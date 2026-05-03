const API_URL = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8787' : '');

export function getApiKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem('salon_api_key') || localStorage.getItem('salon_session') || '';
  } catch {
    return '';
  }
}

export function rememberAuthToken(name: 'salon_api_key' | 'salon_session', value: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(name, value);
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=2592000; SameSite=Lax`;
}

export function friendlyApiError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('Load failed')) {
    return 'APIサーバーに接続できません。Worker が起動しているか、API URL の設定を確認してください。';
  }
  if (message.includes('Unauthorized')) {
    return '認証に失敗しました。ログイン情報または API Key を確認してください。';
  }
  if (message.includes('Forbidden')) {
    return 'この操作を行う権限がありません。';
  }
  return message.replace(/^Error:\s*/, '') || '処理に失敗しました。もう一度お試しください。';
}

export async function fetchApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    if (!API_URL) {
      throw new Error('API URL が設定されていません。NEXT_PUBLIC_API_URL を設定して再デプロイしてください。');
    }
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getApiKey()}`,
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
