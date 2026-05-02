'use client';

import { useEffect, useState } from 'react';
import { Megaphone, Send } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { fetchApi, friendlyApiError } from '@/lib/api';

type Template = {
  template_id: string;
  name: string;
  category: string;
  trigger_keyword: string;
  ref_param: string;
};

export default function CampaignsPage() {
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

  return (
    <AppShell>
      <h1 className="page-title">キャンペーン</h1>
      {error && <p className="panel" style={{ color: '#be123c' }}>{error}</p>}
      {notice && <p className="panel" style={{ color: '#0f766e' }}>{notice}</p>}

      <section className="panel form">
        <h2 style={{ marginTop: 0, fontSize: 18 }}><Megaphone size={18} /> IG Engagement Gate 作成</h2>
        <div className="field">
          <label>テンプレート</label>
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            {templates.map((t) => <option key={t.template_id} value={t.template_id}>{t.name} / キーワード: {t.trigger_keyword}</option>)}
          </select>
        </div>
        <div className="field">
          <label>LINE 友だち追加 URL</label>
          <input value={lineAddUrl} onChange={(e) => setLineAddUrl(e.target.value)} placeholder="https://line.me/ti/p/@example" />
        </div>
        <div className="field">
          <label>クーポンコード（任意）</label>
          <input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="IG2026SUMMER" />
        </div>
        <div className="field">
          <label>対象投稿 ID（カンマ区切り・任意）</label>
          <input value={targetPostIds} onChange={(e) => setTargetPostIds(e.target.value)} placeholder="178..., 179..." />
        </div>
        <button type="button" className="button" onClick={createCampaign}><Send size={16} />作成する</button>
        <p className="muted">IG Harness の URL/API key が Worker secrets に未設定の場合は作成に失敗します。</p>
        <div className="panel" style={{ marginTop: 16, background: '#f8fafc' }}>
          <strong>効果計測について</strong>
          <p className="muted" style={{ marginBottom: 0 }}>
            Worker はテンプレごとの <code style={{ fontSize: 12 }}>ref</code> を LINE 友だち追加 URL に付与し、任意のクーポンは <code style={{ fontSize: 12 }}>coupon</code> クエリで渡します（line-harness 側の流入元・サロン Harness の予約と突合可能）。
            Engagement Gate 内の「誰がどのコメントから来たか」など粒度の細かいログは <strong>ig-harness</strong> の管理画面で確認するのが向いています。
          </p>
        </div>
      </section>
    </AppShell>
  );
}
