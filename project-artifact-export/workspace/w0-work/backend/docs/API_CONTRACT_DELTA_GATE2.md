# API Contract Delta — Gate 2

## Registration
`POST /api/v1/auth/register` now returns:
```json
{
  "data": {
    "user": {},
    "verificationRequired": true
  }
}
```
No active session is created for a pending account.

## Listing lifecycle
- `POST /listings` creates `draft`.
- `POST /listings/{id}/submit` transitions `draft -> pending_moderation`.
- `POST /listings/{id}/publish` requires `pending_moderation`.
- State commands require `expectedVersion`.

## Organization scope
Organization-scoped permission endpoints must carry `X-Organization-Id`.

## Decimal values
Money and exact-area inputs are represented as decimal strings to avoid JavaScript floating-point drift.

## Search
`POST /api/v1/search/listings` is intentionally `501 Not Implemented` in Gate 2; the service must not return fabricated empty results before OpenSearch and indexing are wired.
