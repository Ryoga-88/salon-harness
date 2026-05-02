'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import './login.css';

type Tab = 'email' | 'apikey';

type LoginResponse = {
  success?: boolean;
  error?: string;
  data?: { token?: string };
};

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [workspace, setWorkspace] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [keyLoading, setKeyLoading] = useState(false);

  function clearMessages() {
    setErrorMsg('');
    setSuccess(false);
  }

  function switchTab(next: Tab) {
    setTab(next);
    clearMessages();
  }

  async function handleEmailSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    clearMessages();
    setEmailLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const body = (await res.json()) as LoginResponse;
      if (!res.ok || !body.success || !body.data?.token) {
        setErrorMsg(body.error ?? 'メールアドレスまたはパスワードが正しくありません。');
        setEmailLoading(false);
        return;
      }
      localStorage.setItem('salon_session', body.data.token);
      setSuccess(true);
      router.push('/admin');
    } catch {
      setErrorMsg('通信に失敗しました。しばらく経ってから再度お試しください。');
      setEmailLoading(false);
    }
  }

  function handleApiKeySubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    clearMessages();
    if (!apiKey.trim()) {
      setErrorMsg('有効な API Key を入力してください。');
      return;
    }
    setKeyLoading(true);
    localStorage.setItem('salon_api_key', apiKey.trim());
    setSuccess(true);
    router.push('/admin');
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <div className="mark" aria-hidden="true">S</div>
          <div className="name">
            <span>Salon Harness</span>
            <small>Operator Console</small>
          </div>
        </div>
        <div className="meta">
          <span className="sys" title="ステータス"><span className="status-dot"></span>すべてのサービス稼働中</span>
          <a className="support" href="#">サポートに問い合わせ</a>
        </div>
      </header>

      <main className="center">
        <section className="card" id="card" aria-labelledby="title">
          <span className="pill"><span className="dot"></span>v0.7.2 • 2026-04 リリース</span>
          <h1 id="title">サインイン</h1>
          <p className="lede">サロンオペレーター用のコンソールです。メールアドレス、または発行済みの API Key でログインしてください。</p>

          <div className={`error${errorMsg ? ' show' : ''}`} id="err" role="alert" aria-live="polite">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span id="err-msg">{errorMsg || 'メールアドレスまたはパスワードが正しくありません。'}</span>
          </div>
          <div className={`success${success ? ' show' : ''}`} id="ok" role="status" aria-live="polite">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>
            <span>認証に成功しました。コンソールへ移動します…</span>
          </div>

          <div className="tabs" role="tablist" id="tabs" data-tab={tab}>
            <button
              className={`tab${tab === 'email' ? ' active' : ''}`}
              role="tab"
              aria-selected={tab === 'email'}
              data-target="email"
              id="tab-email"
              type="button"
              onClick={() => switchTab('email')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              メール
            </button>
            <button
              className={`tab${tab === 'apikey' ? ' active' : ''}`}
              role="tab"
              aria-selected={tab === 'apikey'}
              data-target="apikey"
              id="tab-apikey"
              type="button"
              onClick={() => switchTab('apikey')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
              API Key
            </button>
          </div>

          <form className={`pane${tab === 'email' ? ' active' : ''}`} id="pane-email" noValidate onSubmit={handleEmailSubmit}>
            <div className="field" id="f-email">
              <label htmlFor="email">メールアドレス</label>
              <div className="input-wrap">
                <span className="lead">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                </span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="owner@example.salon"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <span className="err">有効なメールアドレスを入力してください。</span>
            </div>

            <div className="field" id="f-pass">
              <label htmlFor="password">パスワード <a className="hint" href="#" id="forgot" style={{ color: 'var(--muted)', textDecoration: 'none' }}>忘れた場合</a></label>
              <div className="input-wrap">
                <span className="lead">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <span className="trail">
                  <button
                    type="button"
                    className="reveal"
                    id="reveal"
                    aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    <svg id="eye-on" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: showPassword ? 'none' : '' }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    <svg id="eye-off" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: showPassword ? '' : 'none' }}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  </button>
                </span>
              </div>
              <span className="err">パスワードは6文字以上で入力してください。</span>
              <span className="caps" id="caps">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5l7 7H5z"></path><line x1="5" y1="19" x2="19" y2="19"></line></svg>
                Caps Lock がオンになっています
              </span>
            </div>

            <div className="row">
              <label className="check">
                <input
                  type="checkbox"
                  id="remember"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>このデバイスを記憶</span>
              </label>
              <a href="#" id="sso">SSO でログイン →</a>
            </div>

            <button className={`btn btn-primary${emailLoading ? ' loading' : ''}`} id="submit-email" type="submit" disabled={emailLoading}>
              <span className="spinner" aria-hidden="true"></span>
              <span className="label">{emailLoading ? '認証中…' : success && tab === 'email' ? '✓ 成功' : 'ログイン'}</span>
            </button>
          </form>

          <form className={`pane${tab === 'apikey' ? ' active' : ''}`} id="pane-apikey" noValidate onSubmit={handleApiKeySubmit}>
            <div className="help">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              <div>
                設定 → <kbd>API Keys</kbd> で発行されたサロン単位のキーを使用します。形式は <code className="mono">sh_live_…</code>。本番キーは安全に保管してください。
              </div>
            </div>

            <div className="field" id="f-key">
              <label htmlFor="apikey">API Key <span className="hint mono">sh_live_********</span></label>
              <div className="input-wrap">
                <span className="lead">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="3.5"></circle><path d="M10 13l8.5-8.5L21 7l-2 2 2 2-3 3-2-2-1.5 1.5"></path></svg>
                </span>
                <input
                  id="apikey"
                  type={showApiKey ? 'text' : 'password'}
                  autoComplete="off"
                  placeholder="sh_live_xxxxxxxxxxxxxxxxxxxxxxxx"
                  required
                  spellCheck={false}
                  className="mono"
                  style={{ fontSize: 13 }}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <span className="trail">
                  <button
                    type="button"
                    className="reveal"
                    id="reveal-key"
                    aria-label={showApiKey ? 'キーを隠す' : 'キーを表示'}
                    onClick={() => setShowApiKey((v) => !v)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  </button>
                </span>
              </div>
              <span className="err">有効な API Key を入力してください（<code className="mono">sh_live_</code> または <code className="mono">sh_test_</code> で始まります）。</span>
            </div>

            <div className="field">
              <label htmlFor="workspace">ワークスペース <span className="hint">任意</span></label>
              <div className="input-wrap">
                <span className="lead">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                </span>
                <input
                  id="workspace"
                  type="text"
                  placeholder="例: aoyama-flagship"
                  spellCheck={false}
                  value={workspace}
                  onChange={(e) => setWorkspace(e.target.value)}
                />
              </div>
            </div>

            <button className={`btn btn-primary${keyLoading ? ' loading' : ''}`} id="submit-key" type="submit" disabled={keyLoading}>
              <span className="spinner" aria-hidden="true"></span>
              <span className="label">{keyLoading ? '認証中…' : success && tab === 'apikey' ? '✓ 成功' : 'キーで認証'}</span>
            </button>
          </form>

          <div className="card-foot">
            <a href="#" id="public-top">← 公開トップへ</a>
            <span>アカウントがない場合は<a href="#" style={{ marginLeft: 6 }}>サロン登録</a></span>
          </div>
        </section>

        <aside className="aside">
          <p className="eyebrow">Operator Console</p>
          <h2>Instagram から LINE、予約までを 1 画面で。</h2>
          <p className="sub">Salon Harness は IG Engagement Gate と LINE 友だち化、LIFF 予約のオペレーションを統合顧客 UUID（<span className="mono" style={{ fontSize: 12 }}>friend_id</span>）でつなぎます。</p>

          <ul className="feats">
            <li>
              <span className="ico" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </span>
              <div>
                <div className="t">IG → LINE → 予約のファネル</div>
                <div className="d">テンプレートからキャンペーン作成、<span className="mono" style={{ fontSize: 11.5 }}>ref</span> / <span className="mono" style={{ fontSize: 11.5 }}>coupon</span> で粗いアトリビューションを把握。</div>
              </div>
            </li>
            <li>
              <span className="ico" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </span>
              <div>
                <div className="t">統合顧客タイムライン</div>
                <div className="d">identity_links で IG と LINE を突き合わせ、予約・クーポン使用・カルテを時系列で。</div>
              </div>
            </li>
            <li>
              <span className="ico" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </span>
              <div>
                <div className="t">ロール別の安全な操作</div>
                <div className="d">オーナー / 受付 / スタイリストでスコープを分離。Workers API 経由で監査ログを残します。</div>
              </div>
            </li>
          </ul>
        </aside>
      </main>

      <footer className="foot">
        <div>&copy; 2026 Salon Harness — Operator Console</div>
        <div className="links">
          <a href="#">利用規約</a>
          <a href="#">プライバシー</a>
          <a href="#">変更履歴</a>
          <span className="sys mono" title="API region">api.jp-tk.salonharness.app</span>
        </div>
      </footer>
    </div>
  );
}
