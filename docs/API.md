# API

All API requests except `/health`, `/api/auth/login`, and `/webhook/uuid-link` require:

```http
Authorization: Bearer <API_KEY or staff session>
```

## Core Endpoints

- `GET /api/stylists`
- `POST /api/stylists`
- `GET /api/menus?stylist_id=...`
- `POST /api/menus`
- `GET /api/reservations/availability?stylist_id=...&date=YYYY-MM-DD&menu_ids=m1,m2`
- `POST /api/reservations`
- `PUT /api/reservations/:id/cancel`
- `PUT /api/reservations/:id/complete`
- `GET /api/coupons?stylist_id=...&friend_id=...`
- `GET /api/coupons/code/:code?stylist_id=...&friend_id=...`
- `POST /api/coupons/validate`
- `POST /api/campaigns/from-template`
- `GET /api/channel-connections?salon_id=...`
- `POST /api/channel-connections`
- `GET /api/channel-connections/resolve?salon_id=...&stylist_id=...&provider=line|instagram`

## Reservation Conflict Rule

`POST /api/reservations` uses a conditional insert:

```sql
WHERE NOT EXISTS (
  SELECT 1 FROM reservations
  WHERE stylist_id = ?
    AND status IN ('confirmed', 'completed')
    AND start_at < ?
    AND end_at > ?
)
```

When no row is inserted, the API returns `409 reservation_conflict`.
