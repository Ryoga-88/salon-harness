import { Hono } from 'hono';
import type { Stylist } from '@salon-harness/shared';
import type { Env } from '../index.js';
import { fail, ok, readJson } from '../lib/http.js';
import { jstNow } from '../lib/time.js';
import { requireRole } from '../middleware/auth.js';

const stylists = new Hono<Env>();

const STYLIST_SELECT = `
  SELECT
    stylists.*,
    stylist_profiles.name_kana,
    stylist_profiles.title,
    stylist_profiles.experience_years,
    stylist_profiles.accepts_direct_booking,
    stylist_profiles.status_label,
    stylist_profiles.catchphrase,
    stylist_profiles.skill_tags,
    stylist_profiles.vibe_tags,
    stylist_profiles.target_audience,
    stylist_profiles.strength_note,
    stylist_profiles.nomination_fee,
    stylist_profiles.max_daily_reservations,
    stylist_profiles.simultaneous_capacity,
    stylist_profiles.available_menu_ids,
    stylist_profiles.unavailable_menu_ids,
    stylist_profiles.holiday_note,
    stylist_profiles.profile_photo_url
  FROM stylists
  LEFT JOIN stylist_profiles ON stylist_profiles.stylist_id = stylists.id
`;

stylists.get('/api/stylists', async (c) => {
  const salonId = c.req.query('salon_id') ?? c.req.query('salon') ?? c.get('staff')?.salon_id ?? 'default';
  const result = await c.env.DB
    .prepare(`${STYLIST_SELECT} WHERE stylists.salon_id = ? AND stylists.is_active = 1 ORDER BY stylists.display_order ASC, stylists.created_at ASC`)
    .bind(salonId)
    .all<Stylist>();
  return ok(c, result.results);
});

stylists.get('/api/stylists/:id', async (c) => {
  const row = await c.env.DB.prepare(`${STYLIST_SELECT} WHERE stylists.id = ?`).bind(c.req.param('id')).first<Stylist>();
  return row ? ok(c, row) : fail(c, 'Stylist not found', 404);
});

stylists.post('/api/stylists', async (c) => {
  const forbidden = requireRole(c, ['owner']);
  if (forbidden) return forbidden;
  const body = await readJson<Partial<Stylist>>(c);
  if (!body.name) return fail(c, 'name is required');
  const now = jstNow();
  const id = crypto.randomUUID();
  const salonId = body.salon_id ?? c.get('staff')?.salon_id ?? 'default';
  await c.env.DB
    .prepare(
      `INSERT INTO stylists
       (id, salon_id, name, display_name, email, phone, bio, avatar_r2_key, specialties, is_active, display_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
    )
    .bind(id, salonId, body.name, body.display_name ?? null, body.email ?? null, body.phone ?? null, body.bio ?? null, body.avatar_r2_key ?? null, body.specialties ?? body.skill_tags ?? null, body.display_order ?? 0, now, now)
    .run();
  await c.env.DB
    .prepare(
      `INSERT INTO stylist_profiles
       (stylist_id, name_kana, title, experience_years, accepts_direct_booking, status_label, catchphrase, skill_tags, vibe_tags, target_audience, strength_note, nomination_fee, max_daily_reservations, simultaneous_capacity, available_menu_ids, unavailable_menu_ids, holiday_note, profile_photo_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      body.name_kana ?? null,
      body.title ?? null,
      body.experience_years ?? null,
      body.accepts_direct_booking === 0 ? 0 : 1,
      body.status_label ?? null,
      body.catchphrase ?? null,
      body.skill_tags ?? body.specialties ?? null,
      body.vibe_tags ?? null,
      body.target_audience ?? null,
      body.strength_note ?? null,
      body.nomination_fee ?? 0,
      body.max_daily_reservations ?? null,
      body.simultaneous_capacity ?? 1,
      body.available_menu_ids ?? null,
      body.unavailable_menu_ids ?? null,
      body.holiday_note ?? null,
      body.profile_photo_url ?? null,
      now,
      now
    )
    .run();
  const row = await c.env.DB.prepare(`${STYLIST_SELECT} WHERE stylists.id = ?`).bind(id).first<Stylist>();
  return ok(c, row, 201);
});

stylists.put('/api/stylists/:id', async (c) => {
  const forbidden = requireRole(c, ['owner', 'editor']);
  if (forbidden) return forbidden;
  const id = c.req.param('id');
  const body = await readJson<Partial<Stylist>>(c);
  const now = jstNow();
  await c.env.DB
    .prepare(
      `UPDATE stylists
       SET name = COALESCE(?, name), display_name = COALESCE(?, display_name), email = ?, phone = ?,
           bio = ?, avatar_r2_key = ?, specialties = ?, display_order = COALESCE(?, display_order), updated_at = ?
       WHERE id = ?`
    )
    .bind(body.name ?? null, body.display_name ?? null, body.email ?? null, body.phone ?? null, body.bio ?? null, body.avatar_r2_key ?? null, body.specialties ?? body.skill_tags ?? null, body.display_order ?? null, now, id)
    .run();
  await c.env.DB
    .prepare(
      `INSERT INTO stylist_profiles
       (stylist_id, name_kana, title, experience_years, accepts_direct_booking, status_label, catchphrase, skill_tags, vibe_tags, target_audience, strength_note, nomination_fee, max_daily_reservations, simultaneous_capacity, available_menu_ids, unavailable_menu_ids, holiday_note, profile_photo_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(stylist_id) DO UPDATE SET
         name_kana = excluded.name_kana,
         title = excluded.title,
         experience_years = excluded.experience_years,
         accepts_direct_booking = excluded.accepts_direct_booking,
         status_label = excluded.status_label,
         catchphrase = excluded.catchphrase,
         skill_tags = excluded.skill_tags,
         vibe_tags = excluded.vibe_tags,
         target_audience = excluded.target_audience,
         strength_note = excluded.strength_note,
         nomination_fee = excluded.nomination_fee,
         max_daily_reservations = excluded.max_daily_reservations,
         simultaneous_capacity = excluded.simultaneous_capacity,
         available_menu_ids = excluded.available_menu_ids,
         unavailable_menu_ids = excluded.unavailable_menu_ids,
         holiday_note = excluded.holiday_note,
         profile_photo_url = excluded.profile_photo_url,
         updated_at = excluded.updated_at`
    )
    .bind(
      id,
      body.name_kana ?? null,
      body.title ?? null,
      body.experience_years ?? null,
      body.accepts_direct_booking === 0 ? 0 : 1,
      body.status_label ?? null,
      body.catchphrase ?? null,
      body.skill_tags ?? body.specialties ?? null,
      body.vibe_tags ?? null,
      body.target_audience ?? null,
      body.strength_note ?? null,
      body.nomination_fee ?? 0,
      body.max_daily_reservations ?? null,
      body.simultaneous_capacity ?? 1,
      body.available_menu_ids ?? null,
      body.unavailable_menu_ids ?? null,
      body.holiday_note ?? null,
      body.profile_photo_url ?? null,
      now,
      now
    )
    .run();
  const row = await c.env.DB.prepare(`${STYLIST_SELECT} WHERE stylists.id = ?`).bind(id).first<Stylist>();
  return row ? ok(c, row) : fail(c, 'Stylist not found', 404);
});

stylists.delete('/api/stylists/:id', async (c) => {
  const forbidden = requireRole(c, ['owner', 'editor']);
  if (forbidden) return forbidden;
  await c.env.DB
    .prepare('UPDATE stylists SET is_active = 0, updated_at = ? WHERE id = ?')
    .bind(jstNow(), c.req.param('id'))
    .run();
  return ok(c, { deleted: true });
});

stylists.get('/api/stylists/:id/business-hours', async (c) => {
  const result = await c.env.DB
    .prepare('SELECT * FROM business_hours WHERE stylist_id = ? ORDER BY day_of_week ASC')
    .bind(c.req.param('id'))
    .all();
  return ok(c, result.results);
});

stylists.put('/api/stylists/:id/business-hours', async (c) => {
  const forbidden = requireRole(c, ['owner', 'editor']);
  if (forbidden) return forbidden;
  const body = await readJson<{ hours: Array<{ day_of_week: number; open_time: string; close_time: string; is_closed?: boolean }> }>(c);
  if (!Array.isArray(body.hours)) return fail(c, 'hours must be an array');
  const stylistId = c.req.param('id');
  for (const h of body.hours) {
    await c.env.DB
      .prepare(
        `INSERT INTO business_hours (id, stylist_id, day_of_week, open_time, close_time, is_closed)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(stylist_id, day_of_week)
         DO UPDATE SET open_time = excluded.open_time, close_time = excluded.close_time, is_closed = excluded.is_closed`
      )
      .bind(crypto.randomUUID(), stylistId, h.day_of_week, h.open_time, h.close_time, h.is_closed ? 1 : 0)
      .run();
  }
  return ok(c, { updated: body.hours.length });
});

stylists.post('/api/stylists/:id/schedule-override', async (c) => {
  const forbidden = requireRole(c, ['owner', 'editor', 'stylist']);
  if (forbidden) return forbidden;
  const body = await readJson<{ date: string; is_closed?: boolean; open_time?: string; close_time?: string; reason?: string }>(c);
  if (!body.date) return fail(c, 'date is required');
  await c.env.DB
    .prepare(
      `INSERT INTO schedule_overrides (id, stylist_id, date, is_closed, open_time, close_time, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(stylist_id, date)
       DO UPDATE SET is_closed = excluded.is_closed, open_time = excluded.open_time, close_time = excluded.close_time, reason = excluded.reason`
    )
    .bind(crypto.randomUUID(), c.req.param('id'), body.date, body.is_closed ? 1 : 0, body.open_time ?? null, body.close_time ?? null, body.reason ?? null)
    .run();
  return ok(c, { updated: true });
});

stylists.get('/api/stylists/:id/menus', async (c) => {
  const result = await c.env.DB
    .prepare('SELECT * FROM menus WHERE stylist_id = ? AND is_active = 1 ORDER BY display_order ASC, created_at ASC')
    .bind(c.req.param('id'))
    .all();
  return ok(c, result.results);
});

export { stylists };
