'use client';

import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { fetchApi, friendlyApiError } from '@/lib/api';

export default function MessagesPage() {
  const [friendId, setFriendId] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('friend_id') : null;
    if (q) setFriendId(q);
  }, []);

  async function send() {
    if (!friendId.trim() || !content.trim()) {
      setError('friend_id と本文を入力してください。');
      return;
    }
    try {
      await fetchApi('/api/messages/send', {
        method: 'POST',
        body: JSON.stringify({ friend_id: friendId.trim(), content: content.trim() })
      });
      setNotice('LINE メッセージを送信しました。');
      setError('');
      setContent('');
    } catch (err) {
      setError(friendlyApiError(err));
    }
  }

  return (
    <AppShell>
      <h1 className="page-title">メッセージ</h1>
      {error && <p className="panel" style={{ color: '#be123c' }}>{error}</p>}
      {notice && <p className="panel" style={{ color: '#0f766e' }}>{notice}</p>}
      <section className="panel form">
        <div className="field"><label>LINE friend_id</label><input value={friendId} onChange={(e) => setFriendId(e.target.value)} placeholder="line-harness friends.id" /></div>
        <div className="field"><label>本文</label><textarea rows={6} value={content} onChange={(e) => setContent(e.target.value)} /></div>
        <button type="button" className="button" onClick={send}><Send size={16} />送信する</button>
        <p className="muted">line-harness の API URL/API key が Worker secrets に未設定の場合は送信されません。</p>
      </section>
    </AppShell>
  );
}
