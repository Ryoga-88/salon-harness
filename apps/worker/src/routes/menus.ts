import { Hono } from 'hono';
import type { Menu } from '@salon-harness/shared';
import type { Env } from '../index.js';
import { fail, ok, readJson } from '../lib/http.js';
import { jstNow } from '../lib/time.js';
import { requireRole } from '../middleware/auth.js';

const menus = new Hono<Env>();

menus.get('/api/menus', async (c) => {
  const stylistId = c.req.query('stylist_id');
  const category = c.req.query('category');
  const where: string[] = ['is_active = 1'];
  const binds: unknown[] = [];
  if (stylistId) {
    where.push('stylist_id = ?');
    binds.push(stylistId);
  }
  if (category) {
    where.push('category = ?');
    binds.push(category);
  }
  const result = await c.env.DB
    .prepare(`SELECT * FROM menus WHERE ${where.join(' AND ')} ORDER BY display_order ASC, created_at ASC`)
    .bind(...binds)
    .all<Menu>();
  return ok(c, result.results);
});

menus.get('/api/menus/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM menus WHERE id = ?').bind(c.req.param('id')).first<Menu>();
  return row ? ok(c, row) : fail(c, 'Menu not found', 404);
});

menus.post('/api/menus', async (c) => {
  const forbidden = requireRole(c, ['owner', 'editor']);
  if (forbidden) return forbidden;
  const body = await readJson<Partial<Menu>>(c);
  if (!body.stylist_id || !body.name || !body.category || !body.duration_min || body.price === undefined) {
    return fail(c, 'stylist_id, name, category, duration_min and price are required');
  }
  const id = crypto.randomUUID();
  const now = jstNow();
  await c.env.DB
    .prepare(
      `INSERT INTO menus
       (id, stylist_id, name, category, duration_min, price, description, is_first_time_only, is_active, display_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
    )
    .bind(id, body.stylist_id, body.name, body.category, body.duration_min, body.price, body.description ?? null, body.is_first_time_only ? 1 : 0, body.display_order ?? 0, now, now)
    .run();
  const row = await c.env.DB.prepare('SELECT * FROM menus WHERE id = ?').bind(id).first<Menu>();
  return ok(c, row, 201);
});

menus.put('/api/menus/:id', async (c) => {
  const forbidden = requireRole(c, ['owner', 'editor']);
  if (forbidden) return forbidden;
  const id = c.req.param('id');
  const body = await readJson<Partial<Menu>>(c);
  await c.env.DB
    .prepare(
      `UPDATE menus SET
       name = COALESCE(?, name), category = COALESCE(?, category), duration_min = COALESCE(?, duration_min),
       price = COALESCE(?, price), description = ?, is_first_time_only = COALESCE(?, is_first_time_only),
       display_order = COALESCE(?, display_order), updated_at = ?
       WHERE id = ?`
    )
    .bind(body.name ?? null, body.category ?? null, body.duration_min ?? null, body.price ?? null, body.description ?? null, body.is_first_time_only === undefined ? null : body.is_first_time_only ? 1 : 0, body.display_order ?? null, jstNow(), id)
    .run();
  const row = await c.env.DB.prepare('SELECT * FROM menus WHERE id = ?').bind(id).first<Menu>();
  return row ? ok(c, row) : fail(c, 'Menu not found', 404);
});

menus.delete('/api/menus/:id', async (c) => {
  const forbidden = requireRole(c, ['owner', 'editor']);
  if (forbidden) return forbidden;
  await c.env.DB.prepare('UPDATE menus SET is_active = 0, updated_at = ? WHERE id = ?').bind(jstNow(), c.req.param('id')).run();
  return ok(c, { deleted: true });
});

export { menus };
