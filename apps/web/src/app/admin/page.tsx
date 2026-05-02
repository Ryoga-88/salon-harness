'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BarChart3, CalendarPlus, Megaphone, Tags } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { fetchApi, friendlyApiError, getApiKey } from '@/lib/api';

type FunnelPayload = {
  cohort: {
    friend_count: number;
    ig_touches: number;
    line_touches: number;
    bridged_ig_and_line: number;
    reservations_customers_booked: number;
    reservations_completed: number;
  };
  note?: string;
};

export default function AdminPage() {
  const [funnel, setFunnel] = useState<FunnelPayload | null>(null);
  const [funnelError, setFunnelError] = useState('');

  useEffect(() => {
    if (!getApiKey()) return;
    void (async () => {
      try {
        setFunnel(await fetchApi<FunnelPayload>('/api/analytics/funnel'));
      } catch (e) {
        setFunnelError(friendlyApiError(e));
      }
    })();
  }, []);

  const ch = funnel?.cohort;

  return (
    <AppShell>
      <h1 className="page-title">ダッシュボード</h1>
      <div className="grid cols">
        <div className="panel">
          <div className="muted">今日の予約</div>
          <div className="metric">0</div>
        </div>
        <div className="panel">
          <div className="muted">今週の売上</div>
          <div className="metric">¥0</div>
        </div>
        <div className="panel">
          <div className="muted">統合済みチャネル</div>
          <div className="metric">{ch?.bridged_ig_and_line ?? '—'}</div>
          <span className="muted" style={{ fontSize: 12 }}>
            IG+LINE 同一UUID
          </span>
        </div>
      </div>

      {ch && (
        <section className="panel" style={{ marginTop: 18 }}>
          <h2 style={{ marginTop: 0, fontSize: 17 }}>集客〜予約の距離（コホート）</h2>
          <p style={{ margin: '0 0 10px', color: '#64748b', fontSize: 14 }}>
            サロンの予約に現れたことがある顧客に絞り、IG/LINE の ID 統合状態を一覧します。詳細は分析ページへ。
          </p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>予約がある顧客: {ch.friend_count}</li>
            <li>IG 連携済みの割合対象数: {ch.ig_touches}</li>
            <li>LINE 側 identity がある: {ch.line_touches}</li>
            <li>予約済み顧客数（集計値）: {ch.reservations_customers_booked}</li>
          </ul>
          <Link href="/analytics" className="button secondary" style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={16} />ファネルを開く
          </Link>
        </section>
      )}
      {funnelError ? <p className="muted" style={{ color: '#b45309' }}>{funnelError}</p> : null}
      {funnel?.note && <p className="muted">{funnel.note}</p>}

      <div className="toolbar" style={{ marginTop: 18 }}>
        <button type="button" className="button">
          <CalendarPlus size={18} />予約を追加
        </button>
        <button type="button" className="button secondary">
          <Tags size={18} />クーポン発行
        </button>
        <Link href="/campaigns" className="button secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Megaphone size={18} />キャンペーン作成
        </Link>
      </div>
      <section className="panel">
        <h2 style={{ marginTop: 0 }}>今日のタイムライン</h2>
        <p className="muted">Worker API 接続後、予約が時系列で表示されます。</p>
      </section>
    </AppShell>
  );
}
