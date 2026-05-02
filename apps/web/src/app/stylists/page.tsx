'use client';

import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Save } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { fetchApi, friendlyApiError } from '@/lib/api';

type Stylist = {
  id: string;
  name: string;
  display_name: string | null;
  email: string | null;
  bio: string | null;
  specialties: string | null;
};

export default function StylistsPage() {
  const [items, setItems] = useState<Stylist[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({
    name: '',
    display_name: '',
    email: '',
    bio: '',
    specialties: ''
  });

  async function load() {
    try {
      setItems(await fetchApi<Stylist[]>('/api/stylists'));
      setError('');
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  async function createStylist() {
    if (!form.name.trim()) {
      setError('スタイリスト名を入力してください。');
      return;
    }
    try {
      await fetchApi('/api/stylists', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          display_name: form.display_name.trim() || null,
          email: form.email.trim() || null,
          bio: form.bio.trim() || null,
          specialties: form.specialties
            ? JSON.stringify(form.specialties.split(',').map((x) => x.trim()).filter(Boolean))
            : null
        })
      });
      setForm({ name: '', display_name: '', email: '', bio: '', specialties: '' });
      setNotice('スタイリストを登録しました。');
      setError('');
      await load();
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <AppShell>
      <h1 className="page-title">スタイリスト</h1>
      <div className="toolbar">
        <button className="button secondary" onClick={load}><RefreshCw size={16} />更新</button>
      </div>
      {error && <p className="panel" style={{ color: '#be123c' }}>{error}</p>}
      {notice && <p className="panel" style={{ color: '#0f766e' }}>{notice}</p>}

      <section className="panel form" style={{ marginBottom: 18 }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}><Plus size={18} /> 新規登録</h2>
        <div className="field">
          <label>スタイリスト名</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="山田 花子" />
        </div>
        <div className="field">
          <label>表示名</label>
          <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Hanako" />
        </div>
        <div className="field">
          <label>メールアドレス</label>
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="stylist@example.com" />
        </div>
        <div className="field">
          <label>得意メニュー（カンマ区切り）</label>
          <input value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} placeholder="カラー, 髪質改善" />
        </div>
        <div className="field">
          <label>プロフィール</label>
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} placeholder="お客様に表示する紹介文" />
        </div>
        <button type="button" className="button" onClick={createStylist}><Save size={16} />登録する</button>
      </section>

      <div className="grid cols">
        {items.map((stylist) => (
          <article className="card" key={stylist.id}>
            <strong>{stylist.display_name || stylist.name}</strong>
            <p className="muted">{stylist.email || 'メール未登録'}</p>
            <p>{stylist.bio || 'プロフィール未登録'}</p>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
