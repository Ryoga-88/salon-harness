import { Hono } from 'hono';
import type { Env } from '../index.js';
import { fail, ok, readJson } from '../lib/http.js';
import { jstNow } from '../lib/time.js';

const referrals = new Hono<Env>();

function makeCode(): string {
  return `REF${crypto.randomUUID().slice(0, 8).replace(/-/g, '').toUpperCase()}`;
}

referrals.post('/api/referrals', async (c) => {
  const body = await readJson<{ stylist_id: string; referrer_friend_id: string; reward_for_referrer?: number; reward_for_referred?: number }>(c);
  if (!body.stylist_id || !body.referrer_friend_id) return fail(c, 'stylist_id and referrer_friend_id are required');
  const id = crypto.randomUUID();
  const code = makeCode();
  await c.env.DB
    .prepare(
      `INSERT INTO referrals
       (id, stylist_id, referrer_friend_id, referrer_code, reward_for_referrer, reward_for_referred, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'created', ?)`
    )
    .bind(id, body.stylist_id, body.referrer_friend_id, code, body.reward_for_referrer ?? null, body.reward_for_referred ?? null, jstNow())
    .run();
  return ok(c, { id, code, line_ref: `ref_${code}` }, 201);
});

referrals.get('/api/referrals/:code', async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM referrals WHERE referrer_code = ?').bind(c.req.param('code')).first();
  return row ? ok(c, row) : fail(c, 'Referral not found', 404);
});

referrals.put('/api/referrals/:code/use', async (c) => {
  const body = await readJson<{ referred_friend_id: string }>(c);
  await c.env.DB
    .prepare("UPDATE referrals SET referred_friend_id = ?, status = 'used', used_at = ? WHERE referrer_code = ? AND status = 'created'")
    .bind(body.referred_friend_id, jstNow(), c.req.param('code'))
    .run();
  return ok(c, { used: true });
});

export { referrals };
