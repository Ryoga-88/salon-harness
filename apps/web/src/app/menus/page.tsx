'use client';

import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Save } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { fetchApi, friendlyApiError } from '@/lib/api';

type Stylist = { id: string; name: string; display_name: string | null };
type Menu = { id: string; name: string; category: string; duration_min: number; price: number; stylist_id: string };
type Salon = { id: string; name: string };

export default function MenusPage() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [selectedSalonId, setSelectedSalonId] = useState('default');
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [items, setItems] = useState<Menu[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({
    stylist_id: '',
    name: '',
    category: 'cut',
    duration_min: 60,
    price: 6600,
    description: ''
  });

  async function load() {
    try {
      const salonItems = await fetchApi<Salon[]>('/api/salons');
      setSalons(salonItems);
      const salonId = selectedSalonId || salonItems[0]?.id || 'default';
      setSelectedSalonId(salonId);
      const stylistItems = await fetchApi<Stylist[]>(`/api/stylists?salon_id=${encodeURIComponent(salonId)}`);
      setStylists(stylistItems);
      const currentStillVisible = stylistItems.some((s) => s.id === form.stylist_id);
      const stylistId = currentStillVisible ? form.stylist_id : stylistItems[0]?.id || '';
      setForm((prev) => ({ ...prev, stylist_id: stylistId }));
      const path = stylistId ? `/api/menus?stylist_id=${encodeURIComponent(stylistId)}` : '/api/menus';
      setItems(await fetchApi<Menu[]>(path));
      setError('');
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  async function createMenu() {
    if (!form.stylist_id || !form.name.trim()) {
      setError('スタイリストとメニュー名を入力してください。');
      return;
    }
    try {
      await fetchApi('/api/menus', {
        method: 'POST',
        body: JSON.stringify({
          stylist_id: form.stylist_id,
          name: form.name.trim(),
          category: form.category,
          duration_min: Number(form.duration_min),
          price: Number(form.price),
          description: form.description.trim() || null
        })
      });
      setNotice('メニューを作成しました。');
      setError('');
      setForm((prev) => ({ ...prev, name: '', description: '' }));
      await load();
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <AppShell>
      <h1 className="page-title">メニュー・料金</h1>
      <div className="toolbar">
        <select value={selectedSalonId} onChange={(e) => setSelectedSalonId(e.target.value)} style={{ minHeight: 40, border: '1px solid var(--line)', borderRadius: 8, padding: '0 10px' }}>
          {salons.map((salon) => <option key={salon.id} value={salon.id}>{salon.name}</option>)}
        </select>
        <button className="button secondary" onClick={load}><RefreshCw size={16} />更新</button>
      </div>
      {error && <p className="panel" style={{ color: '#be123c' }}>{error}</p>}
      {notice && <p className="panel" style={{ color: '#0f766e' }}>{notice}</p>}

      <section className="panel form" style={{ marginBottom: 18 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}><Plus size={18} /> メニュー作成</h2>
        <div className="field">
          <label>スタイリスト</label>
          <select value={form.stylist_id} onChange={(e) => setForm({ ...form, stylist_id: e.target.value })}>
            <option value="">選択してください</option>
            {stylists.map((s) => <option key={s.id} value={s.id}>{s.display_name || s.name}</option>)}
          </select>
        </div>
        <div className="field"><label>メニュー名</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="カット" /></div>
        <div className="field">
          <label>カテゴリ</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="cut">カット</option>
            <option value="color">カラー</option>
            <option value="perm">パーマ</option>
            <option value="treatment">トリートメント</option>
            <option value="other">その他</option>
          </select>
        </div>
        <div className="field"><label>所要時間（分）</label><input type="number" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) })} /></div>
        <div className="field"><label>税込価格</label><input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
        <div className="field"><label>説明</label><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <button type="button" className="button" onClick={createMenu}><Save size={16} />作成する</button>
      </section>

      <div className="grid cols">
        {items.map((m) => (
          <article className="card" key={m.id}>
            <strong>{m.name}</strong>
            <p className="muted">{m.category} / {m.duration_min}分</p>
            <div>¥{m.price.toLocaleString('ja-JP')}</div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
