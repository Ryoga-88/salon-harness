import { AppShell } from '@/components/app-shell';

export default function AnalyticsPage() {
  return (
    <AppShell>
      <h1 className="page-title">分析</h1>
      <div className="grid cols">
        <div className="panel"><div className="muted">予約 CV</div><div className="metric">0%</div></div>
        <div className="panel"><div className="muted">リピート率 4w</div><div className="metric">0%</div></div>
        <div className="panel"><div className="muted">平均客単価</div><div className="metric">¥0</div></div>
      </div>
    </AppShell>
  );
}
