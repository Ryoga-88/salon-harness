'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <section className="panel" style={{ width: 'min(520px, 100%)' }}>
        <h1 style={{ marginTop: 0 }}>画面の読み込みに失敗しました</h1>
        <p className="muted">{error.message || 'ブラウザを再読み込みしてください。'}</p>
        <button className="button" type="button" onClick={reset}>再読み込み</button>
      </section>
    </main>
  );
}
