# Gate 1 Deep Audit — File-by-File Review

## Scope
Reviewed every tracked file in Backend Gate 1 plus the frozen database contract and Backend Contract v1.
The review is static and cross-artifact: API contract, database contract, security model, domain boundaries, lifecycle rules, and transaction semantics were compared.

## Severity
- CRITICAL: unsafe or misleading behavior on a public/privileged path, or a core invariant can be bypassed.
- HIGH: material correctness/security/transaction defect that must be fixed before domain expansion.
- MEDIUM: architectural or operational weakness that should be fixed in the same gate.
- LOW: maintainability/documentation/test coverage issue.
- PASS: no blocking issue found; may still receive hardening later.

## Findings by file

| File | Severity | Finding | Gate 2 action |
|---|---|---|---|
| `.env.example` | MEDIUM | SSL, pool sizing and docs controls absent | expanded settings |
| `README.md` | PASS | Correctly states Gate 1 scope; refresh reuse warning was still incomplete | superseded by Gate 2 docs |
| `package.json` | HIGH | Declares pnpm but root scripts invoke npm workspaces | converted to pnpm filters |
| `pnpm-workspace.yaml` | PASS | Workspace topology matches apps/packages | unchanged |
| `apps/api/package.json` | MEDIUM | Test/build dependency compatibility not runtime-verified; no integration script | added integration target |
| `apps/api/jest.config.js` | LOW | Unit roots okay; integration separated later | retained + new integration config |
| `apps/api/tsconfig.json` | PASS | Strict mode enabled | unchanged |
| `apps/api/src/app.module.ts` | MEDIUM | Authorization module was only conceptual | wired real authorization guard |
| `apps/api/src/main.ts` | HIGH | Swagger always exposed; validation allowed unknown properties to be stripped; no explicit body limit/trust proxy | hardened bootstrap |
| `common/config/app-config.ts` | HIGH | Numeric env parsing weak; JWT secret only length-checked; DB SSL unused | strict parsing + SSL |
| `common/config/env.validation.ts` | HIGH | Most env validation only happened in production | strict validation for all environments |
| `common/errors/http-exception.filter.ts` | MEDIUM | Validation arrays and stable API details were flattened | structured error details |
| `common/auth/access-token.guard.ts` | HIGH | Token carried stale global permissions/status snapshot | token reduced to identity claims |
| `common/auth/access-token.service.ts` | HIGH | Authorization decisions were embedded in JWT and not org-scoped | identity-only JWT |
| `common/auth/auth.spec.ts` | LOW | Only hash function tested | retained; broader tests added |
| `common/auth/auth.types.ts` | LOW | Request typing too narrow and no request id | expanded |
| `common/auth/current-user.decorator.ts` | PASS | Simple parameter extraction | unchanged |
| `common/auth/permissions.decorator.ts` | PASS | Metadata primitive is usable | unchanged |
| `common/auth/permissions.guard.ts` | CRITICAL | Global permissions ignored organization scope and performed no resource policy checks | org-scoped permission lookup |
| `common/config/*` | HIGH | Security-sensitive defaults too permissive | corrected |
| `infrastructure/database.module.ts` | MEDIUM | DB SSL option was never wired; only IAM repository was injectable | SSL + core repositories |
| `packages/db/postgres-database.ts` | HIGH | No transaction context, pool error hook or application session metadata | hardened transaction adapter |
| `packages/db/iam-repository.ts` | CRITICAL | Password credential query could select a passkey row; refresh rotation was non-atomic | password-specific query + row-lock rotation |
| `packages/db/index.ts` | PASS | Basic exports | expanded |
| `packages/db/tsconfig.json` | PASS | Strict DB package config | unchanged |
| `packages/db/src/README.md` | LOW | Scope note only | superseded by Gate 2 docs |
| `packages/contracts/src/index.ts` | HIGH | Authenticated principal contained global permission snapshot | identity-only principal |
| `modules/iam/presentation/dto/register.dto.ts` | MEDIUM | Verification state not represented | registration now remains pending |
| `modules/iam/presentation/dto/login.dto.ts` | HIGH | Login incorrectly enforced current password complexity policy | login now accepts any non-empty password |
| `modules/iam/presentation/dto/refresh.dto.ts` | PASS | Basic length guard | unchanged |
| `modules/iam/domain/iam.errors.ts` | PASS | Minimal domain errors | unchanged |
| `modules/iam/application/iam.service.ts` | CRITICAL | New users were active before verification; refresh race; no real reuse response; unique violations over-mapped | pending registration + atomic rotation + reuse detection |
| `modules/iam/presentation/iam.controller.ts` | MEDIUM | Request id not propagated | request metadata propagated |
| `modules/iam/iam.module.ts` | PASS | DI wiring valid for IAM | unchanged |
| `modules/properties/presentation/dto/create-property.dto.ts` | HIGH | JS number would lose decimal precision relative to numeric DB fields | exact decimal strings |
| `modules/properties/application/create-property.handler.ts` | CRITICAL | In-memory business path, no authenticated actor, no DB | PostgreSQL repository + actor-aware command |
| `modules/properties/domain/property.repository.ts` | HIGH | Contract did not match frozen DB model and had no ownership methods | replaced by DB contract mapping |
| `modules/properties/infrastructure/in-memory-property.repository.ts` | CRITICAL | Production module could mutate process-local memory instead of DB | removed from active DI |
| `modules/properties/presentation/properties.controller.ts` | CRITICAL | Endpoints were unguarded; GET was a stub | guarded create/owner assignment and real read |
| `modules/properties/properties.module.ts` | HIGH | Explicitly selected in-memory repository | real DB repositories |
| `modules/listings/presentation/listings.controller.ts` | CRITICAL | Echoed request body and fabricated publish result | real lifecycle commands |
| `modules/listings/listings.module.ts` | HIGH | No application/domain service | ListingService added |
| `modules/search/presentation/search.controller.ts` | MEDIUM | Placeholder search accepted arbitrary input | kept as explicit placeholder; no fake semantics |
| `modules/search/search.module.ts` | PASS | Placeholder only | unchanged |
| `modules/health/health.module.ts` | MEDIUM | Liveness was the only health endpoint and always returned OK | live/ready split |
| `apps/api/test/iam.service.spec.ts` | LOW | Only duplicate-email precheck tested | broader state tests added |
| `apps/api/test/jest-e2e.json` | LOW | No integration DB test config | separate integration config added |
| Backend Contract `01-domain-boundaries.md` | HIGH cross-artifact | Claimed org-scoped authorization while implementation was global | implementation now begins to match |
| Backend Contract `02-api-conventions.md` | HIGH cross-artifact | Idempotency and error envelope not enforced by Gate 1 | recorded as subsequent Billing gate; error envelope improved |
| Backend Contract `03-authorization-matrix.md` | CRITICAL cross-artifact | Resource ownership/delegated authority absent | property/listing policy introduced |
| Backend Contract `04-error-model.md` | MEDIUM cross-artifact | Codes not aligned in IAM | stable codes aligned |
| Backend Contract `05-command-query-catalog.md` | HIGH cross-artifact | Commands existed only on paper | first Property/Listing commands implemented |
| Backend Contract `06-event-catalog.md` | HIGH cross-artifact | Events were not transactionally recorded | Outbox introduced |
| Backend Contract `07-implementation-order.md` | PASS | Ordering is sound | Gate 2 follows it |
| Database frozen schema | CRITICAL cross-artifact | Publication invariants were enforced only on listing-row changes; child media/price changes could invalidate published listing; status history actor was wrong; optimistic version missing | errata 0024 |

## Blocking cross-artifact findings

1. **Organization scope was not enforceable.** A permission string in the access token is not enough for agency/developer multi-tenancy. Gate 2 resolves the first layer by loading permissions against an explicit `X-Organization-Id` scope.
2. **Refresh rotation was race-prone.** `find → revoke → create` permitted two concurrent refreshes to succeed. Gate 2 uses `SELECT ... FOR UPDATE` and a single transaction, with revoked-token reuse detection.
3. **Registration activated unverified users.** This violated the stated verification domain. New password registrations now remain `pending` and do not receive an active session.
4. **Listing lifecycle was fictitious.** The previous controller returned `published` without touching the database. Gate 2 uses the actual database state machine: `draft → pending_moderation → published`.
5. **Database publication invariants were incomplete.** A published listing could be invalidated later by removing the cover or changing price history. Errata 0024 closes this hole with deferred child-table validation.
6. **Status history attribution was incorrect.** The frozen trigger used `created_by_user_id` as `changed_by`. Gate 2 introduces transaction-local actor/reason context.
7. **Optimistic concurrency had been specified but not modeled.** The backend contract referenced `expectedVersion`, but the database had no version. Errata 0024 adds `marketplace.listings.version` and Gate 2 consumes it.
8. **Decimal values crossed the API as JS numbers.** Exact monetary/area values are now represented as decimal strings at the application boundary.

## Residual known limitations after Gate 2

- Email/phone verification delivery is not yet implemented.
- MFA/passkeys are not implemented.
- Search remains a placeholder until the transactional events are stable.
- Organization creation/invitation and full policy engine are next gate work.
- No live PostgreSQL/PostGIS execution was available in this environment; integration tests are included but must run in CI/target infrastructure.

## Gate 2 implementation correction
The event catalog is extended with `ListingSubmitted.v1`, representing the draft-to-moderation transition. `PublishListing` remains the moderation approval event.
