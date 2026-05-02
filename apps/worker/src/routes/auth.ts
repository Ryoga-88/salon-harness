import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import type { StaffUser } from '@salon-harness/shared';
import type { Env } from '../index.js';
import { fail, ok, readJson } from '../lib/http.js';
import { jstNow } from '../lib/time.js';
import { requireRole } from '../middleware/auth.js';

const auth = new Hono<Env>();

auth.post('/api/auth/login', async (c) => {
  const body = await readJson<{ email: string; password: string }>(c);
  const user = await c.env.DB
    .prepare('SELECT * FROM staff_users WHERE email = ? AND is_active = 1')
    .bind(body.email)
    .first<StaffUser & { password_hash: string | null }>();
  if (!user?.password_hash) return fail(c, 'Invalid email or password', 401);
  const verified = await bcrypt.compare(body.password, user.password_hash);
  if (!verified) return fail(c, 'Invalid email or password', 401);
  const sessionId = crypto.randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await c.env.DB
    .prepare('INSERT INTO staff_sessions (id, staff_user_id, user_agent, ip_address, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(sessionId, user.id, c.req.header('User-Agent') ?? null, c.req.header('CF-Connecting-IP') ?? null, expires, now.toISOString())
    .run();
  await c.env.DB.prepare('UPDATE staff_users SET last_login_at = ? WHERE id = ?').bind(jstNow(), user.id).run();
  return ok(c, {
    token: sessionId,
    user: {
      id: user.id,
      salon_id: user.salon_id,
      email: user.email,
      name: user.name,
      role: user.role,
      linked_stylist_id: user.linked_stylist_id
    }
  });
});

auth.post('/api/auth/logout', async (c) => {
  const token = c.req.header('Authorization')?.replace(/^Bearer /, '');
  if (token) await c.env.DB.prepare('DELETE FROM staff_sessions WHERE id = ?').bind(token).run();
  return ok(c, { logged_out: true });
});

auth.get('/api/auth/me', (c) => ok(c, c.get('staff')));

auth.post('/api/staff', async (c) => {
  const forbidden = requireRole(c, ['owner']);
  if (forbidden) return forbidden;
  const body = await readJson<{ email: string; name: string; password: string; role: 'owner' | 'editor' | 'stylist'; linked_stylist_id?: string; salon_id?: string }>(c);
  if (!body.email || !body.name || !body.password || !body.role) return fail(c, 'email, name, password and role are required');
  const now = jstNow();
  const id = crypto.randomUUID();
  const hash = await bcrypt.hash(body.password, 10);
  await c.env.DB
    .prepare('INSERT INTO staff_users (id, salon_id, email, name, password_hash, role, linked_stylist_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)')
    .bind(id, body.salon_id ?? c.get('staff')?.salon_id ?? 'default', body.email, body.name, hash, body.role, body.linked_stylist_id ?? null, now, now)
    .run();
  return ok(c, { id, email: body.email, name: body.name, role: body.role }, 201);
});

auth.put('/api/staff/:id/role', async (c) => {
  const forbidden = requireRole(c, ['owner']);
  if (forbidden) return forbidden;
  const body = await readJson<{ role: 'owner' | 'editor' | 'stylist' }>(c);
  await c.env.DB.prepare('UPDATE staff_users SET role = ?, updated_at = ? WHERE id = ?').bind(body.role, jstNow(), c.req.param('id')).run();
  return ok(c, { updated: true });
});

auth.delete('/api/staff/:id', async (c) => {
  const forbidden = requireRole(c, ['owner']);
  if (forbidden) return forbidden;
  await c.env.DB.prepare('UPDATE staff_users SET is_active = 0, updated_at = ? WHERE id = ?').bind(jstNow(), c.req.param('id')).run();
  return ok(c, { deleted: true });
});

export { auth };
