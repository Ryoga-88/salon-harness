'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { fetchApi, friendlyApiError } from '@/lib/api';

type Salon = { id: string; name: string };
type Stylist = { id: string; name: string; display_name: string | null };
type Menu = {
  id: string;
  stylist_id: string;
  name: string;
  category: string;
  duration_min: number;
  price: number;
  description: string | null;
};

const emptyForm = { stylist_id: '', name: '', category: 'cut', duration_min: 60, price: 6600, description: '' };

export default function MenusPage() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [salonId, setSalonId] = useState('default');
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [items, setItems] = useState<Menu[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load(nextSalonId = salonId) {
    try {
      const salonItems = await fetchApi<Salon[]>('/api/salons');
      setSalons(salonItems);
      const selected = nextSalonId || salonItems[0]?.id || 'default';
      setSalonId(selected);
      const stylistItems = await fetchApi<Stylist[]>(`/api/stylists?salon_id=${encodeURIComponent(selected)}`);
      setStylists(stylistItems);
      setForm((prev) => ({ ...prev, stylist_id: prev.stylist_id || stylistItems[0]?.id || '' }));
      setItems(await fetchApi<Menu[]>(`/api/menus?salon_id=${encodeURIComponent(selected)}`));
      setError('');
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  async function createMenu(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await fetchApi('/api/menus', {
        method: 'POST',
        body: JSON.stringify({ ...form, duration_min: Number(form.duration_min), price: Number(form.price) })
      });
      setNotice('メニューを作成しました。LIFF のメニュー選択にも表示されます。');
      setForm((prev) => ({ ...emptyForm, stylist_id: prev.stylist_id }));
      await load(salonId);
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  async function deactivate(id: string) {
    try {
      await fetchApi(`/api/menus/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setNotice('メニューを非表示にしました。');
      await load(salonId);
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <AppShell>
      <div style={{ display: 'grid', gap: 18 }}>
        <div>
          <h1 className="page-title">メニュー</h1>
          <p style={{ color: 'var(--muted)', margin: 0 }}>DB に保存されたメニューを管理します。LIFF の金額・所要時間・予約確認画面に同じ値が反映されます。</p>
        </div>

        {error && <div className="panel" style={{ borderColor: 'var(--rose-line)', color: 'var(--rose)' }}>{error}</div>}
        {notice && <div className="panel" style={{ borderColor: 'var(--green-line)', color: 'var(--green)' }}>{notice}</div>}

        <section className="panel">
          <div className="field" style={{ maxWidth: 360 }}>
            <label htmlFor="salon">サロン</label>
            <select id="salon" value={salonId} onChange={(e) => void load(e.target.value)}>
              {salons.map((salon) => <option key={salon.id} value={salon.id}>{salon.name}</option>)}
            </select>
          </div>
        </section>

        <section className="panel">
          <h2 style={{ marginTop: 0 }}>メニュー作成</h2>
          <form className="form" onSubmit={createMenu}>
            <div className="grid cols">
              <div className="field">
                <label>担当スタイリスト</label>
                <select required value={form.stylist_id} onChange={(e) => setForm({ ...form, stylist_id: e.target.value })}>
                  <option value="">選択してください</option>
                  {stylists.map((s) => <option key={s.id} value={s.id}>{s.display_name || s.name}</option>)}
                </select>
              </div>
              <div className="field"><label>メニュー名</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="field"><label>カテゴリ</label><input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            </div>
            <div className="grid cols">
              <div className="field"><label>所要時間（分）</label><input type="number" min={15} step={15} value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) })} /></div>
              <div className="field"><label>価格（円）</label><input type="number" min={0} step={100} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
              <div className="field" style={{ alignSelf: 'end' }}><button className="button" type="submit" disabled={!stylists.length}>作成</button></div>
            </div>
            <div className="field"><label>説明</label><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </form>
        </section>

        <section className="panel">
          <h2 style={{ marginTop: 0 }}>メニュー一覧</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead><tr><th>名前</th><th>カテゴリ</th><th>担当</th><th>時間</th><th>価格</th><th /></tr></thead>
              <tbody>
                {items.map((menu) => {
                  const stylist = stylists.find((s) => s.id === menu.stylist_id);
                  return (
                    <tr key={menu.id}>
                      <td><b>{menu.name}</b><br /><small>{menu.description || '-'}</small></td>
                      <td>{menu.category}</td>
                      <td>{stylist?.display_name || stylist?.name || menu.stylist_id}</td>
                      <td>{menu.duration_min}分</td>
                      <td>¥{Number(menu.price).toLocaleString('ja-JP')}</td>
                      <td style={{ textAlign: 'right' }}><button className="button secondary" type="button" onClick={() => void deactivate(menu.id)}>非表示</button></td>
                    </tr>
                  );
                })}
                {items.length === 0 && <tr><td colSpan={6}>メニューが登録されていません。</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
