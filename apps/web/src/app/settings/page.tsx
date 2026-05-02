import { AppShell } from '@/components/app-shell';

export default function SettingsPage() {
  return (
    <AppShell>
      <h1 className="page-title">設定</h1>
      <form className="panel form">
        <div className="field"><label>サロン名</label><input placeholder="Salon Harness" /></div>
        <div className="field"><label>テーマカラー</label><input type="color" defaultValue="#0f766e" /></div>
        <div className="field"><label>LINE Harness API URL</label><input placeholder="https://line-harness.example.workers.dev" /></div>
        <div className="field"><label>IG Harness API URL</label><input placeholder="https://ig-harness.example.workers.dev" /></div>
      </form>
    </AppShell>
  );
}
