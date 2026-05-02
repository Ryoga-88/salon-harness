'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MapPin, Search, Store } from 'lucide-react';

type Salon = {
  id: string;
  name: string;
  business_type: string;
  theme_color: string | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const LIFF_URL = process.env.NEXT_PUBLIC_LIFF_URL || 'https://salon-harness-liff.vercel.app';

export default function Page() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [query, setQuery] = useState('');
  const [nearMe, setNearMe] = useState(false);
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return salons.filter((s) => !q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
  }, [salons, query]);

  useEffect(() => {
    if (!API_URL) {
      setError('API URL が設定されていません。');
      return;
    }
    fetch(`${API_URL}/public/salons`)
      .then(async (res) => {
        const body = await res.json() as { success: boolean; data?: Salon[]; error?: string };
        if (!res.ok || !body.success) throw new Error(body.error || 'サロン一覧を取得できませんでした。');
        setSalons(body.data || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  return (
    <main style={{ minHeight: '100dvh', background: '#f6f8f9', color: '#172026' }}>
      <section style={{ maxWidth: 960, margin: '0 auto', padding: '40px 20px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <strong style={{ fontSize: 20 }}>Salon Harness</strong>
          <Link href="/login" style={{ border: '1px solid #dbe3ea', borderRadius: 8, padding: '10px 14px', background: '#fff' }}>サロン管理</Link>
        </header>

        <div style={{ display: 'grid', gap: 14, marginBottom: 22 }}>
          <h1 style={{ fontSize: 36, margin: 0, letterSpacing: 0 }}>登録サロンを探す</h1>
          <p style={{ color: '#64748b', margin: 0 }}>近くのサロンや気になるサロンを見つけて、そのままLINE予約に進めます。</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 18 }}>
          <label style={{ minHeight: 46, border: '1px solid #dbe3ea', borderRadius: 8, background: '#fff', padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={18} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="エリア・サロン名で検索" style={{ border: 0, outline: 0, width: '100%', font: 'inherit' }} />
          </label>
          <button onClick={() => setNearMe((v) => !v)} style={{ border: '1px solid #dbe3ea', borderRadius: 8, background: nearMe ? '#e6f3f1' : '#fff', padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} />
            近くから探す
          </button>
        </div>

        {error && <p style={{ color: '#be123c' }}>{error}</p>}
        {!error && salons.length === 0 && <p style={{ color: '#64748b' }}>現在掲載中のサロンがありません。</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {filtered.map((salon) => (
            <a key={salon.id} href={`${LIFF_URL.replace(/\/$/, '')}/s/${salon.id}`} style={{ background: '#fff', border: '1px solid #dbe3ea', borderRadius: 8, padding: 16, display: 'grid', gap: 10 }}>
              <Store size={24} color={salon.theme_color || '#0f766e'} />
              <strong>{salon.name}</strong>
              <span style={{ color: '#64748b', fontSize: 13 }}>{nearMe ? '現在地周辺の登録サロン' : `/s/${salon.id}`}</span>
            </a>
          ))}
        </div>

        <section style={{ marginTop: 28, background: '#fff', border: '1px solid #dbe3ea', borderRadius: 8, padding: 18 }}>
          <h2 style={{ fontSize: 20, margin: '0 0 8px' }}>サロンを登録する</h2>
          <p style={{ color: '#64748b', marginTop: 0 }}>掲載する場合は管理画面にログインして、設定からサロンを作成します。</p>
          <Link href="/login" style={{ display: 'inline-flex', minHeight: 40, alignItems: 'center', borderRadius: 8, background: '#0f766e', color: '#fff', padding: '0 14px' }}>サロン登録へ</Link>
        </section>
      </section>
    </main>
  );
}
