const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';

export function friendlyApiError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('Load failed')) {
    return '予約サーバーに接続できません。時間をおいてもう一度お試しください。';
  }
  if (message.includes('Unauthorized')) {
    return '予約画面の認証設定が未完了です。サロンにお問い合わせください。';
  }
  if (message.includes('reservation_conflict') || message.includes('Selected slot is no longer available')) {
    return '申し訳ありません。この時間は先に予約が入りました。別の時間を選んでください。';
  }
  return message.replace(/^Error:\s*/, '') || '処理に失敗しました。もう一度お試しください。';
}

export async function fetchApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
        ...init.headers
      }
    });
    const body = await res.json() as { success: boolean; data?: T; error?: string; reason?: string };
    if (!res.ok || !body.success) throw new Error(body.error ?? body.reason ?? `API error ${res.status}`);
    return body.data as T;
  } catch (error) {
    throw new Error(friendlyApiError(error));
  }
}
