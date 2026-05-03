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
  name_kana: string | null;
  title: string | null;
  experience_years: number | null;
  accepts_direct_booking: number;
  status_label: string | null;
  catchphrase: string | null;
  specialties: string | null;
  skill_tags: string | null;
  vibe_tags: string | null;
  target_audience: string | null;
  bio: string | null;
  strength_note: string | null;
  nomination_fee: number;
  max_daily_reservations: number | null;
  simultaneous_capacity: number;
  available_menu_ids: string | null;
  unavailable_menu_ids: string | null;
  holiday_note: string | null;
  profile_photo_url: string | null;
  display_order: number;
};

const emptyForm = {
  name: '',
  display_name: '',
  name_kana: '',
  title: '',
  experience_years: '',
  accepts_direct_booking: true,
  status_label: '',
  catchphrase: '',
  skill_tags: '',
  vibe_tags: '',
  target_audience: '',
  bio: '',
  strength_note: '',
  nomination_fee: '',
  max_daily_reservations: '',
  simultaneous_capacity: '1',
  available_menu_ids: '',
  unavailable_menu_ids: '',
  holiday_note: '',
  profile_photo_url: '',
  display_order: '0'
};

function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

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
        body: JSON.stringify({
          salon_id: salonId,
          name: form.name,
          display_name: form.display_name || form.name,
          name_kana: form.name_kana || null,
          title: form.title || null,
          experience_years: numberOrNull(form.experience_years),
          accepts_direct_booking: form.accepts_direct_booking ? 1 : 0,
          status_label: form.status_label || null,
          catchphrase: form.catchphrase || null,
          skill_tags: form.skill_tags || null,
          specialties: form.skill_tags || null,
          vibe_tags: form.vibe_tags || null,
          target_audience: form.target_audience || null,
          bio: form.bio || null,
          strength_note: form.strength_note || null,
          nomination_fee: numberOrNull(form.nomination_fee) ?? 0,
          max_daily_reservations: numberOrNull(form.max_daily_reservations),
          simultaneous_capacity: numberOrNull(form.simultaneous_capacity) ?? 1,
          available_menu_ids: form.available_menu_ids || null,
          unavailable_menu_ids: form.unavailable_menu_ids || null,
          holiday_note: form.holiday_note || null,
          profile_photo_url: form.profile_photo_url || null,
          display_order: numberOrNull(form.display_order) ?? 0
        })
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
      description="予約画面に出すプロフィール、指名受付、表示順、予約枠の基本設定を DB に保存します。"
      error={error}
      notice={notice}
    >
      {salons.length > 1 && <SalonSelector salons={salons} value={salonId} onChange={(next) => void load(next)} />}

      <CrudPanel title="スタイリスト作成">
        <form className="form" onSubmit={createStylist}>
          <div className="grid cols">
            <div className="field"><label>表示名</label><input required placeholder="例: YUKI" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="field"><label>フリガナ</label><input placeholder="例: ユキ" value={form.name_kana} onChange={(e) => setForm({ ...form, name_kana: e.target.value })} /></div>
            <div className="field"><label>肩書き</label><input placeholder="例: トップスタイリスト / 店長" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          </div>

          <div className="grid cols">
            <div className="field"><label>歴年数</label><input inputMode="numeric" placeholder="例: 7" value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: e.target.value })} /></div>
            <div className="field"><label>指名料</label><input inputMode="numeric" placeholder="例: 1100" value={form.nomination_fee} onChange={(e) => setForm({ ...form, nomination_fee: e.target.value })} /></div>
            <div className="field"><label>表示順</label><input inputMode="numeric" placeholder="0" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} /></div>
          </div>

          <div className="grid cols">
            <div className="field"><label>ステータス表示</label><input placeholder="例: 人気 / 新人 / UP" value={form.status_label} onChange={(e) => setForm({ ...form, status_label: e.target.value })} /></div>
            <div className="field"><label>プロフィール写真URL</label><input type="url" placeholder="https://..." value={form.profile_photo_url} onChange={(e) => setForm({ ...form, profile_photo_url: e.target.value })} /></div>
            <div className="field">
              <label>指名予約</label>
              <select value={form.accepts_direct_booking ? '1' : '0'} onChange={(e) => setForm({ ...form, accepts_direct_booking: e.target.value === '1' })}>
                <option value="1">受け付ける</option>
                <option value="0">受け付けない</option>
              </select>
            </div>
          </div>

          <div className="field"><label>キャッチコピー</label><input placeholder="例: 30代男性に刺さるスタイルをご提案" value={form.catchphrase} onChange={(e) => setForm({ ...form, catchphrase: e.target.value })} /></div>
          <div className="field"><label>得意な技術</label><input placeholder="例: メンズカット,パーマ,アイブロウ" value={form.skill_tags} onChange={(e) => setForm({ ...form, skill_tags: e.target.value })} /></div>
          <div className="field"><label>得意な雰囲気</label><input placeholder="例: ナチュラル,ツイスト,サーフ系" value={form.vibe_tags} onChange={(e) => setForm({ ...form, vibe_tags: e.target.value })} /></div>
          <div className="field"><label>対象客層</label><input placeholder="例: メンズ,学生,ビジネス層" value={form.target_audience} onChange={(e) => setForm({ ...form, target_audience: e.target.value })} /></div>
          <div className="field"><label>自己紹介</label><textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
          <div className="field"><label>実績・強み</label><textarea rows={2} placeholder="例: 新規指名No.1、口コミ高評価" value={form.strength_note} onChange={(e) => setForm({ ...form, strength_note: e.target.value })} /></div>

          <div className="grid cols">
            <div className="field"><label>同時施術枠</label><input inputMode="numeric" placeholder="1" value={form.simultaneous_capacity} onChange={(e) => setForm({ ...form, simultaneous_capacity: e.target.value })} /></div>
            <div className="field"><label>1日の予約上限</label><input inputMode="numeric" placeholder="未指定" value={form.max_daily_reservations} onChange={(e) => setForm({ ...form, max_daily_reservations: e.target.value })} /></div>
            <div className="field"><label>休日・不定休メモ</label><input placeholder="例: 月曜定休、不定休あり" value={form.holiday_note} onChange={(e) => setForm({ ...form, holiday_note: e.target.value })} /></div>
          </div>

          <div className="grid cols">
            <div className="field"><label>対応可能メニューID</label><input placeholder="例: menu-cut,menu-color" value={form.available_menu_ids} onChange={(e) => setForm({ ...form, available_menu_ids: e.target.value })} /></div>
            <div className="field"><label>非対応メニューID</label><input placeholder="例: menu-bleach" value={form.unavailable_menu_ids} onChange={(e) => setForm({ ...form, unavailable_menu_ids: e.target.value })} /></div>
          </div>

          <button className="button" type="submit">作成</button>
        </form>
      </CrudPanel>

      <CrudPanel title="ロスター">
        <TableScroll>
          <table className="table" style={{ width: '100%' }}>
            <thead><tr><th>表示</th><th>プロフィール</th><th>予約設定</th><th>対象・強み</th><th /></tr></thead>
            <tbody>
              {items.map((stylist) => (
                <tr key={stylist.id}>
                  <td>
                    <b>{stylist.display_name || stylist.name}</b>
                    {stylist.status_label ? <><br /><span>{stylist.status_label}</span></> : null}
                    <br /><code>{stylist.id}</code>
                  </td>
                  <td>
                    {stylist.title || '-'}{stylist.experience_years != null ? ` / 歴${stylist.experience_years}年` : ''}
                    <br />{stylist.catchphrase || '-'}
                    <br />{stylist.skill_tags || stylist.specialties || '-'}
                  </td>
                  <td>
                    {stylist.accepts_direct_booking === 0 ? '指名不可' : '指名可'}
                    <br />指名料 {stylist.nomination_fee ?? 0}円
                    <br />上限 {stylist.max_daily_reservations ?? '-'} / 同時 {stylist.simultaneous_capacity ?? 1}
                  </td>
                  <td>
                    {stylist.target_audience || '-'}
                    <br />{stylist.strength_note || '-'}
                  </td>
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
