import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth.js';
import { health } from './routes/health.js';
import { auth } from './routes/auth.js';
import { salons } from './routes/salons.js';
import { stylists } from './routes/stylists.js';
import { menus } from './routes/menus.js';
import { reservations } from './routes/reservations.js';
import { coupons } from './routes/coupons.js';
import { referrals } from './routes/referrals.js';
import { kartes } from './routes/kartes.js';
import { campaigns } from './routes/campaigns.js';
import { messages } from './routes/messages.js';
import { webhook } from './routes/webhook.js';
import { customers } from './routes/customers.js';
import { analytics } from './routes/analytics.js';
import { reminderPreVisit } from './cron/reminder_pre_visit.js';
import { processAutomationJobs } from './cron/automation_jobs.js';

export type Env = {
  Bindings: {
    DB: D1Database;
    PHOTOS?: R2Bucket;
    API_KEY: string;
    CROSS_HARNESS_SECRET: string;
    LINE_HARNESS_API_URL?: string;
    LINE_HARNESS_API_KEY?: string;
    IG_HARNESS_API_URL?: string;
    IG_HARNESS_API_KEY?: string;
    CORS_ORIGINS?: string;
  };
  Variables: {
    staff: {
      id: string;
      salon_id: string;
      name: string;
      role: 'owner' | 'editor' | 'stylist';
      linked_stylist_id: string | null;
    };
  };
};

const app = new Hono<Env>();

app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const allowed = c.env.CORS_ORIGINS?.split(',').map((x: string) => x.trim()).filter(Boolean);
      if (!allowed || allowed.length === 0) return origin;
      return allowed.includes(origin) ? origin : allowed[0]!;
    },
    allowHeaders: ['Content-Type', 'Authorization', 'X-Harness-Signature'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  })
);
app.use('*', authMiddleware);

app.get('/', (c) => c.json({ ok: true, service: 'salon-harness-worker', health: '/health' }));
app.route('/', health);
app.route('/', auth);
app.route('/', salons);
app.route('/', stylists);
app.route('/', menus);
app.route('/', reservations);
app.route('/', coupons);
app.route('/', referrals);
app.route('/', kartes);
app.route('/', campaigns);
app.route('/', messages);
app.route('/', webhook);
app.route('/', customers);
app.route('/', analytics);

app.notFound((c) => c.json({ success: false, error: 'Not found' }, 404));

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env['Bindings'], ctx: ExecutionContext) {
    ctx.waitUntil(reminderPreVisit(env));
    ctx.waitUntil(processAutomationJobs(env));
  }
};
