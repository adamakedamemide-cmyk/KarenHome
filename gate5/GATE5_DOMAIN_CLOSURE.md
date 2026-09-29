# GATE 5 — Phase J: Domain Closure Audit (12 domains, file-by-file)

Method: real file inventory (`apps/api/src/modules/*`, `packages/db/src/*`, `database/base+errata+migrations`, `apps/worker/src/workers/*`, `apps/api/openapi.json`) + test execution against fresh `karen_g5_fresh` (83/83 PASS includes all domain suites).

**Rule applied (per mandate):** schema/tables/DTO/controller alone do NOT count as Complete. A business flow must exist end-to-end.

## 1. Matrix

| Domain | DB tables | Repository | Service/Command/Query | API | Events/Workers | Authorization | Tests | STATUS |
|---|---|---|---|---|---|---|---|---|
| Advertising | 11 (0028) | ✅ advertising-repository | ✅ campaigns/budgets/serve/rollup | ✅ 3 paths | ✅ analytics.worker (CPM/CPC accrual) | ✅ 0035 (permission+guard+org isolation) | ✅ g41 T2/T4, g4.integration | **COMPLETE (core scope)** |
| Commission | 7 (0027) | ✅ commission-repository | ✅ rule-versioned engine + reversal | ✅ 9 paths | ✅ settlement via jobs | ✅ permission ladder | ✅ g4-commission-engine, g41 T3 (retroactive immutability) | **COMPLETE (core scope)** |
| Billing / Subscriptions | 11 (base + 0034) | ✅ billing-repository | ✅ immutable plan_version; plan change = new subscription row + events | ✅ 8 paths | ✅ Subscription*.v1 → notifications | ✅ org-scoped | ✅ g4.integration | **COMPLETE (core scope)** |
| Messaging | 4 (base) | ❌ none | ❌ none | ❌ none | ❌ none | ❌ none | ❌ none | **NOT_IMPLEMENTED** (schema-complete only) |
| CRM | 4 (base) | ❌ none | ❌ none | ❌ none | ❌ none | ❌ none | ❌ none | **NOT_IMPLEMENTED** (schema-complete only) |
| Contracts (legal) | 6 (base) | ❌ none for contracts | 🟡 `LegalAgreementsService` — agreement acceptance only (real, guard-protected, used by publication policy) | 🟡 1 path (`legal/agreements`) | ❌ | ✅ AccessTokenGuard | ✅ via publication-policy suite | **PARTIAL** — agreement subdomain real; contracts/templates/signatures absent |
| Projects | 7 (base, incl. translations 0029) | ❌ none | ❌ none (listings/properties do not yet flow through project hierarchy in app layer) | ❌ none | ❌ none | ❌ none | DB invariants only (Gate 3 SQL) | **NOT_IMPLEMENTED** (schema-complete only) |
| Valuation | 3 (base) | ❌ none | ❌ none — no algorithm, no framework/interface in application layer | ❌ none | ❌ | ❌ | ❌ | **NOT_IMPLEMENTED** — honest per Phase O: NO market-value claims |
| Rental | 5 (base) | ❌ none | ❌ none | ❌ none | ❌ none | ❌ none | ❌ | **NOT_IMPLEMENTED** (schema-complete only) |
| Analytics | audit.events + advertising aggregates | 🟡 via ads repo | ✅ analytics.worker (daily rollups, CPM/CPC spend, index-lag snapshots) | ✅ /metrics, admin rollup | ✅ scheduled worker | ✅ admin-guard | ✅ worker exercised | **PARTIAL (high depth)** — product-analytics API absent |
| Moderation | 3 (base) | 🟡 listing state + policy repo | ✅ submit/verify → pending_moderation → publish/reject with 13-state machine | 🟡 via listings paths | ✅ ListingSubmittedForModeration.v1 etc. | ✅ moderator roles | ✅ state-machine suites ×2 | **PARTIAL (high depth)** — content/queue surface absent |
| Verification | 2 (base) + iam verification | ✅ iam-hardening-repository | ✅ email/phone verification, seller verification gate | ✅ auth paths (20) | ✅ email/sms jobs | ✅ token + anti-bot | ✅ iam + mfa/antibot + publication suites | **PARTIAL (high depth)** — document/KYC review workflow absent |

## 2. Aggregate

- COMPLETE (core scope): **3** (Advertising, Commission, Billing/Subscriptions)
- PARTIAL: **4** (Contracts-agreements, Analytics-worker, Moderation-listing, Verification-identity)
- NOT_IMPLEMENTED (schema-complete, application layer absent): **5** (Messaging, CRM, Projects, Valuation, Rental)
- STUB: **0** · CONTRACT_ONLY: **0**
- Broken Core Domain: **0** — nothing previously claimed Complete is broken; the 5 NOT_IMPLEMENTED domains were never claimed (Gate 4.1 registered them honestly; Gate 5 re-verified independently).

## 3. Why the 5 NOT_IMPLEMENTED domains do not flip Gate 5 to BLOCKED

Gate 5 PASS rules: no critical security issue · no critical data-integrity issue · no broken core domain · no unresolved build failure · no schema drift · CI green · recovery verified. The 5 domains have: no code claiming to work (no false claims), no runtime surface (no authz/data paths to attack), and complete, migration-verified, invariant-tested schemas ready for implementation. They are registered as **registered gaps with ADRs**, block any *frontend* on them (frontend is locked anyway), and are the primary content of `GATE5_NEXT_GATE.md`.

## 4. Phases K–Q — mandated flow tests: execution reality

| Phase | Mandated flow | Execution result |
|---|---|---|
| K Messaging | Conversation/membership/read/attachment/IDOR | **NOT_EXECUTABLE — domain not implemented** (schema exists; no service to test). No false claims. |
| L CRM | Lead→assignment→activity→task→viewing→deal | **NOT_EXECUTABLE — domain not implemented** |
| M Contracts | Template/contract/immutable version/party/signature; V1↔V2 no overwrite | **NOT_EXECUTABLE for contracts proper**; agreement-acceptance immutability verified (ON CONFLICT DO NOTHING, `>=` version check) |
| N Projects | Developer→project→building→floor→unit→availability; cross-project integrity | **NOT_EXECUTABLE in app layer**; DB-level hierarchy invariants remain from Gate 3 (37/37 re-verified fresh in Gate 4.1 Phase D; schema unchanged in Gate 5 — REMOVED 0) |
| O Valuation | Estimate/Range/Confidence/Comparables/Method/Timestamp/ModelVersion | **NOT_EXECUTABLE — no algorithm or interface exists.** No market value claimed anywhere in repo (grep-verified: no valuation service, no model files). |
| P Rental | Lease/tenant/landlord/schedule/payment/deposit/renewal/termination/overlap/currency | **NOT_EXECUTABLE — domain not implemented** (schema exists incl. lease status enum + schedule tables) |
| Q Commission | Historical calc immutable, rule versioning, effective date, reversal, payout | ✅ **RE-VALIDATED on fresh G5 DB**: g4-commission-engine suite + g41-governance T3 (rule change ⇒ old calculation unchanged, IMMUTABLE_RECORD audit, reversal −50.0000) — all PASS |
| Q Advertising | Budget, impression dedup, click dedup, org isolation, authorization | ✅ **RE-VALIDATED on fresh G5 DB**: g41-governance T2 (org isolation) + T4 (click anti-double-billing: duplicate click events never double-bill) + budget exhaustion suite — all PASS |
