'use client';

import './menus.css';
import { useEffect, useState } from 'react';
import {
  Clock,
  Download,
  Edit3,
  LayoutGrid,
  List,
  MoreHorizontal,
  Plus,
  Search,
  Send
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { fetchApi, friendlyApiError } from '@/lib/api';

type Menu = { id: string; name: string; category: string; duration_min: number; price: number; stylist_id: string };
type Stylist = { id: string; name: string; display_name: string | null };
type Salon = { id: string; name: string };

type DemoMenu = {
  id: string;
  cat: string;
  catLabel: string;
  thumbLabel: string;
  gradient: string;
  name: string;
  desc: string;
  price: number;
  duration: number;
  slots: number;
  status: 'live' | 'draft' | 'hide';
  tags: ('new' | 'cmp' | 'pop')[];
  stylists: { code: string; bg: string; spec?: boolean }[];
  pop: number;
  book: number;
};

const STYLIST_YK = 'linear-gradient(135deg,#fbbf77,#e1306c)';
const STYLIST_AO = 'linear-gradient(135deg,#a78bfa,#3b82f6)';
const STYLIST_KN = 'linear-gradient(135deg,#34d399,#0d9488)';
const STYLIST_MM = 'linear-gradient(135deg,#fbcfe8,#be185d)';

const COLOR_GRADIENT = 'linear-gradient(135deg,#fbbf77,#e1306c)';

const DEMO_MENUS: DemoMenu[] = [
  {
    id: 'm1', cat: 'color', catLabel: 'カラー', thumbLabel: 'カラー', gradient: COLOR_GRADIENT,
    name: '外国人風カラー', desc: '透明感のあるベージュ系カラー ・ ブリーチなし',
    price: 9800, duration: 120, slots: 2, status: 'live', tags: ['cmp', 'pop'],
    stylists: [{ code: 'YK', bg: STYLIST_YK, spec: true }, { code: 'AO', bg: STYLIST_AO }, { code: 'MM', bg: STYLIST_MM }],
    pop: 92, book: 86
  },
  {
    id: 'm2', cat: 'color', catLabel: 'カラー', thumbLabel: 'カラー', gradient: COLOR_GRADIENT,
    name: 'ハイライト 細め', desc: 'ブリーチ × 細ハイライトで動きと立体感',
    price: 14800, duration: 180, slots: 3, status: 'live', tags: ['pop'],
    stylists: [{ code: 'YK', bg: STYLIST_YK, spec: true }, { code: 'AO', bg: STYLIST_AO }],
    pop: 74, book: 42
  },
  {
    id: 'm3', cat: 'color', catLabel: 'カラー', thumbLabel: 'カラー', gradient: COLOR_GRADIENT,
    name: 'インナーカラー', desc: 'ポイントカラーで個性を演出',
    price: 8800, duration: 90, slots: 1.5, status: 'live', tags: ['new', 'cmp'],
    stylists: [{ code: 'MM', bg: STYLIST_MM, spec: true }, { code: 'AO', bg: STYLIST_AO }],
    pop: 64, book: 32
  },
  {
    id: 'm4', cat: 'color', catLabel: 'カラー', thumbLabel: 'カラー', gradient: COLOR_GRADIENT,
    name: 'リタッチカラー', desc: '根元のみのお手入れカラー',
    price: 5500, duration: 60, slots: 1, status: 'live', tags: [],
    stylists: [{ code: 'YK', bg: STYLIST_YK }, { code: 'AO', bg: STYLIST_AO }, { code: 'KN', bg: STYLIST_KN }, { code: 'MM', bg: STYLIST_MM }],
    pop: 88, book: 78
  },
  {
    id: 'm5', cat: 'color', catLabel: 'カラー', thumbLabel: 'カラー', gradient: COLOR_GRADIENT,
    name: 'ブライダルカラー', desc: '結婚式当日のためのトーンアップ',
    price: 18800, duration: 150, slots: 2.5, status: 'live', tags: [],
    stylists: [{ code: 'KN', bg: STYLIST_KN, spec: true }],
    pop: 38, book: 8
  },
  {
    id: 'm6', cat: 'color', catLabel: 'カラー', thumbLabel: 'カラー', gradient: COLOR_GRADIENT,
    name: '白髪ぼかしカラー', desc: 'デザイン性のある白髪対策',
    price: 11800, duration: 120, slots: 2, status: 'draft', tags: [],
    stylists: [{ code: 'KN', bg: STYLIST_KN }, { code: 'AO', bg: STYLIST_AO }],
    pop: 42, book: 0
  },
  {
    id: 'm7', cat: 'color', catLabel: 'カラー', thumbLabel: 'カラー', gradient: COLOR_GRADIENT,
    name: 'グラデーションカラー', desc: '毛先に向かう自然なグラデ',
    price: 13800, duration: 150, slots: 2.5, status: 'hide', tags: [],
    stylists: [{ code: 'MM', bg: STYLIST_MM }],
    pop: 24, book: 0
  }
];

const CATEGORIES: { key: string; label: string; n: number; dot: string }[] = [
  { key: 'all', label: 'すべて', n: 23, dot: 'var(--ink)' },
  { key: 'cut', label: 'カット', n: 5, dot: '#3b82f6' },
  { key: 'color', label: 'カラー', n: 7, dot: '#e1306c' },
  { key: 'treatment', label: 'トリートメント', n: 4, dot: '#0d9488' },
  { key: 'perm', label: 'パーマ', n: 3, dot: '#be185d' },
  { key: 'set', label: 'ヘアセット', n: 2, dot: '#b45309' },
  { key: 'package', label: 'セットメニュー', n: 2, dot: '#0c4a6e' }
];

const TAGS: { key: string; label: string; n: number; color: string }[] = [
  { key: 'tag-new', label: 'NEW', n: 3, color: 'var(--blue)' },
  { key: 'tag-cmp', label: 'キャンペーン中', n: 5, color: 'var(--purple)' },
  { key: 'tag-pop', label: '人気', n: 8, color: 'var(--amber)' }
];

function StatusPill({ s }: { s: DemoMenu['status'] }) {
  if (s === 'live') return <span className="pill live">公開中</span>;
  if (s === 'draft') return <span className="pill draft">下書き</span>;
  return <span className="pill hide">非公開</span>;
}

function TagPill({ t }: { t: DemoMenu['tags'][number] }) {
  if (t === 'new') return <span className="pill new">NEW</span>;
  if (t === 'cmp') return <span className="pill cmp">キャンペーン</span>;
  return <span className="pill opt">人気</span>;
}

export default function MenusPage() {
  const [view, setView] = useState<'table' | 'card'>('table');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'draft' | 'hide'>('all');
  const [activeCat, setActiveCat] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string>('m1');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [items, setItems] = useState<Menu[]>([]);

  async function load() {
    try {
      const salons = await fetchApi<Salon[]>('/api/salons');
      const salonId = salons[0]?.id || 'default';
      const stylists = await fetchApi<Stylist[]>(`/api/stylists?salon_id=${encodeURIComponent(salonId)}`);
      const stylistId = stylists[0]?.id;
      const path = stylistId ? `/api/menus?stylist_id=${encodeURIComponent(stylistId)}` : '/api/menus';
      setItems(await fetchApi<Menu[]>(path));
      setError('');
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = DEMO_MENUS.filter((m) => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (activeCat !== 'all') {
      if (activeCat.startsWith('tag-')) {
        if (!m.tags.includes(activeCat.slice(4) as DemoMenu['tags'][number])) return false;
      } else if (m.cat !== activeCat) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (!m.name.toLowerCase().includes(q) && !m.desc.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const selected = DEMO_MENUS.find((m) => m.id === selectedId) ?? DEMO_MENUS[0]!;

  return (
    <AppShell>
      <div className="page-menus">
        <aside className="rail">
          <div className="rail-hd">
            <h2>カテゴリ</h2>
            <button type="button" className="add" title="カテゴリ追加"><Plus size={12} /></button>
          </div>
          <div className="rail-list">
            {CATEGORIES.map((c) => (
              <div
                key={c.key}
                className={`cat${activeCat === c.key ? ' active' : ''}`}
                onClick={() => setActiveCat(c.key)}
              >
                <span className="dot" style={{ background: c.dot }} />
                <span className="grow">{c.label}</span>
                <span className="n">{c.n}</span>
              </div>
            ))}
            <div className="rail-hd2">タグ</div>
            {TAGS.map((t) => (
              <div
                key={t.key}
                className={`cat${activeCat === t.key ? ' active' : ''}`}
                onClick={() => setActiveCat(t.key)}
              >
                <span className="dot" style={{ background: t.color, borderRadius: 99 }} />
                <span className="grow">{t.label}</span>
                <span className="n">{t.n}</span>
              </div>
            ))}
          </div>
          <div className="rail-foot">
            並び替えはドラッグ&amp;ドロップで反映 ・ <code>booking.menu_order</code> に保存
          </div>
        </aside>

        <main className="center">
          <div className="page-head">
            <div>
              <h1>メニュー</h1>
              <div className="sub">
                予約フローの表示順・写真・所要時間・指名対応スタイリストを一元管理。<code>analytics</code> の人気メニュー集計と <code>campaigns</code> のクーポン対象に直接連携します。
                {items.length > 0 && <> 連携済みメニュー {items.length} 件。</>}
                {error && <span style={{ color: 'var(--rose)', marginLeft: 6 }}>{error}</span>}
              </div>
            </div>
            <div className="actions">
              <button type="button" className="btn"><Download size={14} />CSV</button>
              <button type="button" className="btn"><Clock size={14} />予約フロー プレビュー</button>
              <button type="button" className="btn btn-primary"><Plus size={14} />メニュー追加</button>
            </div>
          </div>

          <div className="mtiles">
            <div className="mtile">
              <div className="k">公開中</div>
              <div className="v">23<small>件</small></div>
              <div className="d">下書き 2 ・ 非公開 1</div>
            </div>
            <div className="mtile">
              <div className="k">人気 #1</div>
              <div className="v" style={{ fontSize: 15, lineHeight: 1.3, fontWeight: 700 }}>
                外国人風カラー
                <br />
                <small style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 500 }}>予約 86件 ・ 30日</small>
              </div>
            </div>
            <div className="mtile">
              <div className="k">平均単価</div>
              <div className="v">¥7,820</div>
              <div className="d"><span className="delta up">▲ +¥320</span> vs 前月</div>
            </div>
            <div className="mtile">
              <div className="k">平均所要</div>
              <div className="v">96<small>分</small></div>
              <div className="d">スロット平均 1.6コマ</div>
            </div>
          </div>

          <div className="toolbar">
            <label className="search">
              <Search size={13} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="メニュー名・タグで検索…" />
            </label>
            <div className="seg">
              <button className={statusFilter === 'all' ? 'active' : ''} onClick={() => setStatusFilter('all')}>すべて</button>
              <button className={statusFilter === 'live' ? 'active' : ''} onClick={() => setStatusFilter('live')}>公開</button>
              <button className={statusFilter === 'draft' ? 'active' : ''} onClick={() => setStatusFilter('draft')}>下書き</button>
              <button className={statusFilter === 'hide' ? 'active' : ''} onClick={() => setStatusFilter('hide')}>非公開</button>
            </div>
            <div className="grow" />
            <div className="seg">
              <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>
                <List size={11} />テーブル
              </button>
              <button className={view === 'card' ? 'active' : ''} onClick={() => setView('card')}>
                <LayoutGrid size={11} />カード
              </button>
            </div>
          </div>

          {view === 'table' && (
            <div className="table-wrap">
              <div className="cat-hd">
                <span className="pip" style={{ background: '#e1306c' }} />
                カラー <small>・ {filtered.length}件</small>
                <div className="gx" />
                <button type="button" className="btn sm">+ メニュー追加</button>
              </div>
              <table className="menu">
                <thead>
                  <tr>
                    <th style={{ width: 32 }} />
                    <th>メニュー</th>
                    <th>状態</th>
                    <th className="r">価格</th>
                    <th className="r">所要</th>
                    <th>対応スタイリスト</th>
                    <th>人気度</th>
                    <th className="r" style={{ width: 60 }} />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr
                      key={m.id}
                      className={m.id === selectedId ? 'sel' : ''}
                      onClick={() => setSelectedId(m.id)}
                    >
                      <td />
                      <td>
                        <div className="nm">
                          <div className="thumb" style={{ background: m.gradient }}>{m.thumbLabel}</div>
                          <div>
                            <b>
                              {m.name} {m.tags.map((t) => <TagPill key={t} t={t} />)}
                            </b>
                            <small>{m.desc}</small>
                          </div>
                        </div>
                      </td>
                      <td><StatusPill s={m.status} /></td>
                      <td className="r price">
                        <b>¥{m.price.toLocaleString()}</b>
                        <small>+ {m.slots}コマ</small>
                      </td>
                      <td className="r">
                        <b style={{ fontWeight: 600 }}>
                          {m.duration}
                          <small style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 500, marginLeft: 2 }}>分</small>
                        </b>
                      </td>
                      <td>
                        <div className="stylists-row">
                          {m.stylists.map((s, i) => (
                            <div
                              key={`${s.code}-${i}`}
                              className="av"
                              style={{
                                background: s.bg,
                                boxShadow: s.spec ? '0 0 0 2px var(--accent),0 0 0 4px #fff' : undefined
                              }}
                              title={`${s.code}${s.spec ? ' (専門)' : ''}`}
                            >
                              {s.code}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="pop-bar">
                          <div className="b"><i style={{ width: `${m.pop}%` }} /></div>
                          <span className="v">
                            {m.book}
                            <small style={{ color: 'var(--muted)', fontWeight: 500 }}>件</small>
                          </span>
                        </div>
                      </td>
                      <td className="r">
                        <button type="button" className="icon-btn" title="その他">
                          <MoreHorizontal size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {view === 'card' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
              {filtered.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  style={{
                    background: 'var(--panel)',
                    border: '1px solid var(--line)',
                    borderRadius: 10,
                    overflow: 'hidden',
                    cursor: 'pointer'
                  }}
                >
                  <div
                    style={{
                      height: 130,
                      background: m.gradient,
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: 10,
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 11,
                      position: 'relative'
                    }}
                  >
                    <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 4 }}>
                      {m.tags.map((t) => <TagPill key={t} t={t} />)}
                    </div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.85)', fontWeight: 500 }}>{m.catLabel}</span>
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 8,
                        right: 10,
                        background: 'rgba(0,0,0,.5)',
                        color: '#fff',
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: 6,
                        fontSize: 13
                      }}
                    >
                      ¥{m.price.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ padding: '11px 13px' }}>
                    <b style={{ fontSize: 13.5, fontWeight: 600, display: 'block' }}>{m.name}</b>
                    <small style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginTop: 2 }}>{m.desc}</small>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 13px',
                      borderTop: '1px dashed var(--line)',
                      fontSize: 11,
                      color: 'var(--muted)'
                    }}
                  >
                    <span>{m.duration}分 ・ {m.slots}コマ</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <StatusPill s={m.status} />
                      <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{m.book}件</b>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <aside className="preview">
          <div className="pv-hd">
            <h3>メニュー詳細</h3>
            <button type="button" className="ic-btn" title="編集"><Edit3 size={13} /></button>
          </div>
          <div className="pv-img" style={{ background: selected.gradient }}>
            <span className="img-tag">写真をアップロード（推奨 4:3）</span>
          </div>
          <div className="pv-name">
            <b>{selected.name}</b>
            <small>{selected.desc}</small>
          </div>
          <div className="pv-row"><span className="k">価格</span><span className="v">¥{selected.price.toLocaleString()}</span></div>
          <div className="pv-row"><span className="k">所要時間</span><span className="v">{selected.duration}分（{selected.slots}コマ）</span></div>
          <div className="pv-row"><span className="k">カテゴリ</span><span className="v">{selected.catLabel}</span></div>
          <div className="pv-row"><span className="k">予約フロー表示順</span><span className="v">#2</span></div>

          <div className="pv-sec">
            <h4>追加オプション</h4>
            <div className="pv-options">
              <div className="pv-opt"><b>トリートメント追加</b><span className="p">+¥2,200</span></div>
              <div className="pv-opt"><b>前髪カット</b><span className="p">+¥1,100</span></div>
              <div className="pv-opt"><b>シャンプー&amp;ブロー</b><span className="p">+¥1,650</span></div>
            </div>
          </div>

          <div className="pv-sec">
            <h4>対応スタイリスト</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {selected.stylists.map((s, i) => (
                <div key={`${s.code}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, padding: '5px 0' }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 10.5,
                      display: 'grid',
                      placeItems: 'center',
                      background: s.bg
                    }}
                  >
                    {s.code}
                  </div>
                  {s.code}
                  {s.spec && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: 10.5,
                        background: 'var(--accent-soft)',
                        color: 'var(--accent-600)',
                        padding: '1px 7px',
                        borderRadius: 99,
                        fontWeight: 600,
                        border: '1px solid #b8dfd9'
                      }}
                    >
                      専門
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pv-sec">
            <h4>パフォーマンス（30日）</h4>
            <div className="pv-perf">
              <div className="it"><div className="k">予約</div><div className="v">{selected.book}<small>件</small></div></div>
              <div className="it"><div className="k">売上</div><div className="v">¥842<small>K</small></div></div>
              <div className="it"><div className="k">平均評価</div><div className="v">4.8<small>/5</small></div></div>
              <div className="it"><div className="k">リピート率</div><div className="v">68<small>%</small></div></div>
            </div>
            <h4 style={{ marginTop: 14 }}>予約ファネル</h4>
            <div className="funnel-mini">
              <div className="stage"><b>2.1K</b>表示</div>
              <div className="stage"><b>342</b>選択</div>
              <div className="stage"><b>112</b>カート</div>
              <div className="stage cv"><b>{selected.book}</b>予約</div>
            </div>
          </div>

          <div className="pv-sec">
            <h4>連携中のキャンペーン</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 9px',
                  border: '1px solid #ddd6fe',
                  background: 'var(--purple-soft)',
                  borderRadius: 7,
                  fontSize: 12,
                  color: 'var(--purple)'
                }}
              >
                <Send size={12} />
                <b style={{ fontWeight: 600, flex: 1 }}>春の限定カラー10%OFF</b>
                <span style={{ fontSize: 10, background: '#fff', padding: '1px 6px', borderRadius: 99, border: '1px solid #ddd6fe' }}>運用中</span>
              </div>
            </div>
          </div>

          <div className="pv-foot">
            <button type="button" className="btn">複製</button>
            <button type="button" className="btn" style={{ color: 'var(--rose)', borderColor: '#fecdd3' }}>
              非公開にする
            </button>
            <button type="button" className="btn btn-primary">保存</button>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
