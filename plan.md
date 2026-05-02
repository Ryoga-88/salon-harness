# Salon Harness MVP 仕様書

> **目的**: 美容師（特にフリーランス・シェアサロン勢）が HPB を介さずに、Instagram からの集客 → LINE 上で顧客化 → LIFF で予約 → 自動リテンション までを完結できるオープンソース型サービス。
>
> **位置づけ**: line-harness-oss と ig-harness-oss を基盤として、美容師ドメインの薄いレイヤーを乗せる。

---

## 0. プロジェクト概要

### 0.1 解決する課題

美容師（特にフリーランス）の集客・運用には以下の構造的課題がある:

| 課題              | 既存解                         | 既存解の問題                   |
| ----------------- | ------------------------------ | ------------------------------ |
| 新規集客          | HPB 月4〜10万円                | 高コスト・手数料・データ非所有 |
| 予約管理          | HPB / minimo / LINE 手動       | 媒体間でダブルブッキング       |
| カルテ・履歴管理  | LiME / 紙                      | 機能はあるが集客と分断         |
| リピート促進      | LINE 公式 + L ステップ月数万円 | コスト高・データロックイン     |
| IG → 予約への導線 | ManyChat 月$15+                | 英語UI・LINE連携弱い           |

### 0.2 本サービスの解

**1つのプロジェクト内で IG 集客 → LINE 顧客化 → LIFF 予約 → カルテ → リテンション まで完結**。OSS（MIT）として公開し、Cloudflare 上にセルフホストすれば月額数百円〜運用可能。

### 0.3 ターゲットユーザー

- フリーランス美容師（シェアサロン勤務含む）
- 個人サロンオーナー（〜2席規模）
- HPB 解約 or 依存軽減を検討中の美容師
- 月の指名客 30〜200人レベル

### 0.4 成功指標（MVP）

- 1サロンが HPB を解約しても集客が維持できること
- 予約のダブルブッキング発生率 0
- 来店後 30日以内のリピート率 50% 以上
- 1サロン辺りの月額運用コスト 1,000円以下（Cloudflare 課金のみ）

### 0.5 HPB 機能カバレッジ表

**MVP は HPB の予約系コア機能を完全代替し、独自に IG 連携・自動化を上乗せする**ことを目標とする。

| HPB 機能                 | 本サービス対応 | 備考                                 |
| ------------------------ | -------------- | ------------------------------------ |
| ネット予約 24/7          | ✅ MVP         | LIFF で完結                          |
| メニュー選択             | ✅ MVP         | カテゴリ別表示                       |
| 日時選択カレンダー       | ✅ MVP         | 15分刻み・空き枠リアルタイム         |
| **スタイリスト指名予約** | ✅ MVP         | 複数美容師サロン対応                 |
| **クーポン予約**         | ✅ MVP         | 専用クーポン機能（§6.5）             |
| 予約変更・キャンセル     | ✅ MVP         | LIFF から顧客自身で操作可            |
| リマインドメール/SMS     | ✅ MVP         | LINE DM で代替（到達率高い）         |
| 来店履歴                 | ✅ MVP         | LIFF 予約履歴画面                    |
| お気に入りサロン         | ✅ MVP         | LINE 友だち追加 = 事実上のお気に入り |
| 仮予約・空き問い合わせ   | ✅ MVP         | 予約変更フローで対応                 |
| 口コミ投稿・閲覧         | ⚠️ Phase 7     | MVP では Google マップへ誘導         |
| スタイル写真ギャラリー   | ⚠️ Phase 7     | MVP では Instagram で代替            |
| ポイント                 | ❌ なし        | HPB 固有機能（紹介プログラムで代替） |
| 美容クリニック予約       | ❌ なし        | スコープ外                           |
| HPB 内ランキング         | ❌ なし        | 不要（自店内で完結）                 |

**独自上乗せ機能**:

| 機能                         | 既存 SaaS       | 本サービス                                |
| ---------------------------- | --------------- | ----------------------------------------- |
| Instagram コメント→DM 自動化 | ManyChat $15+   | ✅ 標準搭載（ig-harness）                 |
| LINE ステップ配信・自動応答  | L-Step ¥14,800+ | ✅ 標準搭載（line-harness）               |
| IG ↔ LINE 同一ユーザー追跡   | なし            | ✅ UUID クロス連携                        |
| 流入元別 ROI 計測            | なし            | ✅ 投稿単位で予約 CV 可視化               |
| カルテ・施術履歴             | LiME 等         | ✅ 美容師側のみ標準・顧客閲覧はオプション |
| 紹介プログラム               | なし            | ✅ 標準搭載                               |

### 0.6 UI 設計の前提

**重要**: 美容師は line-harness-oss / ig-harness-oss / salon-harness の3つの管理画面を行き来したくない。**salon-harness の管理画面が一本化された窓口となり、内部で line-harness / ig-harness の API を叩いて操作する**設計とする。

```
┌────────────────────────────────────────────┐
│ 美容師（管理画面 = salon-harness web）     │
├────────────────────────────────────────────┤
│  予約・顧客 │ メニュー │ クーポン │       │
│  カルテ    │ キャンペーン │ 設定      │   │
└──────┬──────────────┬──────────┬──────────┘
       │              │          │
       ▼              ▼          ▼
  salon-harness   line-harness  ig-harness
   Workers API    Workers API    Workers API

★line-harness / ig-harness が標準提供する管理画面は
   開発者・上級者向けと位置づけ、美容師には見せない
```

**LIFF（顧客）は salon-harness 独自実装**で、line-harness の `apps/liff/` テンプレを参考にしつつ、サロン業務に特化したフロー・デザインに作り変える。

### 0.7 ユーザーロール

**美容師側（管理画面ユーザー）に3ロールを設ける**:

| ロール    | 権限範囲                                                                 | 想定ユーザー                     |
| --------- | ------------------------------------------------------------------------ | -------------------------------- |
| `owner`   | 全権限：スタッフ追加・削除、決済設定、店舗設定、すべての予約・顧客閲覧   | サロンオーナー、フリーランス本人 |
| `editor`  | メニュー・クーポン・キャンペーン・シナリオ編集、店舗全体の予約閲覧       | 店長、シニアスタイリスト         |
| `stylist` | 自分の予約・自分の顧客カルテ・自分のメニュー・自分のスケジュールのみ管理 | 雇用されたスタイリスト           |

権限マトリクスの詳細は §6.5 参照。

---

## 1. システムアーキテクチャ

### 1.1 全体構成

```
┌──────────────────────────────────────────────────────────┐
│ 流入レイヤー（顧客獲得）                                   │
├──────────────────────────────────────────────────────────┤
│ Instagram (Reel/投稿/Story)                              │
│   ↓ コメント or DM or メンション                         │
│ ┌───────────────────────────────────────┐                │
│ │ ig-harness-oss (CF Workers + D1)      │                │
│ │  - Engagement Gate (フォロー判定)     │                │
│ │  - コメント→DM 配布                  │                │
│ │  - ストーリーメンション→DM           │                │
│ └─────────────┬─────────────────────────┘                │
└───────────────┼──────────────────────────────────────────┘
                │ ★UUID 共有 webhook（built-in）
                ▼
┌──────────────────────────────────────────────────────────┐
│ 顧客化レイヤー（CRM・予約）                                │
├──────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────┐                │
│ │ line-harness-oss (CF Workers + D1)    │                │
│ │  - 友だち管理（IGと同UUIDで統合）     │                │
│ │  - ステップ配信・自動応答             │                │
│ │  - リッチメニュー・タグ                │                │
│ └─────────────┬─────────────────────────┘                │
│               ▼                                           │
│ ┌───────────────────────────────────────┐                │
│ │ ★salon-harness (新規開発 / 本仕様書)  │                │
│ │  - LIFF 予約UI                        │                │
│ │  - 電子カルテ                         │                │
│ │  - メニュー管理                       │                │
│ │  - スタイリスト管理                   │                │
│ │  - 紹介プログラム                     │                │
│ └─────────────┬─────────────────────────┘                │
│               ▼                                           │
│ ┌───────────────────────────────────────┐                │
│ │ Cloudflare D1 (拡張) + R2 (写真)      │                │
│ └───────────────────────────────────────┘                │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ リテンションレイヤー（自動化）                             │
├──────────────────────────────────────────────────────────┤
│ Cloudflare Cron (5分毎)                                  │
│  - 予約前日リマインド                                     │
│  - 来店後御礼DM                                           │
│  - 来店から N 週後 リピート促進                           │
│  - 誕生日・離脱顧客 winback                              │
└──────────────────────────────────────────────────────────┘
```

### 1.2 データフロー（ハッピーパス）

1. 美容師が Instagram にリール投稿（例: ヘアカラー Before/After）
2. 視聴者が動画にコメント「予約」
3. ig-harness-oss の Engagement Gate が起動 → フォロー確認 → 未フォローなら「フォローしてね DM」、フォロー済なら「予約 DM」
4. 予約 DM 内の LINE 友だち追加 URL（`https://line.me/ti/p/@xxx?ref=ig_reel_001`）をクリック
5. LINE 友だち追加 → line-harness-oss が `ref=ig_reel_001` を流入元として記録
6. **同時に ig-harness-oss と line-harness-oss が UUID 共有 webhook で同一ユーザーとして紐付け**
7. ウェルカム DM に「LIFF 予約はこちら」ボタン
8. 顧客が LIFF を開いてメニュー選択 → 日時選択 → 予約確定
9. 予約データが D1 に保存、予約確認 DM が自動送信
10. 前日にリマインド DM、来店後に御礼 DM、4週間後にリピート促進 DM

---

## 2. 技術スタック

| レイヤー            | 技術                         | 理由                                    |
| ------------------- | ---------------------------- | --------------------------------------- |
| ランタイム          | Cloudflare Workers           | 既存ハーネスと統一、低コスト            |
| API フレームワーク  | Hono                         | 既存ハーネスと統一                      |
| DB                  | Cloudflare D1 (SQLite)       | 既存ハーネスと統一                      |
| ファイルストレージ  | Cloudflare R2                | カルテ写真用、低コスト                  |
| 管理画面            | Next.js 15 (App Router)      | 既存ハーネスと統一                      |
| UI                  | Tailwind CSS + shadcn/ui     | スタイル統一・採用率高                  |
| LIFF                | Vite + React                 | line-harness-oss の `apps/liff/` を継承 |
| パッケージ管理      | pnpm                         | 既存ハーネスと統一                      |
| 言語                | TypeScript 5.x               | 既存ハーネスと統一                      |
| デプロイ            | Wrangler / GitHub Actions    | 既存ハーネスと統一                      |
| 決済（Phase 2以降） | Stripe / PayPay for Business | 一旦は店頭精算で OK                     |

**設計原則**:

- 既存の line-harness-oss / ig-harness-oss のコード規約・命名規則・アーキテクチャを完全踏襲する
- 新規開発分は monorepo の追加 package として実装（既存ハーネスを fork せずに extension として動く構造を目指す）

---

## 3. リポジトリ構成

### 3.1 推奨構成（Monorepo として salon-harness を新設）

```
salon-harness/                          # ★新規リポジトリ
├── apps/
│   ├── worker/                          # CF Workers API（予約・カルテ・メニュー）
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes/
│   │   │   │   ├── reservations.ts
│   │   │   │   ├── kartes.ts
│   │   │   │   ├── menus.ts
│   │   │   │   ├── stylists.ts
│   │   │   │   ├── business_hours.ts
│   │   │   │   └── referrals.ts
│   │   │   └── cron/
│   │   │       ├── reminder_pre_visit.ts
│   │   │       ├── thank_you_post_visit.ts
│   │   │       └── repeat_promotion.ts
│   │   └── wrangler.toml
│   │
│   ├── web/                             # Next.js 管理画面（美容師向け）
│   │   ├── app/
│   │   │   ├── dashboard/
│   │   │   ├── reservations/
│   │   │   ├── customers/
│   │   │   ├── kartes/
│   │   │   ├── menus/
│   │   │   ├── campaigns/             # IG Engagement Gate 管理
│   │   │   └── settings/
│   │   └── package.json
│   │
│   └── liff/                            # LIFF 予約UI（顧客向け）
│       ├── src/
│       │   ├── pages/
│       │   │   ├── menu_selection.tsx
│       │   │   ├── datetime_selection.tsx
│       │   │   ├── confirmation.tsx
│       │   │   ├── completion.tsx
│       │   │   ├── history.tsx
│       │   │   └── karte_view.tsx
│       │   └── components/
│       └── package.json
│
├── packages/
│   ├── db/                              # 美容師ドメインスキーマ
│   │   ├── schema.sql
│   │   └── queries/
│   │       ├── reservations.ts
│   │       ├── kartes.ts
│   │       └── menus.ts
│   │
│   ├── sdk/                             # @salon-harness/sdk
│   │   └── src/
│   │
│   ├── salon-domain/                    # 美容師ドメインロジック
│   │   └── src/
│   │       ├── reservation.ts
│   │       ├── availability.ts
│   │       └── pricing.ts
│   │
│   └── shared/                          # 共有型定義
│
├── docs/
│   ├── SETUP.md
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── INTEGRATION.md                   # ig-harness/line-harness との連携手順
│
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

### 3.2 既存ハーネスとの関係

- **line-harness-oss**: 友だち管理・LINE Messaging API・LIFF 基盤を既存のまま使用
- **ig-harness-oss**: IG 集客レイヤーを既存のまま使用
- **salon-harness**: 上記2つを HTTP API 経由で叩いて、美容師ドメイン機能を提供

両ハーネスへの干渉は最小限にする（fork ではなく extension として）。

---

## 4. データベース設計

### 4.1 追加スキーマ（D1 / SQLite）

`packages/db/schema.sql` に以下を追加:

```sql
-- ============================================
-- サロン（マルチテナントの最上位エンティティ）
-- ============================================
CREATE TABLE salons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,                    -- 'サロンA' / フリーランスは個人名
  business_type TEXT NOT NULL,           -- 'freelance' | 'solo_salon' | 'shared_salon' | 'multi_stylist'
  timezone TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  line_official_account_id TEXT,         -- サロン全体で1つの公式アカウント（基本構成）
  ig_business_account_id TEXT,
  theme_color TEXT,                      -- LIFF 表示用テーマカラー
  logo_r2_key TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- ============================================
-- 管理画面ユーザー（=スタッフ）
-- ============================================
CREATE TABLE staff_users (
  id TEXT PRIMARY KEY,
  salon_id TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT,                    -- bcrypt（メール+パスワードログイン）
  role TEXT NOT NULL,                    -- 'owner' | 'editor' | 'stylist'
  linked_stylist_id TEXT,                -- role='stylist' の場合、stylists テーブルの ID
  last_login_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (salon_id) REFERENCES salons(id),
  FOREIGN KEY (linked_stylist_id) REFERENCES stylists(id)
);

CREATE INDEX idx_staff_salon ON staff_users(salon_id, is_active);

-- ============================================
-- セッション（管理画面ログイン用）
-- ============================================
CREATE TABLE staff_sessions (
  id TEXT PRIMARY KEY,                   -- セッショントークン
  staff_user_id TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (staff_user_id) REFERENCES staff_users(id)
);

CREATE INDEX idx_sessions_user ON staff_sessions(staff_user_id);
CREATE INDEX idx_sessions_expires ON staff_sessions(expires_at);

-- ============================================
-- スタイリスト（1サロン複数美容師対応）
-- ============================================
CREATE TABLE stylists (
  id TEXT PRIMARY KEY,
  salon_id TEXT NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  bio TEXT,
  avatar_r2_key TEXT,
  specialties TEXT,                      -- JSON array: ["カラー", "縮毛矯正"]
  is_active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (salon_id) REFERENCES salons(id)
);

CREATE INDEX idx_stylists_salon ON stylists(salon_id, is_active);

-- ============================================
-- メニュー
-- ============================================
CREATE TABLE menus (
  id TEXT PRIMARY KEY,
  stylist_id TEXT NOT NULL,
  name TEXT NOT NULL,                    -- 'カット', 'カラー', '縮毛矯正'
  category TEXT NOT NULL,                -- 'cut' | 'color' | 'perm' | 'treatment' | 'other'
  duration_min INTEGER NOT NULL,
  price INTEGER NOT NULL,                -- 税込
  description TEXT,
  is_first_time_only INTEGER DEFAULT 0,  -- 初回限定メニュー
  is_active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (stylist_id) REFERENCES stylists(id)
);

CREATE INDEX idx_menus_stylist ON menus(stylist_id, is_active);

-- ============================================
-- 営業時間
-- ============================================
CREATE TABLE business_hours (
  id TEXT PRIMARY KEY,
  stylist_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,          -- 0=日曜, 6=土曜
  open_time TEXT NOT NULL,               -- 'HH:MM' 形式
  close_time TEXT NOT NULL,              -- 'HH:MM'
  is_closed INTEGER NOT NULL DEFAULT 0,  -- 定休日フラグ
  FOREIGN KEY (stylist_id) REFERENCES stylists(id),
  UNIQUE(stylist_id, day_of_week)
);

-- ============================================
-- 臨時休業・特別営業日
-- ============================================
CREATE TABLE schedule_overrides (
  id TEXT PRIMARY KEY,
  stylist_id TEXT NOT NULL,
  date TEXT NOT NULL,                    -- 'YYYY-MM-DD'
  is_closed INTEGER NOT NULL DEFAULT 0,
  open_time TEXT,                        -- 特別営業の場合
  close_time TEXT,
  reason TEXT,                           -- '研修', '私用'
  FOREIGN KEY (stylist_id) REFERENCES stylists(id),
  UNIQUE(stylist_id, date)
);

-- ============================================
-- 予約
-- ============================================
CREATE TABLE reservations (
  id TEXT PRIMARY KEY,
  stylist_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,               -- line-harness の friends.id (UUID)
  menu_ids TEXT NOT NULL,                -- JSON array: ["menu_id_1", "menu_id_2"]
  start_at TEXT NOT NULL,                -- ISO8601 (JST)
  end_at TEXT NOT NULL,                  -- ISO8601 (JST)
  total_price INTEGER NOT NULL,          -- 予約時点の合計料金
  status TEXT NOT NULL,                  -- 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  source TEXT,                           -- 'liff' | 'ig_dm' | 'manual' | 'phone'
  customer_note TEXT,                    -- 顧客からの要望
  stylist_note TEXT,                     -- 美容師の私用メモ
  reminder_sent_at TEXT,
  cancelled_at TEXT,
  cancellation_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (stylist_id) REFERENCES stylists(id)
);

CREATE INDEX idx_reservations_stylist_date ON reservations(stylist_id, start_at);
CREATE INDEX idx_reservations_friend ON reservations(friend_id);
CREATE INDEX idx_reservations_status ON reservations(status);

-- ============================================
-- 電子カルテ
-- ============================================
CREATE TABLE kartes (
  id TEXT PRIMARY KEY,
  reservation_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  stylist_id TEXT NOT NULL,
  hair_type TEXT,                        -- '硬毛' | '軟毛' | '普通毛'
  hair_thickness TEXT,                   -- '太い' | '普通' | '細い'
  hair_amount TEXT,                      -- '多い' | '普通' | '少ない'
  scalp_condition TEXT,                  -- '乾燥' | '脂性' | '普通'
  formula TEXT,                          -- 薬剤レシピ JSON
  procedure_note TEXT,                   -- 施術メモ
  next_recommendation TEXT,              -- 次回提案
  recommended_next_visit_date TEXT,      -- 推奨次回来店日 'YYYY-MM-DD'
  before_photo_r2_keys TEXT,             -- JSON array of R2 keys
  after_photo_r2_keys TEXT,              -- JSON array
  is_visible_to_customer INTEGER NOT NULL DEFAULT 0,  -- 顧客LIFFから閲覧可能フラグ
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (reservation_id) REFERENCES reservations(id),
  FOREIGN KEY (stylist_id) REFERENCES stylists(id)
);

CREATE INDEX idx_kartes_friend ON kartes(friend_id, created_at);

-- ============================================
-- 写真メタデータ（R2 上の実体への参照）
-- ============================================
CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL UNIQUE,
  karte_id TEXT,
  type TEXT NOT NULL,                    -- 'before' | 'after' | 'reference'
  width INTEGER,
  height INTEGER,
  size_bytes INTEGER,
  uploaded_by TEXT,                      -- stylist_id
  created_at TEXT NOT NULL,
  FOREIGN KEY (karte_id) REFERENCES kartes(id)
);

-- ============================================
-- 紹介プログラム
-- ============================================
CREATE TABLE referrals (
  id TEXT PRIMARY KEY,
  stylist_id TEXT NOT NULL,
  referrer_friend_id TEXT NOT NULL,      -- 紹介する人
  referrer_code TEXT NOT NULL UNIQUE,    -- 短縮コード（URLに含む）
  referred_friend_id TEXT,               -- 紹介された人（紐付き完了後）
  reward_for_referrer INTEGER,           -- 紹介者への報酬（円）
  reward_for_referred INTEGER,           -- 被紹介者への報酬（円）
  status TEXT NOT NULL,                  -- 'created' | 'used' | 'reward_granted'
  used_at TEXT,
  reward_granted_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (stylist_id) REFERENCES stylists(id)
);

CREATE INDEX idx_referrals_code ON referrals(referrer_code);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_friend_id);

-- ============================================
-- クーポン（HPB 機能代替）
-- ============================================
CREATE TABLE coupons (
  id TEXT PRIMARY KEY,
  stylist_id TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,             -- 'NEW2026', 'WELCOME', 大文字英数字
  name TEXT NOT NULL,                    -- '初回30%OFF', 'カラー¥1,000引き'
  description TEXT,
  type TEXT NOT NULL,                    -- 'percentage' | 'fixed_amount' | 'menu_swap'
  value INTEGER NOT NULL,                -- type=percentage: 30, type=fixed_amount: 1000(円)
  applicable_menu_ids TEXT,              -- JSON array ["menu_001",...] / NULL = 全メニュー対象
  is_first_time_only INTEGER NOT NULL DEFAULT 0,    -- 初回限定フラグ
  min_total_price INTEGER,               -- 最低利用金額（NULL = 制限なし）
  max_discount INTEGER,                  -- 値引き上限額（NULL = 制限なし）
  valid_from TEXT NOT NULL,              -- ISO8601
  valid_until TEXT NOT NULL,
  usage_limit_total INTEGER,             -- 累計使用上限（NULL = 無制限）
  usage_limit_per_user INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  display_in_liff INTEGER NOT NULL DEFAULT 1,  -- LIFFのクーポン一覧に表示するか（限定配布なら 0）
  source TEXT,                           -- 'liff_general' | 'ig_campaign_001' | 'referral' 等
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (stylist_id) REFERENCES stylists(id)
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_stylist_active ON coupons(stylist_id, is_active, valid_until);

-- ============================================
-- クーポン使用履歴
-- ============================================
CREATE TABLE coupon_usages (
  id TEXT PRIMARY KEY,
  coupon_id TEXT NOT NULL,
  reservation_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  discount_applied INTEGER NOT NULL,     -- 実際に適用された値引き額
  used_at TEXT NOT NULL,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id),
  FOREIGN KEY (reservation_id) REFERENCES reservations(id)
);

CREATE INDEX idx_coupon_usages_coupon ON coupon_usages(coupon_id);
CREATE INDEX idx_coupon_usages_friend ON coupon_usages(friend_id, coupon_id);

-- ============================================
-- 予約 → クーポン適用の関連付け（reservations への追加）
-- ============================================
-- 既存の reservations テーブルに以下のカラムを追加:
ALTER TABLE reservations ADD COLUMN applied_coupon_id TEXT;
ALTER TABLE reservations ADD COLUMN discount_amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reservations ADD COLUMN price_before_discount INTEGER;
-- total_price は割引後の最終支払金額として運用

-- ============================================
-- 自動配信ジョブログ（Cron 実行記録）
-- ============================================
CREATE TABLE automation_jobs (
  id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL,                -- 'reminder' | 'thank_you' | 'repeat_promotion' | 'birthday'
  target_friend_id TEXT NOT NULL,
  target_reservation_id TEXT,
  scheduled_at TEXT NOT NULL,
  executed_at TEXT,
  status TEXT NOT NULL,                  -- 'pending' | 'executed' | 'failed' | 'skipped'
  error_message TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_automation_pending ON automation_jobs(status, scheduled_at);
```

### 4.2 既存ハーネスとの結合キー

| 連携先                    | キー                                                                  | 説明                               |
| ------------------------- | --------------------------------------------------------------------- | ---------------------------------- |
| line-harness `friends.id` | `reservations.friend_id`, `kartes.friend_id`, `referrals.*_friend_id` | LINE UUID                          |
| ig-harness `users.id`     | 同 UUID（共有 webhook で紐付け済）                                    | IG ユーザーも同一 friend_id で扱う |

---

## 5. API エンドポイント仕様

すべて `salon-harness/apps/worker` の Hono ルート。認証は API Key（`Authorization: Bearer <key>`）。

### 5.1 メニュー API

```
GET    /api/menus                       メニュー一覧
GET    /api/menus/:id                   メニュー詳細
POST   /api/menus                       メニュー作成
PUT    /api/menus/:id                   メニュー更新
DELETE /api/menus/:id                   メニュー削除（論理削除推奨）
```

POST 例:

```json
{
  "stylist_id": "stylist_001",
  "name": "髪質改善トリートメント",
  "category": "treatment",
  "duration_min": 90,
  "price": 11000,
  "description": "ダメージケア重視のロング向けトリートメント",
  "is_first_time_only": false
}
```

### 5.2 予約 API

```
GET    /api/reservations                              予約一覧（クエリで絞込）
GET    /api/reservations/:id                          予約詳細
GET    /api/reservations/availability                 空き枠取得
POST   /api/reservations                              予約作成（顧客 LIFF から）
PUT    /api/reservations/:id                          予約変更（時間・メニュー）
PUT    /api/reservations/:id/cancel                   予約キャンセル
PUT    /api/reservations/:id/complete                 来店完了マーク
PUT    /api/reservations/:id/no-show                  No-show マーク
```

#### 5.2.1 空き枠取得

```
GET /api/reservations/availability?stylist_id=xxx&date=2026-05-15&menu_ids=m1,m2
```

レスポンス:

```json
{
  "stylist_id": "stylist_001",
  "date": "2026-05-15",
  "total_duration_min": 120,
  "available_slots": [
    {
      "start_at": "2026-05-15T10:00:00+09:00",
      "end_at": "2026-05-15T12:00:00+09:00"
    },
    {
      "start_at": "2026-05-15T13:00:00+09:00",
      "end_at": "2026-05-15T15:00:00+09:00"
    }
  ]
}
```

**実装要件**:

- 営業時間 (`business_hours`) と臨時休業 (`schedule_overrides`) を考慮
- 既存予約とのコンフリクトを除外
- 施術時間 = 選択メニューの `duration_min` 合計
- 開始時刻の刻みは 15分単位
- 当日予約は 2時間後以降のみ受付

#### 5.2.2 予約作成

```
POST /api/reservations
Content-Type: application/json
{
  "stylist_id": "stylist_001",
  "friend_id": "U1234567890abcdef",        // LINE UUID
  "menu_ids": ["menu_001", "menu_002"],
  "start_at": "2026-05-15T10:00:00+09:00",
  "customer_note": "前髪を眉上にしてください"
}
```

レスポンス（201）:

```json
{
  "id": "rsv_xxxxxx",
  "status": "confirmed",
  "start_at": "2026-05-15T10:00:00+09:00",
  "end_at": "2026-05-15T12:00:00+09:00",
  "total_price": 16500,
  "menus": [...]
}
```

**実装要件**:

- 作成成功時、line-harness-oss の API を呼び出して **予約確認 DM を即時送信**
- 同時に `automation_jobs` に「前日リマインド」「来店後御礼」「4週間後リピート促進」を予約登録
- 二重予約はトランザクションで防ぐ（D1 トランザクション）

### 5.3 カルテ API

```
GET    /api/kartes?friend_id=xxx                    特定顧客のカルテ履歴
GET    /api/kartes/:id                              カルテ詳細
POST   /api/kartes                                  カルテ作成
PUT    /api/kartes/:id                              カルテ更新
POST   /api/kartes/:id/photos                       写真アップロード（R2 直アップロード URL 発行）
DELETE /api/kartes/:id/photos/:photoId              写真削除
```

#### 5.3.1 写真アップロード URL 発行

```
POST /api/kartes/:id/photos
{
  "type": "after",
  "filename": "cut_after.jpg",
  "content_type": "image/jpeg"
}
```

レスポンス:

```json
{
  "photo_id": "photo_xxx",
  "upload_url": "https://salon-harness-photos.r2.cloudflarestorage.com/...",
  "expires_at": "2026-05-15T11:30:00Z"
}
```

クライアントは `upload_url` に直接 PUT で R2 にアップロード（Worker 経由しない、ペイロード削減）。

### 5.4 スタイリスト API

```
GET    /api/stylists                                一覧（顧客 LIFF 用 = is_active のみ）
GET    /api/stylists/:id                            詳細
POST   /api/stylists                                作成
PUT    /api/stylists/:id                            更新
GET    /api/stylists/:id/business-hours             営業時間取得
PUT    /api/stylists/:id/business-hours             営業時間一括更新
POST   /api/stylists/:id/schedule-override          臨時休業/特別営業登録
GET    /api/stylists/:id/menus                      指定スタイリストのメニュー一覧
```

**スタイリスト指名予約フロー**:

- LIFF の最初の画面で `GET /api/stylists` を呼び、複数いる場合のみスタイリスト選択画面を表示
- 1人だけなら自動でその美容師を選択し、メニュー選択へスキップ
- 選択したスタイリストの `id` 以降のすべてのリクエスト（メニュー取得・空き枠取得・予約作成）に付与

### 5.5 クーポン API

**設計方針**: クーポンは **IG/SNS で配布されたコードを LIFF で手入力する** のが主導線。理由:

- IG → LINE → LIFF の流れで、コードを覚えてもらう/コピーしてもらう動線が一番自然
- 限定配布感が出やすい（晒されたら使われる前提なので、`usage_limit_total` で総量管理）
- 美容師側は LIFF クーポン一覧（`display_in_liff=1`）に常時掲載するパブリッククーポンと、IG 配布等の限定コードを使い分けられる

```
GET    /api/coupons?stylist_id=xxx&friend_id=xxx     LIFF 一覧表示用（display_in_liff=1 のもの）
GET    /api/coupons/code/:code                       コード照会（顧客の手入力用）★メイン導線
POST   /api/coupons/validate                         予約確定前の適用可否チェック
POST   /api/coupons                                  クーポン作成（管理画面）
PUT    /api/coupons/:id                              更新
DELETE /api/coupons/:id                              論理削除
GET    /api/coupons/:id/analytics                    クーポン効果分析
```

#### 5.5.1 LIFF 一覧表示

公開クーポン（`display_in_liff=1`）のうち、当該ユーザーが利用可能なものを返す:

```
GET /api/coupons?stylist_id=stylist_001&friend_id=U123abc
```

**実装要件**:

- `is_active=1` かつ `valid_from <= NOW <= valid_until`
- `display_in_liff=1` のもの
- 当該 `friend_id` の使用回数 < `usage_limit_per_user` のもの
- `is_first_time_only=1` の場合は `friend_id` の `completed` 状態の予約が0件のもののみ

#### 5.5.2 コード手入力照会（メイン導線）

LIFF のメニュー選択画面でユーザーがコード（例: `IG2026SUMMER`）を入力 → このエンドポイントを叩く:

```
GET /api/coupons/code/IG2026SUMMER?stylist_id=stylist_001&friend_id=U123abc
```

レスポンス（適用可能）:

```json
{
  "valid": true,
  "coupon": {
    "id": "cpn_001",
    "code": "IG2026SUMMER",
    "name": "Instagram 限定 30% OFF",
    "type": "percentage",
    "value": 30,
    "applicable_menu_ids": ["menu_color_001"],
    "valid_until": "2026-08-31T23:59:59+09:00"
  }
}
```

レスポンス（適用不可）:

```json
{
  "valid": false,
  "reason": "expired",
  "message": "このクーポンは有効期限が切れています"
}
```

`reason` のenum: `not_found` | `expired` | `first_time_only` | `usage_limit_exceeded` | `usage_limit_per_user_exceeded` | `inactive`

#### 5.5.3 クーポン適用バリデーション（予約確定直前）

メニュー・日時を選択した後、予約確定直前の最終バリデーション:

```
POST /api/coupons/validate
{
  "code": "IG2026SUMMER",
  "stylist_id": "stylist_001",
  "friend_id": "U123abc",
  "menu_ids": ["menu_color_001"],
  "scheduled_start_at": "2026-05-15T10:00:00+09:00"
}
```

レスポンス（適用可）:

```json
{
  "valid": true,
  "coupon_id": "cpn_001",
  "original_price": 6600,
  "discount_amount": 1980,
  "final_price": 4620
}
```

レスポンス（適用不可）:

```json
{
  "valid": false,
  "reason": "menu_not_applicable",
  "message": "このクーポンは選択したメニューには適用できません"
}
```

`reason` のenum: 上記 + `menu_not_applicable` | `min_price_not_met`

#### 5.5.4 予約作成時のクーポン適用

`POST /api/reservations` のリクエストに `coupon_code` を任意で含められる:

```json
{
  "stylist_id": "stylist_001",
  "friend_id": "U123abc",
  "menu_ids": ["menu_color_001"],
  "start_at": "2026-05-15T10:00:00+09:00",
  "coupon_code": "IG2026SUMMER"
}
```

実装フロー:

1. 予約作成 transaction 内で `coupon_code` があれば validate を実行
2. 適用可なら `discount_amount` 計算 → `total_price` から減算
3. `coupon_usages` レコードを作成
4. `coupons.used_count` をインクリメント
5. 失敗時は予約全体を rollback

#### 5.5.5 セキュリティ考慮（コード晒し対策）

クーポンコードが SNS 等で晒される前提で、以下で総量制限する:

- `usage_limit_total` で全体の使用上限を設ける（例: 100名限定）
- `usage_limit_per_user` で同一ユーザー再利用を制限（デフォルト 1）
- `is_first_time_only=1` で初回顧客限定にする
- 必要なら `valid_from` を未来日に設定して時限解禁

### 5.6 紹介 API

```
POST   /api/referrals                               紹介コード発行
GET    /api/referrals/:code                         コードから紹介情報取得
PUT    /api/referrals/:code/use                     紹介コード使用（被紹介者の予約完了時）
```

紹介リンクは `https://line.me/ti/p/@xxx?ref=ref_<code>` の形で発行。`?ref=` を line-harness の流入元追跡で拾い、`code` を紐付ける。

---

## 6. LIFF 予約UI 画面設計

### 6.1 画面遷移

```
[LINE トーク内のリッチメニュー or DM内ボタン]
       │
       ▼
┌─────────────────────────┐
│ 0. スタイリスト選択画面 │  ← 複数美容師いる場合のみ表示
│   （単一なら自動スキップ）│
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 1. メニュー選択画面     │ ─── 履歴タブ ──> [5. 予約履歴]
│   - メニュータブ        │
│   - クーポンタブ ★NEW   │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 2. 日時選択画面         │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 3. 予約確認画面         │
│   - クーポン適用表示 ★  │
└──────────┬──────────────┘
           │ 予約確定
           ▼
┌─────────────────────────┐
│ 4. 予約完了画面         │ ─── (オプション) ──> [6. カルテ閲覧]
└─────────────────────────┘
```

### 6.2 各画面の要件

#### 6.2.0 スタイリスト選択画面 (`/liff/stylist-selection`) ★NEW

**表示条件**:

- `GET /api/stylists` の結果が2人以上の場合のみ表示
- 1人なら自動的にそのスタイリストを `localStorage` に保存してメニュー選択画面へリダイレクト

**表示要素**:

- スタイリストカード一覧（名前・写真・bio・得意メニュー）
- カードタップで選択 → メニュー選択画面へ
- 「お任せ（先着順）」オプション（任意）

**実装ポイント**:

- 一度選択したらセッション内は記憶（戻るボタンで再選択可）
- ヘッダーに常に選択中のスタイリスト名を小さく表示

#### 6.2.1 メニュー選択画面 (`/liff/menu-selection`)

**表示要素**:

- 選択中のスタイリスト情報（名前・写真・bio）
- **タブ切替**:
  - メニュータブ: 通常メニュー一覧
  - **クーポンタブ ★NEW**: 利用可能クーポン一覧
- メニューカテゴリタブ: カット / カラー / パーマ / トリートメント / その他
- メニューカード（各メニュー）
  - 名前、所要時間、価格、説明
  - 「初回限定」バッジ（該当時）
  - 選択チェックボックス（複数選択可）
- 選択中のメニュー一覧（画面下部に sticky）
  - 合計料金、合計所要時間
  - **適用中クーポン表示（あれば）**
  - 「次へ」ボタン

**クーポンタブの仕様（手入力主導線）**:

```
┌─────────────────────────────────┐
│ クーポンコードをお持ちですか？  │
│ ┌─────────────────────────┐ │
│ │ コード入力欄            │ │
│ └─────────────────────────┘ │
│         [適用する]              │
│                                 │
│ ─────────────────────────       │
│ 🌟 公開中のクーポン             │
│                                 │
│ ┌─────────────────────────┐ │
│ │ 初回30%OFFクーポン      │ │
│ │ ¥6,600 → ¥4,620        │ │
│ └─────────────────────────┘ │
└─────────────────────────────────┘
```

- 画面上部に **コード入力欄を最初に大きく配置**（メイン導線）
  - IG DM や紹介で受け取ったコード（例: `IG2026SUMMER`）を入力 → 「適用する」ボタン
  - `GET /api/coupons/code/:code` で照会、有効なら適用、無効ならエラー表示
- 画面下部に **公開中のクーポン一覧**（`display_in_liff=1` のものだけ）
  - フリーランス美容師にとっての「定期キャンペーン」「初回特典」を常時掲載できる
  - カードタップ → 「このクーポンで予約しますか？」確認 → 適用
- 適用すると、対象メニューに自動チェック（`applicable_menu_ids` 指定時）
- 選択中のメニュー一覧に「クーポン適用中: ◯◯」バッジ + 割引額表示

**データソース**:

- メニュー: `GET /api/menus?stylist_id=xxx`
- 公開クーポン一覧: `GET /api/coupons?stylist_id=xxx&friend_id=xxx`
- コード照会: `GET /api/coupons/code/:code?stylist_id=xxx&friend_id=xxx`

**バリデーション**:

- 最低1つは選択必須
- 初回限定メニューは過去予約履歴があると選択不可
- 初回限定クーポンも同様（API 側で弾く）

#### 6.2.2 日時選択画面 (`/liff/datetime-selection`)

**表示要素**:

- カレンダー（月単位、当月から3ヶ月先まで選択可）
  - 営業日 = タップ可能
  - 定休日 / 臨時休業 = グレーアウト
- 日付タップで時間スロット表示
  - 15分刻みのスロット
  - 空きあり = タップ可能
  - 空きなし = グレーアウト
- 選択した日時を画面下部に表示
- 「次へ」ボタン

**データソース**: `GET /api/reservations/availability?stylist_id=xxx&date=YYYY-MM-DD&menu_ids=...`

**実装ポイント**:

- 月切り替えで月単位の営業情報を取得 → 日付タップで初めてスロット取得（パフォーマンス）
- 当日予約は2時間後以降のみ表示

#### 6.2.3 予約確認画面 (`/liff/confirmation`)

**表示要素**:

- 選択メニュー一覧（変更ボタン）
- 選択日時（変更ボタン）
- 料金内訳:
  - 通常合計
  - **適用クーポン（あれば）**: クーポン名 / 値引き額（赤字でマイナス表示）
  - 最終支払金額
- 合計所要時間
- 顧客要望テキストエリア（任意、200文字まで）
- 来店時の注意事項（テキスト固定表示）
- 「予約を確定する」ボタン

**処理**:

- 確定ボタン押下 → `POST /api/reservations`（クーポン使用時は `coupon_code` 含めて送信）
- 成功時 → 完了画面へ遷移
- 失敗時（コンフリクト等） → エラー表示 + 日時選択画面に戻る
- クーポン適用失敗（usage_limit 到達等） → クーポンを外してリトライ提案

#### 6.2.4 予約完了画面 (`/liff/completion`)

**表示要素**:

- 「予約完了」アニメーション
- 予約サマリ（日時・メニュー・料金）
- 「カレンダーに追加」ボタン（iCal 生成）
- 「友達に紹介」ボタン → 紹介コード発行 → LINE で送信
- 「閉じる」ボタン → LIFF 閉じる

#### 6.2.5 予約履歴画面 (`/liff/history`)

**表示要素**:

- 予約一覧（新しい順）
  - ステータスバッジ: 予約中 / 完了 / キャンセル
  - 各予約のメニュー・日時
- 予約タップで詳細表示
  - 完了済予約 → カルテ閲覧ボタン
  - 予約中 → キャンセルボタン

**データソース**: `GET /api/reservations?friend_id=xxx`

#### 6.2.6 カルテ閲覧画面 (`/liff/karte/:id`) ★オプション機能

**MVP 方針**: ユーザー目線では「カルテを見る」というアクション自体がだるいため、**主導線からは外し、Phase 2 のオプション機能とする**。LIFF メインメニューにはカルテボタンを表示せず、以下のいずれかの場合にだけ自然に到達できるようにする:

1. **来店後の自動配信メッセージから**: 来店翌日のお礼 DM 内に「今日の仕上がりはこちら」リンクとして自動添付（顧客が興味あればタップ）
2. **予約履歴画面から**: 完了済予約のカードに「カルテを見る」リンクを小さく配置（必須アクションではない）
3. **次回予約時の参考として**: 予約確認画面に「前回の施術内容を見る」サブリンク

つまり LIFF を開いて自分から「カルテを見たい」と能動的にナビゲートする導線は**意図的に作らない**。

**美容師側の管理画面では引き続き標準機能として維持**（薬剤レシピや施術履歴は美容師の業務上必須）。

**表示要素（顧客視点で見せる情報のみ）**:

- 施術日
- 受けたメニュー
- Before / After 写真（あれば）
- 美容師からの一言（`next_recommendation`）
- 推奨次回来店日

**非表示にする情報**:

- 薬剤レシピ（`formula`）
- 美容師の私用メモ（`stylist_note`）
- 髪質・頭皮状態の詳細パラメータ

**美容師側の制御**:

- カルテごとに `is_visible_to_customer` フラグ（デフォルト false）
- 美容師が明示的にチェックを入れたカルテだけ顧客側で閲覧可能
- これにより「下書き状態のカルテを誤って顧客に見せる」事故を防止

### 6.3 デザイン方針

- LINE 内で違和感のないトーン（グリーン基調 ではなく、サロンらしい清潔感のあるニュートラル）
- 美容師カスタマイズ可能なテーマカラー（CSS variable 1色だけ差し替えで全体のアクセントが変わる構造）
- フォント: Noto Sans JP
- すべてレスポンシブ（LINE 内 webview）
- 確定アクションは大きなボタン、誤タップ防止

---

## 6.5 管理画面（美容師向け）設計

### 6.5.1 設計の前提

- **デバイス優先順位**: タブレット（iPad）> スマートフォン > PC
- **タブレット最優先**の理由: 美容師は施術中・施術合間にカウンター付近で iPad を触る場面が圧倒的に多い
- スマホ: 移動中・自宅でのチェック用
- PC: オーナー・編集者が設定や分析をじっくり行う時用
- **ネイティブアプリは作らない**。Web（PWA 化はあり）で全デバイス対応する

### 6.5.2 画面構成

```
┌──────────────────────────────────────────┐
│ サイドバー / ボトムナビ（デバイスで切替） │
├──────────────────────────────────────────┤
│  📅 ダッシュボード                       │  ← ホーム（今日の予約サマリ）
│  📋 予約管理                             │  ← カレンダー＆リスト表示
│  👥 顧客管理                             │  ← 友だち一覧（line-harness API 経由）
│  📝 カルテ                               │  ← Phase 6
│  💇 メニュー・料金                       │  ← editor 以上
│  🎫 クーポン                             │  ← editor 以上
│  📣 キャンペーン                         │  ← editor 以上（IG ゲート）
│  💬 メッセージ                           │  ← line-harness のシナリオ・配信
│  📊 分析                                 │  ← editor 以上
│  ⚙️ 設定                                 │  ← owner のみ
└──────────────────────────────────────────┘
```

### 6.5.3 各画面の主要要件

#### ダッシュボード (`/admin`)

- 今日の予約タイムライン（タブレット最適化、ドラッグ可）
- 直近の通知（新規予約・キャンセル・新規 LINE 友だち）
- 今週のサマリ（予約数・売上・新規客数）
- 下部にショートカット（「予約を追加」「クーポン発行」「キャンペーン作成」）

#### 予約管理 (`/admin/reservations`)

- カレンダービュー（日 / 週 / 月切替）
- リストビュー（フィルタ: ステータス・スタイリスト・期間）
- 予約タップ → 詳細モーダル（メニュー・顧客・要望・料金）
  - ステータス変更（完了 / キャンセル / no-show）
  - 顧客の LINE トークへ直接ジャンプ
  - カルテ作成リンク（Phase 6）
- **ロール別表示**: `stylist` ロールは自分の予約のみ表示

#### 顧客管理 (`/admin/customers`)

- 友だち一覧（line-harness API: `GET /api/friends`）
- フィルタ: タグ / 流入元 / 最終来店日
- 顧客タップ → プロフィール画面
  - 過去予約・カルテ・タグ・流入元
  - **メッセージ送信ボタン**（line-harness API 経由で個別 DM）
  - **クロス紐付け表示**: IG 経由で来た顧客なら IG ユーザー名も表示

#### メニュー・料金 (`/admin/menus`)

- メニュー一覧（カテゴリ別）
- メニュー作成・編集モーダル
- 並び替え（ドラッグ&ドロップ、タブレットで優位）
- ロール: `editor` 以上で編集可、`stylist` は閲覧のみ

#### クーポン (`/admin/coupons`)

- クーポン一覧（公開中・期限切れ・下書き）
- クーポン作成フォーム
  - コード自動生成 or 手動指定
  - 公開設定（LIFF に表示する / IG 配布専用 / 紹介専用）
  - 利用上限・有効期限・対象メニュー
  - **ワンクリックで配布リンク生成**（LINE 公式アカウントの一斉配信ドラフトに自動挿入）
- 各クーポンの利用状況・売上貢献ダッシュボード
- ロール: `editor` 以上

#### キャンペーン (`/admin/campaigns`)

- IG Engagement Gate のテンプレ選択 UI
- テンプレを選んでパラメータ入力 → ig-harness API 経由でゲート起動
- 起動中ゲートの分析（コメント数・フォロー通過率・DM 配布数・LINE 登録 CV・予約 CV）
- ロール: `editor` 以上

#### メッセージ (`/admin/messages`)

- line-harness の機能を salon-harness UI から操作:
  - シナリオ一覧・編集
  - 一斉配信作成・予約
  - リッチメニュー編集
- **AI アシスト**: 「今月のリピート促進メッセージを作って」と入力 → Claude API（既に line-harness が用意している MCP 経由 or salon-harness 側で実装）でドラフト生成
- ロール: `editor` 以上

#### 分析 (`/admin/analytics`)

- 流入元別の予約 CV（IG 投稿別 / minimo / Google マップ / 紹介）
- リピート率（4w / 8w / 3m）
- 平均客単価・LTV
- メニュー別売上ランキング
- ロール: `editor` 以上

#### 設定 (`/admin/settings`)

- サロン情報（店名・ロゴ・テーマカラー）
- 営業時間
- スタッフ管理（追加・ロール変更・削除）★`owner` のみ
- LINE 連携設定 / IG 連携設定 ★`owner` のみ
- ロール: `owner` のみがフルアクセス、`editor` は一部閲覧可

### 6.5.4 ロール×権限マトリクス

| 機能                     | owner | editor |       stylist        |
| ------------------------ | :---: | :----: | :------------------: |
| ダッシュボード閲覧       |  ✅   |   ✅   | ✅（自分の予約のみ） |
| 予約閲覧（全員分）       |  ✅   |   ✅   |          ❌          |
| 予約閲覧（自分の分）     |  ✅   |   ✅   |          ✅          |
| 予約作成・編集           |  ✅   |   ✅   |    ✅（自分の分）    |
| 顧客一覧閲覧             |  ✅   |   ✅   | ✅（自分の担当のみ） |
| 顧客プロフィール詳細     |  ✅   |   ✅   | ✅（自分の担当のみ） |
| メニュー作成・編集       |  ✅   |   ✅   |    ❌（閲覧のみ）    |
| クーポン作成・編集       |  ✅   |   ✅   |          ❌          |
| キャンペーン作成・編集   |  ✅   |   ✅   |          ❌          |
| メッセージ・シナリオ編集 |  ✅   |   ✅   |          ❌          |
| 分析閲覧                 |  ✅   |   ✅   |          ❌          |
| スタッフ追加・ロール変更 |  ✅   |   ❌   |          ❌          |
| LINE/IG 連携設定         |  ✅   |   ❌   |          ❌          |
| 店舗基本設定             |  ✅   |   ❌   |          ❌          |

### 6.5.5 デバイス別 UI 最適化

#### タブレット（iPad 縦・横）★最優先

- サイドバー固定表示（左 240px）
- 予約カレンダーは週ビューが基本（広く取れる）
- カウンター置き想定で、ボタン押下時のフィードバックを強めに
- カルテ作成時はステップ式（写真撮影 → 薬剤入力 → メモ → 保存）

#### スマートフォン

- 下部ボトムナビ（ダッシュボード / 予約 / 顧客 / メッセージ / 設定）
- 予約カレンダーは日ビュー固定
- 各機能は単機能ページ化、複雑な操作はタブレット/PCに誘導

#### PC（owner / editor 主用途）

- サイドバー固定 + 広いコンテンツ領域
- 分析・設定・キャンペーン作成は PC 推奨
- Excel エクスポート機能（売上 CSV など）

### 6.5.6 認証

- メールアドレス + パスワードログイン（bcrypt + セッショントークン）
- セッション期間: 30日（タブレット利用想定で長め）
- パスワードリセットはメールリンク方式
- **2FA は MVP では実装しない**（必要なサロン向けに Phase 7 で）
- API は `Authorization: Bearer <session_token>` でアクセス

### 6.5.7 認証 API

```
POST   /api/auth/login                    メール+パスワード認証 → セッション発行
POST   /api/auth/logout                   セッション破棄
POST   /api/auth/password-reset/request   パスワードリセット要求
POST   /api/auth/password-reset/confirm   パスワードリセット確定
GET    /api/auth/me                       現在のスタッフユーザー情報

POST   /api/staff                         スタッフ追加（owner のみ）
PUT    /api/staff/:id                     スタッフ情報更新（owner のみ、本人は名前変更可）
DELETE /api/staff/:id                     スタッフ削除（owner のみ）
PUT    /api/staff/:id/role                ロール変更（owner のみ）
```

### 6.5.8 技術スタック（管理画面）

| レイヤー       | 技術                                                   |
| -------------- | ------------------------------------------------------ |
| フレームワーク | Next.js 15 (App Router)                                |
| ホスティング   | Cloudflare Pages or Vercel                             |
| UI ライブラリ  | shadcn/ui                                              |
| スタイリング   | Tailwind CSS                                           |
| データフェッチ | TanStack Query                                         |
| フォーム       | React Hook Form + Zod                                  |
| カレンダー     | FullCalendar or 自作（タブレット最適化重視で自作推奨） |
| 状態管理       | Zustand（軽量・タブレット安定動作）                    |
| PWA 化         | next-pwa（オフラインで予約一覧確認できると便利）       |

---

## 7. IG Engagement Gate テンプレート（美容師向け）

ig-harness-oss の `/campaigns` で使えるテンプレ5種を `salon-harness` 側に同梱。`docs/templates/ig-engagement-gates.md` として用意し、管理画面の「キャンペーン作成」からワンクリック適用。

### 7.1 テンプレ仕様

各テンプレは JSON で定義:

```typescript
interface IGGateTemplate {
  template_id: string;
  name: string; // 美容師に見せる名前
  category: "new_menu" | "campaign" | "open" | "seasonal" | "winback";
  description: string;
  trigger: {
    post_keyword: string; // コメントトリガーキーワード（複数可）
    post_target: "all" | "specific_post";
  };
  follow_gate: {
    enabled: boolean;
    pre_follow_dm: string; // フォロー前 DM テンプレ
    post_follow_dm: string; // フォロー後 DM テンプレ
  };
  reward_dm: {
    text: string; // 特典 DM の本文
    cta: {
      type: "line_link"; // LINE 友だち追加への誘導
      ref_param: string; // 流入元識別子
    };
  };
}
```

### 7.2 用意するテンプレ5種

| ID                 | 名前               | キーワード           | 用途                                    |
| ------------------ | ------------------ | -------------------- | --------------------------------------- |
| `t_new_menu`       | 新メニュー告知     | "新メニュー", "詳細" | 新メニューの告知＋初回特典クーポン配布  |
| `t_campaign_color` | カラーキャンペーン | "カラー", "色"       | 季節カラーの予約獲得＋限定クーポン配布  |
| `t_open`           | 新店オープン       | "オープン", "OPEN"   | 開業時のローンチ＋オープン特典クーポン  |
| `t_seasonal`       | 季節キャンペーン   | "夏", "梅雨", etc    | 髪質改善・縮毛矯正の季節需要            |
| `t_winback`        | 離脱顧客復活       | "久しぶり"           | 来店から3ヶ月以上の顧客向け復活クーポン |

**クーポン配布型テンプレの仕組み**:

1. 顧客が IG リールに指定キーワードでコメント
2. ig-harness が Engagement Gate 起動 → フォロー判定
3. フォロー後に DM 配布 → DM 内に **動的生成されたクーポンコード** + LINE 友だち追加 URL
4. 顧客が LINE 登録 → LIFF 開く → 自動でクーポンタブにそのコードが適用済表示
5. メニュー選択して予約完了

**動的クーポン生成**:

- テンプレ起動時に salon-harness の `POST /api/coupons` を呼んで `usage_limit_per_user=1` のユニークコードを生成
- 生成したコードを ig-harness の reward DM のテンプレ変数 `{{coupon_code}}` に注入
- これにより「IG 経由でだけ使える限定クーポン」が成立し、流入元の正確な計測が可能

### 7.3 テンプレ実例（t_new_menu）

```json
{
  "template_id": "t_new_menu",
  "name": "新メニュー告知ゲート",
  "category": "new_menu",
  "description": "リールで新メニューを告知し、コメント→DM で初回限定価格を配布",
  "trigger": {
    "post_keyword": "詳細",
    "post_target": "specific_post"
  },
  "follow_gate": {
    "enabled": true,
    "pre_follow_dm": "コメントありがとうございます！🌟\n新メニューの詳細はフォローしてくれた方限定で送ってます！\nフォローしてからもう一度コメントしてくださいね 💁‍♀️",
    "post_follow_dm": "フォローありがとうございます！😊\n新メニューの詳細はこちら👇"
  },
  "reward_dm": {
    "text": "【新メニュー: 髪質改善トリートメント】\n通常 ¥11,000 → 初回限定 ¥7,700\n\n予約は LINE から24時間受付中！\n👇 友だち追加してメニューから予約",
    "cta": {
      "type": "line_link",
      "ref_param": "ig_new_menu_treatment"
    }
  }
}
```

---

## 8. 自動化シナリオ（line-harness-oss のステップ配信を使用）

`salon-harness` セットアップ時に、line-harness-oss の `scenarios` API を叩いて以下のシナリオを自動生成する。

### 8.1 シナリオ一覧

| シナリオ ID           | トリガー                    | 配信内容                            |
| --------------------- | --------------------------- | ----------------------------------- |
| `welcome`             | 友だち追加                  | ウェルカム + 初回予約 LIFF への導線 |
| `pre_visit_reminder`  | 予約前日 9時                | 予約リマインド + キャンセル URL     |
| `post_visit_thanks`   | 来店完了の3時間後           | 御礼 + ホームケア tips              |
| `repeat_promotion_4w` | 来店から4週間後             | 次回予約のお誘い                    |
| `repeat_promotion_8w` | 来店から8週間後（未予約者） | リピート割引クーポン                |
| `winback_3m`          | 来店から3ヶ月（未予約者）   | 久しぶり割クーポン                  |
| `birthday`            | 誕生日当日                  | バースデーメッセージ + 特典         |

### 8.2 シナリオ実例: `pre_visit_reminder`

```typescript
{
  name: "予約前日リマインド",
  triggerType: "scheduled",  // scheduled は salon-harness 側の cron で発火
  steps: [
    {
      stepOrder: 0,
      delayMinutes: 0,
      messageType: "text",
      messageContent:
        "明日 {{reservation.start_time}} のご予約をお待ちしてます🌟\n" +
        "メニュー: {{reservation.menu_names}}\n" +
        "所要時間: 約{{reservation.duration}}分\n\n" +
        "もし変更・キャンセルがある場合は、こちらから手続きできます👇\n" +
        "{{reservation.management_url}}"
    }
  ]
}
```

テンプレ変数 `{{reservation.*}}` は salon-harness の cron が値を埋めて送信。

---

## 9. Cron ジョブ仕様

`apps/worker/src/cron/` に実装。`wrangler.toml` の `[triggers]` で5分毎に発火。

### 9.1 reminder_pre_visit.ts

```typescript
// 毎日 09:00 JST に実行（cron: "0 0 * * *" UTC）
export async function reminderPreVisit(env: Env) {
  // 翌日のすべての confirmed 予約を取得
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const reservations = await db.reservations.findByDate(tomorrow, "confirmed");

  for (const r of reservations) {
    if (r.reminder_sent_at) continue;

    // line-harness の messaging API を叩く
    await sendLineMessage({
      friend_id: r.friend_id,
      message: buildReminderMessage(r),
    });

    await db.reservations.markReminderSent(r.id);
  }
}
```

### 9.2 thank_you_post_visit.ts

```typescript
// 5分毎に実行
// 完了マーク（PUT /complete）から3時間経過した予約を対象
export async function thankYouPostVisit(env: Env) {
  const targets = await db.reservations.findCompletedAwaitingThanks();

  for (const r of targets) {
    await sendLineMessage({
      friend_id: r.friend_id,
      message: buildThankYouMessage(r),
    });

    // 4週後・8週後・3ヶ月後のジョブを automation_jobs に登録
    await scheduleAutomations(r);
  }
}
```

### 9.3 repeat_promotion.ts

```typescript
// 5分毎、automation_jobs を見て scheduled_at が現在時刻 <= のものを実行
export async function processRepeatPromotions(env: Env) {
  const due = await db.automationJobs.findDue();

  for (const job of due) {
    try {
      await executeJob(job);
      await db.automationJobs.markExecuted(job.id);
    } catch (e) {
      await db.automationJobs.markFailed(job.id, e.message);
    }
  }
}
```

---

## 10. UUID クロス連携の設定

ig-harness-oss と line-harness-oss を共有シークレット webhook で繋ぐ手順。
`docs/INTEGRATION.md` に詳細記載。

### 10.1 セットアップ

```bash
# 共通の HMAC シークレットを生成
SHARED_SECRET=$(openssl rand -hex 32)

# ig-harness-oss 側
cd ig-harness-oss
npx wrangler secret put SALON_HARNESS_WEBHOOK_URL
# → https://salon-harness.your-domain.workers.dev/webhook/uuid-link
npx wrangler secret put CROSS_HARNESS_SECRET
# → $SHARED_SECRET

# line-harness-oss 側
cd line-harness-oss
npx wrangler secret put SALON_HARNESS_WEBHOOK_URL
npx wrangler secret put CROSS_HARNESS_SECRET
# → 同じ $SHARED_SECRET

# salon-harness 側
cd salon-harness
npx wrangler secret put CROSS_HARNESS_SECRET
# → 同じ $SHARED_SECRET
```

### 10.2 salon-harness 側の webhook 受信実装

```typescript
// apps/worker/src/routes/webhook.ts
app.post("/webhook/uuid-link", async (c) => {
  const sig = c.req.header("X-Harness-Signature");
  const body = await c.req.text();

  if (!verifyHmac(body, sig, c.env.CROSS_HARNESS_SECRET)) {
    return c.json({ error: "invalid signature" }, 401);
  }

  const { source, uuid, external_id, metadata } = JSON.parse(body);
  // source: 'line' | 'ig'
  // uuid: 統合UUID
  // external_id: LINE userId or IG user_id
  // metadata: { ref?: string, ... }

  await db.identityLinks.upsert({ uuid, source, external_id, metadata });
  return c.json({ ok: true });
});
```

---

## 11. デプロイ手順

`docs/SETUP.md` に詳細記載予定。MVP 時点では以下フローで動くこと:

```bash
# 1. salon-harness をクローン & install
git clone https://github.com/<owner>/salon-harness.git
cd salon-harness
pnpm install

# 2. Cloudflare D1 と R2 を作成
npx wrangler d1 create salon-harness
npx wrangler r2 bucket create salon-harness-photos

# 3. wrangler.toml に database_id を反映、スキーマ適用
npx wrangler d1 execute salon-harness --file=packages/db/schema.sql

# 4. Secret 設定
npx wrangler secret put API_KEY
npx wrangler secret put CROSS_HARNESS_SECRET
npx wrangler secret put LINE_HARNESS_API_URL      # line-harness の Worker URL
npx wrangler secret put LINE_HARNESS_API_KEY
npx wrangler secret put IG_HARNESS_API_URL
npx wrangler secret put IG_HARNESS_API_KEY

# 5. Worker デプロイ
pnpm deploy:worker

# 6. 管理画面（Vercel）デプロイ
cd apps/web && vercel deploy

# 7. LIFF（CF Pages）デプロイ
cd apps/liff && pnpm build && npx wrangler pages deploy dist

# 8. LIFF URL を LINE Developers Console に登録
# → LIFF アプリ作成 → エンドポイント URL を CF Pages の URL に
```

---

## 12. 実装フェーズ

### Phase 0: 基盤セットアップ（4日）

- [ ] salon-harness リポジトリ作成
- [ ] pnpm workspace 設定
- [ ] CF Workers + D1 + R2 セットアップ
- [ ] wrangler.toml と環境変数の整備
- [ ] schema.sql 適用（salons, staff_users, stylists 等まで含む）
- [ ] line-harness-oss / ig-harness-oss を別途デプロイし、UUID クロス連携の疎通確認
- [ ] **認証基盤**: メール+パスワード、セッション、ロール判定ミドルウェア
- [ ] 管理画面の最低限の枠（Next.js + ログイン画面 + ダッシュボード雛形）

### Phase 1: 予約コア機能 + クーポン（2.5週間）

- [ ] スタイリスト CRUD API（ロール `owner` 限定）
- [ ] メニュー CRUD API（ロール `editor` 以上）
- [ ] 営業時間 CRUD API
- [ ] 空き枠取得 API（`/api/reservations/availability`）
- [ ] 予約 CRUD API（ロールで自分のみ/全員フィルタ）
- [ ] **クーポン CRUD + 手入力照会 + 適用バリデーション API**
- [ ] LIFF: スタイリスト選択画面（複数美容師対応）
- [ ] LIFF: メニュー選択画面（メニュータブ + クーポンタブ手入力主導線）
- [ ] LIFF: 日時選択画面
- [ ] LIFF: 予約確認画面（クーポン適用表示）
- [ ] LIFF: 予約完了画面
- [ ] LIFF: 予約履歴画面
- [ ] **管理画面: 予約管理（カレンダー＆リスト）** ★タブレット最適化
- [ ] **管理画面: メニュー・料金 CRUD**
- [ ] **管理画面: クーポン CRUD + 配布リンク生成**
- [ ] line-harness の messaging API を呼び出して予約確認 DM 送信

### Phase 2: 自動化（1週間）

- [ ] Cron: 前日リマインド
- [ ] Cron: 来店後御礼
- [ ] Cron: リピート促進（4w, 8w, 3m）
- [ ] Cron: 誕生日メッセージ
- [ ] line-harness のシナリオを自動生成するセットアップスクリプト
- [ ] **管理画面: メッセージ・シナリオ編集 UI（line-harness API 経由）**

### Phase 3: 顧客管理＆IGキャンペーン（1週間）

- [ ] **管理画面: 顧客一覧（line-harness の friends API 経由）**
- [ ] 管理画面: 顧客プロフィール（過去予約・タグ・流入元）
- [ ] テンプレ JSON を `docs/templates/` に5種用意
- [ ] 管理画面: キャンペーン作成 UI（テンプレ選択 → ig-harness API へ POST）
- [ ] **クーポン配布型キャンペーンの統合（IG DM → 動的クーポンコード生成 → 配布）**
- [ ] 管理画面: キャンペーン分析ダッシュボード

### Phase 4: 紹介プログラム + 分析（5日）

- [ ] 紹介コード発行 API
- [ ] LIFF: 完了画面の「紹介する」ボタン
- [ ] line-harness の `?ref=` 経由で紹介コード突合・報酬発行ロジック
- [ ] **管理画面: 分析ダッシュボード（流入元別 CV、リピート率、LTV）**

### Phase 5: 動作確認・α運用（1週間）

- [ ] 1サロン（友人など）で実運用
- [ ] バグ修正・UX 調整
- [ ] **タブレット実機検証**（iPad 7世代以降を最低基準）
- [ ] PWA 化検証
- [ ] ドキュメント整備（SETUP.md, ARCHITECTURE.md, API.md, ROLES.md）

### Phase 6: カルテ機能（オプション・1週間）★MVP 後回し

- [ ] カルテ CRUD API
- [ ] R2 写真アップロード URL 発行 API
- [ ] 管理画面: カルテ一覧・詳細・編集ページ（美容師向け、タブレット最適化）
- [ ] 美容師側のカルテ「顧客に公開」フラグ管理
- [ ] LIFF: 来店後 DM からのみアクセスできるカルテ閲覧ページ（顧客視点で軽量）
- [ ] 美容師の検証 + UX 調整

### Phase 7: 拡張機能（Phase 6 と並行・各1週間）

- [ ] 口コミ収集（来店後 DM に「Google マップで口コミお願いします」リンク自動添付）
- [ ] スタイル写真ギャラリー（IG の特定ハッシュタグ付き投稿を LIFF で集約表示）
- [ ] 決済連携（Stripe / PayPay for Business）
- [ ] 2FA（オーナー任意）

**MVP リリース基準: Phase 0 〜 5 完了**（合計 5〜6週間）。
カルテ・口コミ・決済は MVP 後の拡張として取り組む。

---

## 13. 受け入れ条件 (Acceptance Criteria)

MVP リリースの基準。すべて満たして初めて α 運用を開始する。

### 13.1 機能要件

- [ ] 顧客が LIFF からメニュー選択 → 日時選択 → 予約完了 までを 3分以内に完結できる
- [ ] **複数美容師が登録されている場合、顧客は明示的にスタイリストを指名して予約できる**
- [ ] **配布されたクーポンコードを LIFF の入力欄に手入力すると、料金が自動計算され、最終金額で予約確定できる**
- [ ] **管理画面でクーポンを発行 → IG DM 経由で配布 → 顧客が LIFF で適用 → 予約完了 のフローが動作する**
- [ ] 同一時刻に2名の顧客が予約しようとした際、1名のみ成功し、もう1名は明確なエラー表示で失敗する（ダブルブッキング防止）
- [ ] 予約成功時に LINE 公式アカウントから自動で予約確認 DM が届く
- [ ] 予約前日 09:00 にリマインド DM が届く（時間誤差 5分以内）
- [ ] 予約完了 → 来店完了マーク → 3時間後に御礼 DM が自動配信される
- [ ] 来店から4週間後に未予約の顧客に対してリピート促進 DM が配信される
- [ ] IG Engagement Gate のテンプレを管理画面から選択して即時起動できる
- [ ] IG → LINE → LIFF 予約 までのファネルで、流入元（投稿ID）別の予約数が管理画面に表示される
- [ ] **クーポンごとの利用数・売上貢献が管理画面で可視化される**
- [ ] **管理画面で `owner` ロールはスタッフ追加・ロール変更・全予約閲覧ができる**
- [ ] **管理画面で `editor` ロールはメニュー・クーポン・キャンペーン編集ができ、設定は閲覧のみ**
- [ ] **管理画面で `stylist` ロールは自分の予約・自分の担当顧客のみ閲覧・操作できる**
- [ ] **管理画面が iPad（縦・横）で快適に操作でき、施術中のカウンターで使える**
- [ ] **管理画面がスマホでも基本機能（予約確認・顧客プロフィール閲覧）が使える**

**MVP には含めない（Phase 6 以降）**:

- カルテ機能（美容師管理画面・顧客閲覧とも Phase 6）
- 口コミ機能
- 決済機能
- 2FA

### 13.2 非機能要件

- [ ] 同時オンライン顧客 100名でも予約 API のレスポンス < 1秒
- [ ] LIFF 画面の初回ロード < 3秒（4G 想定）
- [ ] Cloudflare 月額費用が 500円以下（友だち5,000人まで）
- [ ] LINE 公式アカウントの月間メッセージ数が 1,000通以下なら、LINE 側コストも 0円
- [ ] サロン情報（メニュー・営業時間・スタイリスト bio）の編集が美容師1人で完結（外注不要）

### 13.3 セキュリティ要件

- [ ] すべての API 呼び出しで API Key 認証
- [ ] LIFF からの API 呼び出しは LINE ID Token を検証
- [ ] R2 写真の URL は事前署名 URL で発行、有効期限 30分
- [ ] CORS 設定が salon-harness の web/liff ドメインのみ許可
- [ ] D1 のすべての書き込みクエリでパラメータバインドを使用（SQL injection 対策）
- [ ] webhook エンドポイントは HMAC 署名検証

---

## 14. 開発時の注意事項（Claude Code 向け）

### 14.1 既存リポジトリの参考

実装前に以下を読んで命名規則・コードスタイルを揃える:

- `https://github.com/Shudesu/line-harness-oss` の `apps/worker/src/`
- `https://github.com/Shudesu/ig-harness-oss` の `apps/worker/src/`
- `packages/sdk/` のテスト構成

### 14.2 コード規約

- TypeScript strict mode
- ESM
- async/await（Promise.then 不可）
- 環境変数は `wrangler.toml` の `[vars]` ではなく Secret に格納
- D1 クエリは prepared statement のみ
- ルートハンドラは1ファイル1リソース（reservations.ts, kartes.ts のように分割）

### 14.3 テスト方針

- 各 API ルートは Vitest で integration test を1つ以上書く
- 予約コンフリクト系は集中的にテスト
- LIFF はまず Storybook で画面単体確認、その後 LINE 上で実機確認

### 14.4 やってはいけないこと

- ❌ line-harness-oss / ig-harness-oss の本体コードを fork して改変する（API 経由でしか使わない）
- ❌ HPB API 連携を入れる（HPB を挟まないのが本サービスのアイデンティティ）
- ❌ 顧客の個人情報を D1 以外の場所に保存する（メール・SMS 連携は MVP では除外）
- ❌ 決済機能を MVP で実装する（Phase 7 以降）

---

## 15. オープン論点

実装中に判断が必要そうな点。Claude Code には「迷ったら issue を作って人間に投げる」と認識させる:

1. **シェアサロン対応**: 1サロン = 複数美容師の場合、`stylists` テーブルが複数行になるが、LINE 公式アカウントは1つで運用するか、美容師ごとに分けるか
2. **メニュー組み合わせの所要時間**: 「カット + カラー」のような組み合わせは単純合算でなく短縮されるケースがある（同時並行作業）
3. **キャンセル料**: MVP では実装しないが、no_show 率が高い場合のフラグ運用方針
4. **画像サイズ最適化**: 高画質スマホで撮った写真をそのまま R2 に上げるとコスト増。クライアント側で resize するか、Cloudflare Images を使うか
5. **データ移行**: 既存 LiME や HPB のカルテ・顧客データをインポートする CSV 取り込み機能が必要か

---

## 付録 A: 環境変数一覧

`apps/worker/wrangler.toml`:

```toml
name = "salon-harness-worker"
main = "src/index.ts"
compatibility_date = "2026-05-01"

[[d1_databases]]
binding = "DB"
database_name = "salon-harness"
database_id = "<created_id>"

[[r2_buckets]]
binding = "PHOTOS"
bucket_name = "salon-harness-photos"

[triggers]
crons = [
  "0 0 * * *",      # 09:00 JST 前日リマインド
  "*/5 * * * *"     # 5分毎 ジョブ処理
]
```

Secrets:

| Key                    | 用途                      |
| ---------------------- | ------------------------- |
| `API_KEY`              | 管理画面・LIFF からの認証 |
| `CROSS_HARNESS_SECRET` | UUID 連携の HMAC          |
| `LINE_HARNESS_API_URL` | line-harness Worker URL   |
| `LINE_HARNESS_API_KEY` | line-harness 認証         |
| `IG_HARNESS_API_URL`   | ig-harness Worker URL     |
| `IG_HARNESS_API_KEY`   | ig-harness 認証           |

---

## 付録 B: 参考リンク

- line-harness-oss: https://github.com/Shudesu/line-harness-oss
- ig-harness-oss: https://github.com/Shudesu/ig-harness-oss
- LINE Messaging API: https://developers.line.biz/en/reference/messaging-api/
- LIFF Documentation: https://developers.line.biz/en/docs/liff/
- Instagram Graph API: https://developers.facebook.com/docs/instagram-api
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- Cloudflare D1: https://developers.cloudflare.com/d1/

---

**最終更新**: 2026-05-02
**バージョン**: 0.3.0 (MVP draft - admin UI with roles + manual coupon entry)

## 変更履歴

### v0.3.0 (2026-05-02)

- **管理画面の独立化を明示**（§0.6）: salon-harness が美容師の窓口を一本化し、line-harness / ig-harness の API を内部で叩く設計
- **ロール設計を導入**（§0.7, §6.5.4）: `owner` / `editor` / `stylist` の3ロール
- **管理画面仕様を §6.5 として新設**:
  - タブレット最優先のデバイス戦略
  - 9つの主要画面（ダッシュボード〜設定）
  - ロール×権限マトリクス
  - 認証 API 仕様
- **DB スキーマに `salons` `staff_users` `staff_sessions` 追加**
- **stylists テーブルを salon_id 紐付けに変更**（マルチテナント対応）
- **クーポンを手入力主導線に再設計**（§5.5, §6.2.1）: コード入力欄を LIFF クーポンタブの最上段に配置
- **コード晒し対策**を §5.5.5 に明記
- 受け入れ条件にロール・デバイス・タブレット要件を追加
- Phase 0 〜 5 を再編、認証基盤と管理画面整備を組み込み

### v0.2.0 (2026-05-02)

- HPB 機能カバレッジ表（§0.5）追加
- スタイリスト指名予約フローを LIFF に追加（§6.2.0）
- **クーポン機能を MVP コアに昇格**:
  - DB スキーマ: `coupons`, `coupon_usages` テーブル追加
  - API: `/api/coupons/*` エンドポイント追加（§5.5）
  - LIFF メニュー選択画面にクーポンタブ追加
  - 予約確認画面に値引き表示
  - IG Engagement Gate にクーポン配布型テンプレを統合
- **カルテ機能を MVP からオプション化（Phase 6 へ移動）**:
  - LIFF メイン導線からカルテボタンを削除
  - カルテは美容師管理画面と「来店後 DM 経由でのみアクセスできる軽量閲覧画面」のみ
  - 美容師が `is_visible_to_customer` で公開制御
- 実装フェーズの再編（Phase 1 にクーポン統合、カルテを Phase 6 へ）
- 受け入れ条件の更新

### v0.1.0 (2026-05-02)

- 初版
