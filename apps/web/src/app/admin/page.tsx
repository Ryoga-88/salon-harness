'use client';

import './admin.css';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CalendarPlus,
  CheckCheck,
  ChevronRight,
  Clock,
  DollarSign,
  Link2,
  MessageSquare,
  Plus,
  RefreshCw,
  Star,
  Ticket,
  TrendingUp,
  UserCheck,
  X
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { fetchApi, friendlyApiError, getApiKey } from '@/lib/api';

type FunnelPayload = {
  cohort: {
    friend_count: number;
    ig_touches: number;
    line_touches: number;
    bridged_ig_and_line: number;
    reservations_customers_booked: number;
    reservations_completed: number;
  };
  note?: string;
};

type KpiCard = {
  tone: 't' | 'b' | 'p' | 'a';
  label: string;
  metric: string;
  delta: string;
  deltaTone: 'up' | 'down' | 'flat';
  spark: { stroke: string; fill: string; line: string };
};

const KPI_CARDS: KpiCard[] = [
  {
    tone: 't',
    label: '今日の予約',
    metric: '14 件',
    delta: '▲ +3 件 vs 先週土',
    deltaTone: 'up',
    spark: {
      stroke: '#0f766e',
      fill: 'rgba(15,118,110,.10)',
      line: '0,28 12,26 24,22 36,24 48,18 60,20 72,14 84,16 96,12 108,15 120,8'
    }
  },
  {
    tone: 'b',
    label: '今週の売上',
    metric: '¥864,200',
    delta: '▲ +12.4% vs 前週',
    deltaTone: 'up',
    spark: {
      stroke: '#1d4ed8',
      fill: 'rgba(29,78,216,.10)',
      line: '0,30 12,28 24,30 36,24 48,26 60,18 72,20 84,12 96,14 108,8 120,10'
    }
  },
  {
    tone: 'p',
    label: '統合済みチャネル',
    metric: '412 UUID',
    delta: '▲ +28 同一 UUID（IG ↔ LINE）',
    deltaTone: 'up',
    spark: {
      stroke: '#6d28d9',
      fill: 'rgba(109,40,217,.10)',
      line: '0,32 12,30 24,28 36,26 48,22 60,24 72,18 84,20 96,14 108,12 120,10'
    }
  },
  {
    tone: 'a',
    label: 'クーポン使用',
    metric: '38 / 120',
    delta: '→ 配布 120 件 / 利用率 31.7%',
    deltaTone: 'flat',
    spark: {
      stroke: '#b45309',
      fill: 'rgba(180,83,9,.10)',
      line: '0,20 12,22 24,18 36,20 48,16 60,22 72,18 84,24 96,20 108,18 120,22'
    }
  }
];

type FunnelRow = {
  label: string;
  dotColor: string;
  barGradient: string;
  width: number;
  value: string;
  pct: string;
};

const DEMO_FUNNEL: FunnelRow[] = [
  {
    label: 'Instagram コメント',
    dotColor: '#6d28d9',
    barGradient: 'linear-gradient(90deg,#6d28d9,#8b5cf6)',
    width: 100,
    value: '1,820',
    pct: '100%'
  },
  {
    label: 'Engagement Gate 通過',
    dotColor: '#1d4ed8',
    barGradient: 'linear-gradient(90deg,#1d4ed8,#3b82f6)',
    width: 64,
    value: '1,162',
    pct: '63.8%'
  },
  {
    label: 'LINE 友だち化',
    dotColor: '#0f766e',
    barGradient: 'linear-gradient(90deg,#0f766e,#14a89c)',
    width: 48,
    value: '872',
    pct: '47.9%'
  },
  {
    label: 'identity_links 作成',
    dotColor: '#14a89c',
    barGradient: 'linear-gradient(90deg,#14a89c,#5eead4)',
    width: 22.6,
    value: '412',
    pct: '22.6%'
  },
  {
    label: '予約完了',
    dotColor: '#b45309',
    barGradient: 'linear-gradient(90deg,#b45309,#f59e0b)',
    width: 11.5,
    value: '209',
    pct: '11.5%'
  }
];

const QUICK_ACTIONS = [
  { icon: CalendarPlus, title: '予約を追加', desc: 'スタイリスト・メニュー・顧客 UUID を指定して新規予約。' },
  { icon: Ticket, title: 'クーポン発行', desc: '期間・対象・割引率を設定し、コードを発行します。' },
  { icon: Star, title: 'キャンペーン作成', desc: 'IG Engagement Gate のテンプレから新規キャンペーン。' },
  { icon: MessageSquare, title: 'LINE メッセージ送信', desc: 'friend_id 指定で個別 DM を送信。' }
];

type EvKind = 't' | 'b' | 'p' | 'a' | 's';
type TimelineEvent = {
  time: string;
  kind: EvKind;
  tag: string;
  head: string;
  sub: string;
  uuid: string;
  right: string;
  amount?: string;
};

const TIMELINE: TimelineEvent[] = [
  {
    time: '18:42',
    kind: 'b',
    tag: 'reservation.created',
    head: '新規予約：渡辺 あおい',
    sub: '18:00 / 前髪カット / KEN — IG キャンペーン #spring2026 経由',
    uuid: 'cd14…0fa2',
    right: '',
    amount: '¥1,100'
  },
  {
    time: '17:08',
    kind: 'a',
    tag: 'coupon_used',
    head: 'クーポン使用：SPRING30',
    sub: '松本 さら（10:00 カラー + トリートメント）— 30% OFF',
    uuid: '8e9c…b421',
    right: '',
    amount: '−¥3,960'
  },
  {
    time: '15:21',
    kind: 't',
    tag: 'identity.linked',
    head: 'identity_links 作成',
    sub: 'IG @kokoro_ymd ↔ LINE U7e2c… 統合',
    uuid: '1f2a…c0d3',
    right: 'IG ↔ LINE'
  },
  {
    time: '14:55',
    kind: 'p',
    tag: 'karte',
    head: 'カルテ更新：伊藤 はるか',
    sub: '前回比 メニュー変更（縮毛矯正） / アレルギー注記あり',
    uuid: '4c2b…3d18',
    right: 'YUKI'
  },
  {
    time: '12:10',
    kind: 's',
    tag: 'automation.sent',
    head: 'リマインド送信：3 件',
    sub: 'LINE 配信 / 本日予約 24h 前 — 開封率 100%',
    uuid: '—',
    right: 'LINE Harness'
  },
  {
    time: '09:02',
    kind: 'b',
    tag: 'reservation.updated',
    head: '予約変更：山田 こころ',
    sub: '10:30 → 同日 11:00 へ移動 — 受付スタッフ操作',
    uuid: '1f2a…c0d3',
    right: ''
  }
];

type ResRow = {
  time: string;
  name: string;
  uuid: string;
  av: string;
  initial: string;
  menu: string;
  stylist: string;
  status: 'confirmed' | 'pending' | 'done' | 'cancel';
  amount: number;
};

const TODAY_RES: ResRow[] = [
  { time: '10:00', name: '松本 さら', uuid: '8e9c…b421', av: 'av-r', initial: '松', menu: 'カラー + トリートメント', stylist: 'YUKI', status: 'confirmed', amount: 13200 },
  { time: '10:30', name: '山田 こころ', uuid: '1f2a…c0d3', av: 'av-b', initial: '山', menu: 'カット', stylist: 'AOI', status: 'confirmed', amount: 5500 },
  { time: '11:30', name: '鈴木 みなと', uuid: '77e1…a92f', av: 'av-g', initial: '鈴', menu: 'パーマ', stylist: 'KEN', status: 'pending', amount: 11000 },
  { time: '13:00', name: '伊藤 はるか', uuid: '4c2b…3d18', av: 'av-y', initial: '伊', menu: '縮毛矯正', stylist: 'YUKI', status: 'confirmed', amount: 22000 },
  { time: '14:30', name: '高橋 れい', uuid: '9aab…e004', av: 'av-p', initial: '高', menu: 'カット + カラー', stylist: 'AOI', status: 'confirmed', amount: 14300 },
  { time: '16:00', name: '田中 ひかり', uuid: '2b5e…7c91', av: 'av-s', initial: '田', menu: 'ヘッドスパ', stylist: 'MOMO', status: 'pending', amount: 6600 },
  { time: '18:00', name: '渡辺 あおい', uuid: 'cd14…0fa2', av: 'av-r', initial: '渡', menu: '前髪カット', stylist: 'KEN', status: 'cancel', amount: 1100 }
];

const STATUS_JA: Record<ResRow['status'], string> = {
  confirmed: '確定',
  pending: '仮押さえ',
  done: '完了',
  cancel: 'キャンセル'
};

export default function AdminPage() {
  const [funnel, setFunnel] = useState<FunnelPayload | null>(null);
  const [funnelError, setFunnelError] = useState('');

  useEffect(() => {
    if (!getApiKey()) return;
    void (async () => {
      try {
        setFunnel(await fetchApi<FunnelPayload>('/api/analytics/funnel'));
      } catch (e) {
        setFunnelError(friendlyApiError(e));
      }
    })();
  }, []);

  const ch = funnel?.cohort;
  const funnelRows: FunnelRow[] = (() => {
    if (!ch) return DEMO_FUNNEL;
    const total = Math.max(ch.ig_touches, 1);
    const pctOf = (n: number) => `${((n / total) * 100).toFixed(1)}%`;
    const widthOf = (n: number) => Math.min(100, (n / total) * 100);
    const values: { v: number; pct: string; w: number }[] = [
      { v: ch.ig_touches, pct: '100%', w: 100 },
      { v: ch.line_touches, pct: pctOf(ch.line_touches), w: widthOf(ch.line_touches) },
      { v: ch.bridged_ig_and_line, pct: pctOf(ch.bridged_ig_and_line), w: widthOf(ch.bridged_ig_and_line) },
      { v: ch.reservations_customers_booked, pct: pctOf(ch.reservations_customers_booked), w: widthOf(ch.reservations_customers_booked) },
      { v: ch.reservations_completed, pct: pctOf(ch.reservations_completed), w: widthOf(ch.reservations_completed) }
    ];
    return DEMO_FUNNEL.map((row, i) => {
      const it = values[i] ?? { v: 0, pct: row.pct, w: row.width };
      return { ...row, value: it.v.toLocaleString('ja-JP'), pct: it.pct, width: it.w };
    });
  })();

  return (
    <AppShell>
      <div className="page-head">
        <div>
          <h1>ダッシュボード</h1>
          <div className="sub">
            2026年5月2日（土） <span className="pulse" style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 4px 2px' }} /> Workers API 接続中 最終同期 2 分前
          </div>
        </div>
        <div className="toolbar">
          <div className="seg" role="tablist">
            <button type="button" className="active">今日</button>
            <button type="button">7日</button>
            <button type="button">30日</button>
            <button type="button">90日</button>
          </div>
          <button type="button" className="btn btn-ghost" title="更新">
            <RefreshCw size={14} strokeWidth={2} />
            更新
          </button>
          <button type="button" className="btn btn-primary">
            <Plus size={14} strokeWidth={2} />
            予約を追加
          </button>
        </div>
      </div>

      <div className="grid kpi">
        {KPI_CARDS.map((k) => (
          <div key={k.label} className={`card kpi-card ${k.tone}`}>
            <div className="top">
              <span className="label">
                {k.tone === 't' ? <Calendar size={13} strokeWidth={2} /> : null}
                {k.tone === 'b' ? <DollarSign size={13} strokeWidth={2} /> : null}
                {k.tone === 'p' ? <Link2 size={13} strokeWidth={2} /> : null}
                {k.tone === 'a' ? <Ticket size={13} strokeWidth={2} /> : null}
                {k.label}
              </span>
              <span className="ico">
                {k.tone === 't' ? <CheckCheck size={14} strokeWidth={2} /> : null}
                {k.tone === 'b' ? <TrendingUp size={14} strokeWidth={2} /> : null}
                {k.tone === 'p' ? <UserCheck size={14} strokeWidth={2} /> : null}
                {k.tone === 'a' ? <Star size={14} strokeWidth={2} /> : null}
              </span>
            </div>
            <div className="metric">
              <span>{k.metric}</span>
            </div>
            <span className={`delta ${k.deltaTone}`}>{k.delta}</span>
            <svg className="spark" viewBox="0 0 120 38" preserveAspectRatio="none">
              <polyline points={k.spark.line} fill="none" stroke={k.spark.stroke} strokeWidth="1.5" />
              <polyline points={`0,38 ${k.spark.line} 120,38`} fill={k.spark.fill} stroke="none" />
            </svg>
          </div>
        ))}
      </div>

      <div className="grid row2">
        <section className="card">
          <div className="card-h">
            <div>
              <h3>IG → LINE → 予約 ファネル</h3>
              <div className="sub">過去 30 日 / global_identity ベース</div>
            </div>
            <Link className="link" href="/analytics">
              ファネルを開く
              <ChevronRight size={12} strokeWidth={2.4} />
            </Link>
          </div>

          <div>
            {funnelRows.map((r) => (
              <div key={r.label} className="funnel-row">
                <div className="lbl">
                  <span className="dt" style={{ background: r.dotColor }} />
                  {r.label}
                </div>
                <div className="bar">
                  <span style={{ background: r.barGradient, width: `${r.width}%` }} />
                </div>
                <div>
                  <div className="v">{r.value}</div>
                  <div className="pct">{r.pct}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="conv-strip">
            <span>
              IG → LINE <b>47.9%</b>
            </span>
            <span>
              LINE → identity <b>47.2%</b>
            </span>
            <span>
              identity → 予約 <b>50.7%</b>
            </span>
            <span>
              全体 CV <b>11.5%</b>
            </span>
          </div>

          {funnelError ? (
            <p className="sub" style={{ color: 'var(--amber)', marginTop: 10, fontSize: 12 }}>
              {funnelError}
            </p>
          ) : null}
          {funnel?.note ? (
            <p className="sub" style={{ marginTop: 10, fontSize: 12 }}>
              {funnel.note}
            </p>
          ) : null}
        </section>

        <section className="card">
          <div className="card-h">
            <div>
              <h3>クイックアクション</h3>
              <div className="sub">よく使う作成系オペレーション</div>
            </div>
          </div>

          <div className="qa-grid">
            {QUICK_ACTIONS.map((a) => {
              const Icon = a.icon;
              return (
                <button key={a.title} type="button" className="qa">
                  <span className="ico">
                    <Icon size={15} strokeWidth={2} />
                  </span>
                  <div className="t">{a.title}</div>
                  <div className="d">{a.desc}</div>
                </button>
              );
            })}
          </div>

          <div className="alert" style={{ marginTop: 14 }}>
            <AlertCircle size={14} strokeWidth={2} />
            <div>
              <b>LINE Harness の Webhook</b>が 1 件失敗しています。
              <Link href="/settings">設定 → 連携</Link>で再送してください。
            </div>
            <button type="button" className="x" aria-label="閉じる">
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        </section>
      </div>

      <div className="grid row3">
        <section className="card">
          <div className="card-h">
            <div>
              <h3>今日のタイムライン</h3>
              <div className="sub">予約・クーポン使用・identity・automation</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="btn btn-ghost" title="空状態を表示">
                <Clock size={13} strokeWidth={2} />
                空状態
              </button>
            </div>
          </div>
          <div className="tl">
            {TIMELINE.map((e, idx) => (
              <div key={`${e.time}-${idx}`} className={`ev ${e.kind}`}>
                <div className="t">{e.time}</div>
                <div className="rail">
                  <div className="dot" />
                </div>
                <div className="body">
                  <div className="head">
                    {e.head}
                    <span className={`chip ${e.kind}`}>{e.tag}</span>
                  </div>
                  <div className="sub">
                    {e.sub}
                    {e.uuid !== '—' ? (
                      <>
                        {' '}
                        <span className="uuid">{e.uuid}</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="right">
                  {e.amount ? <span className="amt">{e.amount}</span> : null}
                  {e.right ? <span>{e.right}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-h">
            <div>
              <h3>本日の予約</h3>
              <div className="sub">14 件 顧客 UUID クリックでタイムラインへ</div>
            </div>
            <Link className="link" href="/reservations">
              すべての予約
              <ChevronRight size={12} strokeWidth={2.4} />
            </Link>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>日時</th>
                <th>顧客</th>
                <th>メニュー / スタイリスト</th>
                <th>状態</th>
                <th style={{ textAlign: 'right' }}>金額</th>
              </tr>
            </thead>
            <tbody>
              {TODAY_RES.map((r) => (
                <tr key={r.uuid + r.time}>
                  <td>
                    <b>{r.time}</b>
                  </td>
                  <td>
                    <div className="cust">
                      <div className={`av ${r.av}`}>{r.initial}</div>
                      <div className="nm">
                        {r.name}
                        <small>{r.uuid}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{r.menu}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '11.5px', marginTop: 2 }}>担当: {r.stylist}</div>
                  </td>
                  <td>
                    <span className={`stat ${r.status}`}>
                      <span className="dt" />
                      {STATUS_JA[r.status]}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                    ¥{r.amount.toLocaleString('ja-JP')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}
