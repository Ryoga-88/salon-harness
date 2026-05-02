# IG Engagement Gate Templates

The Worker exposes these as `GET /api/campaign-templates`.

| ID | Name | Keyword | Ref |
| --- | --- | --- | --- |
| `t_new_menu` | 新メニュー告知 | 詳細 | `ig_new_menu` |
| `t_campaign_color` | カラーキャンペーン | カラー | `ig_color_campaign` |
| `t_open` | 新店オープン | OPEN | `ig_open` |
| `t_seasonal` | 季節キャンペーン | 梅雨 | `ig_seasonal` |
| `t_winback` | 離脱顧客復活 | 久しぶり | `ig_winback` |

Create a gate:

```json
{
  "template_id": "t_campaign_color",
  "line_add_url": "https://line.me/ti/p/@example",
  "coupon_code": "IG2026SUMMER",
  "target_post_ids": ["178..."]
}
```
