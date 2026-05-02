'use client';

import './customer-timeline.css';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Edit2,
  Link2,
  MessageSquare,
  RefreshCw,
  Send
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { fetchApi, friendlyApiError, getApiKey } from '@/lib/api';

type TimelineEvent = { kind: string; at: string; title: string; subtitle?: string; meta?: Record<string, unknown> };

type Detail = {
  friend_id: string;
  display_name: string | null;
  timeline: TimelineEvent[];
  identity_links: { source: string; external_id: string; created_at: string; metadata?: string | null }[];
};

type DemoEvent = {
  iso: string;
  time: string;
  kind: 'identity' | 'reservation' | 'coupon' | 'karte' | 'automation' | 'message';
  evt: string;
  title: React.ReactNode;
  sub: React.ReactNode;
};

const DEMO_EVENTS: DemoEvent[] = [
  {
    iso: '2026-05-02',
    time: '18:42',
    kind: 'automation',
    evt: 'automation.reminder_scheduled',
    title: (
      <>
        リマインド送信を予約 <span className="name">5/7 19:00</span>
      </>
    ),
    sub: (
      <>
        前日リマインドテンプレ <code>tmpl_remind_24h</code> を 5/7 19:00 に発火予定。
      </>
    )
  },
  {
    iso: '2026-05-02',
    time: '18:40',
    kind: 'reservation',
    evt: 'reservation.created',
    title: (
      <>
        予約作成 <span className="name">5/8 14:00 カラー + トリートメント</span>
      </>
    ),
    sub: (
      <>
        担当 <b>YUKI</b> ・ 所要 120 分 ・ 予定 <span className="amt">¥13,200</span> ・ LIFF 経由
      </>
    )
  },
  {
    iso: '2026-05-02',
    time: '18:39',
    kind: 'message',
    evt: 'message.received',
    title: (
      <>
        LINE 受信 <span className="name">← さら</span>
      </>
    ),
    sub: '「5/8 14時で予約お願いします、いつものカラーで！」'
  },
  {
    iso: '2026-04-30',
    time: '15:14',
    kind: 'karte',
    evt: 'karte.updated',
    title: (
      <>
        カルテ更新 <span className="name">YUKI が更新</span>
      </>
    ),
    sub: (
      <>
        毛先ダメージ <code>level 2</code> に修正。次回はカラー前にトリートメント追加を提案。
      </>
    )
  },
  {
    iso: '2026-04-30',
    time: '14:48',
    kind: 'reservation',
    evt: 'reservation.completed',
    title: (
      <>
        来店完了 <span className="name">カット + カラー</span>
      </>
    ),
    sub: (
      <>
        担当 YUKI ・ 滞在 110 分 ・ 売上 <span className="amt">¥14,300</span> ・ 次回予約案内済み
      </>
    )
  },
  {
    iso: '2026-04-30',
    time: '13:02',
    kind: 'coupon',
    evt: 'coupon.used',
    title: (
      <>
        クーポン使用 <span className="name">SPRING10</span>
      </>
    ),
    sub: (
      <>
        カラー10%OFF ・ 値引 <span className="amt">¥1,430</span> ・ キャンペーン <code>cmp_spring_2026</code> 由来
      </>
    )
  },
  {
    iso: '2026-04-29',
    time: '09:11',
    kind: 'automation',
    evt: 'automation.reminder_sent',
    title: <>前日リマインド配信</>,
    sub: (
      <>
        LINE 自動配信 ・ 開封 <b>済</b> ・ クリック <b>なし</b>
      </>
    )
  },
  {
    iso: '2026-04-22',
    time: '19:50',
    kind: 'message',
    evt: 'message.sent',
    title: (
      <>
        LINE 送信 <span className="name">→ さら</span>
      </>
    ),
    sub: (
      <>
        4月 春クーポンのご案内（テンプレ <code>tmpl_spring_blast</code>）
      </>
    )
  },
  {
    iso: '2026-04-15',
    time: '12:30',
    kind: 'coupon',
    evt: 'coupon.issued',
    title: (
      <>
        クーポン配布 <span className="name">SPRING10</span>
      </>
    ),
    sub: '有効期限 2026-05-31 ・ 配布先 セグメント「VIP + LINE 友だち」'
  },
  {
    iso: '2026-02-03',
    time: '09:12',
    kind: 'identity',
    evt: 'identity.relinked',
    title: (
      <>
        identity 再連携 <span className="name">LINE</span>
      </>
    ),
    sub: 'LIFF ログイン経由で LINE userId が再認証。同一 friend_id に統合済。'
  },
  {
    iso: '2025-12-24',
    time: '16:08',
    kind: 'karte',
    evt: 'karte.created',
    title: (
      <>
        カルテ初回作成 <span className="name">来店時アンケート</span>
      </>
    ),
    sub: '髪質：細毛 / くせ弱め / アレルギー：パラフェニ系 ×'
  },
  {
    iso: '2025-08-14',
    time: '10:31',
    kind: 'identity',
    evt: 'identity.linked',
    title: (
      <>
        LINE 友だち追加 <span className="name">identity_links 作成</span>
      </>
    ),
    sub: (
      <>
        IG コメント → Engagement Gate 経由で LINE 友だち追加 → identity 結合。所要 <b>2分</b>
      </>
    )
  },
  {
    iso: '2025-08-12',
    time: '14:11',
    kind: 'automation',
    evt: 'automation.gate_passed',
    title: <>Engagement Gate 通過</>,
    sub: (
      <>
        IG 投稿 <code>media_17944…</code> のコメント「予約」キーワードで自動 DM 送信 → LINE 友だち URL 発火
      </>
    )
  },
  {
    iso: '2025-08-12',
    time: '14:08',
    kind: 'identity',
    evt: 'identity.discovered',
    title: (
      <>
        初回 identity 作成 <span className="name">Instagram</span>
      </>
    ),
    sub: (
      <>
        IG ハンドル <code>@sara_m_88</code> のコメントが ig-harness で観測され friend_id を新規発行。
      </>
    )
  }
];

const FILTER_CHIPS: { key: 'all' | DemoEvent['kind']; label: string; color?: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'reservation', label: '予約', color: 'var(--blue)' },
  { key: 'identity', label: 'identity', color: 'var(--teal)' },
  { key: 'coupon', label: 'クーポン', color: 'var(--amber)' },
  { key: 'karte', label: 'カルテ', color: 'var(--purple)' },
  { key: 'automation', label: 'automation', color: 'var(--slate)' },
  { key: 'message', label: 'メッセージ', color: 'var(--pink)' }
];

function evIcon(kind: DemoEvent['kind']) {
  const common = { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.5 };
  if (kind === 'reservation')
    return (
      <svg {...common} aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    );
  if (kind === 'identity')
    return (
      <svg {...common} aria-hidden>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    );
  if (kind === 'coupon')
    return (
      <svg {...common} aria-hidden>
        <path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" />
        <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
      </svg>
    );
  if (kind === 'karte')
    return (
      <svg {...common} aria-hidden>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="13" y2="17" />
      </svg>
    );
  if (kind === 'automation')
    return (
      <svg {...common} aria-hidden>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    );
  return (
    <svg {...common} aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function fmtDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return '今日 ・ ' + iso;
  if (diff === 1) return '昨日 ・ ' + iso;
  if (diff < 7) return `${diff} 日前 ・ ${iso}`;
  if (diff < 30) return `${Math.floor(diff / 7)} 週間前 ・ ${iso}`;
  if (diff < 365) return `${Math.floor(diff / 30)} ヶ月前 ・ ${iso}`;
  return `${Math.floor(diff / 365)} 年前 ・ ${iso}`;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const raw = params?.friendId;
  const friendId = Array.isArray(raw) ? raw[0] : raw;
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | DemoEvent['kind']>('all');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [composerCh, setComposerCh] = useState<'line' | 'ig' | 'note'>('line');

  async function load() {
    if (!friendId) return;
    setError('');
    if (!getApiKey()) {
      setData(null);
      setError('ログイン情報がありません。');
      return;
    }
    try {
      const d = await fetchApi<Detail>(`/api/customers/${encodeURIComponent(friendId)}`);
      setData(d);
    } catch (err) {
      setData(null);
      setError(friendlyApiError(err));
    }
  }

  useEffect(() => {
    void load();
  }, [friendId]);

  const counts = FILTER_CHIPS.reduce<Record<string, number>>((acc, c) => {
    acc[c.key] = c.key === 'all' ? DEMO_EVENTS.length : DEMO_EVENTS.filter((e) => e.kind === c.key).length;
    return acc;
  }, {});

  const filteredEvents = DEMO_EVENTS.filter((e) => filter === 'all' || e.kind === filter)
    .slice()
    .sort((a, b) => {
      const A = a.iso + ' ' + a.time;
      const B = b.iso + ' ' + b.time;
      return sortDir === 'desc' ? (A < B ? 1 : -1) : A < B ? -1 : 1;
    });

  const grouped: { day: string; events: DemoEvent[] }[] = [];
  for (const ev of filteredEvents) {
    const last = grouped[grouped.length - 1];
    if (last && last.day === ev.iso) last.events.push(ev);
    else grouped.push({ day: ev.iso, events: [ev] });
  }

  const titleName = data?.display_name ?? '松本 さら';
  const fid = friendId ?? '';

  return (
    <AppShell>
      <div className="page-tl">
        <div className="back-row">
          <Link className="btn" href="/customers">
            <ArrowLeft size={14} />顧客一覧へ
          </Link>
          <button type="button" className="btn icon-only" title="前の顧客" disabled>
            <ChevronLeft size={14} />
          </button>
          <button type="button" className="btn icon-only" title="次の顧客" disabled>
            <ChevronRight size={14} />
          </button>
          <div className="right">
            <button type="button" className="btn" onClick={() => void load()}>
              <RefreshCw size={14} />更新
            </button>
            <button type="button" className="btn" disabled>
              <Download size={14} />
              CSV
            </button>
            <button type="button" className="btn" disabled>
              <Edit2 size={14} />編集
            </button>
            <Link className="btn btn-primary" href={fid ? `/messages?friend_id=${encodeURIComponent(fid)}` : '/messages'}>
              <MessageSquare size={14} />メッセージを送る
            </Link>
          </div>
        </div>

        <section className="profile">
          <div className="p-av av-r">
            松
            <span className="link-ind">
              <Link2 size={11} />
            </span>
          </div>
          <div className="p-meta">
            <div className="p-name">
              <h1>{titleName}</h1>
              <span className="reading">まつもと さら</span>
              <span className="p-tag vip">★ VIP</span>
              <span className="p-tag regular">来店 18 回</span>
            </div>
            <div className="p-uuid" title="UUID をコピー">
              <Link2 size={11} />
              <span>friend_id</span>
              <span style={{ color: 'var(--ink)' }}>{fid || '8e9c1a44-22b4-4ef0-9d0f-c1e2f3a4b421'}</span>
              <Copy size={11} />
            </div>
            <div className="p-channels">
              <span className="ch ig">
                <span className="d" />IG @sara_m_88
              </span>
              <span className="ch li">
                <span className="d" />
                LINE さら
              </span>
              <span className="ch bridge">
                <Link2 size={10} />identity 統合済
              </span>
            </div>
          </div>

          <div className="p-stats">
            <div className="p-stat">
              <div className="v">¥248,400</div>
              <div className="l">累計売上 LTV</div>
            </div>
            <div className="p-stat">
              <div className="v">
                18 <small>回</small>
              </div>
              <div className="l">来店回数</div>
            </div>
            <div className="p-stat">
              <div className="v">¥13,800</div>
              <div className="l">平均単価</div>
            </div>
            <div className="p-stat">
              <div className="v" style={{ color: 'var(--accent-600)' }}>
                5月8日
              </div>
              <div className="l">次回予約</div>
            </div>
          </div>
        </section>

        {error && (
          <p className="panel" style={{ color: 'var(--rose)', marginTop: 14 }}>
            {error}
          </p>
        )}

        <div className="grid-main">
          <div>
            <section className="tl-card">
              <div className="hd">
                <div>
                  <h3>
                    <Clock size={14} />
                    イベントタイムライン
                  </h3>
                  <div className="sub">
                    予約・identity・クーポン・カルテ・automation を時系列で表示
                    <span className="pulse" style={{ marginLeft: 8 }} aria-hidden /> リアルタイム同期
                  </div>
                </div>
                <div className="legend">
                  <span>
                    <i style={{ background: 'var(--blue)' }} />
                    reservation
                  </span>
                  <span>
                    <i style={{ background: 'var(--teal)' }} />
                    identity
                  </span>
                  <span>
                    <i style={{ background: 'var(--amber)' }} />
                    coupon
                  </span>
                  <span>
                    <i style={{ background: 'var(--purple)' }} />
                    karte
                  </span>
                  <span>
                    <i style={{ background: 'var(--slate)' }} />
                    automation
                  </span>
                  <span>
                    <i style={{ background: 'var(--pink)' }} />
                    message
                  </span>
                </div>
              </div>

              <div className="filter-row">
                {FILTER_CHIPS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={`chip-f${filter === c.key ? ' active' : ''}`}
                    onClick={() => setFilter(c.key)}>
                    {c.color && <span className="dt" style={{ background: c.color }} />}
                    {c.label}
                    <span className="sw">{counts[c.key] ?? 0}</span>
                  </button>
                ))}
                <div className="seg-sort">
                  <button
                    type="button"
                    className={sortDir === 'desc' ? 'active' : ''}
                    onClick={() => setSortDir('desc')}>
                    新しい順
                  </button>
                  <button
                    type="button"
                    className={sortDir === 'asc' ? 'active' : ''}
                    onClick={() => setSortDir('asc')}>
                    古い順
                  </button>
                </div>
              </div>

              <div className="tl-body">
                {grouped.map(({ day, events }) => (
                  <div key={day}>
                    <div className="tl-day">
                      <span className="lbl">{fmtDay(day)}</span>
                      <span className="ln" />
                    </div>
                    {events.map((e, i) => (
                      <div key={`${day}-${i}`} className={`ev k-${e.kind}`}>
                        <div className="t">
                          {e.time}
                          <small>{e.iso.slice(5)}</small>
                        </div>
                        <div className="rail">
                          <span className="dot ev-icon">{evIcon(e.kind)}</span>
                        </div>
                        <div className="body">
                          <div className="row">
                            <div className="head">
                              <p className="ttl">{e.title}</p>
                              <span className="echip">{e.evt}</span>
                            </div>
                            <div className="sub">{e.sub}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>

            <div className="composer">
              <div className="ch-tabs">
                <button type="button" className={composerCh === 'line' ? 'active' : ''} onClick={() => setComposerCh('line')}>
                  LINE
                </button>
                <button type="button" className={composerCh === 'ig' ? 'active' : ''} onClick={() => setComposerCh('ig')}>
                  IG DM
                </button>
                <button type="button" className={composerCh === 'note' ? 'active' : ''} onClick={() => setComposerCh('note')}>
                  カルテ
                </button>
              </div>
              <div className="input">
                <textarea placeholder="さらさんへ、5/8 のご来店ありがとうございます。担当 YUKI からのフォロー…" />
                <div className="crow">
                  <span className="hint">
                    送信先 <code>friend_id={fid ? fid.slice(0, 8) + '…' + fid.slice(-4) : '8e9c1a44…b421'}</code> ・ LINE Harness 経由
                  </span>
                  <div className="right">
                    <button type="button" className="btn sm" disabled>
                      テンプレ
                    </button>
                    <button type="button" className="btn sm" disabled>
                      クーポン添付
                    </button>
                    <button type="button" className="btn btn-primary sm" disabled>
                      送信
                      <Send size={11} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="side">
            <section className="tl-card">
              <div className="hd">
                <h3>次回予約</h3>
                <button type="button" className="btn sm btn-ghost">
                  変更
                </button>
              </div>
              <div className="bd">
                <div className="next-res">
                  <div className="when">
                    <div className="day">
                      <div className="m">5月</div>
                      <div className="d">8</div>
                      <div className="w">金</div>
                    </div>
                    <div className="info">
                      <div className="ttl">14:00 — カラー + トリートメント</div>
                      <div className="by">担当 YUKI ・ 所要 120 分 ・ 予定 ¥13,200</div>
                    </div>
                  </div>
                  <div className="nrow">
                    <span className="l">前回比</span>
                    <span className="amt">+ 6 週ぶり</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="btn sm" style={{ flex: 1 }}>
                      リマインド送信
                    </button>
                    <button type="button" className="btn sm" style={{ flex: 1 }}>
                      予約詳細
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="tl-card">
              <div className="hd">
                <div>
                  <h3>identity_links</h3>
                  <div className="sub">同一 friend_id にひもづく外部 ID</div>
                </div>
              </div>
              <div className="bd flush">
                <table className="itable">
                  <thead>
                    <tr>
                      <th>source</th>
                      <th>external_id</th>
                      <th>作成</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.identity_links?.length ? data.identity_links : [
                      { source: 'ig', external_id: '17841405822304914', created_at: '2025-08-12T14:08:00Z' },
                      { source: 'line', external_id: 'U4af4980629…b8c3', created_at: '2025-08-14T10:31:00Z' }
                    ]).map((ln, idx) => (
                      <tr key={`${ln.source}-${ln.external_id}-${idx}`}>
                        <td>
                          <span className={`src ${ln.source === 'ig' ? 'ig' : 'li'}`}>
                            {ln.source.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span className="ext">{ln.external_id}</span>
                        </td>
                        <td className="ts">{ln.created_at.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="tl-card">
              <div className="hd">
                <h3>カルテ要約</h3>
                <button type="button" className="btn sm btn-ghost">
                  編集
                </button>
              </div>
              <div className="bd">
                <dl className="pref-list">
                  <dt>髪質 / 状態</dt>
                  <dd>
                    細毛・量普通・くせ弱め。毛先ダメージ <code>level 2</code>
                  </dd>
                  <dt>履歴カラー</dt>
                  <dd>ベージュ系 9トーン → 8トーン（4月）</dd>
                  <dt>NG / アレルギー</dt>
                  <dd>
                    パラフェニ系×。テスト済み <code>2025-09-04</code>
                  </dd>
                  <dt>会話メモ</dt>
                  <dd>結婚式 6月 / 前髪は短くしすぎない / 同伴は妹</dd>
                </dl>
              </div>
            </section>

            <section className="tl-card">
              <div className="hd">
                <h3>担当スタイリスト</h3>
              </div>
              <div className="bd">
                <div className="styl-row">
                  <div className="av av-y">YU</div>
                  <div className="nm">
                    YUKI<small>カラー / トリートメント</small>
                  </div>
                  <div className="ct">
                    <b>14</b> / 18
                  </div>
                </div>
                <div className="styl-row">
                  <div className="av av-b">AO</div>
                  <div className="nm">
                    AOI<small>カット</small>
                  </div>
                  <div className="ct">
                    <b>3</b> / 18
                  </div>
                </div>
                <div className="styl-row">
                  <div className="av av-g">KE</div>
                  <div className="nm">
                    KEN<small>パーマ</small>
                  </div>
                  <div className="ct">
                    <b>1</b> / 18
                  </div>
                </div>
              </div>
            </section>

            <section className="tl-card">
              <div className="hd">
                <h3>タグ</h3>
              </div>
              <div className="bd">
                <div className="tag-list">
                  <span className="tg">ブライダル</span>
                  <span className="tg">紹介経由</span>
                  <span className="tg">高単価</span>
                  <span className="tg">表参道</span>
                  <span className="tg add">＋追加</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
