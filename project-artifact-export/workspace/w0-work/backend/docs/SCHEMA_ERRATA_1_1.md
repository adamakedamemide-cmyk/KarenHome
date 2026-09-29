# Database Contract Errata v1.1

The original database freeze remains the source baseline. This errata closes defects discovered during file-by-file backend review.

## 0024 — critical hardening
- Credential row must represent exactly one authenticator type.
- Verified email/phone must carry `verified_at`.
- One password credential per user.
- Listing optimistic `version` added.
- Listing version automatically increments on update.
- Published-listing invariant extracted into a reusable assertion.
- Published-listing integrity is rechecked when child price/media rows change.
- Status-history actor/reason can be provided through transaction-local settings.

## 0025 — indexes
Operational indexes for listing lifecycle, outbox polling and audit lookups.

## 0026 — reliable outbox leasing
- Adds `locked_at` and `locked_by` so multiple workers cannot repeatedly lease the same unpublished event.
- Adds explicit `markPublished` / `markFailed` lifecycle.
