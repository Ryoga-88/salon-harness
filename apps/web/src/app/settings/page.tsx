'use client';

import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Save } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { fetchApi, friendlyApiError } from '@/lib/api';

type Salon = {
  id: string;
  name: string;
  business_type: string;
  theme_color: string | null;
};

export default function SettingsPage() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({
    id: '',
    name: '',
    business_type: 'freelance',
    theme_color: '#0f766e'
  });

  async function load() {
    try {
      setSalons(await fetchApi<Salon[]>('/api/salons'));
      setError('');
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  async function createSalon() {
    if (!form.id.trim() || !form.name.trim()) {
      setError('サロンIDとサロン名を入力してください。');
      return;
    }
    try {
      await fetchApi('/api/salons', {
        method: 'POST',
        body: JSON.stringify({
          id: form.id.trim().toLowerCase(),
          name: form.name.trim(),
          business_type: form.business_type,
          theme_color: form.theme_color
        })
      });
      setForm({ id: '', name: '', business_type: 'freelance', theme_color: '#0f766e' });
      setNotice('サロンを作成しました。');
      setError('');
      await load();
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <AppShell>
      <h1 className="page-title">設定</h1>
      <div className="toolbar">
        <button className="button secondary" onClick={load}><RefreshCw size={16} />更新</button>
      </div>
      {error && <p className="panel" style={{ color: '#be123c' }}>{error}</p>}
      {notice && <p className="panel" style={{ color: '#0f766e' }}>{notice}</p>}

      <section className="panel form" style={{ marginBottom: 18 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}><Plus size={18} /> サロン作成</h2>
        <div className="field">
          <label>サロンID</label>
          <input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase() })} placeholder="omotesando" />
        </div>
        <div className="field">
          <label>サロン名</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="表参道 Demo Salon" />
        </div>
        <div className="field">
          <label>利用形態</label>
          <select value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })}>
            <option value="freelance">個人美容師</option>
            <option value="solo_salon">1人サロン</option>
            <option value="shared_salon">シェアサロン</option>
            <option value="multi_stylist">複数スタイリスト店舗</option>
          </select>
        </div>
        <div className="field">
          <label>テーマカラー</label>
          <input type="color" value={form.theme_color} onChange={(e) => setForm({ ...form, theme_color: e.target.value })} />
        </div>
        <button type="button" className="button" onClick={createSalon}><Save size={16} />作成する</button>
      </section>

      <div className="grid cols">
        {salons.map((salon) => (
          <article className="card" key={salon.id}>
            <strong>{salon.name}</strong>
            <p className="muted">LIFF URL: /s/{salon.id}</p>
            <p className="muted">種別: {salon.business_type}</p>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
