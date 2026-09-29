# API Conventions v1

## Base
`/api/v1`

## Headers
- `Authorization: Bearer <access_token>` when authenticated.
- `Idempotency-Key: <opaque-key>` on payment/order/refund and other explicitly idempotent mutation endpoints.
- `X-Request-Id: <opaque-id>` optional client supplied; server always returns one.
- `Accept-Language` controls localized response fields where supported.

## Resource naming
Plural nouns, kebab-case only when multi-word: `/saved-searches`, `/listing-promotions`.
No verbs except explicit state transitions such as `/publish`, `/archive`, `/verify`.

## HTTP semantics
- `200` successful read/update with representation.
- `201` successful creation.
- `202` accepted asynchronous processing.
- `204` successful deletion/action without representation.
- `400` malformed request.
- `401` missing/invalid authentication.
- `403` authenticated but unauthorized.
- `404` resource not visible/not found.
- `409` state or uniqueness conflict.
- `422` semantically invalid domain input.
- `429` rate limited.
- `500/503` infrastructure/service failures.

## Success envelope
```json
{
  "data": {},
  "meta": {
    "requestId": "req_01..."
  }
}
```

Collection:
```json
{
  "data": [],
  "meta": {
    "requestId": "req_01...",
    "nextCursor": "..."
  }
}
```

## Error envelope
```json
{
  "error": {
    "code": "LISTING_STATE_CONFLICT",
    "message": "The listing cannot be published from its current state.",
    "details": [],
    "requestId": "req_01..."
  }
}
```

## Cursor pagination
`?limit=24&cursor=<opaque>`; never expose database offsets for large business collections.

## Filtering
Simple filters may use query parameters. Complex listing search uses `POST /search/listings` with a typed body.

## Sorting
Only allow enumerated server-side sort keys. Never accept raw SQL/order expressions.

## Idempotency
The idempotency key is scoped to authenticated principal + route + method. Persist request hash and response metadata. Reject reuse with a different payload using `IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD`.
