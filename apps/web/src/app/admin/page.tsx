import { AppShell } from '@/components/app-shell';
import { CalendarPlus, Tags, Megaphone } from 'lucide-react';

export default function AdminPage() {
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
          <div className="muted">新規 LINE 友だち</div>
          <div className="metric">0</div>
        </div>
      </div>
      <div className="toolbar" style={{ marginTop: 18 }}>
        <button className="button"><CalendarPlus size={18} />予約を追加</button>
        <button className="button secondary"><Tags size={18} />クーポン発行</button>
        <button className="button secondary"><Megaphone size={18} />キャンペーン作成</button>
      </div>
      <section className="panel">
        <h2 style={{ marginTop: 0 }}>今日のタイムライン</h2>
        <p className="muted">Worker API 接続後、予約が時系列で表示されます。</p>
      </section>
    </AppShell>
  );
}
