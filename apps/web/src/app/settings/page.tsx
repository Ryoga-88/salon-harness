'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CrudPage, CrudPanel, EmptyTableRow, SalonSelector, TableScroll } from '@/components/admin/crud-page';
import { fetchApi, friendlyApiError } from '@/lib/api';

type Salon = {
  id: string;
  name: string;
  business_type: string;
  theme_color: string | null;
};

type Stylist = {
  id: string;
  salon_id: string;
  name: string;
  display_name: string | null;
};

type ChannelConnection = {
  id: string;
  salon_id: string;
  stylist_id: string | null;
  provider: 'line' | 'instagram';
  scope: 'salon' | 'stylist';
  account_name: string;
  provider_account_id: string | null;
  harness_api_url: string | null;
  harness_api_key_masked: string | null;
  is_default: number;
  is_active: number;
  stylist_name?: string | null;
};

const emptySalonForm = { id: '', name: '', business_type: 'freelance', theme_color: '#0f766e' };
const emptyConnectionForm = {
  provider: 'instagram' as 'line' | 'instagram',
  stylist_id: '',
  account_name: '',
  provider_account_id: '',
  harness_api_url: '',
  harness_api_key: '',
  is_default: true
};

function providerLabel(provider: 'line' | 'instagram'): string {
  return provider === 'line' ? 'LINE公式' : 'Instagram';
}

export default function SettingsPage() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [selectedSalonId, setSelectedSalonId] = useState('default');
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [connections, setConnections] = useState<ChannelConnection[]>([]);
  const [salonForm, setSalonForm] = useState(emptySalonForm);
  const [connectionForm, setConnectionForm] = useState(emptyConnectionForm);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const stylistNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const stylist of stylists) map[stylist.id] = stylist.display_name || stylist.name;
    return map;
  }, [stylists]);

  async function load(nextSalonId = selectedSalonId) {
    try {
      const salonItems = await fetchApi<Salon[]>('/api/salons');
      const selected = nextSalonId || salonItems[0]?.id || 'default';
      setSalons(salonItems);
      setSelectedSalonId(selected);
      const [stylistItems, connectionItems] = await Promise.all([
        fetchApi<Stylist[]>(`/api/stylists?salon_id=${encodeURIComponent(selected)}`),
        fetchApi<ChannelConnection[]>(`/api/channel-connections?salon_id=${encodeURIComponent(selected)}`)
      ]);
      setStylists(stylistItems);
      setConnections(connectionItems);
      setError('');
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  async function createSalon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await fetchApi('/api/salons', { method: 'POST', body: JSON.stringify(salonForm) });
      setNotice('サロンを作成しました。LIFF のサロン選択にも表示されます。');
      setSalonForm(emptySalonForm);
      await load(salonForm.id);
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  async function deactivateSalon(id: string) {
    try {
      await fetchApi(`/api/salons/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setNotice('サロンを非表示にしました。LIFF の一覧からも外れます。');
      await load(id === selectedSalonId ? '' : selectedSalonId);
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  async function createConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await fetchApi('/api/channel-connections', {
        method: 'POST',
        body: JSON.stringify({
          salon_id: selectedSalonId,
          provider: connectionForm.provider,
          stylist_id: connectionForm.stylist_id || null,
          account_name: connectionForm.account_name,
          provider_account_id: connectionForm.provider_account_id || null,
          harness_api_url: connectionForm.harness_api_url || null,
          harness_api_key: connectionForm.harness_api_key || null,
          is_default: connectionForm.is_default
        })
      });
      setNotice('チャネル接続を保存しました。美容師個人の接続がある場合は、サロン全体より優先して使われます。');
      setConnectionForm(emptyConnectionForm);
      await load(selectedSalonId);
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  async function deactivateConnection(id: string) {
    try {
      await fetchApi(`/api/channel-connections/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setNotice('チャネル接続を無効化しました。');
      await load(selectedSalonId);
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  async function setDefaultConnection(connection: ChannelConnection) {
    try {
      await fetchApi(`/api/channel-connections/${encodeURIComponent(connection.id)}`, {
        method: 'PUT',
        body: JSON.stringify({ is_default: true })
      });
      setNotice(`${providerLabel(connection.provider)} の既定接続を更新しました。`);
      await load(selectedSalonId);
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <CrudPage
      title="設定"
      description="サロン情報と、サロン全体・美容師個人の LINE/Instagram 接続を管理します。個人接続が未設定の場合はサロン全体の接続を使います。"
      error={error}
      notice={notice}
    >
      <CrudPanel title="サロン作成">
        <form className="form" onSubmit={createSalon}>
          <div className="field">
            <label htmlFor="salon-id">サロンID</label>
            <input id="salon-id" required pattern="[a-z0-9-]+" placeholder="例: aoyama-salon" value={salonForm.id} onChange={(e) => setSalonForm({ ...salonForm, id: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="salon-name">サロン名</label>
            <input id="salon-name" required placeholder="例: Salon Harness 青山" value={salonForm.name} onChange={(e) => setSalonForm({ ...salonForm, name: e.target.value })} />
          </div>
          <div className="grid cols">
            <div className="field">
              <label htmlFor="business-type">形態</label>
              <select id="business-type" value={salonForm.business_type} onChange={(e) => setSalonForm({ ...salonForm, business_type: e.target.value })}>
                <option value="freelance">フリーランス</option>
                <option value="solo_salon">個人サロン</option>
                <option value="shared_salon">シェアサロン</option>
                <option value="multi_stylist">複数スタイリスト</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="theme-color">テーマカラー</label>
              <input id="theme-color" type="color" value={salonForm.theme_color} onChange={(e) => setSalonForm({ ...salonForm, theme_color: e.target.value })} />
            </div>
            <div className="field" style={{ alignSelf: 'end' }}>
              <button className="button" type="submit">作成</button>
            </div>
          </div>
        </form>
      </CrudPanel>

      <CrudPanel title="連携済みサロン">
        <TableScroll>
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
              {salons.length === 0 && <EmptyTableRow colSpan={5}>表示中のサロンがありません。</EmptyTableRow>}
            </tbody>
          </table>
        </TableScroll>
      </CrudPanel>

      <SalonSelector salons={salons} value={selectedSalonId} onChange={(next) => void load(next)} />

      <CrudPanel title="LINE / Instagram 接続作成">
        <form className="form" onSubmit={createConnection}>
          <div className="grid cols">
            <div className="field">
              <label htmlFor="connection-provider">チャネル</label>
              <select id="connection-provider" value={connectionForm.provider} onChange={(e) => setConnectionForm({ ...connectionForm, provider: e.target.value as 'line' | 'instagram' })}>
                <option value="instagram">Instagram</option>
                <option value="line">LINE公式</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="connection-stylist">適用先</label>
              <select id="connection-stylist" value={connectionForm.stylist_id} onChange={(e) => setConnectionForm({ ...connectionForm, stylist_id: e.target.value })}>
                <option value="">サロン全体</option>
                {stylists.map((stylist) => (
                  <option key={stylist.id} value={stylist.id}>{stylist.display_name || stylist.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="connection-name">表示名</label>
              <input id="connection-name" required placeholder="例: 田中 Instagram / 青山 LINE公式" value={connectionForm.account_name} onChange={(e) => setConnectionForm({ ...connectionForm, account_name: e.target.value })} />
            </div>
          </div>
          <div className="grid cols">
            <div className="field">
              <label htmlFor="provider-account-id">外部アカウントID</label>
              <input id="provider-account-id" placeholder="LINE channel ID / IG business account ID" value={connectionForm.provider_account_id} onChange={(e) => setConnectionForm({ ...connectionForm, provider_account_id: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="harness-url">Harness API URL</label>
              <input id="harness-url" type="url" placeholder="https://...workers.dev" value={connectionForm.harness_api_url} onChange={(e) => setConnectionForm({ ...connectionForm, harness_api_url: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="harness-key">Harness API Key</label>
              <input id="harness-key" type="password" autoComplete="new-password" placeholder="保存時のみ入力" value={connectionForm.harness_api_key} onChange={(e) => setConnectionForm({ ...connectionForm, harness_api_key: e.target.value })} />
            </div>
          </div>
          <label className="check" style={{ justifyContent: 'flex-start' }}>
            <input type="checkbox" checked={connectionForm.is_default} onChange={(e) => setConnectionForm({ ...connectionForm, is_default: e.target.checked })} />
            <span>この適用先の既定接続にする</span>
          </label>
          <button className="button" type="submit">接続を保存</button>
        </form>
      </CrudPanel>

      <CrudPanel title="チャネル接続">
        <TableScroll>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr><th>チャネル</th><th>適用先</th><th>表示名</th><th>外部ID</th><th>API</th><th>状態</th><th /></tr>
            </thead>
            <tbody>
              {connections.map((connection) => (
                <tr key={connection.id}>
                  <td>{providerLabel(connection.provider)}</td>
                  <td>{connection.stylist_id ? stylistNameById[connection.stylist_id] ?? connection.stylist_name ?? '美容師個人' : 'サロン全体'}</td>
                  <td><b>{connection.account_name}</b><br /><code>{connection.id}</code></td>
                  <td>{connection.provider_account_id || '-'}</td>
                  <td>
                    <span>{connection.harness_api_url || '-'}</span>
                    <br />
                    <code>{connection.harness_api_key_masked || 'key未設定'}</code>
                  </td>
                  <td>
                    {connection.is_active ? '有効' : '無効'}
                    {connection.is_default ? <><br /><b>既定</b></> : null}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {!connection.is_default && connection.is_active ? <button className="button secondary" type="button" onClick={() => void setDefaultConnection(connection)}>既定にする</button> : null}
                    <button className="button secondary" type="button" onClick={() => void deactivateConnection(connection.id)} style={{ marginLeft: 8 }}>無効化</button>
                  </td>
                </tr>
              ))}
              {connections.length === 0 && <EmptyTableRow colSpan={7}>LINE / Instagram 接続がありません。サロン全体の接続から登録してください。</EmptyTableRow>}
            </tbody>
          </table>
        </TableScroll>
      </CrudPanel>
    </CrudPage>
  );
}
