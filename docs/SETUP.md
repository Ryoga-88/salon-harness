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

管理者ログインで Google / LINE を使う場合は、追加で以下を設定します。

```bash
npx wrangler secret put GOOGLE_OAUTH_CLIENT_ID
npx wrangler secret put GOOGLE_OAUTH_CLIENT_SECRET
npx wrangler secret put LINE_LOGIN_CHANNEL_ID
npx wrangler secret put LINE_LOGIN_CHANNEL_SECRET
```

OAuth 側のコールバック URL は Worker の URL に合わせます。

- Google: `https://<worker-domain>/api/auth/oauth/google/callback`
- LINE: `https://<worker-domain>/api/auth/oauth/line/callback`
- ローカル: `http://localhost:8787/api/auth/oauth/google/callback` / `http://localhost:8787/api/auth/oauth/line/callback`

Google / LINE ログインは `staff_users.email` と外部アカウントのメールアドレスが一致するスタッフだけを許可します。LINE は LINE Login チャネルで email 権限を有効にしてください。

## 5. Local development

```bash
pnpm dev:worker
pnpm dev:web
pnpm dev:liff
```

The web and LIFF apps call the Worker through `NEXT_PUBLIC_API_URL` and `VITE_API_URL`.

## Vercel（管理者 Web と LIFF を別プロジェクトでデプロイ）

- **管理者 Web**（例: `salon-harness-web`）は `/login` → `/admin` 配下のみ。
- **LIFF**（例: `salon-harness-liff`）は LINE 友だち向けの予約フローを `/s/:salonId` で受け持つ。
- 両者は同じ Worker API（`NEXT_PUBLIC_API_URL` / `VITE_API_URL`）を参照するため **DB は共通**。
- 管理者 Web と LIFF は独立した Vercel プロジェクトとしてデプロイし、URL は相互に**自動遷移しない**。LINE 共有用に LIFF の絶対 URL を表示したい場合は、管理画面の設定からテキストとして提示する。
