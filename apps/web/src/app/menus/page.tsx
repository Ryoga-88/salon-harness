'use client';

import { useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { fetchApi } from '@/lib/api';

type Menu = { id: string; name: string; category: string; duration_min: number; price: number; stylist_id: string };

export default function MenusPage() {
  const [items, setItems] = useState<Menu[]>([]);
  const [error, setError] = useState('');
  async function load() {
    try {
      setItems(await fetchApi<Menu[]>('/api/menus'));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }
  useEffect(() => { void load(); }, []);
  return (
    <AppShell>
      <h1 className="page-title">メニュー・料金</h1>
      <div className="toolbar">
        <button className="button"><Plus size={16} />メニュー作成</button>
        <button className="button secondary" onClick={load}><RefreshCw size={16} />更新</button>
      </div>
      {error && <p className="muted">{error}</p>}
      <div className="grid cols">
        {items.map((m) => (
          <article className="card" key={m.id}>
            <strong>{m.name}</strong>
            <p className="muted">{m.category} / {m.duration_min}分</p>
            <div>¥{m.price.toLocaleString('ja-JP')}</div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
