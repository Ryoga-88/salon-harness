'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { fetchApi, friendlyApiError } from '@/lib/api';

type Salon = { id: string; name: string };
type Stylist = { id: string; name: string; display_name: string | null };
type Menu = { id: string; name: string; price: number };
type Coupon = {
  id: string;
  stylist_id: string;
  code: string;
  name: string;
  type: string;
  value: number;
  valid_from: string;
  valid_until: string;
  used_count: number;
  usage_limit_per_user: number;
  display_in_liff: number;
  source: string | null;
  applicable_menu_ids: string | null;
};

function defaultUntil() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 16);
}

const emptyForm = {
  stylist_id: '',
  code: '',
  name: '',
  type: 'percentage',
  value: 10,
  valid_until: defaultUntil(),
  usage_limit_per_user: 1,
  display_in_liff: true,
  source: 'stylist',
  applicable_menu_ids: [] as string[]
};

export default function CouponsPage() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [salonId, setSalonId] = useState('default');
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [items, setItems] = useState<Coupon[]>([]);
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
      setMenus(await fetchApi<Menu[]>(`/api/menus?salon_id=${encodeURIComponent(selected)}`));
      setItems(await fetchApi<Coupon[]>(`/api/coupons?salon_id=${encodeURIComponent(selected)}`));
      setError('');
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  async function createCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await fetchApi('/api/coupons', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          value: Number(form.value),
          valid_until: `${form.valid_until}:00+09:00`,
          applicable_menu_ids: form.applicable_menu_ids.length ? JSON.stringify(form.applicable_menu_ids) : null,
          display_in_liff: form.display_in_liff ? 1 : 0
        })
      });
      setNotice('クーポンを作成しました。LIFF の候補・コード適用に反映されます。');
      setForm((prev) => ({ ...emptyForm, stylist_id: prev.stylist_id }));
      await load(salonId);
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  async function deactivate(id: string) {
    try {
      await fetchApi(`/api/coupons/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setNotice('クーポンを非表示にしました。');
      await load(salonId);
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  function toggleMenu(id: string) {
    const has = form.applicable_menu_ids.includes(id);
    setForm({
      ...form,
      applicable_menu_ids: has ? form.applicable_menu_ids.filter((x) => x !== id) : [...form.applicable_menu_ids, id]
    });
  }

  useEffect(() => { void load(); }, []);

  return (
    <AppShell>
      <div style={{ display: 'grid', gap: 18 }}>
        <div>
          <h1 className="page-title">クーポン</h1>
          <p style={{ color: 'var(--muted)', margin: 0 }}>DB に保存されたクーポンを管理します。スタイリスト単位・サロン全体の両方に対応し、LIFF の表示可否も制御できます。</p>
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
          <h2 style={{ marginTop: 0 }}>クーポン作成</h2>
          <form className="form" onSubmit={createCoupon}>
            <div className="grid cols">
              <div className="field">
                <label>対象</label>
                <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                  <option value="stylist">スタイリスト限定</option>
                  <option value="salon">サロン全体</option>
                </select>
              </div>
              <div className="field">
                <label>基準スタイリスト</label>
                <select required value={form.stylist_id} onChange={(e) => setForm({ ...form, stylist_id: e.target.value })}>
                  <option value="">選択してください</option>
                  {stylists.map((s) => <option key={s.id} value={s.id}>{s.display_name || s.name}</option>)}
                </select>
              </div>
              <div className="field"><label>コード</label><input placeholder="未入力なら自動発行" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
            </div>
            <div className="grid cols">
              <div className="field"><label>名前</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="field"><label>割引種別</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="percentage">%</option><option value="amount">円</option></select></div>
              <div className="field"><label>割引値</label><input type="number" min={1} value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} /></div>
            </div>
            <div className="grid cols">
              <div className="field"><label>期限</label><input type="datetime-local" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} /></div>
              <div className="field"><label>1人あたり使用回数</label><input type="number" min={1} value={form.usage_limit_per_user} onChange={(e) => setForm({ ...form, usage_limit_per_user: Number(e.target.value) })} /></div>
              <label className="field" style={{ alignSelf: 'end' }}><span>LIFF表示</span><input type="checkbox" checked={form.display_in_liff} onChange={(e) => setForm({ ...form, display_in_liff: e.target.checked })} /></label>
            </div>
            <div className="field">
              <label>対象メニュー（未選択なら全メニュー）</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {menus.map((menu) => (
                  <label key={menu.id} className="button secondary">
                    <input type="checkbox" checked={form.applicable_menu_ids.includes(menu.id)} onChange={() => toggleMenu(menu.id)} />
                    {menu.name}
                  </label>
                ))}
              </div>
            </div>
            <button className="button" type="submit" disabled={!stylists.length}>作成</button>
          </form>
        </section>

        <section className="panel">
          <h2 style={{ marginTop: 0 }}>クーポン一覧</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead><tr><th>コード</th><th>名前</th><th>対象</th><th>割引</th><th>期限</th><th>利用</th><th>LIFF</th><th /></tr></thead>
              <tbody>
                {items.map((coupon) => (
                  <tr key={coupon.id}>
                    <td><code>{coupon.code}</code></td>
                    <td>{coupon.name}</td>
                    <td>{coupon.source === 'salon' ? 'サロン全体' : 'スタイリスト'}</td>
                    <td>{coupon.type === 'percentage' ? `${coupon.value}%` : `¥${coupon.value.toLocaleString('ja-JP')}`}</td>
                    <td>{coupon.valid_until}</td>
                    <td>{coupon.used_count}回</td>
                    <td>{coupon.display_in_liff ? '表示' : '非表示'}</td>
                    <td style={{ textAlign: 'right' }}><button className="button secondary" type="button" onClick={() => void deactivate(coupon.id)}>非表示</button></td>
                  </tr>
                ))}
                {items.length === 0 && <tr><td colSpan={8}>クーポンが登録されていません。</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
