import { Context, Hono } from 'hono';
import bcrypt from 'bcryptjs';
import type { StaffUser } from '@salon-harness/shared';
import type { Env } from '../index.js';
import { fail, ok, readJson } from '../lib/http.js';
import { jstNow } from '../lib/time.js';
import { requireRole } from '../middleware/auth.js';

const auth = new Hono<Env>();

type OAuthProvider = 'google' | 'line';

type OAuthState = {
  provider: OAuthProvider;
  redirect: string;
  redirect_uri: string;
  nonce: string;
  iat: number;
};

function base64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return atob(padded);
}

async function hmac(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return base64Url(sig);
}

async function encodeState(env: Env['Bindings'], state: OAuthState): Promise<string> {
  const payload = base64Url(new TextEncoder().encode(JSON.stringify(state)));
  return `${payload}.${await hmac(env.CROSS_HARNESS_SECRET || env.API_KEY, payload)}`;
}

async function decodeState(env: Env['Bindings'], raw: string | null | undefined): Promise<OAuthState | null> {
  if (!raw) return null;
  const [payload, sig] = raw.split('.');
  if (!payload || !sig) return null;
  const expected = await hmac(env.CROSS_HARNESS_SECRET || env.API_KEY, payload);
  if (expected !== sig) return null;
  const state = JSON.parse(decodeBase64Url(payload)) as OAuthState;
  if (Date.now() - state.iat > 10 * 60 * 1000) return null;
  return state;
}

async function createStaffSession(c: Context<Env>, user: StaffUser): Promise<string> {
  const sessionId = crypto.randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await c.env.DB
    .prepare('INSERT INTO staff_sessions (id, staff_user_id, user_agent, ip_address, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(sessionId, user.id, c.req.header('User-Agent') ?? null, c.req.header('CF-Connecting-IP') ?? null, expires, now.toISOString())
    .run();
  await c.env.DB.prepare('UPDATE staff_users SET last_login_at = ? WHERE id = ?').bind(jstNow(), user.id).run();
  return sessionId;
}

async function staffByEmail(db: D1Database, email: string): Promise<StaffUser | null> {
  return db
    .prepare('SELECT * FROM staff_users WHERE lower(email) = lower(?) AND is_active = 1')
    .bind(email)
    .first<StaffUser>();
}

function finishRedirect(redirect: string, params: Record<string, string>): Response {
  const url = new URL(redirect);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return Response.redirect(url.toString(), 302);
}

function isAllowedAppRedirect(env: Env['Bindings'], redirect: string): boolean {
  try {
    const url = new URL(redirect);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true;
    const allowed = env.CORS_ORIGINS?.split(',').map((x) => x.trim()).filter(Boolean);
    return !allowed?.length || allowed.includes(url.origin);
  } catch {
    return false;
  }
}

auth.post('/api/auth/login', async (c) => {
  const body = await readJson<{ email: string; password: string }>(c);
  const user = await c.env.DB
    .prepare('SELECT * FROM staff_users WHERE email = ? AND is_active = 1')
    .bind(body.email)
    .first<StaffUser & { password_hash: string | null }>();
  if (!user?.password_hash) return fail(c, 'Invalid email or password', 401);
  const verified = await bcrypt.compare(body.password, user.password_hash);
  if (!verified) return fail(c, 'Invalid email or password', 401);
  const sessionId = await createStaffSession(c, user);
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

auth.get('/api/auth/oauth/:provider/start', async (c) => {
  const provider = c.req.param('provider') as OAuthProvider;
  if (provider !== 'google' && provider !== 'line') return fail(c, 'Unknown login provider', 404);

  const appRedirect = c.req.query('redirect');
  if (!appRedirect) return fail(c, 'redirect is required');
  if (!isAllowedAppRedirect(c.env, appRedirect)) return fail(c, '許可されていないログイン戻り先です。CORS_ORIGINS を確認してください。', 400, 'oauth_redirect_not_allowed');

  const origin = new URL(c.req.url).origin;
  const redirectUri = `${origin}/api/auth/oauth/${provider}/callback`;
  const state = await encodeState(c.env, {
    provider,
    redirect: appRedirect,
    redirect_uri: redirectUri,
    nonce: crypto.randomUUID(),
    iat: Date.now()
  });

  if (provider === 'google') {
    if (!c.env.GOOGLE_OAUTH_CLIENT_ID || !c.env.GOOGLE_OAUTH_CLIENT_SECRET) {
      return fail(c, 'Googleログインが未設定です。GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET を設定してください。', 400, 'google_oauth_not_configured');
    }
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', c.env.GOOGLE_OAUTH_CLIENT_ID);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('prompt', 'select_account');
    url.searchParams.set('state', state);
    return ok(c, { url: url.toString() });
  }

  if (!c.env.LINE_LOGIN_CHANNEL_ID || !c.env.LINE_LOGIN_CHANNEL_SECRET) {
    return fail(c, 'LINEログインが未設定です。LINE_LOGIN_CHANNEL_ID / LINE_LOGIN_CHANNEL_SECRET を設定してください。', 400, 'line_oauth_not_configured');
  }
  const url = new URL('https://access.line.me/oauth2/v2.1/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', c.env.LINE_LOGIN_CHANNEL_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'profile openid email');
  url.searchParams.set('bot_prompt', 'normal');
  url.searchParams.set('state', state);
  return ok(c, { url: url.toString() });
});

auth.get('/api/auth/oauth/:provider/callback', async (c) => {
  const provider = c.req.param('provider') as OAuthProvider;
  const code = c.req.query('code');
  const state = await decodeState(c.env, c.req.query('state'));
  if (!code || !state || state.provider !== provider) {
    return finishRedirect(state?.redirect ?? '/', { error: 'oauth_state_invalid' });
  }

  try {
    let email = '';
    if (provider === 'google') {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: c.env.GOOGLE_OAUTH_CLIENT_ID ?? '',
          client_secret: c.env.GOOGLE_OAUTH_CLIENT_SECRET ?? '',
          redirect_uri: state.redirect_uri
        })
      });
      const token = await tokenRes.json() as { access_token?: string; error?: string };
      if (!tokenRes.ok || !token.access_token) throw new Error(token.error ?? 'google_token_failed');
      const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${token.access_token}` }
      });
      const profile = await userRes.json() as { email?: string; email_verified?: boolean };
      if (!userRes.ok || !profile.email || profile.email_verified === false) throw new Error('google_email_unverified');
      email = profile.email;
    } else {
      const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: c.env.LINE_LOGIN_CHANNEL_ID ?? '',
          client_secret: c.env.LINE_LOGIN_CHANNEL_SECRET ?? '',
          redirect_uri: state.redirect_uri
        })
      });
      const token = await tokenRes.json() as { id_token?: string; error?: string };
      if (!tokenRes.ok || !token.id_token) throw new Error(token.error ?? 'line_token_failed');
      const verifyRes = await fetch('https://api.line.me/oauth2/v2.1/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          id_token: token.id_token,
          client_id: c.env.LINE_LOGIN_CHANNEL_ID ?? ''
        })
      });
      const profile = await verifyRes.json() as { email?: string };
      if (!verifyRes.ok || !profile.email) throw new Error('line_email_missing');
      email = profile.email;
    }

    const user = await staffByEmail(c.env.DB, email);
    if (!user) return finishRedirect(state.redirect, { error: 'staff_not_found' });
    const session = await createStaffSession(c, user);
    return finishRedirect(state.redirect, { session });
  } catch (err) {
    return finishRedirect(state.redirect, { error: err instanceof Error ? err.message : 'oauth_failed' });
  }
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
