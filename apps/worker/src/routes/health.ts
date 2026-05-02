import { Hono } from 'hono';
import type { Env } from '../index.js';

const health = new Hono<Env>();

health.get('/health', (c) => c.json({ ok: true, service: 'salon-harness-worker' }));

export { health };
