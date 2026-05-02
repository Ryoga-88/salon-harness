import { Hono } from 'hono';
import type { Env } from '../index.js';
import { fail, ok, readJson } from '../lib/http.js';
import { jstNow } from '../lib/time.js';

const kartes = new Hono<Env>();

kartes.get('/api/kartes', async (c) => {
  const friendId = c.req.query('friend_id');
  if (!friendId) return fail(c, 'friend_id is required');
  const result = await c.env.DB.prepare('SELECT * FROM kartes WHERE friend_id = ? ORDER BY created_at DESC').bind(friendId).all();
  return ok(c, result.results);
});

kartes.get('/api/kartes/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM kartes WHERE id = ?').bind(c.req.param('id')).first();
  return row ? ok(c, row) : fail(c, 'Karte not found', 404);
});

kartes.post('/api/kartes', async (c) => {
  const body = await readJson<{ reservation_id: string; friend_id: string; stylist_id: string; procedure_note?: string; next_recommendation?: string; is_visible_to_customer?: boolean }>(c);
  if (!body.reservation_id || !body.friend_id || !body.stylist_id) return fail(c, 'reservation_id, friend_id and stylist_id are required');
  const id = crypto.randomUUID();
  const now = jstNow();
  await c.env.DB
    .prepare(
      `INSERT INTO kartes
       (id, reservation_id, friend_id, stylist_id, procedure_note, next_recommendation, is_visible_to_customer, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, body.reservation_id, body.friend_id, body.stylist_id, body.procedure_note ?? null, body.next_recommendation ?? null, body.is_visible_to_customer ? 1 : 0, now, now)
    .run();
  const row = await c.env.DB.prepare('SELECT * FROM kartes WHERE id = ?').bind(id).first();
  return ok(c, row, 201);
});

kartes.put('/api/kartes/:id', async (c) => {
  const body = await readJson<Record<string, unknown>>(c);
  await c.env.DB
    .prepare(
      `UPDATE kartes SET hair_type = ?, hair_thickness = ?, hair_amount = ?, scalp_condition = ?,
       formula = ?, procedure_note = ?, next_recommendation = ?, recommended_next_visit_date = ?,
       is_visible_to_customer = COALESCE(?, is_visible_to_customer), updated_at = ? WHERE id = ?`
    )
    .bind(
      body.hair_type ?? null,
      body.hair_thickness ?? null,
      body.hair_amount ?? null,
      body.scalp_condition ?? null,
      body.formula ? JSON.stringify(body.formula) : null,
      body.procedure_note ?? null,
      body.next_recommendation ?? null,
      body.recommended_next_visit_date ?? null,
      typeof body.is_visible_to_customer === 'boolean' ? body.is_visible_to_customer ? 1 : 0 : null,
      jstNow(),
      c.req.param('id')
    )
    .run();
  return ok(c, { updated: true });
});

kartes.post('/api/kartes/:id/photos', async (c) => {
  const body = await readJson<{ type: 'before' | 'after' | 'reference'; filename: string; content_type: string }>(c);
  if (!body.type || !body.filename) return fail(c, 'type and filename are required');
  const photoId = crypto.randomUUID();
  const r2Key = `kartes/${c.req.param('id')}/${photoId}-${body.filename}`;
  await c.env.DB
    .prepare('INSERT INTO photos (id, r2_key, karte_id, type, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(photoId, r2Key, c.req.param('id'), body.type, jstNow())
    .run();
  return ok(c, {
    photo_id: photoId,
    r2_key: r2Key,
    upload_url: `/api/kartes/${c.req.param('id')}/photos/${photoId}/upload`,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
  });
});

kartes.delete('/api/kartes/:id/photos/:photoId', async (c) => {
  const row = await c.env.DB.prepare('SELECT r2_key FROM photos WHERE id = ?').bind(c.req.param('photoId')).first<{ r2_key: string }>();
  if (row && c.env.PHOTOS) await c.env.PHOTOS.delete(row.r2_key);
  await c.env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(c.req.param('photoId')).run();
  return ok(c, { deleted: true });
});

export { kartes };
