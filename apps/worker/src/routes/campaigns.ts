import { Hono } from 'hono';
import type { Env } from '../index.js';
import { fail, ok, readJson } from '../lib/http.js';
import { requireRole } from '../middleware/auth.js';

const campaigns = new Hono<Env>();

const templates = [
  {
    template_id: 't_new_menu',
    name: '新メニュー告知',
    category: 'new_menu',
    trigger_keyword: '詳細',
    reward_dm_text: '新メニューの詳細はこちら。LINEから24時間予約できます。',
    ref_param: 'ig_new_menu'
  },
  {
    template_id: 't_campaign_color',
    name: 'カラーキャンペーン',
    category: 'campaign',
    trigger_keyword: 'カラー',
    reward_dm_text: 'Instagram限定カラークーポンを配布中です。LINEで予約できます。',
    ref_param: 'ig_color_campaign'
  },
  {
    template_id: 't_open',
    name: '新店オープン',
    category: 'open',
    trigger_keyword: 'OPEN',
    reward_dm_text: 'オープン記念特典をお送りします。LINEから予約してください。',
    ref_param: 'ig_open'
  },
  {
    template_id: 't_seasonal',
    name: '季節キャンペーン',
    category: 'seasonal',
    trigger_keyword: '梅雨',
    reward_dm_text: '季節限定メニューの特典です。LINEから予約できます。',
    ref_param: 'ig_seasonal'
  },
  {
    template_id: 't_winback',
    name: '離脱顧客復活',
    category: 'winback',
    trigger_keyword: '久しぶり',
    reward_dm_text: '久しぶりのお客様向け特典をお送りします。',
    ref_param: 'ig_winback'
  }
];

campaigns.get('/api/campaign-templates', (c) => ok(c, templates));

campaigns.post('/api/campaigns/from-template', async (c) => {
  const forbidden = requireRole(c, ['owner', 'editor']);
  if (forbidden) return forbidden;
  const body = await readJson<{
    template_id: string;
    name?: string;
    target_post_ids?: string[];
    line_add_url: string;
    coupon_code?: string;
  }>(c);
  const template = templates.find((t) => t.template_id === body.template_id);
  if (!template) return fail(c, 'template not found', 404);
  if (!c.env.IG_HARNESS_API_URL || !c.env.IG_HARNESS_API_KEY) return fail(c, 'IG harness is not configured', 400);

  const ref = encodeURIComponent(template.ref_param);
  const rewardUrl = `${body.line_add_url}${body.line_add_url.includes('?') ? '&' : '?'}ref=${ref}${body.coupon_code ? `&coupon=${encodeURIComponent(body.coupon_code)}` : ''}`;
  const res = await fetch(`${c.env.IG_HARNESS_API_URL}/api/engagement-gates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${c.env.IG_HARNESS_API_KEY}`
    },
    body: JSON.stringify({
      name: body.name ?? template.name,
      status: 'active',
      trigger_type: 'comment_on_post',
      trigger_keyword: template.trigger_keyword,
      require_follow: 1,
      initial_dm_text: 'コメントありがとうございます。フォロー後に詳細をお送りします。',
      initial_dm_button_label: 'フォローしました',
      follow_reminder_dm_text: 'フォロー後にもう一度ボタンを押してください。',
      follow_reminder_button_label: 'フォローしました',
      reward_dm_text: body.coupon_code ? `${template.reward_dm_text}\nクーポンコード: ${body.coupon_code}` : template.reward_dm_text,
      reward_url: rewardUrl,
      target_post_ids: body.target_post_ids ?? []
    })
  });
  if (!res.ok) return fail(c, `ig-harness error: ${res.status} ${await res.text()}`, 502);
  return ok(c, await res.json(), 201);
});

export { campaigns };
