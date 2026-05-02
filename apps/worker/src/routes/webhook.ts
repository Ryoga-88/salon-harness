import { Hono } from 'hono';
import type { Env } from '../index.js';
import { fail, ok } from '../lib/http.js';
import { verifyHmac } from '../lib/hmac.js';
import { jstNow } from '../lib/time.js';

const webhook = new Hono<Env>();

webhook.post('/webhook/uuid-link', async (c) => {
  const bodyText = await c.req.text();
  const valid = await verifyHmac(bodyText, c.req.header('X-Harness-Signature'), c.env.CROSS_HARNESS_SECRET);
  if (!valid) return fail(c, 'invalid signature', 401);
  const body = JSON.parse(bodyText) as { source: 'line' | 'ig'; uuid: string; external_id: string; metadata?: unknown };
  if (!body.source || !body.uuid || !body.external_id) return fail(c, 'source, uuid and external_id are required');
  const now = jstNow();
  await c.env.DB
    .prepare(
      `INSERT INTO identity_links (id, uuid, source, external_id, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(source, external_id)
       DO UPDATE SET uuid = excluded.uuid, metadata = excluded.metadata, updated_at = excluded.updated_at`
    )
    .bind(crypto.randomUUID(), body.uuid, body.source, body.external_id, JSON.stringify(body.metadata ?? {}), now, now)
    .run();
  return ok(c, { linked: true });
});

export { webhook };
