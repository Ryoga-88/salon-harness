import type { Env } from '../index.js';

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
