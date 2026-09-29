# Enterprise Real Estate Platform — Backend Gate 1

This package advances the prior backend skeleton to the first executable backend boundary:

- PostgreSQL adapter (`@platform/db`)
- IAM repository against the frozen database contract
- Argon2id password hashing
- Access JWT verification/signing with issuer + audience
- Rotating opaque refresh sessions
- RBAC permission loading
- Authentication endpoints and guards
- Central API error mapping

## Run

1. Apply the frozen PostgreSQL/PostGIS database contract from `enterprise_real_estate_contract_v1`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` and a 32+ char `JWT_SECRET`.
3. Install dependencies with pnpm 10+.
4. Build packages, then start `apps/api`.

The implementation intentionally keeps the Property/Listing modules as placeholders until the IAM + database boundary is verified in the target CI environment.

## Next Gate

- Real DB integration tests
- User email/phone verification flow
- Refresh-token reuse detection
- Permission cache
- Organization-scoped authorization policies
- Property repository backed by PostgreSQL
- Listing aggregate + state machine backed by PostgreSQL
- Outbox transaction publishing
