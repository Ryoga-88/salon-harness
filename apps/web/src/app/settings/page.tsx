'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { fetchApi, friendlyApiError } from '@/lib/api';

type Salon = {
  id: string;
  name: string;
  business_type: string;
  theme_color: string | null;
};

const emptyForm = { id: '', name: '', business_type: 'freelance', theme_color: '#0f766e' };

export default function SettingsPage() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    try {
      setSalons(await fetchApi<Salon[]>('/api/salons'));
      setError('');
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  async function createSalon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await fetchApi('/api/salons', { method: 'POST', body: JSON.stringify(form) });
      setNotice('サロンを作成しました。LIFF のサロン選択にも表示されます。');
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  async function deactivateSalon(id: string) {
    try {
      await fetchApi(`/api/salons/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setNotice('サロンを非表示にしました。LIFF の一覧からも外れます。');
      await load();
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <AppShell>
      <div style={{ display: 'grid', gap: 18 }}>
        <div>
          <h1 className="page-title">設定</h1>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            サロンの作成・表示状態を DB に保存します。ここで作成したサロンは管理画面と LIFF が同じ Worker API から参照します。
          </p>
        </div>

        {error && <div className="panel" style={{ borderColor: 'var(--rose-line)', color: 'var(--rose)' }}>{error}</div>}
        {notice && <div className="panel" style={{ borderColor: 'var(--green-line)', color: 'var(--green)' }}>{notice}</div>}

        <section className="panel">
          <h2 style={{ marginTop: 0 }}>サロン作成</h2>
          <form className="form" onSubmit={createSalon}>
            <div className="field">
              <label htmlFor="salon-id">サロンID</label>
              <input id="salon-id" required pattern="[a-z0-9-]+" placeholder="例: aoyama-salon" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="salon-name">サロン名</label>
              <input id="salon-name" required placeholder="例: Salon Harness 青山" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid cols">
              <div className="field">
                <label htmlFor="business-type">形態</label>
                <select id="business-type" value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })}>
                  <option value="freelance">フリーランス</option>
                  <option value="salon">店舗</option>
                  <option value="chain">複数店舗</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="theme-color">テーマカラー</label>
                <input id="theme-color" type="color" value={form.theme_color} onChange={(e) => setForm({ ...form, theme_color: e.target.value })} />
              </div>
              <div className="field" style={{ alignSelf: 'end' }}>
                <button className="button" type="submit">作成</button>
              </div>
            </div>
          </form>
        </section>

        <section className="panel">
          <h2 style={{ marginTop: 0 }}>連携済みサロン</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr><th>ID</th><th>名前</th><th>形態</th><th>色</th><th /></tr>
              </thead>
              <tbody>
                {salons.map((salon) => (
                  <tr key={salon.id}>
                    <td><code>{salon.id}</code></td>
                    <td>{salon.name}</td>
                    <td>{salon.business_type}</td>
                    <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 18, height: 18, borderRadius: 4, background: salon.theme_color ?? '#0f766e', border: '1px solid var(--line)' }} />{salon.theme_color}</span></td>
                    <td style={{ textAlign: 'right' }}><button className="button secondary" type="button" onClick={() => void deactivateSalon(salon.id)}>非表示</button></td>
                  </tr>
                ))}
                {salons.length === 0 && <tr><td colSpan={5}>表示中のサロンがありません。</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
