'use client';

import { useState } from 'react';
import { Copy, Plus } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { fetchApi } from '@/lib/api';

export default function CouponsPage() {
  const [stylistId, setStylistId] = useState('');
  const [items, setItems] = useState<Array<{ id: string; code: string; name: string; valid_until: string; used_count: number }>>([]);
  const [error, setError] = useState('');
  async function load() {
    try {
      setItems(await fetchApi(`/api/coupons?stylist_id=${encodeURIComponent(stylistId)}&friend_id=preview`));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }
  return (
    <AppShell>
      <h1 className="page-title">クーポン</h1>
      <div className="toolbar">
        <input placeholder="stylist_id" value={stylistId} onChange={(e) => setStylistId(e.target.value)} style={{ minHeight: 40, border: '1px solid var(--line)', borderRadius: 8, padding: '0 10px' }} />
        <button className="button" onClick={load}><Plus size={16} />一覧取得</button>
      </div>
      {error && <p className="muted">{error}</p>}
      <table className="table">
        <thead><tr><th>コード</th><th>名称</th><th>期限</th><th>利用数</th><th>配布</th></tr></thead>
        <tbody>{items.map((c) => <tr key={c.id}><td>{c.code}</td><td>{c.name}</td><td>{c.valid_until}</td><td>{c.used_count}</td><td><button className="button secondary"><Copy size={14} />コピー</button></td></tr>)}</tbody>
      </table>
    </AppShell>
  );
}
