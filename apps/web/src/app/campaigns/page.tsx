'use client';

import './campaigns.css';

import { useEffect, useState } from 'react';
import { Copy, Download, Megaphone, MoreHorizontal, Pencil, Play, Plus, Search, Send } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { fetchApi, friendlyApiError } from '@/lib/api';

type Template = {
  template_id: string;
  name: string;
  category: string;
  trigger_keyword: string;
  ref_param: string;
};

type CampaignStatus = 'live' | 'paused' | 'draft' | 'ended';

type CampaignRow = {
  id: string;
  channel: 'ig' | 'line' | 'cross';
  channelLabel: string;
  name: string;
  code: string;
  meta: string[];
  status: CampaignStatus;
  funnel: { comment: number | null; dm: number | null; line: number | null };
  cv: { num: number | null; total: number | null; pct: string; barW: number; pctColor: string };
};

const CAMPAIGNS: CampaignRow[] = [
  {
    id: 'spr', channel: 'ig', channelLabel: 'IG', name: '春の限定カラー10%OFF', code: 'gate_v2',
    meta: ['キーワード: 予約 / カラー / 春', '4/12 〜 4/30'], status: 'live',
    funnel: { comment: 428, dm: 312, line: 291 },
    cv: { num: 68, total: 312, pct: '21.8%', barW: 78, pctColor: 'var(--accent-600)' }
  },
  {
    id: 'ba', channel: 'ig', channelLabel: 'IG', name: 'before/after シリーズ DM', code: 'gate_v1',
    meta: ['キーワード: 同じ / 髪型 / 教えて', '常時稼働'], status: 'live',
    funnel: { comment: 312, dm: 208, line: 184 },
    cv: { num: 52, total: 208, pct: '25.0%', barW: 64, pctColor: 'var(--accent-600)' }
  },
  {
    id: 'brid', channel: 'cross', channelLabel: 'CR', name: 'ブライダル相談 1on1', code: 'gate_brid',
    meta: ['IG → LINE → 担当指名予約', '5/01 〜 6/30'], status: 'live',
    funnel: { comment: 198, dm: 144, line: 128 },
    cv: { num: 42, total: 144, pct: '29.2%', barW: 84, pctColor: 'var(--accent-600)' }
  },
  {
    id: 'rein', channel: 'ig', channelLabel: 'IG', name: '雨の日キャンペーン', code: 'gate_rein',
    meta: ['キーワード: 雨 / 当日', '4/01 〜'], status: 'paused',
    funnel: { comment: 156, dm: 88, line: 62 },
    cv: { num: 14, total: 88, pct: '15.9%', barW: 32, pctColor: 'var(--rose)' }
  },
  {
    id: 'haha', channel: 'line', channelLabel: 'LN', name: '5月 母の日ペア割（下書き）', code: 'gate_test',
    meta: ['LINE 既存友だち向け', '未公開'], status: 'draft',
    funnel: { comment: null, dm: null, line: null },
    cv: { num: null, total: null, pct: '—', barW: 0, pctColor: 'var(--muted)' }
  },
  {
    id: 'reel', channel: 'ig', channelLabel: 'IG', name: '3月 春トリートメント解説リール', code: 'gate_v1',
    meta: ['3/15 〜 3/31'], status: 'ended',
    funnel: { comment: 284, dm: 118, line: 92 },
    cv: { num: 22, total: 118, pct: '18.6%', barW: 52, pctColor: 'var(--muted)' }
  }
];

const STATUS_LABEL: Record<CampaignStatus, string> = { live: '運用中', paused: '一時停止', draft: '下書き', ended: '終了' };

const TAB_FILTERS: { key: 'all' | CampaignStatus; label: string; count: number }[] = [
  { key: 'all', label: 'すべて', count: 8 },
  { key: 'live', label: '運用中', count: 3 },
  { key: 'draft', label: '下書き', count: 2 },
  { key: 'paused', label: '一時停止', count: 1 },
  { key: 'ended', label: '終了', count: 2 }
];

export default function CampaignsPage() {
  const [tab, setTab] = useState<'all' | CampaignStatus>('all');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [lineAddUrl, setLineAddUrl] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [targetPostIds, setTargetPostIds] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    try {
      const items = await fetchApi<Template[]>('/api/campaign-templates');
      setTemplates(items);
      setTemplateId((prev) => prev || items[0]?.template_id || '');
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  async function createCampaign() {
    if (!templateId || !lineAddUrl.trim()) {
      setError('テンプレートと LINE 友だち追加 URL を入力してください。');
      return;
    }
    try {
      await fetchApi('/api/campaigns/from-template', {
        method: 'POST',
        body: JSON.stringify({
          template_id: templateId,
          line_add_url: lineAddUrl.trim(),
          coupon_code: couponCode.trim() || undefined,
          target_post_ids: targetPostIds.split(',').map((x) => x.trim()).filter(Boolean)
        })
      });
      setNotice('IG Engagement Gate を作成しました。');
      setError('');
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  useEffect(() => { void load(); }, []);

  const visible = CAMPAIGNS.filter((c) => tab === 'all' || c.status === tab);

  return (
    <AppShell>
      <div className="cmp-head">
        <div>
          <h1>キャンペーン</h1>
          <div className="sub">Engagement Gate（IG コメント → 自動 DM → LINE 友だち化）の作成と運用</div>
        </div>
        <div className="actions">
          <div className="seg">
            <button type="button" className="active">30日</button>
            <button type="button">90日</button>
            <button type="button">12ヶ月</button>
          </div>
          <button type="button" className="btn"><Download size={14} />エクスポート</button>
          <button type="button" className="btn btn-primary"><Plus size={14} />新規キャンペーン</button>
        </div>
      </div>

      {error && <div className="cmp-msg err">{error}</div>}
      {notice && <div className="cmp-msg ok">{notice}</div>}

      <div className="cmp-kpis">
        <div className="cmp-kpi t"><div className="k">アクティブ</div><div className="v">3</div><div className="d">うち IG: 2 / クロス: 1</div></div>
        <div className="cmp-kpi b"><div className="k">トリガー数（30日）</div><div className="v">1,820</div><div className="d"><span className="delta up">▲ +18.3%</span> vs 前30日</div></div>
        <div className="cmp-kpi p"><div className="k">DM 配信</div><div className="v">1,162<small>63.8%</small></div><div className="d">配信率（Gate 通過 ÷ コメント）</div></div>
        <div className="cmp-kpi a"><div className="k">予約 CV</div><div className="v">209<small>17.9%</small></div><div className="d">DM → 予約完了</div></div>
      </div>

      <div className="cmp-tabs">
        {TAB_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`cmp-tab${tab === f.key ? ' active' : ''}`}
            onClick={() => setTab(f.key)}
          >
            {f.label} <span className="c">{f.count}</span>
          </button>
        ))}
        <div className="tabs-grow" />
        <label className="tabs-search">
          <Search size={13} />
          <input placeholder="キャンペーン名で検索…" />
        </label>
      </div>

      <div className="ctbl">
        <div className="ctbl-row head">
          <div>キャンペーン</div>
          <div>状態</div>
          <div>ファネル（30日）</div>
          <div>予約 CV</div>
          <div />
        </div>
        {visible.map((c) => (
          <div key={c.id} className="ctbl-row">
            <div className="c-name">
              <div className={`ico ${c.channel}`}>{c.channelLabel}</div>
              <div className="nm">
                <b>{c.name}</b>
                <div className="meta">
                  <code>{c.code}</code>
                  {c.meta.map((m, i) => <span key={i}>{m}</span>)}
                </div>
              </div>
            </div>
            <div><span className={`pill ${c.status}`}><span className="dt" />{STATUS_LABEL[c.status]}</span></div>
            <div className="c-funnel">
              {c.funnel.comment === null ? (
                <div className="seg-mini"><b>—</b><small>未配信</small></div>
              ) : (
                <>
                  <div className="seg-mini"><b>{c.funnel.comment}</b><small>コメント</small></div>
                  <span className="arr">▶</span>
                  <div className="seg-mini"><b>{c.funnel.dm}</b><small>DM</small></div>
                  <span className="arr">▶</span>
                  <div className="seg-mini"><b>{c.funnel.line}</b><small>LINE</small></div>
                </>
              )}
            </div>
            <div className="c-cv">
              {c.cv.num === null ? (
                <div className="nums" style={{ color: 'var(--muted)' }}>—</div>
              ) : (
                <div className="nums">
                  {c.cv.num}<small>/ {c.cv.total}</small>{' '}
                  <span style={{ color: c.cv.pctColor, fontSize: 11.5 }}>{c.cv.pct}</span>
                </div>
              )}
              <div className="bar"><i style={{ width: `${c.cv.barW}%` }} /></div>
            </div>
            <div className="c-actions">
              {c.status === 'paused' && <button type="button" className="ic" title="再開"><Play size={13} /></button>}
              {c.status !== 'draft' && c.status !== 'paused' && (
                <button type="button" className="ic" title="複製"><Copy size={13} /></button>
              )}
              <button type="button" className="ic" title="編集"><Pencil size={13} /></button>
              <button type="button" className="ic" title="その他"><MoreHorizontal size={13} /></button>
            </div>
          </div>
        ))}
      </div>

      <div className="wizard-launcher">
        <div className="hd">
          <h3><span className="sp">テンプレートから作成</span></h3>
          <div className="sub">よく使う Engagement Gate のテンプレを選んで素早くキャンペーンを開始。あとからすべて編集できます。</div>
        </div>
        <div className="templates">
          <button type="button" className="tpl"><b>クーポン誘導</b><small>例: 「予約」コメントで自動 DM</small></button>
          <button type="button" className="tpl"><b>before / after 質問</b><small>例: 「同じ髪型」で詳細送信</small></button>
          <button type="button" className="tpl"><b>ブライダル相談</b><small>担当指名予約への誘導</small></button>
          <button type="button" className="tpl"><b>白紙から作成</b><small>すべて手動で設定</small></button>
        </div>
      </div>

      <section className="cmp-form">
        <h3><Megaphone size={16} /> IG Engagement Gate 作成（API）</h3>
        <div className="row">
          <label>テンプレート</label>
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            {templates.length === 0 && <option value="">（読み込み中...）</option>}
            {templates.map((t) => (
              <option key={t.template_id} value={t.template_id}>
                {t.name} / キーワード: {t.trigger_keyword}
              </option>
            ))}
          </select>
        </div>
        <div className="row">
          <label>LINE 友だち追加 URL</label>
          <input value={lineAddUrl} onChange={(e) => setLineAddUrl(e.target.value)} placeholder="https://line.me/ti/p/@example" />
        </div>
        <div className="row">
          <label>クーポンコード（任意）</label>
          <input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="IG2026SUMMER" />
        </div>
        <div className="row">
          <label>対象投稿 ID（任意）</label>
          <input value={targetPostIds} onChange={(e) => setTargetPostIds(e.target.value)} placeholder="178..., 179..." />
        </div>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={createCampaign}><Send size={14} />作成する</button>
        </div>
        <p className="muted">
          IG Harness の URL/API key が Worker secrets に未設定の場合は作成に失敗します。
          Worker はテンプレごとの <code>ref</code> を LINE 友だち追加 URL に付与し、任意のクーポンは <code>coupon</code> クエリで渡します。
        </p>
      </section>
    </AppShell>
  );
}
