# line-harness / ig-harness Integration

## line-harness

Salon Harness sends booking and retention messages through:

```http
POST {LINE_HARNESS_API_URL}/api/friends/{friend_id}/messages
Authorization: Bearer {LINE_HARNESS_API_KEY}
Content-Type: application/json

{
  "messageType": "text",
  "content": "..."
}
```

`friend_id` is the shared UUID from line-harness `friends.id`.

## ig-harness

Salon Harness starts beauty-salon campaign templates through:

```http
POST {IG_HARNESS_API_URL}/api/engagement-gates
Authorization: Bearer {IG_HARNESS_API_KEY}
```

The payload matches `ig-harness-oss` engagement gate fields, including `trigger_type`, `trigger_keyword`, `reward_dm_text`, `reward_url`, and `target_post_ids`.

## UUID Link Webhook

Both harnesses should send identity events to:

```http
POST https://<salon-worker>/webhook/uuid-link
X-Harness-Signature: sha256=<hmac>
```

Body:

```json
{
  "source": "line",
  "uuid": "shared_uuid",
  "external_id": "line_or_ig_id",
  "metadata": { "ref": "ig_reel_001" }
}
```
