'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginAside, LoginFooter, LoginHeader, LoginShell } from '@/components/login/login-chrome';
import { friendlyApiError, getApiUrl, rememberAuthToken } from '@/lib/api';
import './login.css';

type LoginResponse = {
  success?: boolean;
  error?: string;
  data?: { token?: string };
};

type OAuthStartResponse = {
  success?: boolean;
  error?: string;
  data?: { url?: string };
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'line' | null>(null);

  function clearMessages() {
    setErrorMsg('');
    setSuccess(false);
  }

  async function handleEmailSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    clearMessages();
    setEmailLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/auth/login`, {
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
      rememberAuthToken('salon_session', body.data.token, remember);
      setSuccess(true);
      router.push('/admin');
    } catch {
      setErrorMsg('通信に失敗しました。しばらく経ってから再度お試しください。');
      setEmailLoading(false);
    }
  }

  async function startOAuth(provider: 'google' | 'line') {
    clearMessages();
    const apiUrl = getApiUrl();
    if (!apiUrl) {
      setErrorMsg('API URL が設定されていません。NEXT_PUBLIC_API_URL を設定してください。');
      return;
    }
    setOauthLoading(provider);
    try {
      sessionStorage.setItem('salon_oauth_remember', remember ? '1' : '0');
      const redirect = `${window.location.origin}/login`;
      const res = await fetch(`${apiUrl}/api/auth/oauth/${provider}/start?redirect=${encodeURIComponent(redirect)}`);
      const body = (await res.json()) as OAuthStartResponse;
      if (!res.ok || !body.success || !body.data?.url) {
        setErrorMsg(body.error ?? '外部ログインを開始できませんでした。設定を確認してください。');
        setOauthLoading(null);
        return;
      }
      window.location.href = body.data.url;
    } catch (err) {
      setErrorMsg(friendlyApiError(err));
      setOauthLoading(null);
    }
  }

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const session = query.get('session');
    const error = query.get('error');
    if (session) {
      const persistent = sessionStorage.getItem('salon_oauth_remember') !== '0';
      sessionStorage.removeItem('salon_oauth_remember');
      rememberAuthToken('salon_session', session, persistent);
      window.history.replaceState(null, '', '/login');
      router.push('/admin');
      return;
    }
    if (error) {
      window.history.replaceState(null, '', '/login');
      const messages: Record<string, string> = {
        staff_not_found: 'このアカウントのメールアドレスは管理者として登録されていません。',
        line_email_missing: 'LINEログインでメールアドレスを取得できませんでした。LINE Login チャネルの email 権限を確認してください。',
        google_email_unverified: 'Googleアカウントのメール認証が確認できませんでした。'
      };
      setErrorMsg(messages[error] ?? '外部ログインに失敗しました。もう一度お試しください。');
    }
  }, [router]);

  return (
    <LoginShell>
      <LoginHeader />

      <main className="center">
        <section className="card" id="card" aria-labelledby="title">
          <span className="pill"><span className="dot" />v0.8.0 ・ 2026-05 リリース</span>
          <h1 id="title">サインイン</h1>
          <p className="lede">サロンオペレーター用のコンソールです。メールアドレス、Google、または LINE でログインしてください。</p>

          <div className={`error${errorMsg ? ' show' : ''}`} id="err" role="alert" aria-live="polite">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            <span id="err-msg">{errorMsg || 'ログインできませんでした。'}</span>
          </div>
          <div className={`success${success ? ' show' : ''}`} id="ok" role="status" aria-live="polite">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            <span>認証に成功しました。コンソールへ移動します…</span>
          </div>

          <div className="oauth-actions">
            <button className="oauth-btn" type="button" onClick={() => void startOAuth('google')} disabled={oauthLoading !== null}>
              <span className="oauth-mark">G</span>
              {oauthLoading === 'google' ? 'Google に接続中…' : 'Googleで続行'}
            </button>
            <button className="oauth-btn line" type="button" onClick={() => void startOAuth('line')} disabled={oauthLoading !== null}>
              <span className="oauth-mark">L</span>
              {oauthLoading === 'line' ? 'LINE に接続中…' : 'LINEで続行'}
            </button>
          </div>

          <div className="divider"><span>または</span></div>

          <form className="pane active" noValidate onSubmit={handleEmailSubmit}>
            <div className="field">
              <label htmlFor="email">メールアドレス</label>
              <div className="input-wrap">
                <span className="lead">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                </span>
                <input id="email" type="email" autoComplete="email" placeholder="owner@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div className="field">
              <label htmlFor="password">パスワード <a className="hint" href="#" style={{ color: 'var(--muted)', textDecoration: 'none' }}>忘れた場合</a></label>
              <div className="input-wrap">
                <span className="lead">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </span>
                <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                <span className="trail">
                  <button type="button" className="reveal" aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'} onClick={() => setShowPassword((v) => !v)}>
                    {showPassword ? '隠す' : '表示'}
                  </button>
                </span>
              </div>
            </div>

            <div className="row">
              <label className="check">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span>このデバイスを記憶</span>
              </label>
            </div>

            <button className={`btn btn-primary${emailLoading ? ' loading' : ''}`} type="submit" disabled={emailLoading || oauthLoading !== null}>
              <span className="spinner" aria-hidden="true" />
              <span className="label">{emailLoading ? '認証中…' : success ? '✓ 成功' : 'メールでログイン'}</span>
            </button>
          </form>

        </section>

        <LoginAside />
      </main>

      <LoginFooter />
    </LoginShell>
  );
}
