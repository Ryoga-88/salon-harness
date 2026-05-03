'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { fetchApi, friendlyApiError } from '@/lib/api';

type Dashboard = {
  today_reservations: number;
  weekly_sales: number;
  identity_links: number;
  coupon_used_count: number;
  coupon_total_used_count: number;
  recent_reservations: Array<{ id: string; friend_id: string; start_at: string; status: string; total_price: number; stylist_name: string }>;
  recent_jobs: Array<{ id: string; job_type: string; target_friend_id: string; scheduled_at: string; status: string }>;
};

type Funnel = {
  global_identity: { distinct_with_ig: number; distinct_with_line: number; bridged_ig_and_line: number };
  cohort: { reservations_completed: number; reservations_customers_booked: number };
};

export default function AdminPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const [dash, fun] = await Promise.all([
        fetchApi<Dashboard>('/api/analytics/dashboard'),
        fetchApi<Funnel>('/api/analytics/funnel')
      ]);
      setDashboard(dash);
      setFunnel(fun);
      setError('');
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  useEffect(() => { void load(); }, []);

  const cards = [
    { label: '今日の予約', value: `${dashboard?.today_reservations ?? 0} 件`, href: '/reservations' },
    { label: '今週の売上', value: `¥${Number(dashboard?.weekly_sales ?? 0).toLocaleString('ja-JP')}`, href: '/reservations' },
    { label: '統合 UUID', value: `${dashboard?.identity_links ?? 0} 件`, href: '/customers' },
    { label: 'クーポン利用', value: `${dashboard?.coupon_used_count ?? 0} 件`, href: '/coupons' }
  ];

  return (
    <AppShell>
      <div style={{ display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 className="page-title">ダッシュボード</h1>
            <p style={{ color: 'var(--muted)', margin: 0 }}>DB の予約・identity_links・クーポン使用・自動化ジョブを集計しています。</p>
          </div>
          <button className="button secondary" type="button" onClick={() => void load()}>更新</button>
        </div>

        {error && <div className="panel" style={{ borderColor: 'var(--rose-line)', color: 'var(--rose)' }}>{error}</div>}

        <div className="grid cols">
          {cards.map((card) => (
            <Link key={card.label} href={card.href} className="panel" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>{card.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{card.value}</div>
            </Link>
          ))}
        </div>

        <section className="panel">
          <h2 style={{ marginTop: 0 }}>IG → LINE → 予約ファネル</h2>
          <div className="grid cols">
            <div><small>IG連携UUID</small><br /><b>{funnel?.global_identity.distinct_with_ig ?? 0}</b></div>
            <div><small>LINE連携UUID</small><br /><b>{funnel?.global_identity.distinct_with_line ?? 0}</b></div>
            <div><small>IG↔LINE統合</small><br /><b>{funnel?.global_identity.bridged_ig_and_line ?? 0}</b></div>
            <div><small>予約済み顧客</small><br /><b>{funnel?.cohort.reservations_customers_booked ?? 0}</b></div>
            <div><small>完了予約</small><br /><b>{funnel?.cohort.reservations_completed ?? 0}</b></div>
          </div>
        </section>

        <section className="panel">
          <h2 style={{ marginTop: 0 }}>最近の予約</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead><tr><th>日時</th><th>顧客</th><th>担当</th><th>状態</th><th>金額</th></tr></thead>
              <tbody>
                {(dashboard?.recent_reservations ?? []).map((r) => (
                  <tr key={r.id}>
                    <td>{r.start_at}</td>
                    <td><Link href={`/customers/${encodeURIComponent(r.friend_id)}`}>{r.friend_id}</Link></td>
                    <td>{r.stylist_name}</td>
                    <td>{r.status}</td>
                    <td>¥{Number(r.total_price).toLocaleString('ja-JP')}</td>
                  </tr>
                ))}
                {(!dashboard || dashboard.recent_reservations.length === 0) && <tr><td colSpan={5}>予約はまだありません。</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <h2 style={{ marginTop: 0 }}>自動化ジョブ</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead><tr><th>種別</th><th>顧客</th><th>予定</th><th>状態</th></tr></thead>
              <tbody>
                {(dashboard?.recent_jobs ?? []).map((job) => (
                  <tr key={job.id}>
                    <td>{job.job_type}</td>
                    <td>{job.target_friend_id}</td>
                    <td>{job.scheduled_at}</td>
                    <td>{job.status}</td>
                  </tr>
                ))}
                {(!dashboard || dashboard.recent_jobs.length === 0) && <tr><td colSpan={4}>ジョブはまだありません。</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
