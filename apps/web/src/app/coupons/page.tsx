'use client';

import './coupons.css';

import { useEffect, useState } from 'react';
import { Check, Copy, Download, Plus, QrCode, Search, Tags } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { fetchApi, friendlyApiError } from '@/lib/api';

type Stylist = { id: string; name: string; display_name: string | null };
type Coupon = { id: string; code: string; name: string; valid_until: string; used_count: number; source: string | null };
type Salon = { id: string; name: string };

type DemoCoupon = {
  id: string;
  color: '' | 'amber' | 'rose' | 'purple' | 'slate';
  name: string;
  code: string;
  discount: string;
  unit: '%' | '¥';
  status: 'live' | 'sched' | 'draft' | 'exp';
  linked: string;
  issued: number;
  redeemed: number;
  target: string;
  period: string;
  min: string;
  campaign: string;
};

const COUPONS: DemoCoupon[] = [
  { id: 'c1', color: '', name: '春の限定カラー10%OFF', code: 'SPRING10', discount: '10', unit: '%', status: 'live', linked: 'gate_v2', issued: 1280, redeemed: 268, target: 'カラー全メニュー', period: '〜 5/31', min: '¥6,000〜', campaign: '春の限定カラー10%OFF' },
  { id: 'c2', color: 'amber', name: '新規友だち登録 ¥1,000 OFF', code: 'NEWFRIEND', discount: '1,000', unit: '¥', status: 'live', linked: 'auto', issued: 412, redeemed: 142, target: 'すべて', period: '常時', min: '¥3,300〜', campaign: '新規友だち自動配布' },
  { id: 'c3', color: 'rose', name: 'ブライダル相談 30% OFF', code: 'BRIDAL30', discount: '30', unit: '%', status: 'live', linked: 'gate_v3', issued: 248, redeemed: 18, target: 'ブライダルメニュー', period: '〜 7/31', min: '¥15,000〜', campaign: 'ブライダル相談 1on1' },
  { id: 'c4', color: 'purple', name: 'before/after 紹介クーポン', code: 'BAREFER', discount: '15', unit: '%', status: 'live', linked: 'gate_v4', issued: 198, redeemed: 42, target: 'カット+カラー', period: '〜 6/15', min: '¥8,000〜', campaign: 'before-after シリーズ' },
  { id: 'c5', color: '', name: '平日11:00来店 早割', code: 'WEEKDAY15', discount: '15', unit: '%', status: 'live', linked: 'manual', issued: 188, redeemed: 22, target: 'すべて', period: '〜 8/31', min: 'なし', campaign: '手動配布' },
  { id: 'c6', color: 'amber', name: 'トリートメント体験 ¥1,500', code: 'TRT1500', discount: '1,500', unit: '¥', status: 'live', linked: 'gate_v2', issued: 142, redeemed: 14, target: 'トリートメント', period: '〜 5/31', min: 'なし', campaign: '春の限定カラー10%OFF' },
  { id: 'c7', color: 'slate', name: 'GW 連休感謝クーポン', code: 'GW2026', discount: '20', unit: '%', status: 'sched', linked: 'manual', issued: 0, redeemed: 0, target: 'カラー / トリートメント', period: '5/3 〜 5/6', min: '¥5,500〜', campaign: 'GW 限定配信（予約）' },
  { id: 'c8', color: 'rose', name: 'バースデー月特典', code: 'BIRTHDAY', discount: '2,000', unit: '¥', status: 'live', linked: 'auto', issued: 198, redeemed: 88, target: 'すべて', period: '常時', min: '¥6,000〜', campaign: '誕生月自動配布' },
  { id: 'c9', color: 'purple', name: 'リール限定 学割クーポン', code: 'STUDENT500', discount: '500', unit: '¥', status: 'draft', linked: 'gate_v5', issued: 0, redeemed: 0, target: 'カット', period: '未設定', min: 'なし', campaign: '下書き ・ 未連携' },
  { id: 'c10', color: 'slate', name: '冬の保湿トリートメント', code: 'WINTER25', discount: '25', unit: '%', status: 'exp', linked: 'gate_v1', issued: 684, redeemed: 142, target: 'トリートメント', period: '12/1 〜 2/28（終了）', min: '¥4,400〜', campaign: '冬キャンペーン（終了）' }
];

type RedeemRow = {
  nm: string;
  initials: string;
  avBg: string;
  src: string;
  srcCls: '' | 'ig';
  cpn: string;
  code: string;
  chan: 'ig' | 'line' | 'web';
  stylist: string;
  dis: string;
  amt: string;
  state: 'ok' | 'pend' | 'cncl';
  t: string;
};

const REDEEM_ROWS: RedeemRow[] = [
  { nm: '花田 ななみ', initials: 'HN', avBg: 'linear-gradient(135deg,#fbbf77,#e1306c)', src: 'L', srcCls: '', cpn: '春の限定カラー10%OFF', code: 'SPRING10', chan: 'line', stylist: 'YUKI', dis: '-¥980', amt: '¥9,800→¥8,820', state: 'ok', t: '5分前' },
  { nm: '佐藤 みか', initials: 'SM', avBg: 'linear-gradient(135deg,#a78bfa,#3b82f6)', src: 'L', srcCls: '', cpn: '新規友だち登録 ¥1,000 OFF', code: 'NEWFRIEND', chan: 'line', stylist: 'AOI', dis: '-¥1,000', amt: '¥7,700→¥6,700', state: 'ok', t: '34分前' },
  { nm: '山田 あい', initials: 'YA', avBg: 'linear-gradient(135deg,#34d399,#0d9488)', src: 'IG', srcCls: 'ig', cpn: 'before/after 紹介クーポン', code: 'BAREFER', chan: 'ig', stylist: 'YUKI', dis: '-¥2,070', amt: '¥13,800→¥11,730', state: 'pend', t: '1時間前' },
  { nm: '渡辺 結衣', initials: 'WY', avBg: 'linear-gradient(135deg,#fbcfe8,#be185d)', src: 'L', srcCls: '', cpn: 'バースデー月特典', code: 'BIRTHDAY', chan: 'line', stylist: 'KEN', dis: '-¥2,000', amt: '¥18,800→¥16,800', state: 'ok', t: '2時間前' },
  { nm: '木村 さやか', initials: 'KS', avBg: 'linear-gradient(135deg,#fde68a,#b45309)', src: 'L', srcCls: '', cpn: '平日11:00来店 早割', code: 'WEEKDAY15', chan: 'web', stylist: 'AOI', dis: '-¥1,170', amt: '¥7,800→¥6,630', state: 'ok', t: '昨日' },
  { nm: '高橋 ゆり', initials: 'TY', avBg: 'linear-gradient(135deg,#bae6fd,#0c4a6e)', src: 'IG', srcCls: 'ig', cpn: 'トリートメント体験 ¥1,500', code: 'TRT1500', chan: 'ig', stylist: 'MOMO', dis: '-¥1,500', amt: '¥4,400→¥2,900', state: 'ok', t: '昨日' },
  { nm: '中村 リサ', initials: 'NR', avBg: 'linear-gradient(135deg,#fecaca,#991b1b)', src: 'L', srcCls: '', cpn: '春の限定カラー10%OFF', code: 'SPRING10', chan: 'line', stylist: 'YUKI', dis: '-¥1,180', amt: '¥11,800→¥10,620', state: 'cncl', t: '2日前' },
  { nm: '松本 みゆ', initials: 'MM', avBg: 'linear-gradient(135deg,#fbcfe8,#be185d)', src: 'L', srcCls: '', cpn: 'ブライダル相談 30% OFF', code: 'BRIDAL30', chan: 'line', stylist: 'KEN', dis: '-¥5,640', amt: '¥18,800→¥13,160', state: 'ok', t: '3日前' }
];

const STATE_LABEL: Record<RedeemRow['state'], string> = { ok: '引換済', pend: '予約済', cncl: 'キャンセル' };
const CHAN_LABEL: Record<RedeemRow['chan'], string> = { ig: 'Instagram', line: 'LINE', web: '店頭' };

function statusPill(s: DemoCoupon['status']) {
  if (s === 'live') return <span className="status-pill live"><span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />運用中</span>;
  if (s === 'sched') return <span className="status-pill sched">予約</span>;
  if (s === 'draft') return <span className="status-pill draft">下書き</span>;
  return <span className="status-pill exp">終了</span>;
}

function defaultUntil() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 16);
}

export default function CouponsPage() {
  const [tab, setTab] = useState<'list' | 'redeem'>('list');
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [items, setItems] = useState<Coupon[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ stylist_id: '', code: '', name: '', type: 'percentage', value: 10, valid_until: defaultUntil() });

  async function load() {
    try {
      const salonItems = await fetchApi<Salon[]>('/api/salons');
      setSalons(salonItems);
      const salonId = salonItems[0]?.id || 'default';
      const stylistItems = await fetchApi<Stylist[]>(`/api/stylists?salon_id=${encodeURIComponent(salonId)}`);
      setStylists(stylistItems);
      const stylistId = stylistItems[0]?.id || '';
      if (stylistId) {
        setForm((prev) => ({ ...prev, stylist_id: prev.stylist_id || stylistId }));
        setItems(await fetchApi<Coupon[]>(`/api/coupons?stylist_id=${encodeURIComponent(stylistId)}&friend_id=preview`));
      }
      setError('');
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  async function createCoupon() {
    if (!form.stylist_id || !form.name.trim()) {
      setError('対象スタイリストとクーポン名を入力してください。');
      return;
    }
    try {
      await fetchApi('/api/coupons', {
        method: 'POST',
        body: JSON.stringify({
          stylist_id: form.stylist_id,
          code: form.code.trim() || undefined,
          name: form.name.trim(),
          type: form.type,
          value: Number(form.value),
          valid_until: `${form.valid_until}:00+09:00`,
          display_in_liff: 1,
          source: 'admin'
        })
      });
      setNotice('クーポンを作成しました。');
      setError('');
      setForm((prev) => ({ ...prev, code: '', name: '' }));
      await load();
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <AppShell>
      <div className="page-head">
        <div>
          <h1>クーポン</h1>
          <div className="sub">
            発行・配布チャネル・引き換え状況を一元管理。<code>campaigns</code> から自動配布されるクーポンと手動発行のものを統合表示。
            <code>identity_link</code> 経由の引き換えは自動でファネルに記録されます。
          </div>
        </div>
        <div className="coupons-actions">
          <button type="button" className="btn"><Download size={14} />CSV</button>
          <button type="button" className="btn"><QrCode size={14} />QR一括発行</button>
          <button type="button" className="btn btn-primary"><Plus size={14} />クーポン作成</button>
        </div>
      </div>

      {error && <div className="coup-msg err">{error}</div>}
      {notice && <div className="coup-msg ok">{notice}</div>}

      <div className="mtiles">
        <div className="mtile">
          <div className="k">運用中クーポン</div>
          <div className="v">8<small>件</small></div>
          <div className="d">予約 / 下書き 各 2件</div>
        </div>
        <div className="mtile">
          <div className="k">発行済（30日）</div>
          <div className="v">2,184<small>枚</small></div>
          <div className="d"><span className="delta up">▲ +24%</span> vs 前30日</div>
        </div>
        <div className="mtile">
          <div className="k">引換数</div>
          <div className="v">412<small>枚</small></div>
          <div className="d">引換率 <b style={{ color: 'var(--ink)', fontWeight: 600 }}>18.9%</b></div>
        </div>
        <div className="mtile">
          <div className="k">割引売上影響</div>
          <div className="v">¥-186<small>K</small></div>
          <div className="d">純増売上 +¥1.42M（×7.6 ROI）</div>
        </div>
      </div>

      <div className="coup-tabs">
        <button type="button" className={`coup-tab${tab === 'list' ? ' active' : ''}`} onClick={() => setTab('list')}>
          <Tags size={13} />クーポン一覧 <span className="n">{COUPONS.length}</span>
        </button>
        <button type="button" className={`coup-tab${tab === 'redeem' ? ' active' : ''}`} onClick={() => setTab('redeem')}>
          <Check size={13} />引換ログ <span className="n">{REDEEM_ROWS.length}</span>
        </button>
      </div>

      {tab === 'list' && (
        <div>
          <div className="coup-toolbar">
            <label className="search">
              <Search size={13} />
              <input placeholder="クーポン名・コードで検索…" />
            </label>
            <select>
              <option>状態: すべて</option><option>運用中</option><option>予約</option><option>下書き</option><option>終了</option>
            </select>
            <select>
              <option>連携: すべて</option><option>キャンペーン経由</option><option>手動配布</option><option>新規友だち</option>
            </select>
            <div className="grow" />
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>クリックで詳細</span>
          </div>

          <div className="coup-grid">
            {COUPONS.map((c) => {
              const pct = c.issued ? Math.round((c.redeemed / c.issued) * 100) : 0;
              const channels = c.linked.startsWith('gate_')
                ? <span className="gate-tag">Gate {c.linked.replace('gate_', 'v')}</span>
                : c.linked === 'auto' ? <span>自動配布</span> : <span>手動配布</span>;
              return (
                <div key={c.id} className="ccard">
                  <div className={`ticket ${c.color}`}>
                    <div className="row1">
                      <span className="pill">{c.target}</span>
                      {statusPill(c.status)}
                    </div>
                    <div className="discount">{c.discount}<small>{c.unit === '%' ? '% OFF' : '円OFF'}</small></div>
                    <div className="nm">{c.name}</div>
                    <div className="meta-pills">
                      <span>📅 {c.period}</span>
                      <span>{c.min}</span>
                    </div>
                  </div>
                  <div className="body">
                    <div className="code-row">
                      <code className="code">{c.code}</code>
                      <button type="button" className="code-cp" title="コードをコピー" onClick={() => navigator.clipboard?.writeText(c.code)}>
                        <Copy size={12} />
                      </button>
                    </div>
                    <div className="stats">
                      <div className="it">発行<b>{c.issued.toLocaleString()}<small>枚</small></b></div>
                      <div className="it">引換<b>{c.redeemed.toLocaleString()}<small>枚</small></b></div>
                      <div className="it">引換率<b>{pct}<small>%</small></b></div>
                    </div>
                    <div className="progress">
                      <div className="lbl"><span>引換進捗</span><b>{c.redeemed} / {c.issued || '∞'}</b></div>
                      <div className="b"><i style={{ width: `${pct}%` }} /></div>
                    </div>
                  </div>
                  <div className="ft">
                    {channels}
                    <div className="right"><a>{c.campaign} →</a></div>
                  </div>
                </div>
              );
            })}
          </div>

          <section className="coup-create-form">
            <h3>クーポン作成（API）</h3>
            <label>スタイリスト
              <select value={form.stylist_id} onChange={(e) => setForm({ ...form, stylist_id: e.target.value })}>
                <option value="">選択してください</option>
                {stylists.map((s) => <option key={s.id} value={s.id}>{s.display_name || s.name}</option>)}
              </select>
            </label>
            <label>コード
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="自動生成可" />
            </label>
            <label>名称
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="初回10%OFF" />
            </label>
            <label>割引タイプ
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="percentage">%</option>
                <option value="fixed_amount">円引き</option>
              </select>
            </label>
            <label>割引値
              <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
            </label>
            <label>有効期限
              <input type="datetime-local" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
            </label>
            <button type="button" className="btn btn-primary" onClick={createCoupon}><Plus size={13} />作成する</button>
            {salons.length > 0 && (
              <span className="full" style={{ fontSize: 11, color: 'var(--muted)' }}>サロン: {salons[0]?.name}</span>
            )}
          </section>

          {items.length > 0 && (
            <section className="coup-create-form" style={{ display: 'block' }}>
              <h3>API 取得済みクーポン（{items.length}件）</h3>
              <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none', fontSize: 12.5 }}>
                {items.map((c) => (
                  <li key={c.id} style={{ padding: '6px 0', borderBottom: '1px dashed var(--line)' }}>
                    <code style={{ fontFamily: '"JetBrains Mono",monospace' }}>{c.code}</code>
                    {' · '}{c.name} · 利用 {c.used_count} · 期限 {c.valid_until}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {tab === 'redeem' && (
        <div className="redeem-wrap">
          <div className="rh">
            <Check size={14} />
            最近の引換ログ
            <span style={{ fontWeight: 500, color: 'var(--muted)', fontSize: 11.5 }}>・ 過去30日 412件</span>
            <div style={{ flex: 1 }} />
            <button type="button" className="btn sm">CSV エクスポート</button>
          </div>
          <table className="redeem">
            <thead>
              <tr>
                <th>顧客</th><th>クーポン</th><th>コード</th><th>チャネル</th><th>担当</th>
                <th className="r">割引額</th><th className="r">予約金額</th><th>状態</th><th className="r">引換時刻</th>
              </tr>
            </thead>
            <tbody>
              {REDEEM_ROWS.map((r, i) => (
                <tr key={i}>
                  <td>
                    <div className="nm">
                      <div className="av" style={{ background: r.avBg }}>{r.initials}<div className={`src ${r.srcCls}`}>{r.src}</div></div>
                      <div><b>{r.nm}</b><small>{r.t}</small></div>
                    </div>
                  </td>
                  <td>{r.cpn}</td>
                  <td><code className="code-mono">{r.code}</code></td>
                  <td><span className={`chan-pill ${r.chan}`}>{CHAN_LABEL[r.chan]}</span></td>
                  <td>{r.stylist}</td>
                  <td className="r" style={{ color: 'var(--rose)', fontWeight: 600 }}>{r.dis}</td>
                  <td className="r"><b style={{ fontWeight: 600 }}>{r.amt}</b></td>
                  <td><span className={`row-status ${r.state}`}><span className="dot" />{STATE_LABEL[r.state]}</span></td>
                  <td className="r" style={{ color: 'var(--muted)', fontSize: 11.5 }}>{r.t}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
