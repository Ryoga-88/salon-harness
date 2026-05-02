import { AppShell } from '@/components/app-shell';

export default function CustomersPage() {
  return (
    <AppShell>
      <h1 className="page-title">顧客管理</h1>
      <section className="panel">
        <p className="muted">line-harness の `/api/friends` を管理画面から呼び出して、LINE 友だち、タグ、流入元を統合表示します。</p>
      </section>
    </AppShell>
  );
}
