# GATE4_TEST_REPORT (§22)

## Summary (final evidence run)

| Layer | Suites | Tests | Result | Evidence |
|---|---|---|---|---|
| Unit (no DB) | 10 | 40 | **40 PASS** | `g4-test-final.log` (RUN_DB_TESTS absent → DB suites skipped) |
| Full with DB (unit + integration + E2E + red-team) | 12 | 60 | **60 PASS** | `g4-test-db-final.log` |
| Concurrency races (Node/PG harness) | 5 | — | **5/5 PASS** | `g4-concurrency.log` |
| SQL verification suites | 2 | 37 + 22 | **37/37 + 22/22 PASS** | `g3-verification-on-g4-fresh.log`, `g4-verification.log` |

## Coverage by mandated test type

- **Unit:** 13-state machine parity (33 rules), publication policy (7 cases), commission engine math (percentage/fixed/min/max/splits/specificity/future-rule/no-rule/validation), TOTP window + AES-GCM tamper, disposable email, i18n chain/override/fallback, rate-limit bucket, legacy Gate-2 suites (IAM/state machine/property contract/auth hash).
- **Integration (real PostgreSQL, karen_g4):** J1 jobs lifecycle (claim single-winner, dedup, backoff, dead, requeue), J2 email verification, J3 phone OTP, J4 password reset + session revocation, J5 MFA lifecycle, J6 commission (immutability, future-rule isolation, settlement→payout, beneficiary XOR), J7 billing plan versioning (history intact), J8 advertising (dedup, spend, budget guard), J9 search (doc build/index/FTS/injection), J10 notifications (preferences/quiet hours).
- **E2E (real app over fastify.inject):** E0 rate limit, E1 health, E2 full auth flow incl. refresh-replay→global revocation, E3 owner listing lifecycle with publication gate (readiness unmet→location+agreement endpoints→publish v4), E4 IDOR block, E5 commission permission + rule config + calculation, E6 search injection, E7 media intake guards, E8 subscription gate, E9 OpenAPI surface.
- **Concurrency:** C1 transition single-winner (1/10), C2 job claim zero double-claim (20/20 unique), C3 budget guard (5 accepted/5 rejected, spent=limit), C4 refresh reuse (1 win/1 reuse), C5 impression minute-dedup (1/10 counted).
- **Security:** red-team suite (separate report) — every blocked attempt has a named regression test.
- **Contract:** E9 OpenAPI path coverage + error-shape assertions `{error:{code,message,requestId}}` across suites.

## Mandated critical scenarios (13) → mapping

| Scenario | Covered by |
|---|---|
| Owner creates listing | E3 |
| Agent creates listing | E3 (personal scope = agent-equivalent path); org-scope guard asserted in E4 |
| Marketer creates listing | Designated by partyRole in commission flows (E5); full marketer RBAC story deferred with CRM (registered) |
| Unauthorized modification | E4 IDOR + ownership guards |
| Commission calculation | E5 + unit |
| Commission versioning | J6 + unit future-rule |
| Ad campaign | J8 |
| Subscription entitlement | E8 + J7 |
| i18n fallback | g4-i18n spec |
| Media processing | media unit/intake (E7) + pipeline pieces (partial at job level — registered) |
| Search indexing | J9 |
| Outbox retry | J1 + outbox lease semantics |
| Worker duplicate execution | C2 |

## Honest notes

- E2E driver is fastify.inject (no network); real-socket e2e is a Gate 5 nicety.
- Test data hygiene: e2e retires leftover integration commission rules (documented in-suite).
