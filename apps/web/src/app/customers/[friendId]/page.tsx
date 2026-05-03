'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { fetchApi, friendlyApiError } from '@/lib/api';

type TimelineEvent = { kind: string; at: string; title: string; subtitle?: string; meta?: Record<string, unknown> };
type Reservation = { id: string; start_at: string; stylist_id: string; status: string; total_price: number; stylist_name?: string; stylist_display_name?: string | null };
type Detail = {
  friend_id: string;
  display_name: string | null;
  timeline: TimelineEvent[];
  identity_links: { source: string; external_id: string; created_at: string; metadata?: string | null }[];
  reservations: Reservation[];
  kartes: Array<{ id: string; created_at: string; procedure_note?: string | null; next_recommendation?: string | null }>;
  coupon_usages: Array<{ id: string; used_at: string; coupon_code?: string; coupon_name?: string; discount_applied: number }>;
  automation_jobs: Array<{ id: string; job_type: string; scheduled_at: string; status: string }>;
};

function kindLabel(kind: string) {
  if (kind.startsWith('reservation')) return '予約';
  if (kind.startsWith('identity')) return 'ID連携';
  if (kind.startsWith('coupon')) return 'クーポン';
  if (kind.startsWith('karte')) return 'カルテ';
  if (kind.startsWith('automation')) return '自動化';
  return kind;
}

export default function CustomerDetailPage() {
  const params = useParams<{ friendId: string }>();
  const friendId = decodeURIComponent(params.friendId);
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [karte, setKarte] = useState({ reservation_id: '', procedure_note: '', next_recommendation: '' });

  async function load() {
    try {
      const detail = await fetchApi<Detail>(`/api/customers/${encodeURIComponent(friendId)}`);
      setData(detail);
      setKarte((prev) => ({ ...prev, reservation_id: prev.reservation_id || detail.reservations[0]?.id || '' }));
      setError('');
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  async function createKarte(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reservation = data?.reservations.find((r) => r.id === karte.reservation_id);
    if (!reservation) {
      setError('カルテを紐付ける予約を選択してください。');
      return;
    }
    try {
      await fetchApi('/api/kartes', {
        method: 'POST',
        body: JSON.stringify({
          reservation_id: reservation.id,
          friend_id: friendId,
          stylist_id: reservation.stylist_id,
          procedure_note: karte.procedure_note,
          next_recommendation: karte.next_recommendation
        })
      });
      setNotice('カルテを追加しました。タイムラインに反映されます。');
      setKarte({ reservation_id: reservation.id, procedure_note: '', next_recommendation: '' });
      await load();
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  useEffect(() => { void load(); }, [friendId]);

  return (
    <AppShell>
      <div style={{ display: 'grid', gap: 18 }}>
        <div>
          <Link href="/customers" style={{ color: 'var(--muted)', textDecoration: 'none' }}>← 顧客一覧</Link>
          <h1 className="page-title" style={{ marginTop: 10 }}>{data?.display_name || friendId}</h1>
          <p style={{ color: 'var(--muted)', margin: 0 }}><code>{friendId}</code> の予約・クーポン使用・identity_links・カルテを DB から時系列表示します。</p>
        </div>

        {error && <div className="panel" style={{ borderColor: 'var(--rose-line)', color: 'var(--rose)' }}>{error}</div>}
        {notice && <div className="panel" style={{ borderColor: 'var(--green-line)', color: 'var(--green)' }}>{notice}</div>}

        <div className="grid cols">
          <section className="panel"><small>予約</small><br /><b style={{ fontSize: 24 }}>{data?.reservations.length ?? 0}</b></section>
          <section className="panel"><small>クーポン使用</small><br /><b style={{ fontSize: 24 }}>{data?.coupon_usages.length ?? 0}</b></section>
          <section className="panel"><small>連携チャネル</small><br /><b style={{ fontSize: 24 }}>{data?.identity_links.length ?? 0}</b></section>
        </div>

        <section className="panel">
          <h2 style={{ marginTop: 0 }}>identity_links</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(data?.identity_links ?? []).map((link) => (
              <span key={`${link.source}-${link.external_id}`} className="button secondary">
                {link.source}: {link.external_id}
              </span>
            ))}
            {data?.identity_links.length === 0 && <span>identity_links はまだありません。</span>}
          </div>
        </section>

        <section className="panel">
          <h2 style={{ marginTop: 0 }}>カルテ追加</h2>
          <form className="form" onSubmit={createKarte}>
            <div className="field">
              <label>予約</label>
              <select value={karte.reservation_id} onChange={(e) => setKarte({ ...karte, reservation_id: e.target.value })}>
                <option value="">選択してください</option>
                {(data?.reservations ?? []).map((r) => <option key={r.id} value={r.id}>{r.start_at} / {r.status}</option>)}
              </select>
            </div>
            <div className="field"><label>施術メモ</label><textarea rows={3} value={karte.procedure_note} onChange={(e) => setKarte({ ...karte, procedure_note: e.target.value })} /></div>
            <div className="field"><label>次回提案</label><textarea rows={2} value={karte.next_recommendation} onChange={(e) => setKarte({ ...karte, next_recommendation: e.target.value })} /></div>
            <button className="button" type="submit" disabled={!data?.reservations.length}>追加</button>
          </form>
        </section>

        <section className="panel">
          <h2 style={{ marginTop: 0 }}>タイムライン</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {(data?.timeline ?? []).map((event, index) => (
              <div key={`${event.kind}-${event.at}-${index}`} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <b>{event.title}</b>
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>{event.at}</span>
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{kindLabel(event.kind)} / {event.subtitle || '-'}</div>
                {event.meta && <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, background: 'var(--header)', padding: 8, borderRadius: 6 }}>{JSON.stringify(event.meta, null, 2)}</pre>}
              </div>
            ))}
            {data?.timeline.length === 0 && <div>タイムラインに表示する履歴はまだありません。</div>}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
