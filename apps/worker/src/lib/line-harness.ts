import type { Env } from '../index.js';

/** line-harness `GET /api/friends` の行から統合 ID（通常は UUID）を取り出す */
export function extractLineFriendId(row: Record<string, unknown>): string | undefined {
  for (const k of ['id', 'friend_id', 'uuid']) {
    const v = row[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
}

export async function fetchLineFriends(env: Env['Bindings']): Promise<Record<string, unknown>[]> {
  if (!env.LINE_HARNESS_API_URL || !env.LINE_HARNESS_API_KEY) return [];
  const res = await fetch(`${env.LINE_HARNESS_API_URL}/api/friends`, {
    headers: { Authorization: `Bearer ${env.LINE_HARNESS_API_KEY}` }
  });
  if (!res.ok) {
    throw new Error(`line-harness friends failed: ${res.status} ${await res.text()}`);
  }
  const raw: unknown = await res.json();
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (raw && typeof raw === 'object' && 'data' in raw && Array.isArray((raw as { data: unknown }).data)) {
    return (raw as { data: Record<string, unknown>[] }).data;
  }
  if (raw && typeof raw === 'object' && 'friends' in raw && Array.isArray((raw as { friends: unknown }).friends)) {
    return (raw as { friends: Record<string, unknown>[] }).friends;
  }
  return [];
}

export async function sendLineMessage(env: Env['Bindings'], friendId: string, content: string): Promise<void> {
  if (!env.LINE_HARNESS_API_URL || !env.LINE_HARNESS_API_KEY) return;
  const res = await fetch(`${env.LINE_HARNESS_API_URL}/api/friends/${encodeURIComponent(friendId)}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.LINE_HARNESS_API_KEY}`
    },
    body: JSON.stringify({ messageType: 'text', content })
  });
  if (!res.ok) {
    throw new Error(`line-harness message failed: ${res.status} ${await res.text()}`);
  }
}

export async function createLineScenario(env: Env['Bindings'], payload: unknown): Promise<void> {
  if (!env.LINE_HARNESS_API_URL || !env.LINE_HARNESS_API_KEY) return;
  const res = await fetch(`${env.LINE_HARNESS_API_URL}/api/scenarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.LINE_HARNESS_API_KEY}`
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`line-harness scenario failed: ${res.status} ${await res.text()}`);
}
