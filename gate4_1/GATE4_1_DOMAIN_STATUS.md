# GATE4_1_DOMAIN_STATUS — Phases F + M

Generated: 2026-09-29 · Method: real code inventory (entity/repository/service/policy/events/persistence/API/DTO/tests per domain) + stub scan (no TODO/FIXME/empty bodies/hardcoded fakes exist anywhere in apps/ or packages/ — verified by repo-wide grep; gaps are ABSENCE of modules, not stubs inside them).

Status legend: **COMPLETE** (all layers real + tests) · **SUBSTANTIAL** (all core layers real; minor depth notes) · **PARTIAL** (some layers) · **CONTRACT-ONLY / NOT IMPLEMENTED** · Stub/Mock/Placeholder/hard-coded responses ⇒ NOT counted as complete (none found).

## 22 mandated domains

| Domain | Entity | Repo | Service/Handlers | Policy/Authz | Events | Persistence | API | Tests | Status |
|---|---|---|---|---|---|---|---|---|---|
| IAM | iam.errors.ts (typed) | iam-repository + iam-hardening-repository | iam.service + iam-hardening.service | guards, TOTP, cipher, anti-bot | job enqueues | 0030/0033 | 20 routes | iam.service.spec, g4-mfa-antibot, J2-J5, E2 | **SUBSTANTIAL** (MFA key hardening shipped in 4.1) |
| Authorization | — | via iam.effective_permissions (0030) | PermissionsGuard global wiring | permissions.guard + decorator + org scoping | — | 0030 | cross-cutting | E5 positive/negative, guard path | **SUBSTANTIAL** |
| Organizations | org.organizations (frozen schema) | via iam repos (membership checks) | org scoping in services | ORG_SCOPE_REQUIRED guard | — | frozen schema | headers-driven | E4/org paths | **PARTIAL** (no org CRUD API — registered) |
| Properties | property.repository port | packages/db property-repository | create-property/assign-owner handlers | RESOURCE_NOT_OWNED owner checks | — | frozen schema | 4 routes | property.repository.contract.spec, E3/E4 | **SUBSTANTIAL** |
| Listings | listing-state.machine (13 states/33 rules) + publication-policy | listing-repository (outbox emits) | listing.service + listing-search.service | publication policy (10 checks) + moderation perm + org/owner scope | Listing*.v1 outbox | 0027-0031 | 20 routes incl. 14 transitions | 3 spec files + J1, E3/E4 | **COMPLETE** |
| Projects | — | — | — | — | — | frozen schema | none | none | **NOT IMPLEMENTED** (ADR-G41-04) |
| CRM | — | — | — | — | — | frozen schema | none | none | **NOT IMPLEMENTED** (ADR-G41-02) |
| Messaging | — | — | — | — | — | frozen schema | none | none | **NOT IMPLEMENTED** (ADR-G41-01) |
| Commission | rule/version/calculation/settlement/payout (0027) | commission-repository (immutable triggers) | engine + settlement services | commission.view/manage via engine | — | 0027 + DB immutability | 9 routes (incl. NEW reversals) | 7 engine specs + J6 + E5 + **T3 (new)** | **COMPLETE** (reversal shipped in 4.1; settlement/adjustment/payout real) |
| Advertising | campaign/creative/slot/budget (0028) | advertising-repository | advertising.service + admin service | **NEW 4.1**: permission guard + org isolation | fraud risk events | 0028 + **0036 dedup index** | public 3 + admin 7 | J8 + **T1/T2/T4 (new)** | **SUBSTANTIAL** (authz gap CLOSED in 4.1; click dedup DB-enforced) |
| Billing | plans/plan_versions/entitlements (0034) | billing-repository | billing.service | billing-admin.guard + authorizeSubject | SubscriptionStarted/PlanChanged outbox | 0034 | 9 routes | E8, J7 | **SUBSTANTIAL** |
| Subscriptions | subscription + events | billing-repository | change-plan opens new subscription (history intact) | same as billing | outbox events | 0034 | within billing API | J7, E8 | **SUBSTANTIAL** |
| Verification | email/phone tokens (0033) | iam-hardening-repository | hardening service | anti-enumeration, throttles | job enqueues | 0033 | 15 hardening routes | g4-mfa-antibot, J2-J5, E2 | **SUBSTANTIAL** |
| Moderation | moderation.cases (frozen) | policy-repository reads cases | publication policy consumes open cases | listing.moderate perm | — | frozen schema | none (workflow API missing) | policy specs | **PARTIAL** (reads + gating real; case CRUD missing — registered) |
| Media | media assets (frozen + 0032 columns) | media-repository | media.service intake | MEDIA_NOT_OWNED at attach | media.process jobs | 0032 | 3 routes | E7 + worker paths | **SUBSTANTIAL** (worker pipeline verified; ClamAV/S3 = deployment gaps) |
| Search | search-engine.port | search-repository + PgFtsEngine | search.service (engine selection, rebuild, lag stats) | public rate-limited | consumes outbox | listing_search_docs (GIN/GiST) | 2 routes + admin rebuild | J9, E6 | **COMPLETE** (local engine; external UNVERIFIED_EXTERNAL) |
| Notifications | notification prefs + quiet hours (0032/0034) | notification-repository | notification.service fan-out | authenticated prefs routes | notification.dispatch jobs | 0032 | 5 routes | J10 | **SUBSTANTIAL** |
| Contracts | legal.contracts* (frozen) | — | legal module = agreement acceptance ONLY | AccessTokenGuard | — | acceptance table | 1 route | E3 | **CONTRACT-ONLY** (acceptance real; contract lifecycle NOT IMPLEMENTED — ADR-G41-03) |
| Rental | rental.leases (frozen) | policy-repository read-only existence check | publication gating uses lease evidence | — | — | frozen schema | none | policy specs | **NOT IMPLEMENTED** (read-only cameo; ADR target Gate 5+) |
| Valuation | valuation.* (frozen) | — | — | — | — | frozen schema | none | none | **NOT IMPLEMENTED** (ADR-G41-05) |
| Analytics | ads daily reports (0028) + index lag | upsertDailyReport | analytics.worker (ads_rollup, index_lag_snapshot) | platform-admin rollup trigger | consumes queues | 0028 | 1 admin route | worker paths | **PARTIAL** (worker rollups real; no analytics API/schema depth) |
| Audit | audit.logs + outbox_events | audit-repository | cross-cutting writes | admin stats routes | outbox machinery | frozen + 0026 claiming | admin endpoints | C2 race, J-suite | **SUBSTANTIAL** |

## Stub/mock scan result
Zero `TODO`/`FIXME`/`not implemented` bodies; zero hardcoded fake returns in implemented modules. All NOT IMPLEMENTED domains are honest absences with frozen schema ready — classified per Phase M without mock-filling.

## Phase M decisions
- **Implemented in Gate 4.1** (was partial, core-blocking for integrity): Advertising admin authorization + org isolation (T1/T2), click billing dedup (T4), Commission reversal endpoint (T3), MFA key hardening.
- **ADR-registered, deferred**: ADR-G41-01 Messaging, ADR-G41-02 CRM, ADR-G41-03 Contracts lifecycle, ADR-G41-04 Projects, ADR-G41-05 Valuation (+ Rental/Moderation workflow grouped with 01-04; target Gates 5-6 per user decisions). Rationale: frozen schema exists, product scope/business rules are user decisions, and mocking them to fill a checklist is explicitly forbidden.
