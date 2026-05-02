'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { fetchApi, friendlyApiError, getApiKey } from '@/lib/api';

type Reservation = { id: string; start_at: string; end_at: string; friend_id: string; status: string; total_price: number };

export default function ReservationsPage() {
  const [items, setItems] = useState<Reservation[]>([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  async function load() {
    setError('');
    if (!getApiKey()) {
      setItems([]);
      setLoaded(true);
      setError('ログイン情報がありません。/login で API Key を入力してください。');
      return;
    }
    try {
      const data = await fetchApi<Reservation[]>('/api/reservations');
      setItems(Array.isArray(data) ? data : []);
      setLoaded(true);
    } catch (err) {
      setItems([]);
      setLoaded(true);
      setError(friendlyApiError(err));
    }
  }
  useEffect(() => { void load(); }, []);
  return (
    <AppShell>
      <h1 className="page-title">予約管理</h1>
      <div className="toolbar"><button className="button secondary" onClick={load}><RefreshCw size={16} />更新</button></div>
      {error && <p className="muted">{error}</p>}
      {loaded && !error && items.length === 0 && <p className="muted">予約はまだありません。</p>}
      <table className="table">
        <thead><tr><th>日時</th><th>顧客 UUID</th><th>ステータス</th><th>金額</th></tr></thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id}>
              <td>{r.start_at || '-'}</td>
              <td>{r.friend_id || '-'}</td>
              <td>{r.status || '-'}</td>
              <td>¥{Number(r.total_price ?? 0).toLocaleString('ja-JP')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AppShell>
  );
}
