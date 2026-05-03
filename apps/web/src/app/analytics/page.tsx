'use client';

import './analytics.css';
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Download,
  Filter,
  Info,
  Instagram,
  Link2,
  RefreshCw,
  Settings,
  Users,
  CheckCircle2
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { fetchApi, friendlyApiError, getApiKey } from '@/lib/api';

type FunnelPayload = {
  scope: string;
  global_identity: { distinct_with_ig: number; distinct_with_line: number; bridged_ig_and_line: number };
  cohort: {
    friend_count: number;
    ig_touches: number;
    line_touches: number;
    bridged_ig_and_line: number;
    reservations_completed: number;
    reservations_customers_booked: number;
  };
  note?: string;
};

type Step = { id: string; label: string; v: number; color: string; grad: string };

const EMPTY_STEPS: Step[] = [
  { id: 'ig', label: 'Instagram コメント', v: 0, color: '#6d28d9', grad: 'g-purple' },
  { id: 'gate', label: 'Engagement Gate 通過', v: 0, color: '#1d4ed8', grad: 'g-blue' },
  { id: 'line', label: 'LINE 友だち化', v: 0, color: '#0f766e', grad: 'g-teal' },
  { id: 'ident', label: 'identity_links 作成', v: 0, color: '#14a89c', grad: 'g-bridge' },
  { id: 'book', label: '予約完了', v: 0, color: '#b45309', grad: 'g-amber' }
];

type Kpi = { tone: 'purple' | 'blue' | 'teal' | 'amber'; label: string; icon: React.ReactNode; v: number; deltaText: string; deltaCls?: string; suffix?: React.ReactNode };

const RANGES = [
  { r: '7', label: '7日' },
  { r: '30', label: '30日' },
  { r: '90', label: '90日' },
  { r: '365', label: '12ヶ月' }
];

const COHORTS = [
  { c: 'global', label: '全体（global_identity）' },
  { c: 'booked', label: '予約あり顧客に絞る' }
];

const TREND_DAYS = 30;

const TREND_SERIES = (() => {
  const ig = Array.from({ length: TREND_DAYS }, (_, i) => 35 + 25 * Math.sin(i / 4) + 18 * Math.sin(i / 9) + (i > 20 ? 15 : 0));
  const ig0 = ig[0] ?? 0;
  const li = ig.map((v) => v * 0.48 + 4 * Math.sin(ig0 + v));
  const bk = li.map((v) => v * 0.24 + 2);
  return { ig, li, bk };
})();

const HIST_BINS = [
  { l: '同日', v: 62 },
  { l: '1d', v: 108 },
  { l: '2d', v: 84 },
  { l: '3d', v: 69 },
  { l: '4-7d', v: 142 },
  { l: '8-14d', v: 96 },
  { l: '15-30d', v: 54 },
  { l: '30d+', v: 21 }
];

const POSTS = [
  { id: '17944', name: '春の限定カラー10%OFF', date: '2026-04-12', media: 'media_17944…', count: 428, bot: 12, cv: 68 },
  { id: '17312', name: 'before/after #34', date: '2026-04-08', media: 'media_17312…', count: 312, bot: 4, cv: 55 },
  { id: '17890', name: 'リール: トリートメント解説', date: '2026-04-22', media: 'reel_17890…', count: 284, bot: 22, cv: 42 },
  { id: '17226', name: 'モデル写真: 結婚式', date: '2026-03-30', media: 'media_17226…', count: 198, bot: 1, cv: 71 },
  { id: '17612', name: 'ストーリーズ: 雨の日キャンペーン', date: '2026-04-18', media: 'story_17612…', count: 156, bot: 8, cv: 38 }
];

const GATE_TPL = [
  { pin: 'gate_v2', label: '春クーポン誘導', w: 78, v: 312, pct: '78%', grad: 'linear-gradient(90deg,#0f766e,#14a89c)' },
  { pin: 'gate_v1', label: '標準テンプレ', w: 52, v: 208, pct: '52%', grad: 'linear-gradient(90deg,#1d4ed8,#3b82f6)' },
  { pin: 'gate_brid', label: 'ブライダル誘導', w: 64, v: 144, pct: '64%', grad: 'linear-gradient(90deg,#6d28d9,#8b5cf6)' },
  { pin: 'gate_rein', label: 'リエンゲージ', w: 29, v: 88, pct: '29%', grad: 'linear-gradient(90deg,#b45309,#f59e0b)' },
  { pin: 'gate_test', label: 'A/B 試験中', w: 41, v: 42, pct: '41%', grad: 'linear-gradient(90deg,#475569,#94a3b8)' }
];

const STYLISTS = [
  { name: 'YUKI', w: 92, v: 86, pct: '41.1%', grad: 'linear-gradient(90deg,#0f766e,#14a89c)' },
  { name: 'AOI', w: 64, v: 59, pct: '28.2%', grad: 'linear-gradient(90deg,#1d4ed8,#3b82f6)' },
  { name: 'KEN', w: 42, v: 39, pct: '18.7%', grad: 'linear-gradient(90deg,#6d28d9,#8b5cf6)' },
  { name: 'MOMO', w: 28, v: 25, pct: '12.0%', grad: 'linear-gradient(90deg,#b45309,#f59e0b)' }
];

function buildFunnelPaths(steps: Step[]) {
  const W = 1200;
  const H = 230;
  const padX = 20;
  const padY = 20;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const n = steps.length;
  const segW = innerW / n;
  const gap = 8;
  const max = steps[0]?.v || 1;
  return steps.map((s, i) => {
    const ratio = max > 0 ? s.v / max : 0;
    const next = steps[i + 1];
    const nextRatio = next && max > 0 ? next.v / max : ratio * 0.85;
    const x = padX + i * segW;
    const w = segW - gap;
    const cy = padY + innerH / 2;
    const h = ratio * innerH;
    const top = cy - h / 2;
    const bottom = cy + h / 2;
    const nh = nextRatio * innerH;
    const ntop = cy - nh / 2;
    const nbottom = cy + nh / 2;
    const path =
      i < n - 1
        ? `M ${x},${top} L ${x + w},${ntop} L ${x + w},${nbottom} L ${x},${bottom} Z`
        : `M ${x},${top} L ${x + w},${cy - 3} L ${x + w},${cy + 3} L ${x},${bottom} Z`;
    let arrow: { d: string; x: number; y: number; drop: number; pct: string } | null = null;
    if (next) {
      const drop = s.v - next.v;
      const dropPct = s.v > 0 ? ((drop / s.v) * 100).toFixed(1) : '0.0';
      const ax = x + w + gap / 2;
      const ay1 = bottom + 6;
      const ay2 = ay1 + 14;
      arrow = {
        d: `M ${ax - 8} ${ay1} L ${ax + 8} ${ay1} M ${ax} ${ay1 - 3} L ${ax} ${ay2}`,
        x: ax,
        y: ay2 + 10,
        drop,
        pct: dropPct
      };
    }
    return {
      step: s,
      path,
      x,
      w,
      cy,
      top,
      pctOfMax: max > 0 ? ((s.v / max) * 100).toFixed(1) : '0.0',
      arrow
    };
  });
}

function buildTrendPaths() {
  const W = 600;
  const H = 160;
  const padL = 30;
  const padR = 10;
  const padT = 10;
  const padB = 22;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const all = [...TREND_SERIES.ig, ...TREND_SERIES.li, ...TREND_SERIES.bk];
  const max = Math.max(...all) * 1.05;

  function pts(ser: number[]) {
    return ser.map((v, i) => {
      const x = padL + (i / (TREND_DAYS - 1)) * iw;
      const y = padT + ih * (1 - v / max);
      return [x, y] as [number, number];
    });
  }
  function pathLine(p: [number, number][]) {
    return p.map((pt, i) => (i === 0 ? 'M' : 'L') + pt[0].toFixed(1) + ',' + pt[1].toFixed(1)).join(' ');
  }
  function pathArea(p: [number, number][]) {
    if (p.length === 0) return '';
    const last = p[p.length - 1]!;
    const first = p[0]!;
    return pathLine(p) + ` L ${last[0].toFixed(1)} ${(padT + ih).toFixed(1)} L ${first[0].toFixed(1)} ${(padT + ih).toFixed(1)} Z`;
  }

  const series = [
    { ser: TREND_SERIES.ig, color: '#6d28d9', grad: 't-igl' },
    { ser: TREND_SERIES.li, color: '#0f766e', grad: 't-line' },
    { ser: TREND_SERIES.bk, color: '#b45309', grad: 't-book' }
  ].map((s) => {
    const p = pts(s.ser);
    return { ...s, area: pathArea(p), line: pathLine(p) };
  });

  const grid = [0, 0.25, 0.5, 0.75, 1].map((p) => ({
    y: padT + ih * (1 - p),
    label: Math.round(max * p).toString()
  }));

  const xLabels: { x: number; label: string }[] = [];
  for (let i = 0; i < TREND_DAYS; i += 5) {
    xLabels.push({ x: padL + (i / (TREND_DAYS - 1)) * iw, label: `D-${TREND_DAYS - 1 - i}` });
  }

  return { series, grid, xLabels, W, H, padL, padR };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<FunnelPayload | null>(null);
  const [error, setError] = useState('');
  const [activeRange, setActiveRange] = useState('30');
  const [activeCohort, setActiveCohort] = useState('global');
  const [activeCohortSeg, setActiveCohortSeg] = useState('all');
  const [selectedStep, setSelectedStep] = useState<number | null>(null);

  async function load() {
    setError('');
    if (!getApiKey()) {
      setData(null);
      return;
    }
    try {
      setData(await fetchApi<FunnelPayload>('/api/analytics/funnel'));
    } catch (err) {
      setData(null);
      setError(friendlyApiError(err));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const steps: Step[] = (() => {
    if (!data) return EMPTY_STEPS;
    const ig = data.global_identity?.distinct_with_ig ?? 0;
    const line = data.global_identity?.distinct_with_line ?? 0;
    const ident = data.global_identity?.bridged_ig_and_line ?? 0;
    const book = data.cohort?.reservations_completed ?? 0;
    const gate = Math.max(ig, line, ident);
    const apiSteps: Step[] = [
      { id: 'ig', label: 'Instagram コメント', v: ig, color: '#6d28d9', grad: 'g-purple' },
      { id: 'gate', label: 'Engagement Gate 通過', v: gate, color: '#1d4ed8', grad: 'g-blue' },
      { id: 'line', label: 'LINE 友だち化', v: line, color: '#0f766e', grad: 'g-teal' },
      { id: 'ident', label: 'identity_links 作成', v: ident, color: '#14a89c', grad: 'g-bridge' },
      { id: 'book', label: '予約完了', v: book, color: '#b45309', grad: 'g-amber' }
    ];
    return apiSteps;
  })();

  const top = steps[0]?.v || 1;

  const igVal = data?.global_identity?.distinct_with_ig ?? 0;
  const gateVal = (() => {
    if (!data) return 0;
    const g = data.global_identity;
    return Math.max(g?.distinct_with_ig ?? 0, g?.distinct_with_line ?? 0, g?.bridged_ig_and_line ?? 0);
  })();
  const identVal = data?.global_identity?.bridged_ig_and_line ?? 0;
  const bookVal = data?.cohort?.reservations_completed ?? 0;

  const kpis: Kpi[] = [
    {
      tone: 'purple',
      label: 'IG コメント',
      icon: <Instagram size={12} strokeWidth={2.4} />,
      v: igVal,
      deltaText: '▲ +18.3%',
      deltaCls: 'up',
      suffix: <> vs 前30日</>
    },
    {
      tone: 'blue',
      label: 'Gate 通過',
      icon: <CheckCircle2 size={12} strokeWidth={2.4} />,
      v: gateVal,
      deltaText: '▲ +12.1%',
      deltaCls: 'up',
      suffix: (
        <>
          {' '}
          通過率 <b style={{ color: 'var(--ink)' }}>63.8%</b>
        </>
      )
    },
    {
      tone: 'teal',
      label: 'identity 結合',
      icon: <Link2 size={12} strokeWidth={2.4} />,
      v: identVal,
      deltaText: '▲ +28',
      deltaCls: 'up',
      suffix: <> 同一 UUID（IG ↔ LINE）</>
    },
    {
      tone: 'amber',
      label: '予約完了',
      icon: <Calendar size={12} strokeWidth={2.4} />,
      v: bookVal,
      deltaText: '▲ +9.4%',
      deltaCls: 'up',
      suffix: (
        <>
          {' '}
          全体 CV <b style={{ color: 'var(--ink)' }}>11.5%</b>
        </>
      )
    }
  ];

  const funnel = buildFunnelPaths(steps);
  const trend = buildTrendPaths();
  const histMax = Math.max(...HIST_BINS.map((b) => b.v));
  const histPeak = HIST_BINS.findIndex((b) => b.v === histMax);

  return (
    <AppShell>
      <div className="page-head">
        <div>
          <h1>分析</h1>
          <div className="sub">
            Instagram コメント → Engagement Gate → LINE 友だち化 → identity 結合 → 予約完了 のファネル可視化。
            <br />
            細かいコメントログは <code>ig-harness</code> / <code>line-harness</code> 側のダッシュボードを参照してください。
            <span className="pulse" /> Workers API 接続中 ・ 最終同期 2 分前
          </div>
        </div>
        <div className="actions">
          <div className="seg">
            {RANGES.map((r) => (
              <button
                key={r.r}
                type="button"
                className={activeRange === r.r ? 'active' : ''}
                onClick={() => setActiveRange(r.r)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn" onClick={() => void load()}>
            <RefreshCw size={14} strokeWidth={2} />
            更新
          </button>
          <button type="button" className="btn">
            <Users size={14} strokeWidth={2} />
            顧客一覧
          </button>
          <button type="button" className="btn btn-primary">
            <Download size={14} strokeWidth={2} />
            CSV エクスポート
          </button>
        </div>
      </div>

      {error && (
        <div className="note" style={{ background: 'var(--rose-soft)', borderColor: 'var(--rose-line)', color: 'var(--rose)', marginTop: 0, marginBottom: 14 }}>
          <span className="ico" style={{ color: 'var(--rose)', borderColor: 'var(--rose-line)' }}>
            <AlertTriangle size={13} strokeWidth={2.4} />
          </span>
          <div>{error}</div>
        </div>
      )}

      <div className="strip">
        <span className="lbl">コホート</span>
        <div className="seg">
          {COHORTS.map((c) => (
            <button
              key={c.c}
              type="button"
              className={activeCohort === c.c ? 'active' : ''}
              onClick={() => setActiveCohort(c.c)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <span className="sep" />
        <span className="lbl">スタイリスト</span>
        <select defaultValue="all">
          <option value="all">すべて</option>
          <option>YUKI</option>
          <option>AOI</option>
          <option>KEN</option>
          <option>MOMO</option>
        </select>
        <span className="sep" />
        <span className="lbl">流入</span>
        <select defaultValue="all">
          <option value="all">IG（すべて）</option>
          <option>春クーポン投稿</option>
          <option>before/after シリーズ</option>
          <option>リール: トリートメント</option>
        </select>
        <div className="grow" />
        <button type="button" className="btn sm">
          <Filter size={13} strokeWidth={2} />
          フィルタ追加
        </button>
      </div>

      <div className="kpis">
        {kpis.map((k) => (
          <div key={k.label} className={`kpi ${k.tone}`}>
            <div className="k">
              <span className="ico">{k.icon}</span>
              {k.label}
            </div>
            <div className="v">{k.v.toLocaleString('ja-JP')}</div>
            <div className="d">
              <span className={`delta ${k.deltaCls ?? 'flat'}`}>{k.deltaText}</span>
              {k.suffix}
            </div>
          </div>
        ))}
      </div>

      {data?.note && (
        <div className="note" style={{ marginTop: 0, marginBottom: 14 }}>
          <span className="ico">
            <Info size={13} strokeWidth={2.4} />
          </span>
          <div>{data.note}</div>
        </div>
      )}

      <section className="card">
        <div className="hd">
          <div>
            <h3>
              <Filter size={14} strokeWidth={2} />
              全体ファネル
            </h3>
            <div className="sub">
              過去 30 日 ・{' '}
              <code className="mono" style={{ fontSize: 11, background: 'var(--header)', border: '1px solid var(--line)', padding: '1px 5px', borderRadius: 4 }}>
                /api/analytics/funnel
              </code>{' '}
              ベース ・ 各ステップをクリックで詳細
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button type="button" className="btn sm">
              <Settings size={13} strokeWidth={2} />
              ステップ設定
            </button>
          </div>
        </div>

        <div className="funnel-wrap">
          <svg className="fn-svg" viewBox="0 0 1200 230" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="g-purple" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="#6d28d9" />
                <stop offset="1" stopColor="#8b5cf6" />
              </linearGradient>
              <linearGradient id="g-blue" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="#1d4ed8" />
                <stop offset="1" stopColor="#3b82f6" />
              </linearGradient>
              <linearGradient id="g-teal" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="#0f766e" />
                <stop offset="1" stopColor="#14a89c" />
              </linearGradient>
              <linearGradient id="g-bridge" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="#14a89c" />
                <stop offset="1" stopColor="#5eead4" />
              </linearGradient>
              <linearGradient id="g-amber" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="#b45309" />
                <stop offset="1" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
            <g>
              {funnel.map((f, i) => (
                <path
                  key={f.step.id}
                  d={f.path}
                  fill={`url(#${f.step.grad})`}
                  className="band"
                  style={{ cursor: 'pointer', opacity: selectedStep === null || selectedStep === i ? 1 : 0.6 }}
                />
              ))}
            </g>
            <g>
              {funnel.map(
                (f) =>
                  f.arrow && (
                    <g key={`arr-${f.step.id}`}>
                      <path d={f.arrow.d} className="arrow" />
                      <text x={f.arrow.x} y={f.arrow.y} textAnchor="middle" className="drop">
                        −{f.arrow.drop.toLocaleString('ja-JP')} ({f.arrow.pct}%)
                      </text>
                    </g>
                  )
              )}
            </g>
            <g>
              {funnel.map((f) => (
                <g key={`lbl-${f.step.id}`}>
                  <text x={f.x + f.w / 2} y={f.top - 8} textAnchor="middle" className="lbl-out">
                    {f.step.label}
                  </text>
                  <text x={f.x + f.w / 2} y={f.cy + 5} textAnchor="middle" className="vlbl">
                    {f.step.v.toLocaleString('ja-JP')}
                  </text>
                  <text x={f.x + f.w / 2} y={f.cy + 22} textAnchor="middle" className="pct">
                    {f.pctOfMax}%
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </div>

        <div className="funnel-toolbar">
          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
            幅は通過数。各バンドの数字は <b style={{ color: 'var(--ink)' }}>絶対数 / 直前比 / 累計比</b>。点線矢印 + 赤数字はドロップオフ。
          </span>
          <div className="legend">
            <span>
              <i style={{ background: '#6d28d9' }} />
              IG
            </span>
            <span>
              <i style={{ background: '#1d4ed8' }} />
              Gate
            </span>
            <span>
              <i style={{ background: '#0f766e' }} />
              LINE
            </span>
            <span>
              <i style={{ background: '#14a89c' }} />
              identity
            </span>
            <span>
              <i style={{ background: '#b45309' }} />
              予約
            </span>
          </div>
        </div>

        <div className="stair">
          {steps.map((s, i) => {
            const prev = steps[i - 1];
            const stepFromPrev = i === 0 ? 100 : prev && prev.v > 0 ? (s.v / prev.v) * 100 : 0;
            const cumul = top > 0 ? (s.v / top) * 100 : 0;
            const drop = i === 0 || !prev ? 0 : prev.v - s.v;
            return (
              <div
                key={s.id}
                className={`step${selectedStep === i ? ' sel' : ''}`}
                onClick={() => setSelectedStep(i)}
              >
                <div className="ix">
                  STEP {i + 1} · {s.id.toUpperCase()}
                </div>
                <div className="nm">
                  <span className="dt" style={{ background: s.color }} />
                  {s.label}
                </div>
                <div className="v">{s.v.toLocaleString('ja-JP')}</div>
                <div className="pct">
                  {i === 0 ? (
                    <b>入口</b>
                  ) : (
                    <>
                      直前比 <b>{stepFromPrev.toFixed(1)}%</b>
                      <span className="drop">−{drop.toLocaleString('ja-JP')}</span>
                    </>
                  )}
                </div>
                <div className="bar">
                  <i style={{ width: `${cumul}%`, background: `linear-gradient(90deg,${s.color},${s.color}dd)` }} />
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                  累計{' '}
                  <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{cumul.toFixed(1)}%</b>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid-row">
        <section className="card">
          <div className="hd">
            <div>
              <h3>コホート別 CV（30日）</h3>
              <div className="sub">
                予約あり顧客に絞ったファネル ・{' '}
                <span style={{ color: 'var(--rose-soft)', background: 'var(--rose)', padding: '1px 6px', borderRadius: 99, fontSize: 10.5, fontWeight: 700 }}>
                  ⚠ stylist=YUKI のみで集計
                </span>
              </div>
            </div>
            <div className="seg">
              {[
                { c: 'all', label: '全コホート' },
                { c: 'new', label: '新規' },
                { c: 'reb', label: '再来店' }
              ].map((c) => (
                <button
                  key={c.c}
                  type="button"
                  className={activeCohortSeg === c.c ? 'active' : ''}
                  onClick={() => setActiveCohortSeg(c.c)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="bd">
            <svg className="trend" viewBox={`0 0 ${trend.W} ${trend.H}`} preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="t-igl" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#6d28d9" stopOpacity=".25" />
                  <stop offset="1" stopColor="#6d28d9" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="t-line" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#0f766e" stopOpacity=".25" />
                  <stop offset="1" stopColor="#0f766e" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="t-book" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#b45309" stopOpacity=".25" />
                  <stop offset="1" stopColor="#b45309" stopOpacity="0" />
                </linearGradient>
              </defs>
              <g stroke="#dbe3ea" strokeWidth={1} strokeDasharray="2 3">
                {trend.grid.map((g) => (
                  <line key={g.y} x1={trend.padL} x2={trend.W - trend.padR} y1={g.y} y2={g.y} />
                ))}
              </g>
              <g>
                {trend.grid.map((g) => (
                  <text key={`gl-${g.y}`} x={4} y={g.y + 3} fontFamily="JetBrains Mono,monospace" fontSize={9} fill="#94a3b0">
                    {g.label}
                  </text>
                ))}
              </g>
              <g fontFamily="JetBrains Mono,monospace" fontSize={9} fill="#64748b">
                {trend.xLabels.map((x) => (
                  <text key={x.label} x={x.x} y={trend.H - 6} textAnchor="middle">
                    {x.label}
                  </text>
                ))}
              </g>
              <g>
                {trend.series.map((s) => (
                  <path key={`a-${s.color}`} d={s.area} fill={`url(#${s.grad})`} />
                ))}
              </g>
              <g>
                {trend.series.map((s) => (
                  <path
                    key={`l-${s.color}`}
                    d={s.line}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ))}
              </g>
            </svg>
            <div className="trend-legend">
              <span>
                <i style={{ background: '#6d28d9' }} />
                IG コメント
              </span>
              <span>
                <i style={{ background: '#0f766e' }} />
                LINE 友だち化
              </span>
              <span>
                <i style={{ background: '#b45309' }} />
                予約完了
              </span>
              <span style={{ marginLeft: 'auto' }}>直近 30 日</span>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="hd">
            <div>
              <h3>友だち化から予約までの時間</h3>
              <div className="sub">LINE identity 作成から最初の予約完了までの分布</div>
            </div>
          </div>
          <div className="bd">
            <div className="hist">
              {HIST_BINS.map((b, i) => (
                <div
                  key={b.l}
                  className={`col${i === histPeak ? ' peak' : ''}`}
                  style={{ height: `${(b.v / histMax) * 100}%` }}
                >
                  <span className="v">{b.v}</span>
                </div>
              ))}
            </div>
            <div className="hist-x">
              {HIST_BINS.map((b) => (
                <span key={b.l}>{b.l}</span>
              ))}
            </div>
            <div className="hist-summary">
              <span>
                中央値 <b>4.2 日</b>
              </span>
              <span>
                P75 <b>11 日</b>
              </span>
              <span>
                未予約 <b style={{ color: 'var(--rose)' }}>38.4%</b>
              </span>
              <span>
                n = <b>872</b>
              </span>
            </div>
          </div>
        </section>
      </div>

      <div className="grid-3">
        <section className="card">
          <div className="hd">
            <div>
              <h3>流入元 IG 投稿 Top 5</h3>
              <div className="sub">コメント数 → LINE 友だち化 CV</div>
            </div>
          </div>
          <div className="bd flush">
            <table className="ptbl">
              <thead>
                <tr>
                  <th>投稿</th>
                  <th style={{ textAlign: 'right' }}>コメント</th>
                  <th>LINE CV</th>
                </tr>
              </thead>
              <tbody>
                {POSTS.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="post">
                        <div className="th">{p.id}</div>
                        <div className="nm">
                          <b>{p.name}</b>
                          <small>
                            {p.date} ・ {p.media}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td className="num" style={{ textAlign: 'right' }}>
                      {p.count}
                      <small>うち bot {p.bot}</small>
                    </td>
                    <td>
                      <div className="ic-cv">
                        <div className="mini-bar">
                          <i style={{ width: `${p.cv}%` }} />
                        </div>
                        <span className="pct">{p.cv}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="hd">
            <div>
              <h3>Engagement Gate テンプレ</h3>
              <div className="sub">DM 自動返信テンプレ別 CV</div>
            </div>
          </div>
          <div className="bd">
            <div className="h-bars">
              {GATE_TPL.map((g) => (
                <div key={g.pin} className="h-bar">
                  <span className="l">
                    <span className="pin">{g.pin}</span>
                    {g.label}
                  </span>
                  <div className="b">
                    <i style={{ width: `${g.w}%`, background: g.grad }} />
                  </div>
                  <div className="v">
                    {g.v}
                    <small>{g.pct}</small>
                  </div>
                </div>
              ))}
            </div>
            <div className="note" style={{ marginTop: 14 }}>
              <span className="ico">
                <Info size={13} strokeWidth={2.4} />
              </span>
              <div>
                <b>gate_v2</b> が最高 CV。標準テンプレは置き換え検討。粗いログのみ表示 — 詳細コメントは <code>ig-harness</code>。
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="hd">
            <div>
              <h3>スタイリスト別 予約寄与</h3>
              <div className="sub">identity → 予約 のうち担当別の内訳</div>
            </div>
          </div>
          <div className="bd">
            <div className="h-bars">
              {STYLISTS.map((s) => (
                <div key={s.name} className="h-bar">
                  <span className="l">{s.name}</span>
                  <div className="b">
                    <i style={{ width: `${s.w}%`, background: s.grad }} />
                  </div>
                  <div className="v">
                    {s.v}
                    <small>{s.pct}</small>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px dashed var(--line)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>指名率</div>
                <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>61.4%</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>平均単価</div>
                <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>¥9,820</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="note">
        <span className="ico">
          <Info size={13} strokeWidth={2.4} />
        </span>
        <div>
          <b>これは粗いファネルです。</b>
          細かいコメントログ・送信ログ・Webhook ペイロードは <code>ig-harness</code> / <code>line-harness</code> のダッシュボードで確認できます。
          スタイリスト権限のユーザーは自分が担当した予約に紐づく数値のみが見えます。
        </div>
      </div>
    </AppShell>
  );
}
