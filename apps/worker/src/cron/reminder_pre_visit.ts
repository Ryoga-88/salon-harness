import type { Env } from '../index.js';
import { sendLineMessage } from '../lib/line-harness.js';
import { addDaysIso, jstNow } from '../lib/time.js';

export async function reminderPreVisit(env: Env['Bindings']): Promise<void> {
  const tomorrow = addDaysIso(new Date(), 1);
  const result = await env.DB
    .prepare("SELECT * FROM reservations WHERE status = 'confirmed' AND reminder_sent_at IS NULL AND substr(start_at, 1, 10) = ?")
    .bind(tomorrow)
    .all<{ id: string; friend_id: string; start_at: string }>();
  for (const r of result.results) {
    await sendLineMessage(env, r.friend_id, `明日 ${r.start_at} のご予約をお待ちしています。変更やキャンセルは予約履歴から手続きできます。`);
    await env.DB.prepare('UPDATE reservations SET reminder_sent_at = ?, updated_at = ? WHERE id = ?').bind(jstNow(), jstNow(), r.id).run();
  }
}
