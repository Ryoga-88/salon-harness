import type { Env } from '../index.js';
import { sendLineMessage } from '../lib/line-harness.js';
import { jstNow } from '../lib/time.js';

function messageFor(jobType: string): string {
  if (jobType === 'post_visit_thanks') return '本日はご来店ありがとうございました。次回も扱いやすい髪になるようサポートします。';
  if (jobType === 'repeat_promotion_4w') return '前回のご来店から約4週間です。次回予約の目安時期になりました。';
  if (jobType === 'repeat_promotion_8w') return '前回のご来店から少し期間が空いています。メンテナンスのご予約をお待ちしています。';
  if (jobType === 'winback_3m') return 'お久しぶりです。髪の状態に合わせたメニューをご提案できます。';
  return 'サロンからのお知らせです。';
}

export async function processAutomationJobs(env: Env['Bindings']): Promise<void> {
  const now = jstNow();
  const result = await env.DB
    .prepare("SELECT * FROM automation_jobs WHERE status = 'pending' AND scheduled_at <= ? ORDER BY scheduled_at ASC LIMIT 50")
    .bind(now)
    .all<{ id: string; job_type: string; target_friend_id: string }>();
  for (const job of result.results) {
    try {
      await sendLineMessage(env, job.target_friend_id, messageFor(job.job_type));
      await env.DB.prepare("UPDATE automation_jobs SET status = 'executed', executed_at = ? WHERE id = ?").bind(now, job.id).run();
    } catch (err) {
      await env.DB
        .prepare("UPDATE automation_jobs SET status = 'failed', error_message = ? WHERE id = ?")
        .bind(err instanceof Error ? err.message : String(err), job.id)
        .run();
    }
  }
}
