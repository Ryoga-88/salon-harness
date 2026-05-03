'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CrudPage, CrudPanel, EmptyTableRow, SalonSelector, TableScroll } from '@/components/admin/crud-page';
import { fetchApi, friendlyApiError } from '@/lib/api';

type Salon = { id: string; name: string };
type Stylist = {
  id: string;
  salon_id: string;
  name: string;
  display_name: string | null;
  email: string | null;
  bio: string | null;
  specialties: string | null;
};

const emptyForm = { name: '', display_name: '', email: '', bio: '', specialties: '' };

export default function StylistsPage() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [salonId, setSalonId] = useState('default');
  const [items, setItems] = useState<Stylist[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load(nextSalonId = salonId) {
    try {
      const salonItems = await fetchApi<Salon[]>('/api/salons');
      setSalons(salonItems);
      const selected = nextSalonId || salonItems[0]?.id || 'default';
      setSalonId(selected);
      setItems(await fetchApi<Stylist[]>(`/api/stylists?salon_id=${encodeURIComponent(selected)}`));
      setError('');
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  async function createStylist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await fetchApi('/api/stylists', {
        method: 'POST',
        body: JSON.stringify({ ...form, salon_id: salonId })
      });
      setNotice('スタイリストを作成しました。LIFF のスタイリスト選択にも表示されます。');
      setForm(emptyForm);
      await load(salonId);
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  async function deactivate(id: string) {
    try {
      await fetchApi(`/api/stylists/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setNotice('スタイリストを非表示にしました。');
      await load(salonId);
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <CrudPage
      title="スタイリスト"
      description="DB に保存されたスタイリストを管理します。予約の担当者、メニュー、空き時間 API の基準になります。"
      error={error}
      notice={notice}
    >
        <SalonSelector salons={salons} value={salonId} onChange={(next) => void load(next)} />

        <CrudPanel title="スタイリスト作成">
          <form className="form" onSubmit={createStylist}>
            <div className="grid cols">
              <div className="field"><label>名前</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="field"><label>表示名</label><input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></div>
              <div className="field"><label>メール</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="field"><label>得意分野</label><input placeholder="例: カラー,ショート" value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} /></div>
            <div className="field"><label>紹介文</label><textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
            <button className="button" type="submit">作成</button>
          </form>
        </CrudPanel>

        <CrudPanel title="ロスター">
          <TableScroll>
            <table className="table" style={{ width: '100%' }}>
              <thead><tr><th>名前</th><th>メール</th><th>得意分野</th><th>紹介</th><th /></tr></thead>
              <tbody>
                {items.map((stylist) => (
                  <tr key={stylist.id}>
                    <td><b>{stylist.display_name || stylist.name}</b><br /><code>{stylist.id}</code></td>
                    <td>{stylist.email || '-'}</td>
                    <td>{stylist.specialties || '-'}</td>
                    <td>{stylist.bio || '-'}</td>
                    <td style={{ textAlign: 'right' }}><button className="button secondary" type="button" onClick={() => void deactivate(stylist.id)}>非表示</button></td>
                  </tr>
                ))}
                {items.length === 0 && <EmptyTableRow colSpan={5}>スタイリストが登録されていません。</EmptyTableRow>}
              </tbody>
            </table>
          </TableScroll>
        </CrudPanel>
    </CrudPage>
  );
}
