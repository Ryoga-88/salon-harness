import type { Context, Next } from 'hono';
import type { Env } from '../index.js';
import { fail } from '../lib/http.js';

const PUBLIC_PATHS = [
  '/',
  '/favicon.ico',
  '/health',
  '/api/auth/login',
  '/webhook/uuid-link'
];

export async function authMiddleware(c: Context<Env>, next: Next): Promise<Response | void> {
  const path = new URL(c.req.url).pathname;
  if (PUBLIC_PATHS.includes(path)) return next();

  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) return fail(c, 'Unauthorized', 401);
  const token = header.slice('Bearer '.length);
  if (token === c.env.API_KEY) {
    c.set('staff', { id: 'env-owner', salon_id: 'default', name: 'Owner', role: 'owner', linked_stylist_id: null });
    return next();
  }

  const session = await c.env.DB
    .prepare(
      `SELECT s.id, u.id AS user_id, u.salon_id, u.name, u.role, u.linked_stylist_id
       FROM staff_sessions s
       JOIN staff_users u ON u.id = s.staff_user_id
       WHERE s.id = ? AND s.expires_at > ? AND u.is_active = 1`
    )
    .bind(token, new Date().toISOString())
    .first<{ user_id: string; salon_id: string; name: string; role: 'owner' | 'editor' | 'stylist'; linked_stylist_id: string | null }>();
  if (!session) return fail(c, 'Unauthorized', 401);
  c.set('staff', {
    id: session.user_id,
    salon_id: session.salon_id,
    name: session.name,
    role: session.role,
    linked_stylist_id: session.linked_stylist_id
  });
  return next();
}

export function requireRole(c: Context<Env>, roles: Array<'owner' | 'editor' | 'stylist'>): Response | null {
  const staff = c.get('staff');
  if (!staff || !roles.includes(staff.role)) return fail(c, 'Forbidden', 403);
  return null;
}
