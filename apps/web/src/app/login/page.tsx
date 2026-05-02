'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  async function login() {
    setError('');
    if (apiKey) {
      localStorage.setItem('salon_api_key', apiKey);
      router.push('/admin');
      return;
    }
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const body = await res.json();
    if (!res.ok || !body.success) {
      setError(body.error ?? 'Login failed');
      return;
    }
    localStorage.setItem('salon_session', body.data.token);
    router.push('/admin');
  }

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <section className="panel form" style={{ width: 'min(440px, 100%)' }}>
        <h1 style={{ marginTop: 0 }}>Salon Harness</h1>
        <div className="field"><label>メールアドレス</label><input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="field"><label>パスワード</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <div className="field"><label>または API Key</label><input value={apiKey} onChange={(e) => setApiKey(e.target.value)} /></div>
        {error && <p className="muted">{error}</p>}
        <button className="button" type="button" onClick={login}>ログイン</button>
      </section>
    </main>
  );
}
