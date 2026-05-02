# Setup

## 1. Install

```bash
pnpm install
```

## 2. Cloudflare resources

```bash
npx wrangler d1 create salon-harness
npx wrangler r2 bucket create salon-harness-photos
```

Set the generated D1 `database_id` in `apps/worker/wrangler.toml`.

## 3. Apply schema

```bash
pnpm db:migrate:local
```

## 4. Worker secrets

```bash
npx wrangler secret put API_KEY
npx wrangler secret put CROSS_HARNESS_SECRET
npx wrangler secret put LINE_HARNESS_API_URL
npx wrangler secret put LINE_HARNESS_API_KEY
npx wrangler secret put IG_HARNESS_API_URL
npx wrangler secret put IG_HARNESS_API_KEY
```

## 5. Local development

```bash
pnpm dev:worker
pnpm dev:web
pnpm dev:liff
```

The web and LIFF apps call the Worker through `NEXT_PUBLIC_API_URL` and `VITE_API_URL`.
