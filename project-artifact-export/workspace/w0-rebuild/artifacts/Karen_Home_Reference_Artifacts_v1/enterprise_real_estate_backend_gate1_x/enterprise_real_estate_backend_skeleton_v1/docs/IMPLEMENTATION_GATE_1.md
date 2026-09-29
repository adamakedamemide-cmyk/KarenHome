# Implementation Gate 1 — PostgreSQL Adapter + IAM

## Implemented
- PostgreSQL connection pool with bounded transactions and timeout guards
- IAM repository backed by `iam.*` tables
- Argon2id password hashing
- Short-lived HS256 access JWT with issuer/audience validation
- Opaque 48-byte refresh tokens; only SHA-256 digests are persisted
- Refresh-session rotation (old digest revoked before issuing replacement)
- `/api/v1/auth/register`
- `/api/v1/auth/login`
- `/api/v1/auth/refresh`
- `/api/v1/auth/logout`
- `/api/v1/auth/me`
- Permission loading from organization membership → member roles → permissions
- Bearer-token guard and permission metadata/guard
- Central exception mapping for expected IAM errors
- Environment validation for production secrets

## Security decisions
1. Refresh tokens are never stored in plaintext.
2. Access tokens contain only subject, status and permission claims.
3. JWT issuer and audience are mandatory verification constraints.
4. DB transactions set statement and lock timeouts.
5. Duplicate email registration maps to HTTP 409.
6. Authentication errors do not reveal whether an email exists during login.
7. A user must be `active` to receive/refresh usable authentication tokens.

## Environment
Copy `.env.example` to `.env` and set `DATABASE_URL` and a 32+ character `JWT_SECRET`.

## Database prerequisite
Apply the frozen PostgreSQL/PostGIS contract before starting the API. IAM expects the `platform`, `iam`, `org`, `property`, `marketplace`, and related schemas from Database Contract v1.

## Validation note
The build could not be executed in the authoring environment because dependency installation timed out. The code and package manifests are included so the project can be installed and compiled in the target development/CI environment.
