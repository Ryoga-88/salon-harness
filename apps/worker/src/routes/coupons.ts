import { Hono } from 'hono';
import { validateCoupon } from '@salon-harness/salon-domain';
import type { Coupon, Menu } from '@salon-harness/shared';
import type { Env } from '../index.js';
import { fail, ok, readJson } from '../lib/http.js';
import { jstNow } from '../lib/time.js';
import { requireRole } from '../middleware/auth.js';

const coupons = new Hono<Env>();

async function completedCount(db: D1Database, friendId: string): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS count FROM reservations WHERE friend_id = ? AND status = 'completed'")
    .bind(friendId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

async function userUsageCount(db: D1Database, couponId: string, friendId: string): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) AS count FROM coupon_usages WHERE coupon_id = ? AND friend_id = ?')
    .bind(couponId, friendId)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

async function getMenusByIds(db: D1Database, menuIds: string[]): Promise<Menu[]> {
  if (menuIds.length === 0) return [];
  const menus: Menu[] = [];
  for (const id of menuIds) {
    const row = await db.prepare('SELECT * FROM menus WHERE id = ? AND is_active = 1').bind(id).first<Menu>();
    if (row) menus.push(row);
  }
  return menus;
}

export async function validateCouponForReservation(args: {
  db: D1Database;
  code: string;
  stylistId: string;
  friendId: string;
  menuIds: string[];
}) {
  const code = args.code.trim().toUpperCase();
  const coupon = await args.db
    .prepare('SELECT * FROM coupons WHERE code = ? AND stylist_id = ?')
    .bind(code, args.stylistId)
    .first<Coupon>();
  const menus = await getMenusByIds(args.db, args.menuIds);
  return validateCoupon({
    coupon: coupon ?? null,
    menus,
    nowIso: jstNow(),
    completedReservations: await completedCount(args.db, args.friendId),
    userUsageCount: coupon ? await userUsageCount(args.db, coupon.id, args.friendId) : 0
  });
}

coupons.get('/api/coupons', async (c) => {
  const stylistId = c.req.query('stylist_id');
  const friendId = c.req.query('friend_id');
  if (!stylistId || !friendId) return fail(c, 'stylist_id and friend_id are required');
  const now = jstNow();
  const result = await c.env.DB
    .prepare(
      `SELECT * FROM coupons
       WHERE stylist_id = ? AND is_active = 1 AND display_in_liff = 1 AND valid_from <= ? AND valid_until >= ?
       ORDER BY valid_until ASC`
    )
    .bind(stylistId, now, now)
    .all<Coupon>();
  const items: Coupon[] = [];
  for (const coupon of result.results) {
    const firstOk = !coupon.is_first_time_only || (await completedCount(c.env.DB, friendId)) === 0;
    const usageOk = (await userUsageCount(c.env.DB, coupon.id, friendId)) < coupon.usage_limit_per_user;
    const totalOk = coupon.usage_limit_total === null || coupon.used_count < coupon.usage_limit_total;
    if (firstOk && usageOk && totalOk) items.push(coupon);
  }
  return ok(c, items);
});

coupons.get('/api/coupons/code/:code', async (c) => {
  const stylistId = c.req.query('stylist_id');
  const friendId = c.req.query('friend_id');
  if (!stylistId || !friendId) return fail(c, 'stylist_id and friend_id are required');
  const coupon = await c.env.DB
    .prepare('SELECT * FROM coupons WHERE code = ? AND stylist_id = ?')
    .bind(c.req.param('code').trim().toUpperCase(), stylistId)
    .first<Coupon>();
  const result = validateCoupon({
    coupon: coupon ?? null,
    menus: [],
    nowIso: jstNow(),
    completedReservations: await completedCount(c.env.DB, friendId),
    userUsageCount: coupon ? await userUsageCount(c.env.DB, coupon.id, friendId) : 0
  });
  if (!result.valid && result.reason === 'menu_not_applicable') {
    return ok(c, { valid: true, coupon });
  }
  return result.valid
    ? ok(c, { valid: true, coupon: result.coupon })
    : ok(c, { valid: false, reason: result.reason, message: result.message });
});

coupons.post('/api/coupons/validate', async (c) => {
  const body = await readJson<{ code: string; stylist_id: string; friend_id: string; menu_ids: string[] }>(c);
  const result = await validateCouponForReservation({
    db: c.env.DB,
    code: body.code,
    stylistId: body.stylist_id,
    friendId: body.friend_id,
    menuIds: body.menu_ids
  });
  return result.valid
    ? ok(c, {
        valid: true,
        coupon_id: result.coupon.id,
        original_price: result.originalPrice,
        discount_amount: result.discountAmount,
        final_price: result.finalPrice
      })
    : ok(c, { valid: false, reason: result.reason, message: result.message });
});

coupons.post('/api/coupons', async (c) => {
  const forbidden = requireRole(c, ['owner', 'editor']);
  if (forbidden) return forbidden;
  const body = await readJson<Partial<Coupon>>(c);
  if (!body.stylist_id || !body.name || !body.type || body.value === undefined) {
    return fail(c, 'stylist_id, name, type and value are required');
  }
  const now = jstNow();
  const id = crypto.randomUUID();
  const code = (body.code ?? `CPN${crypto.randomUUID().slice(0, 8)}`).toUpperCase();
  await c.env.DB
    .prepare(
      `INSERT INTO coupons
       (id, stylist_id, code, name, description, type, value, applicable_menu_ids, is_first_time_only,
        min_total_price, max_discount, valid_from, valid_until, usage_limit_total, usage_limit_per_user,
        display_in_liff, source, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
    )
    .bind(
      id,
      body.stylist_id,
      code,
      body.name,
      body.description ?? null,
      body.type,
      body.value,
      body.applicable_menu_ids ?? null,
      body.is_first_time_only ? 1 : 0,
      body.min_total_price ?? null,
      body.max_discount ?? null,
      body.valid_from ?? now,
      body.valid_until ?? '2099-12-31T23:59:59+09:00',
      body.usage_limit_total ?? null,
      body.usage_limit_per_user ?? 1,
      body.display_in_liff === undefined ? 1 : body.display_in_liff ? 1 : 0,
      body.source ?? null,
      now,
      now
    )
    .run();
  const row = await c.env.DB.prepare('SELECT * FROM coupons WHERE id = ?').bind(id).first<Coupon>();
  return ok(c, row, 201);
});

coupons.put('/api/coupons/:id', async (c) => {
  const forbidden = requireRole(c, ['owner', 'editor']);
  if (forbidden) return forbidden;
  const body = await readJson<Partial<Coupon>>(c);
  await c.env.DB
    .prepare(
      `UPDATE coupons SET
       name = COALESCE(?, name), description = ?, value = COALESCE(?, value),
       valid_from = COALESCE(?, valid_from), valid_until = COALESCE(?, valid_until),
       usage_limit_total = ?, usage_limit_per_user = COALESCE(?, usage_limit_per_user),
       display_in_liff = COALESCE(?, display_in_liff), is_active = COALESCE(?, is_active), updated_at = ?
       WHERE id = ?`
    )
    .bind(body.name ?? null, body.description ?? null, body.value ?? null, body.valid_from ?? null, body.valid_until ?? null, body.usage_limit_total ?? null, body.usage_limit_per_user ?? null, body.display_in_liff ?? null, body.is_active ?? null, jstNow(), c.req.param('id'))
    .run();
  const row = await c.env.DB.prepare('SELECT * FROM coupons WHERE id = ?').bind(c.req.param('id')).first<Coupon>();
  return row ? ok(c, row) : fail(c, 'Coupon not found', 404);
});

coupons.delete('/api/coupons/:id', async (c) => {
  const forbidden = requireRole(c, ['owner', 'editor']);
  if (forbidden) return forbidden;
  await c.env.DB.prepare('UPDATE coupons SET is_active = 0, updated_at = ? WHERE id = ?').bind(jstNow(), c.req.param('id')).run();
  return ok(c, { deleted: true });
});

coupons.get('/api/coupons/:id/analytics', async (c) => {
  const row = await c.env.DB
    .prepare(
      `SELECT c.id, c.code, c.name, c.used_count, COALESCE(SUM(cu.discount_applied), 0) AS total_discount,
              COALESCE(SUM(r.total_price), 0) AS attributed_sales
       FROM coupons c
       LEFT JOIN coupon_usages cu ON cu.coupon_id = c.id
       LEFT JOIN reservations r ON r.id = cu.reservation_id
       WHERE c.id = ?
       GROUP BY c.id`
    )
    .bind(c.req.param('id'))
    .first();
  return row ? ok(c, row) : fail(c, 'Coupon not found', 404);
});

export { coupons };
