# Architecture

Salon Harness is an extension layer over `line-harness-oss` and `ig-harness-oss`.

- `apps/worker`: Hono API on Cloudflare Workers. Owns salon domain data: stylists, menus, availability, reservations, coupons, referrals, kartes, automation jobs.
- `apps/web`: unified admin UI for salon operators. It talks to Salon Harness and hides the separate harness admin UIs from hair stylists.
- `apps/liff`: customer booking flow for LINE LIFF.
- `packages/salon-domain`: deterministic booking, pricing, and coupon rules.
- `packages/sdk`: small typed client for integrations.
- `packages/db/schema.sql`: D1 schema.

External harnesses are used only through HTTP APIs:

- line-harness: reservation confirmation and retention messages through `POST /api/friends/:id/messages`.
- ig-harness: campaign creation through `POST /api/engagement-gates`.

UUID linkage is received at `POST /webhook/uuid-link` with `X-Harness-Signature` HMAC.
