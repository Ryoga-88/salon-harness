# 受け入れテスト計画

「管理画面で入力 → DB に保存 → 管理画面と LIFF の双方が同じ DB を参照して表示」を満たすことを目標にしたテスト項目。
このドキュメントの全項目が通る状態を実装ゴールとし、未通過の項目があるたびに DB / API / UI のどこを直すかの起点にする。

---

## 0. 事前準備（環境セットアップ）

| # | 内容 | 確認方法 |
|---|---|---|
| 0-1 | D1 マイグレーション適用後、全テーブルが空で存在 | `pnpm db:migrate:local` 後 sqlite で `.schema` |
| 0-2 | Worker secrets 設定済み（`API_KEY` `CROSS_HARNESS_SECRET` `LINE_HARNESS_API_*` `IG_HARNESS_API_*`、OAuth を使う場合は `GOOGLE_OAUTH_*` / `LINE_LOGIN_*`） | `wrangler secret list` |
| 0-3 | Web `.env` に `NEXT_PUBLIC_API_URL` が Worker を指す | `/admin` 表示で 401 にならない |
| 0-4 | LIFF `.env` に `VITE_API_URL` が同じ Worker を指す | サロン一覧が読める |
| 0-5 | 初期オーナーアカウント（`staff_users`）を 1 件 SQL で投入 | `/login` でメール+パスワードログインできる |

---

## 1. 認証 / 権限

| # | テスト | 期待 |
|---|---|---|
| 1-1 | `/login` でメール+パスワード送信 | `salon_session` を localStorage に保存し `/admin` に遷移 |
| 1-2 | `/login` で Google または LINE ログイン | `staff_users.email` と一致する場合 `salon_session` を保存し `/admin` に遷移 |
| 1-3 | 未ログイン状態で `/admin` に直接アクセス | middleware で `/login` にリダイレクト（要追加実装） |
| 1-4 | 別サロンのスタッフセッションで `/api/reservations` 等を叩く | 自サロンのデータしか返ってこない（multi-tenant 分離） |
| 1-5 | role=stylist のセッションで `/api/reservations` GET | `linked_stylist_id` の予約のみ返る |
| 1-6 | role=stylist のセッションで `/api/campaigns/from-template` POST | 403（`requireRole(['owner','editor'])`） |

---

## 2. サロン（settings）

| # | テスト | 期待 |
|---|---|---|
| 2-1 | `/settings` でサロン作成（id, name, business_type, theme_color） | DB の `salons` に行が増える |
| 2-2 | `/settings` を再読込 | 作成したサロンが連携済みリストに表示 |
| 2-3 | LIFF を開く | サロン選択画面に新サロンが出る |
| 2-4 | サロンを非表示（`is_active=0`）に更新 | LIFF のサロン一覧から消える |

---

## 3. スタイリスト

| # | テスト | 期待 |
|---|---|---|
| 3-1 | `/stylists` でスタイリスト作成（name, display_name, email, bio） | `stylists` に行が増え、ロスター一覧に表示 |
| 3-2 | LIFF で「スタイリスト指名」フローに入る | 作成したスタイリストが選択肢に出る |
| 3-3 | スタイリストの `business_hours` を SQL で投入 | `/api/reservations/availability` が時間枠を返す |
| 3-4 | スタイリストを `is_active=0` に更新 | LIFF と空き時間 API から除外される |
| 3-5 | `/settings` で美容師個人の LINE / Instagram 接続を作成 | `channel_connections` に `scope=stylist` で保存される |
| 3-6 | `/api/channel-connections/resolve` に `salon_id` + `stylist_id` + `provider` を指定 | 個人接続があればそれを返し、なければサロン全体接続を返す |

---

## 4. メニュー

| # | テスト | 期待 |
|---|---|---|
| 4-1 | `/menus` でメニュー作成（stylist 紐付け、price, duration_min） | DB の `menus` に行が増え、メニュー一覧に表示 |
| 4-2 | LIFF で「メニューから選ぶ」フローに入る | 該当サロンのメニューが価格・所要時間付きで出る |
| 4-3 | LIFF でメニューを複数選択 → 確認画面 | 合計金額 = sum(price)、所要時間 = sum(duration_min) |
| 4-4 | メニューを `is_active=0` に更新 | LIFF の選択肢から消える |

---

## 5. クーポン

| # | テスト | 期待 |
|---|---|---|
| 5-1 | `/coupons` でクーポン作成（code, type=percentage/amount, valid_from/until, applicable_menu_ids） | `coupons` に行が増える |
| 5-2 | LIFF でクーポンコードを入力して「適用」 | バリデーション通過、選択メニューに割引適用 |
| 5-3 | 期限切れクーポン適用 | エラー（`coupon expired` 等） |
| 5-4 | `usage_limit_per_user=1` のクーポンを同じ friend_id で 2 回使用 | 2 回目はエラー |
| 5-5 | LIFF からクーポン適用予約を作成 | `coupons.used_count` がインクリメント、`coupon_usages` に履歴 |
| 5-6 | `/admin` のクーポン KPI と `/coupons` 一覧 | 使用数が反映 |
| 5-7 | `display_in_liff=0` のクーポンを LIFF で `/api/coupons?stylist_id=...` で取得 | 一覧に出ない |

---

## 6. キャンペーン（IG Engagement Gate）

| # | テスト | 期待 |
|---|---|---|
| 6-1 | `/campaigns` でテンプレ選択 → LINE add URL + クーポンコードで作成 | `IG_HARNESS_API_URL/api/engagement-gates` への POST が成功 |
| 6-2 | IG Harness 側で gate が active で登録されていることを確認 | reward_url に `?ref=ig_xxx&coupon=YYY` が付与 |
| 6-3 | IG_HARNESS_API_URL 未設定で作成 | 400 `IG harness is not configured` |

---

## 7. 統合 UUID（identity_links）

| # | テスト | 期待 |
|---|---|---|
| 7-1 | LINE Harness が `POST /webhook/uuid-link` を正しい HMAC で送信 | `identity_links` に行が増える、`linked: true` 返却 |
| 7-2 | 同一 (source, external_id) で再送 | UPSERT で uuid と metadata だけ更新（重複行が増えない） |
| 7-3 | 不正な署名で送信 | 401 `invalid signature` |
| 7-4 | IG 側からも uuid-link が届く（同じ uuid で） | LINE と IG の external_id が同じ uuid に紐付く |
| 7-5 | `/admin` の「統合済みチャネル」KPI と `/analytics` のファネル | identity_links 件数 / IG↔LINE 統合数が反映 |
| 7-6 | `/customers/[friendId]` を開く | `identity_links` に登録された IG / LINE 双方が表示 |

---

## 8. 予約（LIFF → 管理画面の双方向確認）

| # | テスト | 期待 |
|---|---|---|
| 8-1 | LIFF からスタイリスト指定で予約作成 | `reservations` に `status='confirmed'` で行が増える |
| 8-2 | LIFF からスタイリスト未指定（サロンお任せ）で予約 | 空いてるスタイリストが自動割当 |
| 8-3 | 同じ枠を 2 セッションから同時に予約 | 1 件のみ成功、もう 1 件は 409 `reservation_conflict` |
| 8-4 | LIFF で予約後、`/reservations` を開く | 即座にリストに表示 |
| 8-5 | `/customers/[friendId]` を開く | タイムラインに reservation.created が出る |
| 8-6 | LIFF 予約直後に LINE 確認メッセージが届く | LINE Harness 経由で送信されたか確認 |
| 8-7 | クーポン付き予約 | `total_price = price - discount`、`coupon_usages` に履歴 |
| 8-8 | `/reservations` で予約をキャンセル（`/api/reservations/:id/cancel`） | `status='cancelled'` で更新、LIFF 履歴にも反映 |
| 8-9 | `/reservations` で予約を完了（`/api/reservations/:id/complete`） | `status='completed'`、`automation_jobs` に `post_visit_thanks` ジョブが投入 |

---

## 9. 自動化・リマインド（Cron）

| # | テスト | 期待 |
|---|---|---|
| 9-1 | 翌日の予約があり `reminder_sent_at IS NULL` の状態で `reminderPreVisit` 実行 | LINE メッセージ送信、`reminder_sent_at` が埋まる |
| 9-2 | 同じ Cron を 2 回起動 | 2 回目は対象 0 件（reminder_sent_at が既に埋まっている） |
| 9-3 | 予約作成時に `automation_jobs` に `pre_visit_reminder` (前日 9:00) と `repeat_promotion_4w` (28 日後 9:00) が pending で入る | `SELECT * FROM automation_jobs WHERE status='pending'` で確認 |
| 9-4 | scheduled_at 到来後に `processAutomationJobs` 実行 | LINE 送信成功 → `status='executed'`、失敗 → `status='failed'` + `error_message` |
| 9-5 | 予約完了から 3 時間後の `post_visit_thanks` ジョブ | LINE 送信される |

---

## 10. 顧客タイムライン（Web から DB 直読）

| # | テスト | 期待 |
|---|---|---|
| 10-1 | `/customers` 一覧 | LIFF からの予約者全員が friend_id 単位で出る |
| 10-2 | `/customers/[friendId]` 開く | 予約・クーポン使用・identity_links が時系列に出る |
| 10-3 | カルテ追加（`/api/kartes` POST） | タイムラインに karte イベントが追加 |

---

## 11. 分析（Web の集計が DB と一致）

| # | テスト | 期待 |
|---|---|---|
| 11-1 | `/analytics` のファネル各段の数値 | `SELECT count` で出る生値と一致 |
| 11-2 | `/admin` の KPI（今日の予約・週売上・統合 UUID・クーポン使用） | 該当の SQL 集計と一致 |

---

## 12. クリーンアップ確認

| # | テスト | 期待 |
|---|---|---|
| 12-1 | Web `/` にアクセス | `/login` に 307 リダイレクト（Web のサロン公開トップは廃止） |
| 12-2 | Web の `/s/anything` にアクセス | 404（旧リダイレクトハンドラは削除済み） |
| 12-3 | LIFF の `/s/{salonId}` にアクセス | LIFF 単独で予約フローが動く |
| 12-4 | 管理画面のサイドバーリンクを順に踏む | 全 11 ページが描画される |

---

## E2E ユーザーフロー（最終受け入れテスト）

「Instagram コメント → 自動 DM → LINE 登録 → LINE で予約 →（次回から）クーポン・リマインド」を 1 本通すシナリオ。

1. **管理者**：`/login` ログイン → `/settings` でサロン作成 → `/stylists` でスタイリスト作成 → `/menus` で 2-3 件作成 → `/coupons` で 1 件発行（IG 限定、コード `IG30`）
2. **管理者**：`/campaigns` で「カラーキャンペーン」テンプレ選択、LINE add URL と coupon=`IG30` を指定して作成
3. **IG（テスト）**：対象投稿に「カラー」とコメント → IG Harness が DM、reward URL に LINE 追加リンク
4. **LINE（テスト）**：LINE 公式を友だち追加、Webhook が `identity_links` に登録
5. **LIFF**：reward URL からアクセス → サロン → スタイリスト → メニュー選択 → クーポン `IG30` 適用 → 日時 → 予約確定
6. **DB**：`reservations` に行、`coupon_usages` に行、`automation_jobs` に `pre_visit_reminder` と `repeat_promotion_4w`
7. **LINE**：予約確認メッセージが即届く
8. **管理者**：`/reservations` `/customers/{friend_id}` `/admin` `/analytics` 全てに反映されている
9. **Cron 実行**（前日 9:00 相当）：LINE にリマインド配信
10. **管理者**：予約を `complete` に更新 → `automation_jobs` に `post_visit_thanks` 追加 → Cron 実行で「ありがとう」LINE 配信
11. **28 日後**：`repeat_promotion_4w` が発火、LINE で再来店促進

このシナリオが通れば「管理画面で入力 → DB → LIFF と管理画面双方で参照」「IG → LINE → 予約 → クーポン・リマインド」の両方が満たされたことの最終確認になる。

---

## 本テストを完遂するために追加で必要な実装

現状の構成では下記が未実装のため、テストの一部が Web 経由で実行できない。これらを着手することで全項目を Web UI から検証可能になる。

### A. 管理者 Web の CRUD フォーム再構築
デザイン HTML 優先で各ページから一旦削除した作成・編集 UI。API は Worker 側に揃っているので、UI を当てるだけで動く。

- `/settings` のサロン作成・編集モーダル → テスト 2-1, 2-4 を Web 経由で実行可
- `/stylists` のスタイリスト作成・編集ドロワー → テスト 3-1, 3-4
- `/menus` のメニュー作成・編集ドロワー → テスト 4-1, 4-4
- `/coupons` のクーポン作成モーダル → テスト 5-1
- 各画面の「削除／無効化」ボタンの実装

### B. 認証ガード
`apps/web/middleware.ts` を追加し、`salon_session` Cookie がない状態で `/admin` 配下にアクセスしたら `/login` に飛ばす。

- middleware は server で localStorage が読めないため、ログイン時にセッションを Cookie に同期保存する変更が必要
- → テスト 1-3

### C. シードデータ投入スクリプト
`packages/db/seed.sql` を用意し、テスト用に最小データセット（サロン 1 / スタイリスト 1 / メニュー 3 / 営業時間 / オーナーアカウント）を一発投入できるようにする。

- 反復テスト時のリセット → 再現性確保
- E2E シナリオの開始点を固定化

### D. 自動化テストの仕掛け（任意）
- Worker 側：`apps/worker/src/__tests__/` に vitest で routes と cron の単体テストを追加
- Web 側：Playwright で `/login → /admin → /reservations` の最低限の遷移テスト
- LIFF 側：予約フロー 1 本の Playwright テスト

このうち少なくとも A と C は本受け入れテストの実行に必須。B は本番運用前に必要。D は後追いで構わない。
