import { Hono } from 'hono';
import type { Salon } from '@salon-harness/shared';
import type { Env } from '../index.js';
import { fail, ok, readJson } from '../lib/http.js';
import { jstNow } from '../lib/time.js';
import { requireRole } from '../middleware/auth.js';

const salons = new Hono<Env>();

salons.get('/public/salons', async (c) => {
  const result = await c.env.DB
    .prepare('SELECT id, name, business_type, timezone, theme_color FROM salons WHERE is_active = 1 ORDER BY created_at ASC')
    .all<Salon>();
  return ok(c, result.results);
});

salons.get('/api/salons', async (c) => {
  const result = await c.env.DB
    .prepare('SELECT id, name, business_type, timezone, theme_color FROM salons WHERE is_active = 1 ORDER BY created_at ASC')
    .all<Salon>();
  return ok(c, result.results);
});

salons.get('/api/salons/:id', async (c) => {
  const row = await c.env.DB
    .prepare('SELECT id, name, business_type, timezone, theme_color FROM salons WHERE id = ? AND is_active = 1')
    .bind(c.req.param('id'))
    .first<Salon>();
  return row ? ok(c, row) : fail(c, 'Salon not found', 404);
});

salons.post('/api/salons', async (c) => {
  const forbidden = requireRole(c, ['owner']);
  if (forbidden) return forbidden;
  const body = await readJson<{ id: string; name: string; business_type?: string; theme_color?: string }>(c);
  if (!body.id || !body.name) return fail(c, 'id and name are required');
  if (!/^[a-z0-9-]+$/.test(body.id)) return fail(c, 'id must be lowercase letters, numbers, and hyphens');
  const now = jstNow();
  await c.env.DB
    .prepare(
      `INSERT INTO salons (id, name, business_type, timezone, theme_color, is_active, created_at, updated_at)
       VALUES (?, ?, ?, 'Asia/Tokyo', ?, 1, ?, ?)`
    )
    .bind(body.id, body.name, body.business_type ?? 'freelance', body.theme_color ?? '#0f766e', now, now)
    .run();
  const row = await c.env.DB.prepare('SELECT * FROM salons WHERE id = ?').bind(body.id).first<Salon>();
  return ok(c, row, 201);
});

salons.put('/api/salons/:id', async (c) => {
  const forbidden = requireRole(c, ['owner']);
  if (forbidden) return forbidden;
  const body = await readJson<{ name?: string; business_type?: string; theme_color?: string; is_active?: number }>(c);
  await c.env.DB
    .prepare(
      `UPDATE salons
       SET name = COALESCE(?, name),
           business_type = COALESCE(?, business_type),
           theme_color = COALESCE(?, theme_color),
           is_active = COALESCE(?, is_active),
           updated_at = ?
       WHERE id = ?`
    )
    .bind(body.name ?? null, body.business_type ?? null, body.theme_color ?? null, body.is_active ?? null, jstNow(), c.req.param('id'))
    .run();
  const row = await c.env.DB.prepare('SELECT * FROM salons WHERE id = ?').bind(c.req.param('id')).first<Salon>();
  return row ? ok(c, row) : fail(c, 'Salon not found', 404);
});

salons.delete('/api/salons/:id', async (c) => {
  const forbidden = requireRole(c, ['owner']);
  if (forbidden) return forbidden;
  await c.env.DB.prepare('UPDATE salons SET is_active = 0, updated_at = ? WHERE id = ?').bind(jstNow(), c.req.param('id')).run();
  return ok(c, { deleted: true });
});

export { salons };
