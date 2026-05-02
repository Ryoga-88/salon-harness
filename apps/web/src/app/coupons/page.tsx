'use client';

import { useEffect, useState } from 'react';
import { Copy, Plus, RefreshCw, Save } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { fetchApi, friendlyApiError } from '@/lib/api';

type Stylist = { id: string; name: string; display_name: string | null };
type Coupon = { id: string; code: string; name: string; valid_until: string; used_count: number; source: string | null };
type Salon = { id: string; name: string };

function defaultUntil() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 16);
}

export default function CouponsPage() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [selectedSalonId, setSelectedSalonId] = useState('default');
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [selectedStylistId, setSelectedStylistId] = useState('');
  const [items, setItems] = useState<Coupon[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({
    scope: 'stylist',
    stylist_id: '',
    code: '',
    name: '',
    type: 'percentage',
    value: 10,
    valid_until: defaultUntil(),
    display_in_liff: true
  });

  async function load() {
    try {
      const salonItems = await fetchApi<Salon[]>('/api/salons');
      setSalons(salonItems);
      const salonId = selectedSalonId || salonItems[0]?.id || 'default';
      setSelectedSalonId(salonId);
      const stylistItems = await fetchApi<Stylist[]>(`/api/stylists?salon_id=${encodeURIComponent(salonId)}`);
      setStylists(stylistItems);
      const currentStillVisible = stylistItems.some((s) => s.id === selectedStylistId || s.id === form.stylist_id);
      const stylistId = currentStillVisible ? selectedStylistId || form.stylist_id : stylistItems[0]?.id || '';
      if (stylistId) {
        setSelectedStylistId(stylistId);
        setForm((prev) => ({ ...prev, stylist_id: stylistId }));
        setItems(await fetchApi<Coupon[]>(`/api/coupons?stylist_id=${encodeURIComponent(stylistId)}&friend_id=preview`));
      } else {
        setItems([]);
      }
      setError('');
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  async function createCoupon() {
    const targetStylist = form.scope === 'salon' ? stylists[0]?.id : form.stylist_id;
    if (!targetStylist || !form.name.trim()) {
      setError('対象スタイリストとクーポン名を入力してください。');
      return;
    }
    try {
      await fetchApi('/api/coupons', {
        method: 'POST',
        body: JSON.stringify({
          stylist_id: targetStylist,
          code: form.code.trim() || undefined,
          name: form.name.trim(),
          type: form.type,
          value: Number(form.value),
          valid_until: `${form.valid_until}:00+09:00`,
          display_in_liff: form.display_in_liff ? 1 : 0,
          source: form.scope === 'salon' ? 'salon' : 'admin'
        })
      });
      setNotice(form.scope === 'salon' ? 'サロン全体クーポンを作成しました。' : 'スタイリスト用クーポンを作成しました。');
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
      <h1 className="page-title">クーポン</h1>
      <div className="toolbar">
        <select value={selectedSalonId} onChange={(e) => setSelectedSalonId(e.target.value)} style={{ minHeight: 40, border: '1px solid var(--line)', borderRadius: 8, padding: '0 10px' }}>
          {salons.map((salon) => <option key={salon.id} value={salon.id}>{salon.name}</option>)}
        </select>
        <select value={selectedStylistId} onChange={(e) => setSelectedStylistId(e.target.value)} style={{ minHeight: 40, border: '1px solid var(--line)', borderRadius: 8, padding: '0 10px' }}>
          {stylists.map((s) => <option key={s.id} value={s.id}>{s.display_name || s.name}</option>)}
        </select>
        <button className="button secondary" onClick={load}><RefreshCw size={16} />一覧取得</button>
      </div>
      {error && <p className="panel" style={{ color: '#be123c' }}>{error}</p>}
      {notice && <p className="panel" style={{ color: '#0f766e' }}>{notice}</p>}

      <section className="panel form" style={{ marginBottom: 18 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}><Plus size={18} /> クーポン作成</h2>
        <div className="field">
          <label>対象</label>
          <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
            <option value="stylist">スタイリストごと</option>
            <option value="salon">サロン全体</option>
          </select>
        </div>
        {form.scope === 'stylist' && (
          <div className="field">
            <label>スタイリスト</label>
            <select value={form.stylist_id} onChange={(e) => setForm({ ...form, stylist_id: e.target.value })}>
              <option value="">選択してください</option>
              {stylists.map((s) => <option key={s.id} value={s.id}>{s.display_name || s.name}</option>)}
            </select>
          </div>
        )}
        <div className="field"><label>コード</label><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="未入力なら自動生成" /></div>
        <div className="field"><label>名称</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="初回10%OFF" /></div>
        <div className="field">
          <label>割引タイプ</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="percentage">%</option>
            <option value="fixed_amount">円引き</option>
          </select>
        </div>
        <div className="field"><label>割引値</label><input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} /></div>
        <div className="field"><label>有効期限</label><input type="datetime-local" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} /></div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={form.display_in_liff} onChange={(e) => setForm({ ...form, display_in_liff: e.target.checked })} />LIFFに表示する</label>
        <button type="button" className="button" onClick={createCoupon}><Save size={16} />作成する</button>
      </section>

      <table className="table">
        <thead><tr><th>コード</th><th>名称</th><th>対象</th><th>期限</th><th>利用数</th><th>配布</th></tr></thead>
        <tbody>{items.map((c) => <tr key={c.id}><td>{c.code}</td><td>{c.name}</td><td>{c.source === 'salon' ? '全体' : '個別'}</td><td>{c.valid_until}</td><td>{c.used_count}</td><td><button className="button secondary" onClick={() => navigator.clipboard?.writeText(c.code)}><Copy size={14} />コピー</button></td></tr>)}</tbody>
      </table>
    </AppShell>
  );
}
