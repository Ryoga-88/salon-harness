# Salon Harness

美容師向けの Instagram 集客 → LINE 顧客化 → LIFF 予約 → 自動配信をまとめる OSS MVP です。  
`line-harness-oss` と `ig-harness-oss` は fork せず、Salon Harness から HTTP API で呼び出します。

## いま実装済みの範囲

- Cloudflare Workers API
  - サロン一覧/作成
  - スタイリスト
  - メニュー
  - 営業時間
  - 空き枠
  - 予約作成
  - クーポン
  - 紹介コード
  - カルテの最小 API
  - UUID 連携 webhook
  - line-harness / ig-harness 連携口
- 管理画面
  - 公開トップのサロン検索
  - ダッシュボード
  - 予約一覧
  - サロン作成
  - サロン別スタイリスト登録
  - メニュー作成/一覧
  - スタイリスト別/サロン全体クーポン作成/一覧
  - IG キャンペーン作成
  - LINE メッセージ送信
  - 顧客/分析/設定の最小画面
- LIFF
  - サロン選択
  - スタイリスト選択
  - 希望ヘアスタイル選択
  - メニュー選択
  - クーポン入力
  - 希望日を選んで空き時間候補を表示
  - 予約内容の最終確認
  - 予約完了

未実装:

- 口コミ投稿・閲覧
- スタイル写真ギャラリー
- ポイント機能
- 本番 LINE ID Token 検証
- 決済

## 必要なもの

- Node.js 20 以上
- pnpm
- Cloudflare アカウント
- Wrangler

```bash
pnpm install
```

## ローカルで画面だけ見る

API が未起動でも画面の見た目は確認できます。

```bash
pnpm dev:web
pnpm dev:liff
```

標準 URL:

- 管理画面: `http://localhost:3000/admin`
- 公開サロン検索: `http://localhost:3000`
- LIFF: `http://localhost:5173`
- サロン指定 LIFF: `http://localhost:5173/s/default?friend_id=test_friend_001`

ポートが埋まっている場合:

```bash
cd apps/web
pnpm dev --port 3001
```

## Worker API を動かす

### 1. D1 と R2 を作る

```bash
npx wrangler d1 create salon-harness
```

`apps/worker/wrangler.toml` の `database_id` を、D1 作成時に表示された ID に置き換えます。binding 名はコード側が `DB` を見ているので、Cloudflare が表示する例の `salon_harness` ではなく `DB` のままにしてください。

```toml
[[d1_databases]]
binding = "DB"
database_name = "salon-harness"
database_id = "ここを置き換える"
```

R2 はカルテ写真アップロード用です。予約機能だけ試す場合は不要です。Cloudflare Dashboard で R2 を有効化してから、必要になったタイミングで作成してください。

```bash
npx wrangler r2 bucket create salon-harness-photos
```

作成できたら `apps/worker/wrangler.toml` の R2 block を uncomment します。

### 2. ローカル用 env を作る

```bash
cp apps/worker/.dev.vars.example apps/worker/.dev.vars
cp apps/web/.env.example apps/web/.env.local
cp apps/liff/.env.example apps/liff/.env.local
```

LIFF は Worker API を直接呼ぶため `VITE_API_KEY` が必要です。管理画面ログインはメールアドレス+パスワード、Google、LINE を使います。

```bash
# apps/worker/.dev.vars
API_KEY=dev-secret
CROSS_HARNESS_SECRET=dev-cross-secret

# apps/liff/.env.local
VITE_API_URL=http://localhost:8787
VITE_API_KEY=dev-secret

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_LIFF_URL=http://localhost:5173
```

Google / LINE 管理者ログインをローカルで試す場合は、`apps/worker/.dev.vars` に以下も追加します。

```bash
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
LINE_LOGIN_CHANNEL_ID=...
LINE_LOGIN_CHANNEL_SECRET=...
```

### 3. DB スキーマを入れる

```bash
pnpm db:migrate:local
```

### 4. 初期サロンを作る

最初の確認は seed コマンドで入れるのが簡単です。管理画面の `設定` からサロン追加・編集もできます。

```bash
pnpm db:seed:local
```

root から `npx wrangler d1 execute ...` を直接実行する場合は、config の場所を指定してください。

```bash
npx wrangler d1 execute salon-harness \
  --config apps/worker/wrangler.toml \
  --local \
  --command "INSERT OR IGNORE INTO salons (id, name, business_type, timezone, theme_color, is_active, created_at, updated_at)
VALUES ('default', 'Demo Salon', 'freelance', 'Asia/Tokyo', '#0f766e', 1, datetime('now'), datetime('now'));"
```

### 5. Worker を起動する

```bash
pnpm dev:worker
```

Worker は通常 `http://localhost:8787` で起動します。

## 最初の予約テスト手順

### 1. 管理画面にログイン

`/login` を開き、seed で作成されたオーナーのメールアドレスとパスワードでログインします。Google / LINE ログインを使う場合は、外部アカウントのメールアドレスが `staff_users.email` と一致している必要があります。

```text
owner@example.salon
```

### 2. スタイリストを登録

管理画面の `設定` で必要なサロンを作り、`スタイリスト` から所属サロンを選んで登録します。

### 3. 営業時間を登録

まだ UI がないので API で登録します。`STYLIST_ID` は管理画面や API レスポンスの ID に置き換えてください。

```bash
curl -X PUT http://localhost:8787/api/stylists/STYLIST_ID/business-hours \
  -H "Authorization: Bearer dev-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "hours": [
      { "day_of_week": 0, "open_time": "10:00", "close_time": "19:00", "is_closed": true },
      { "day_of_week": 1, "open_time": "10:00", "close_time": "19:00" },
      { "day_of_week": 2, "open_time": "10:00", "close_time": "19:00" },
      { "day_of_week": 3, "open_time": "10:00", "close_time": "19:00" },
      { "day_of_week": 4, "open_time": "10:00", "close_time": "19:00" },
      { "day_of_week": 5, "open_time": "10:00", "close_time": "19:00" },
      { "day_of_week": 6, "open_time": "10:00", "close_time": "19:00" }
    ]
  }'
```

### 4. メニューを登録

管理画面の `メニュー` から登録できます。API で入れる場合は以下です。

```bash
curl -X POST http://localhost:8787/api/menus \
  -H "Authorization: Bearer dev-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "stylist_id": "STYLIST_ID",
    "name": "カット",
    "category": "cut",
    "duration_min": 60,
    "price": 6600,
    "description": "シャンプー・ブロー込み"
  }'
```

### 5. LIFF で予約する

```text
http://localhost:5173/?friend_id=test_friend_001
```

サロンIDを直接指定する場合:

```text
http://localhost:5173/s/default?friend_id=test_friend_001
```

サロン選択 → スタイリスト/ヘアスタイル/メニュー/クーポン → 希望日 → 空き時間 → 最終確認 → 予約確定まで進めます。

### 6. 管理画面で予約を確認する

```text
http://localhost:3000/reservations
```

本番の場合は、Vercel の管理画面 URL の `/reservations` です。

## `TypeError: Failed to fetch` が出る場合

これは LIFF から Worker API に接続できていない時に出ます。

よくある原因:

- `pnpm dev:worker` が起動していない
- `VITE_API_URL` が間違っている
- `VITE_API_KEY` が Worker の `API_KEY` と違う
- LINE 実機 LIFF なのに `VITE_API_URL=http://localhost:8787` のまま

`GET /api/stylists 401 Unauthorized` が Worker ログに出る場合は、ほぼ `apps/worker/.dev.vars` と `apps/liff/.env.local` の API key 不一致です。変更後は Worker と LIFF dev server を再起動してください。

ローカルの最低設定:

```bash
# apps/worker/.dev.vars
API_KEY=dev-secret
CROSS_HARNESS_SECRET=dev-cross-secret
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:5173,http://localhost:5174

# apps/liff/.env.local
VITE_API_URL=http://localhost:8787
VITE_API_KEY=dev-secret
```

接続確認:

```bash
curl -H "Authorization: Bearer dev-secret" http://localhost:8787/api/stylists
```

`{"success":true,"data":[]}` のように返れば接続できています。

## dev server が残っている場合

`Unable to acquire lock ... .next/dev/lock` は、前に起動した Next dev server が残っている状態です。別ターミナルで `Ctrl+C` するか、該当 PID を終了してください。

確認:

```bash
lsof -nP -iTCP:3000 -iTCP:3001 -iTCP:3002 -iTCP:3003 -iTCP:5173 -iTCP:5174 -sTCP:LISTEN
```

終了例:

```bash
kill <PID>
```

LINE アプリ上で確認する場合、`localhost` は使えません。Cloudflare に Worker を deploy して、LIFF 側には HTTPS の Worker URL を入れてください。

```bash
# apps/liff/.env.local または本番環境変数
VITE_API_URL=https://your-salon-harness-worker.your-subdomain.workers.dev
VITE_API_KEY=本番のAPI_KEY
```

## line-harness / ig-harness 連携

詳しくは [docs/INTEGRATION.md](docs/INTEGRATION.md) を見てください。

- 予約確定 DM は line-harness の `POST /api/friends/:id/messages` を呼びます。
- IG キャンペーンは ig-harness の `POST /api/engagement-gates` を呼びます。
- UUID 連携は `POST /webhook/uuid-link` で受けます。
- 管理画面の `設定` でサロン全体、または美容師個人ごとの LINE / Instagram 接続を保存できます。美容師個人の接続があればそちらを優先し、未設定ならサロン全体の接続を使います。

## デプロイ

推奨構成:

- Worker API: Cloudflare Workers
- LIFF: Vercel または Cloudflare Pages
- 管理画面: Vercel

Vercel を使う場合は、同じ GitHub repo から 2 つの Project を作ります。

- `salon-harness-liff`: Root Directory `apps/liff`
- `salon-harness-web`: Root Directory `apps/web`

SaaS としてはアプリ自体は1つずつで、サロンごとに別デプロイはしません。サロンごとの入口は `https://salon-harness-liff.vercel.app/s/default` のように URL の `/s/{salon_id}` で分けます。

### 1. Worker を初回デプロイ

まず Cloudflare secrets を入れます。

```bash
npx wrangler secret put API_KEY --config apps/worker/wrangler.toml
npx wrangler secret put CROSS_HARNESS_SECRET --config apps/worker/wrangler.toml
npx wrangler secret put LINE_HARNESS_API_URL --config apps/worker/wrangler.toml
npx wrangler secret put LINE_HARNESS_API_KEY --config apps/worker/wrangler.toml
npx wrangler secret put IG_HARNESS_API_URL --config apps/worker/wrangler.toml
npx wrangler secret put IG_HARNESS_API_KEY --config apps/worker/wrangler.toml
npx wrangler secret put GOOGLE_OAUTH_CLIENT_ID --config apps/worker/wrangler.toml
npx wrangler secret put GOOGLE_OAUTH_CLIENT_SECRET --config apps/worker/wrangler.toml
npx wrangler secret put LINE_LOGIN_CHANNEL_ID --config apps/worker/wrangler.toml
npx wrangler secret put LINE_LOGIN_CHANNEL_SECRET --config apps/worker/wrangler.toml
```

まだ line-harness / ig-harness を繋がない場合、URL と API key は仮値でも Worker 自体は動きます。ただし予約確認 DM と IG キャンペーン作成は動きません。

remote DB に schema を入れます。

```bash
pnpm db:migrate
```

初期サロンを remote DB に入れる場合:

```bash
npx wrangler d1 execute salon-harness \
  --config apps/worker/wrangler.toml \
  --remote \
  --command "INSERT OR IGNORE INTO salons (id, name, business_type, timezone, theme_color, is_active, created_at, updated_at)
VALUES ('default', 'Demo Salon', 'freelance', 'Asia/Tokyo', '#0f766e', 1, datetime('now'), datetime('now'));"
```

Worker deploy:

```bash
pnpm deploy:worker
```

デプロイ後の URL はだいたい以下の形です。

```text
https://salon-harness-worker.<your-subdomain>.workers.dev
```

### 2. LIFF を Cloudflare Pages にデプロイ

初回だけ Pages project を作ります。

```bash
npx wrangler pages project create salon-harness-liff --production-branch main
```

LIFF の本番 build には Worker URL と API key が必要です。

```bash
cd apps/liff
VITE_API_URL=https://salon-harness-worker.<your-subdomain>.workers.dev \
VITE_API_KEY=<API_KEY> \
pnpm build
cd ../..
```

deploy:

```bash
npx wrangler pages deploy apps/liff/dist --project-name salon-harness-liff --branch main
```

出てきた Pages URL を LINE Developers Console の LIFF endpoint URL に設定します。

### 3. LIFF を Vercel にデプロイする場合

Vercel で GitHub repository を import します。

設定:

```text
Framework Preset: Vite
Root Directory: apps/liff
Build Command: pnpm build
Output Directory: dist
Install Command: pnpm install
```

Environment Variables:

```bash
VITE_API_URL=https://salon-harness-worker.<your-subdomain>.workers.dev
VITE_API_KEY=Workerに入れたAPI_KEYと同じ値
```

確認 URL:

```text
https://salon-harness-liff.vercel.app/s/default?friend_id=test_friend_001
```

### 4. 管理画面を Vercel にデプロイ

Vercel で GitHub repository を import します。

設定:

```text
Framework Preset: Next.js
Root Directory: apps/web
Build Command: pnpm build
Output Directory: .next
Install Command: pnpm install
```

Environment Variables:

```bash
NEXT_PUBLIC_API_URL=https://salon-harness-worker.<your-subdomain>.workers.dev
NEXT_PUBLIC_LIFF_URL=https://salon-harness-liff.vercel.app
```

管理画面のログインはメールアドレス+パスワード、Google、LINE です。Google / LINE は `staff_users.email` と外部アカウントのメールアドレスが一致するスタッフだけログインできます。

OAuth callback URL:

```text
Google: https://salon-harness-worker.<your-subdomain>.workers.dev/api/auth/oauth/google/callback
LINE:   https://salon-harness-worker.<your-subdomain>.workers.dev/api/auth/oauth/line/callback
```

確認 URL:

```text
https://salon-harness-web.vercel.app/reservations
```

### 5. GitHub push で自動デプロイ

この repo には GitHub Actions を追加済みです。

- `.github/workflows/check.yml`
  - PR と main 以外の push で `typecheck / test / build`
- `.github/workflows/deploy-worker.yml`
  - main push で Worker deploy
- `.github/workflows/deploy-liff.yml`
  - main push で LIFF を Cloudflare Pages deploy

GitHub repository の Settings → Secrets and variables → Actions に以下を登録してください。

```bash
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
LIFF_API_URL
LIFF_API_KEY
```

`LIFF_API_URL` は Worker の本番 URL、`LIFF_API_KEY` は Worker secret の `API_KEY` と同じ値です。

Cloudflare API token には最低限以下が必要です。

- Workers Scripts: Edit
- D1: Edit
- Cloudflare Pages: Edit
- Account: Read

Vercel は GitHub 連携を使えば、main push で自動デプロイされます。Vercel 側で `Root Directory = apps/web` と `NEXT_PUBLIC_API_URL` だけ設定してください。

## よく使うコマンド

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm dev:worker
pnpm dev:web
pnpm dev:liff
```

## ディレクトリ構成

```text
apps/
  worker/  Cloudflare Workers API
  web/     管理画面
  liff/    顧客向け LIFF 予約画面
packages/
  db/            D1 schema
  salon-domain/ 予約・空き枠・クーポン計算
  sdk/           API client
  shared/        型定義
docs/
  SETUP.md
  API.md
  ARCHITECTURE.md
  INTEGRATION.md
```
