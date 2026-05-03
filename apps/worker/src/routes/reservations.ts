import { Hono } from 'hono';
import { buildAvailabilitySlots, calculateMenuTotals, toJstIso, addMinutes } from '@salon-harness/salon-domain';
import type { Menu, Reservation } from '@salon-harness/shared';
import type { Env } from '../index.js';
import { fail, ok, readJson } from '../lib/http.js';
import { sendLineMessage } from '../lib/line-harness.js';
import { addDaysIso, jstNow } from '../lib/time.js';
import { requireRole } from '../middleware/auth.js';
import { validateCouponForReservation } from './coupons.js';

const reservations = new Hono<Env>();
const CONSULTATION_DURATION_MIN = 60;

async function getMenus(db: D1Database, menuIds: string[]): Promise<Menu[]> {
  const menus: Menu[] = [];
  for (const id of menuIds) {
    const row = await db.prepare('SELECT * FROM menus WHERE id = ? AND is_active = 1').bind(id).first<Menu>();
    if (!row) throw new Error(`menu not found: ${id}`);
    menus.push(row);
  }
  return menus;
}

function consultationTotals(menus: Menu[]) {
  if (menus.length > 0) return calculateMenuTotals(menus);
  return { durationMin: CONSULTATION_DURATION_MIN, price: 0 };
}

async function getStylistsForAvailability(db: D1Database, args: { stylistId?: string; salonId?: string; stylistIds?: string[] }) {
  if (args.stylistId) {
    const row = await db.prepare('SELECT id, name, display_name FROM stylists WHERE id = ? AND is_active = 1').bind(args.stylistId).first<{ id: string; name: string; display_name: string | null }>();
    return row ? [row] : [];
  }
  if (args.stylistIds && args.stylistIds.length > 0) {
    const stylists = [];
    for (const id of args.stylistIds) {
      const row = await db.prepare('SELECT id, name, display_name FROM stylists WHERE id = ? AND is_active = 1').bind(id).first<{ id: string; name: string; display_name: string | null }>();
      if (row) stylists.push(row);
    }
    return stylists;
  }
  if (!args.salonId) return [];
  const result = await db
    .prepare('SELECT id, name, display_name FROM stylists WHERE salon_id = ? AND is_active = 1 ORDER BY display_order ASC, created_at ASC')
    .bind(args.salonId)
    .all<{ id: string; name: string; display_name: string | null }>();
  return result.results;
}

reservations.get('/api/reservations/availability', async (c) => {
  const stylistId = c.req.query('stylist_id');
  const salonId = c.req.query('salon_id');
  const date = c.req.query('date');
  const menuIds = (c.req.query('menu_ids') ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  if (!date || (!stylistId && !salonId)) return fail(c, 'date and stylist_id or salon_id are required');

  const menus = await getMenus(c.env.DB, menuIds);
  const totals = consultationTotals(menus);
  const day = new Date(`${date}T00:00:00+09:00`).getDay();
  const menuStylistIds = Array.from(new Set(menus.map((m) => m.stylist_id)));
  const stylists = await getStylistsForAvailability(c.env.DB, { stylistId, salonId, stylistIds: menuStylistIds });
  const availableSlots = [];
  for (const s of stylists) {
    const [businessHours, override, existing] = await Promise.all([
      c.env.DB.prepare('SELECT * FROM business_hours WHERE stylist_id = ? AND day_of_week = ?').bind(s.id, day).first<{ open_time: string; close_time: string; is_closed: number }>(),
      c.env.DB.prepare('SELECT * FROM schedule_overrides WHERE stylist_id = ? AND date = ?').bind(s.id, date).first<{ is_closed: number; open_time: string | null; close_time: string | null }>(),
      c.env.DB
        .prepare("SELECT * FROM reservations WHERE stylist_id = ? AND date(start_at) = ? AND status IN ('confirmed', 'completed')")
        .bind(s.id, date)
        .all<Reservation>()
    ]);
    const slots = buildAvailabilitySlots({
      date,
      durationMin: totals.durationMin,
      businessHours,
      override,
      reservations: existing.results
    });
    for (const slot of slots) {
      availableSlots.push({ ...slot, stylist_id: s.id, stylist_name: s.display_name ?? s.name });
    }
  }
  availableSlots.sort((a, b) => a.start_at.localeCompare(b.start_at) || a.stylist_name.localeCompare(b.stylist_name));
  return ok(c, {
    stylist_id: stylistId ?? null,
    salon_id: salonId ?? null,
    date,
    total_duration_min: totals.durationMin,
    available_slots: availableSlots
  });
});

reservations.get('/api/reservations', async (c) => {
  const conditions: string[] = ['1 = 1'];
  const binds: unknown[] = [];
  const friendId = c.req.query('friend_id');
  const stylistId = c.req.query('stylist_id');
  const status = c.req.query('status');
  if (friendId) {
    conditions.push('friend_id = ?');
    binds.push(friendId);
  }
  if (stylistId) {
    conditions.push('stylist_id = ?');
    binds.push(stylistId);
  }
  if (status) {
    conditions.push('status = ?');
    binds.push(status);
  }
  const staff = c.get('staff');
  if (staff?.role === 'stylist' && staff.linked_stylist_id) {
    conditions.push('stylist_id = ?');
    binds.push(staff.linked_stylist_id);
  } else if (staff?.salon_id) {
    conditions.push('stylist_id IN (SELECT id FROM stylists WHERE salon_id = ?)');
    binds.push(staff.salon_id);
  }
  const result = await c.env.DB
    .prepare(`SELECT * FROM reservations WHERE ${conditions.join(' AND ')} ORDER BY start_at DESC LIMIT 200`)
    .bind(...binds)
    .all<Reservation>();
  return ok(c, result.results);
});

reservations.get('/api/reservations/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM reservations WHERE id = ?').bind(c.req.param('id')).first<Reservation>();
  return row ? ok(c, row) : fail(c, 'Reservation not found', 404);
});

reservations.post('/api/reservations', async (c) => {
  const body = await readJson<{ salon_id?: string; stylist_id?: string; friend_id: string; menu_ids?: string[]; start_at: string; customer_note?: string; coupon_code?: string; source?: string }>(c);
  if (!body.friend_id || !body.start_at || (!body.stylist_id && !body.salon_id)) {
    return fail(c, 'friend_id, start_at and stylist_id or salon_id are required');
  }
  const menuIds = Array.isArray(body.menu_ids) ? body.menu_ids : [];
  const menus = await getMenus(c.env.DB, menuIds);
  const totals = consultationTotals(menus);
  const start = new Date(body.start_at);
  const end = addMinutes(start, totals.durationMin);
  const endAt = toJstIso(end);
  const now = jstNow();
  let stylistId = body.stylist_id ?? menus[0]?.stylist_id ?? null;
  if (!stylistId && body.salon_id) {
    const result = await c.env.DB
      .prepare(
        `SELECT id FROM stylists
         WHERE salon_id = ? AND is_active = 1
           AND NOT EXISTS (
             SELECT 1 FROM reservations
             WHERE reservations.stylist_id = stylists.id
               AND status IN ('confirmed', 'completed')
               AND start_at < ?
               AND end_at > ?
           )
         ORDER BY display_order ASC, created_at ASC
         LIMIT 1`
      )
      .bind(body.salon_id, endAt, body.start_at)
      .first<{ id: string }>();
    stylistId = result?.id ?? null;
  }
  if (!stylistId) return fail(c, '予約可能な担当者が見つかりません。別の日時を選択してください。', 409, 'stylist_not_available');
  let priceBeforeDiscount = totals.price;
  let discountAmount = 0;
  let totalPrice = totals.price;
  let couponId: string | null = null;

  if (body.coupon_code && menuIds.length > 0) {
    const couponResult = await validateCouponForReservation({
      db: c.env.DB,
      code: body.coupon_code,
      stylistId,
      friendId: body.friend_id,
      menuIds
    });
    if (!couponResult.valid) return fail(c, couponResult.message, 400, couponResult.reason);
    priceBeforeDiscount = couponResult.originalPrice;
    discountAmount = couponResult.discountAmount;
    totalPrice = couponResult.finalPrice;
    couponId = couponResult.coupon.id;
  }

  const id = crypto.randomUUID();
  const inserted = await c.env.DB
    .prepare(
      `INSERT INTO reservations
       (id, stylist_id, friend_id, menu_ids, start_at, end_at, total_price, price_before_discount, discount_amount,
        applied_coupon_id, status, source, customer_note, created_at, updated_at)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?
       WHERE NOT EXISTS (
         SELECT 1 FROM reservations
         WHERE stylist_id = ?
           AND status IN ('confirmed', 'completed')
           AND start_at < ?
           AND end_at > ?
       )`
    )
    .bind(id, stylistId, body.friend_id, JSON.stringify(menuIds), body.start_at, endAt, totalPrice, priceBeforeDiscount, discountAmount, couponId, body.source ?? 'liff', body.customer_note ?? null, now, now, stylistId, endAt, body.start_at)
    .run();

  if ((inserted.meta as { changes?: number }).changes === 0) {
    return fail(c, 'Selected slot is no longer available', 409, 'reservation_conflict');
  }

  if (couponId) {
    await c.env.DB.prepare('UPDATE coupons SET used_count = used_count + 1, updated_at = ? WHERE id = ?').bind(now, couponId).run();
    await c.env.DB
      .prepare('INSERT INTO coupon_usages (id, coupon_id, reservation_id, friend_id, discount_applied, used_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), couponId, id, body.friend_id, discountAmount, now)
      .run();
  }

  await c.env.DB
    .prepare('INSERT INTO automation_jobs (id, job_type, target_friend_id, target_reservation_id, scheduled_at, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)')
    .bind(
      crypto.randomUUID(), 'pre_visit_reminder', body.friend_id, id, `${addDaysIso(start, -1)}T09:00:00+09:00`, 'pending', now,
      crypto.randomUUID(), 'repeat_promotion_4w', body.friend_id, id, `${addDaysIso(start, 28)}T09:00:00+09:00`, 'pending', now
    )
    .run();

  c.executionCtx.waitUntil(
    sendLineMessage(c.env, body.friend_id, `ご予約ありがとうございます。\n日時: ${body.start_at}\nメニュー: ${menus.length ? menus.map((m) => m.name).join(' / ') : '当日相談'}\n合計: ${totalPrice > 0 ? `${totalPrice.toLocaleString('ja-JP')}円` : '当日確定'}`)
  );

  const row = await c.env.DB.prepare('SELECT * FROM reservations WHERE id = ?').bind(id).first<Reservation>();
  return ok(c, { ...row, menus }, 201);
});

reservations.put('/api/reservations/:id/cancel', async (c) => {
  const body = await readJson<{ reason?: string }>(c);
  await c.env.DB
    .prepare("UPDATE reservations SET status = 'cancelled', cancelled_at = ?, cancellation_reason = ?, updated_at = ? WHERE id = ? AND status = 'confirmed'")
    .bind(jstNow(), body.reason ?? null, jstNow(), c.req.param('id'))
    .run();
  return ok(c, { cancelled: true });
});

reservations.put('/api/reservations/:id/complete', async (c) => {
  const forbidden = requireRole(c, ['owner', 'editor', 'stylist']);
  if (forbidden) return forbidden;
  const now = jstNow();
  await c.env.DB.prepare("UPDATE reservations SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?").bind(now, now, c.req.param('id')).run();
  const row = await c.env.DB.prepare('SELECT * FROM reservations WHERE id = ?').bind(c.req.param('id')).first<Reservation>();
  if (row) {
    await c.env.DB
      .prepare('INSERT INTO automation_jobs (id, job_type, target_friend_id, target_reservation_id, scheduled_at, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), 'post_visit_thanks', row.friend_id, row.id, toJstIso(addMinutes(new Date(now), 180)), 'pending', now)
      .run();
  }
  return ok(c, { completed: true });
});

reservations.put('/api/reservations/:id/no-show', async (c) => {
  const forbidden = requireRole(c, ['owner', 'editor', 'stylist']);
  if (forbidden) return forbidden;
  await c.env.DB.prepare("UPDATE reservations SET status = 'no_show', updated_at = ? WHERE id = ?").bind(jstNow(), c.req.param('id')).run();
  return ok(c, { no_show: true });
});

export { reservations };
