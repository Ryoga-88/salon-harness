'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { fetchApi, friendlyApiError, getApiKey } from '@/lib/api';

type FunnelPayload = {
  scope: string;
  global_identity: { distinct_with_ig: number; distinct_with_line: number; bridged_ig_and_line: number };
  cohort: {
    friend_count: number;
    ig_touches: number;
    line_touches: number;
    bridged_ig_and_line: number;
    reservations_completed: number;
    reservations_customers_booked: number;
  };
  note?: string;
};

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const w = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
        <span>{label}</span>
        <strong>{value.toLocaleString('ja-JP')}</strong>
      </div>
      <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${w}%`, height: '100%', background: '#0f766e', transition: 'width 0.2s ease' }} />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<FunnelPayload | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    if (!getApiKey()) {
      setData(null);
      setError('ログイン情報がありません。');
      return;
    }
    try {
      setData(await fetchApi<FunnelPayload>('/api/analytics/funnel'));
    } catch (err) {
      setData(null);
      setError(friendlyApiError(err));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const g = data?.global_identity;
  const ch = data?.cohort;
  const maxGlobal = Math.max(g?.distinct_with_ig ?? 0, g?.distinct_with_line ?? 0, g?.bridged_ig_and_line ?? 0, 1);
  const maxCohort = Math.max(
    ch?.friend_count ?? 0,
    ch?.ig_touches ?? 0,
    ch?.line_touches ?? 0,
    ch?.bridged_ig_and_line ?? 0,
    ch?.reservations_customers_booked ?? 0,
    ch?.reservations_completed ?? 0,
    1
  );

  return (
    <AppShell>
      <h1 className="page-title">分析 · ファネル</h1>
      <p className="muted">
        コメント→DM→LINE友だち→予約の流れを、ID連携（<code style={{ fontSize: 13 }}>identity_links</code>）と予約データからざっくり可視化します。
        詳細なコメント・DMログは <strong>ig-harness</strong> / <strong>line-harness</strong> 側の管理画面で追うのが確実です。
      </p>

      <div className="toolbar">
        <button type="button" className="button secondary" onClick={() => void load()}>
          <RefreshCw size={16} />更新
        </button>
        <Link href="/customers" className="button secondary">
          顧客一覧
        </Link>
      </div>

      {error && (
        <p className="panel" style={{ color: '#be123c' }}>
          {error}
        </p>
      )}

      {data?.note && <p className="panel muted">{data.note}</p>}

      {g && (
        <section className="panel" style={{ marginBottom: 18 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>全体（identity 全体の距離感）</h2>
          <Bar label="Instagram 側で登場した UUID" value={g.distinct_with_ig} max={maxGlobal} />
          <Bar label="LINE 側で登場した UUID" value={g.distinct_with_line} max={maxGlobal} />
          <Bar label="IG と LINE の両方が付いた UUID" value={g.bridged_ig_and_line} max={maxGlobal} />
        </section>
      )}

      {ch && (
        <section className="panel">
          <h2 style={{ marginTop: 0, fontSize: 18 }}>
            コホート（{data?.scope === 'stylist' ? '担当で予約のある顧客' : 'サロンで予約のある顧客'}に絞り込み）
          </h2>
          <Bar label="コホート人数（予約履歴のある friend_id）" value={ch.friend_count} max={maxCohort} />
          <Bar label="うち IG identity あり" value={ch.ig_touches} max={maxCohort} />
          <Bar label="うち LINE identity あり" value={ch.line_touches} max={maxCohort} />
          <Bar label="うち IG+LINE ブリッジ済み" value={ch.bridged_ig_and_line} max={maxCohort} />
          <Bar label="予約を持つ顧客数（ステータス多数）" value={ch.reservations_customers_booked} max={maxCohort} />
          <Bar label="来店完了（completed）件数" value={ch.reservations_completed} max={maxCohort} />
        </section>
      )}
    </AppShell>
  );
}
