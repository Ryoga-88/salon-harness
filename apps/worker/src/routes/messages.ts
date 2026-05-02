import { Hono } from 'hono';
import type { Env } from '../index.js';
import { fail, ok, readJson } from '../lib/http.js';
import { sendLineMessage } from '../lib/line-harness.js';
import { requireRole } from '../middleware/auth.js';

const messages = new Hono<Env>();

messages.post('/api/messages/send', async (c) => {
  const forbidden = requireRole(c, ['owner', 'editor']);
  if (forbidden) return forbidden;
  const body = await readJson<{ friend_id: string; content: string }>(c);
  if (!body.friend_id || !body.content) return fail(c, 'friend_id and content are required');
  if (!c.env.LINE_HARNESS_API_URL || !c.env.LINE_HARNESS_API_KEY) return fail(c, 'LINE harness is not configured', 400);
  await sendLineMessage(c.env, body.friend_id, body.content);
  return ok(c, { sent: true });
});

export { messages };
