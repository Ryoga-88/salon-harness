'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { fetchApi, friendlyApiError, getApiKey } from '@/lib/api';

type TimelineEvent = { kind: string; at: string; title: string; subtitle?: string; meta?: Record<string, unknown> };

type Detail = {
  friend_id: string;
  display_name: string | null;
  timeline: TimelineEvent[];
  identity_links: { source: string; external_id: string; created_at: string; metadata?: string | null }[];
};

function kindTone(kind: string): string {
  if (kind.startsWith('identity.')) return '#0f766e';
  if (kind.startsWith('reservation.')) return '#1e40af';
  if (kind === 'coupon_used') return '#a16207';
  if (kind === 'karte') return '#6b21a8';
  return '#475569';
}

export default function CustomerDetailPage() {
  const params = useParams();
  const raw = params?.friendId;
  const friendId = Array.isArray(raw) ? raw[0] : raw;
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState('');

  async function load() {
    if (!friendId) return;
    setError('');
    if (!getApiKey()) {
      setData(null);
      setError('ログイン情報がありません。');
      return;
    }
    try {
      const d = await fetchApi<Detail>(`/api/customers/${encodeURIComponent(friendId)}`);
      setData(d);
    } catch (err) {
      setData(null);
      setError(friendlyApiError(err));
    }
  }

  useEffect(() => {
    void load();
  }, [friendId]);

  const titleName = data?.display_name ?? '—';

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
        <Link href="/customers" className="button secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <ArrowLeft size={16} />一覧へ
        </Link>
        <button type="button" className="button secondary" onClick={() => void load()}>
          <RefreshCw size={16} />更新
        </button>
      </div>

      <h1 className="page-title" style={{ marginBottom: 6 }}>
        顧客タイムライン
      </h1>
      <p style={{ marginTop: 0, color: '#64748b' }}>
        <strong>{titleName}</strong>
      </p>
      <code style={{ fontSize: 13, wordBreak: 'break-all', color: '#475569' }}>{friendId}</code>

      {error && (
        <p className="panel" style={{ color: '#be123c' }}>
          {error}
        </p>
      )}

      {!error && data && (
        <section className="panel" style={{ marginTop: 20 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>統合・アクション履歴</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Instagram / LINE の紐付け、予約、クーポン、自動化ジョブを時系列でまとめています。上流の詳細ログはそれぞれの Harness で確認できます。
          </p>

          {(data.timeline?.length ?? 0) === 0 ? (
            <p className="muted">イベントはまだありません。</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
              {data.timeline.map((ev, i) => (
                <li
                  key={`${ev.at}-${ev.kind}-${i}`}
                  style={{
                    borderLeft: `4px solid ${kindTone(ev.kind)}`,
                    paddingLeft: 14,
                    background: '#f8fafc',
                    borderRadius: 8,
                    paddingTop: 10,
                    paddingBottom: 10,
                    paddingRight: 10
                  }}
                >
                  <div style={{ fontSize: 12, color: '#64748b' }}>{ev.at}</div>
                  <strong style={{ fontSize: 15 }}>{ev.title}</strong>
                  {ev.subtitle && <div style={{ fontSize: 14, marginTop: 4 }}>{ev.subtitle}</div>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!error && data?.identity_links?.length ? (
        <section className="panel" style={{ marginTop: 18 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>外部 ID（identity_links）</h2>
          <table className="table">
            <thead>
              <tr>
                <th>ソース</th>
                <th>external_id</th>
                <th>作成</th>
              </tr>
            </thead>
            <tbody>
              {data.identity_links.map((ln) => (
                <tr key={`${ln.source}-${ln.external_id}-${ln.created_at}`}>
                  <td>{ln.source}</td>
                  <td>{ln.external_id}</td>
                  <td>{ln.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {friendId ? (
        <p className="muted" style={{ marginTop: 20 }}>
          個別に LINE送信する場合は{' '}
          <Link href={`/messages?friend_id=${encodeURIComponent(friendId)}`}>メッセージ</Link> から入力できます。
        </p>
      ) : null}
    </AppShell>
  );
}
