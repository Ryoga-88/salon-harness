import type { ReactNode } from 'react';

export function LoginShell({ children }: { children: ReactNode }) {
  return <div className="login-page">{children}</div>;
}

export function LoginHeader() {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="mark" aria-hidden="true">S</div>
        <div className="name">
          <span>Salon Harness</span>
          <small>Operator Console</small>
        </div>
      </div>
      <div className="meta">
        <span className="sys" title="ステータス"><span className="status-dot" />すべてのサービス稼働中</span>
        <a className="support" href="#">サポートに問い合わせ</a>
      </div>
    </header>
  );
}

export function LoginAside() {
  return (
    <aside className="aside">
      <p className="eyebrow">Operator Console</p>
      <h2>Instagram から LINE、予約までを 1 画面で。</h2>
      <p className="sub">Salon Harness は IG Engagement Gate と LINE 友だち化、LIFF 予約のオペレーションを統合顧客 UUID（<span className="mono" style={{ fontSize: 12 }}>friend_id</span>）でつなぎます。</p>

      <ul className="feats">
        <FeatureItem
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>}
          title="IG → LINE → 予約のファネル"
          description={<>テンプレートからキャンペーン作成、<span className="mono" style={{ fontSize: 11.5 }}>ref</span> / <span className="mono" style={{ fontSize: 11.5 }}>coupon</span> で粗いアトリビューションを把握。</>}
        />
        <FeatureItem
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
          title="統合顧客タイムライン"
          description="identity_links で IG と LINE を突き合わせ、予約・クーポン使用・カルテを時系列で。"
        />
        <FeatureItem
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
          title="ロール別の安全な操作"
          description="オーナー / 受付 / スタイリストでスコープを分離。Workers API 経由で監査ログを残します。"
        />
      </ul>
    </aside>
  );
}

export function LoginFooter() {
  return (
    <footer className="foot">
      <div>&copy; 2026 Salon Harness — Operator Console</div>
      <div className="links">
        <a href="#">利用規約</a>
        <a href="#">プライバシー</a>
        <a href="#">変更履歴</a>
        <span className="sys mono" title="API region">api.jp-tk.salonharness.app</span>
      </div>
    </footer>
  );
}

function FeatureItem({ icon, title, description }: { icon: ReactNode; title: string; description: ReactNode }) {
  return (
    <li>
      <span className="ico" aria-hidden="true">{icon}</span>
      <div>
        <div className="t">{title}</div>
        <div className="d">{description}</div>
      </div>
    </li>
  );
}
