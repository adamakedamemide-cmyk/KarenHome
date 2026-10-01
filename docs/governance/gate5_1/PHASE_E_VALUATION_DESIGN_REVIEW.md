# PHASE E — Valuation Design Review (G1 → G3 → G8 → Immutability → Currency → Traceability → IRR = TBD → 0040)

Status: **DESIGN REVIEW COMPLETE — DECISIONS REGISTERED; 0040 NOT YET IMPLEMENTED**
Input: `PHASE_E_VALUATION_SCHEMA_AUDIT.md` (verdict **B — partially sufficient**; gaps G1–G8; open TBD 1–9) + owner directive chain order (G1 → G3 → G8 → Immutability → Currency → Traceability → IRR = TBD → 0040).
Rule of construction: **every decision below is anchored to an existing schema/code precedent — nothing invented.** Frozen base tables are never altered destructively; all changes are additive (`REMOVED = 0` invariant).

---

## 0) Decision register — resolves Audit 1 §11 TBD 1–9

| TBD | Question | Decision | Anchor |
|---|---|---|---|
| 1 | Org binding for `valuation.cases` | **G1 — explicit `organization_id uuid NOT NULL` FK**, requesting-org pattern; ownership cross-check at app layer | `listings.managing_organization_id`, `project.projects.developer_organization_id` (base:698); derive-only alternative rejected by Audit 1 §4.4 |
| 2 | Unit/project-scoped targets | **NOT ADDED — property-anchor-only** (directive chain omits G2); transitive reach preserved (`units.property_id`, `listings.property_id`) | Audit 1 §4.5 ("only if governance requires") |
| 3 | Status vocabulary + transitions + `processing` owner | **G3 — data-driven vocabulary** (0039 pattern); transitions = minimal documented set; `processing→completed` = system/worker + `valuation.finalize`; DB trigger is sole authority | 0039:18–104 (`status_values`/`status_transitions`/`enforce_status_transition`) |
| 4 | Method configuration table vs constrained text | **DEFERRED — no table in 0040.** `cases.method` stays text; method catalog is a future additive decision (no methods invented now) | Seed policy (`seed_reference.sql:1-7` — no business values seeded); Audit 1 §3 |
| 5 | Adjustment-level breakdown table | **NOT ADDED** — scalar `adjusted_price` sufficient for the mandated output shape | Audit 1 §3 (ValuationAdjustment: "only if governance requires") |
| 6 | Comparables currency + IRR seed | **G6 — explicit canonical column + enforcement trigger**; **IRR = TBD** (not seeded, no FX invented) | `rental.validate_rent_payment_currency` (base:1862); `platform.currencies` seeds unchanged (base:2163) |
| 7 | Permission set + role mapping | **G8 — five `valuation.*` seeds**, `ON CONFLICT DO NOTHING`; role mapping = app phase | Convention verified: `domain.action` pairs (0035–0039) + granular actions (base seed: `property.create`, `listing.update`, `verification.request`) |
| 8 | Event set + payload | **`ValuationRequested.v1` / `ValuationCompleted.v1` / `ValuationFailed.v1`** via `audit.outbox_events`, same-transaction write (app phase) | Live convention `<Aggregate><Action>.v1` (37-event catalogue) |
| 9 | Expiry semantics | **No auto-transition job.** `completed→expired` is worker/app-driven through the same transition authority; `expires_at` validated (see G5) | No scheduler exists anywhere in the frozen base — inventing one is out of scope |

---

## 1) G1 — Organization Binding (DECIDED)

**Change (additive):**
```sql
ALTER TABLE valuation.cases
  ADD COLUMN organization_id uuid REFERENCES org.organizations(id) ON DELETE RESTRICT,
  ADD COLUMN updated_at timestamptz;
-- fresh chains: tables empty → SET NOT NULL succeeds; non-empty legacy DB fails
-- LOUDLY by design (no silent unscoped rows; backfill = governance decision)
ALTER TABLE valuation.cases ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_valuation_cases_org ON valuation.cases (organization_id, requested_at DESC);
```

**Semantics:** `organization_id` = the **requesting/managing organization** — the same shape as `listings.managing_organization_id` and `project.projects.developer_organization_id` (the acting org owns the row). It is deliberately **not derived** from `property.owners`: that table is multi-row `user_id XOR organization_id` (base:409–418), so deriving a single binding org would require an ownership-precedence policy that does not exist anywhere in the platform (invention forbidden). Enabling cross-tenant isolation is therefore concrete and indexable: org-scoped 404-no-leak exactly like Projects/CRM.

**Enforcement split:**
- DB: FK + NOT NULL + access-path index (existence and non-voidness).
- App (implementation phase): requester must hold `valuation.create` **within the binding org**; read scope = binding-org members + requester; cross-org access ⇒ 404-no-leak (proven Projects/CRM service pattern). Ownership-consistency display checks (if any) are read-only app logic — never a DB-derived binding.

## 2) G2 — Context targets (REGISTERED: property-anchor-only)

The directive chain orders G1 → G3 → G8 and does not include unit/project targets. Decision: **core stays property-anchored** (`cases.property_id`, RESTRICT, exists). Unit/project remain reachable transitively; listings remain referenced per-comparable. If governance later requires unit/project-scoped valuations, the path is additive nullable FKs + composite-consistency triggers — documented here so it never becomes a rework. **No DDL for G2 in 0040.**

## 3) G3 — Status / Lifecycle authority (DECIDED)

Vocabulary tables clone the 0039 pattern into the `valuation` schema (enum is left untouched — vocabulary supersedes it as authority):

```sql
valuation.status_values    (entity 'case': requested, processing, completed, failed, expired)
valuation.status_transitions:
    requested  → processing
    requested  → failed
    processing → completed
    processing → failed
    completed  → expired
```

- This is the **minimal documented lifecycle** — every value already exists in the frozen enum (base:76); no backward transitions (a completed valuation is superseded by a NEW case, not mutated — see G4).
- `BEFORE UPDATE OF status ON valuation.cases` trigger `valuation.enforce_case_status_transition()` (0039:64–96 shape): unregistered status ⇒ `VALUATION_UNKNOWN_STATUS`; unregistered transition ⇒ `VALUATION_INVALID_TRANSITION`.
- `processing → completed` is owned by the **system/worker principal holding `valuation.finalize`**; the transition table is the sole mutation authority, so "exactly-one finalizer" concurrency reduces to the transition guard (same property proven for units in Phase D).
- `updated_at` touch folded into the same trigger on status change (0039 pattern) + plain touch on any UPDATE.

## 4) G4 — Finalized-result immutability (DECIDED)

Snapshot semantics: **case-per-valuation; revaluation = new case ⇒ history preserved.** Enforcement is trigger-level (bypass via app is impossible by construction):

```sql
valuation.trg_results_immutability:
    BEFORE UPDATE OR DELETE ON valuation.results
    WHEN parent case.status IN ('completed','expired') → RAISE 'VALUATION_RESULT_IMMUTABLE'
valuation.trg_comparables_immutability:
    BEFORE UPDATE OR DELETE ON valuation.comparables
    WHEN parent result's case.status IN ('completed','expired') → RAISE 'VALUATION_COMPARABLE_IMMUTABLE'
```

- `'expired'` is included: an expired valuation is an ex-completed snapshot; expiry must not reopen mutation.
- **Corrections remain possible while the case is `requested`/`processing`** (resolves Audit 1 TBD: processing-state results may be corrected; completion locks everything).
- `failed` cases keep rows mutable — cleanup of partial artifacts is operational, not a history violation (no snapshot exists).
- INSERT of new results/comparables into a completed case is additionally rejected by the results trigger (UPDATE covers supersedence; INSERT guard covers orphans) — no new evidence can be attached to a sealed snapshot.

## 5) G5 — Case/result consistency (DECIDED, folded into the G3 trigger)

- Transition into `completed`: `completed_at := COALESCE(NEW.completed_at, now())`.
- `status IN ('requested','processing','failed')` ⇒ `completed_at` MUST be NULL, else `VALUATION_COMPLETED_AT_INVALID`.
- `status = 'expired'` inherits `completed_at IS NOT NULL` (reachable only from `completed` — structurally guaranteed).
- `expires_at` may be set only when `status IN ('completed','expired')`, else `VALUATION_EXPIRES_AT_INVALID`.
- No DB scheduler: expiry transitions are worker/app-driven through the G3 authority (TBD 9).

## 6) G6 — Currency, explicit canonical (DECIDED)

```sql
ALTER TABLE valuation.comparables
  ADD COLUMN currency_code char(3) REFERENCES platform.currencies(code);
-- deterministic backfill from the ONLY documented source (parent result):
UPDATE valuation.comparables c
   SET currency_code = r.currency_code
  FROM valuation.results r WHERE r.id = c.valuation_result_id;
ALTER TABLE valuation.comparables ALTER COLUMN currency_code SET NOT NULL;
```

Trigger `valuation.validate_comparable_currency()` (exact pattern of `rental.validate_rent_payment_currency`, base:1862–1879): `INSERT/UPDATE` where `NEW.currency_code IS DISTINCT FROM` parent result's currency ⇒ `VALUATION_CURRENCY_MISMATCH`. **No conversion, no FX logic anywhere** — `platform.exchange_rates` remains observed data for app-layer reporting only; valuation storage is single-currency per result with explicit canonical per-comparable currency. Same-currency invariant is now enforced, not undocumented (closes Audit 1 §1.1 "must inherit result currency — undocumented").

## 7) G7 — Comparable traceability (DECIDED)

```sql
CREATE INDEX idx_valuation_comparables_property ON valuation.comparables (comparable_property_id);
```

Closes the audit's index gap: "which valuations used property X as comparable" becomes an index scan. RESTRICT FKs already guarantee the rows cannot dangle.

## 8) G8 — Permission seeds (DECIDED)

Naming convention verified across the corpus (`advertising.view/manage`, `messaging.view/manage`, `crm.view/manage`, `project.view/manage` + granular base seeds `property.create`, `listing.update`, `verification.request`):

```sql
INSERT INTO iam.permissions (code, description) VALUES
  ('valuation.view',     'Read valuations within scope'),
  ('valuation.create',   'Request new valuation cases'),
  ('valuation.update',   'Update valuation cases and results while not finalized'),
  ('valuation.finalize', 'Finalize valuation results (system/worker authority)'),
  ('valuation.manage',   'Manage the valuation domain within the binding organization')
ON CONFLICT (code) DO NOTHING;
```

- **View-only write = 403** at the permission-guard layer (implementation phase — `AccessTokenGuard` + permissions guard, proven pattern). No role bindings are seeded (role mapping is an app/governance decision — no invention).

## 9) IRR = TBD (REGISTERED — nothing implemented)

`IRR` (Iranian Rial) is **not seeded** in `platform.currencies` and 0040 does not add it. No FX rules are invented. This remains an explicit governance decision (Persian-market currency policy), recorded identically in Audit 1 §7 and here; the schema accepts it later as a one-row INSERT plus data, never as code.

## 10) Events & evidence (implementation-phase contract)

- Events: `ValuationRequested.v1`, `ValuationCompleted.v1`, `ValuationFailed.v1` written to `audit.outbox_events` **in the same transaction** as the mutation (outbox claiming infra exists — errata 0026; naming per the 37-event catalogue).
- `audit.logs` rows for create / transition / finalize with before/after jsonb (Projects/CRM service pattern).
- Gate 5 acceptance stands: no surface may present an "estimate" without a real model; OpenAPI may expose case lifecycle + evidence structure only.

## 11) 0040 migration design (`0040_gate51_valuation_domain.sql`)

Single additive migration, sectioned `BEGIN…COMMIT`, 0039 runner patterns (dollar-quoted functions, `ON CONFLICT DO NOTHING`, ledger-aware skip-if-applied):

| § | Objects | Gap |
|---|---|---|
| 1 | `cases.organization_id` FK + `SET NOT NULL` + `updated_at` + `idx_valuation_cases_org` | G1 |
| 2 | `valuation.status_values` + `status_transitions` + seeds | G3 |
| 3 | `enforce_case_status_transition()` trigger (status authority + G5 consistency + touch) | G3+G5 |
| 4 | `trg_results_immutability` + `trg_comparables_immutability` | G4 |
| 5 | `comparables.currency_code` + deterministic backfill + `SET NOT NULL` + `validate_comparable_currency()` | G6 |
| 6 | `idx_valuation_comparables_property` | G7 |
| 7 | permission seeds ×5 | G8 |

Constraints honored: **no enum alteration** (vocabulary supersedes), **no destructive DDL** (`REMOVED = 0`), frozen tables touched only additively. `ALTER TABLE … SET NOT NULL` on fresh chains (empty tables) succeeds; a non-empty legacy DB fails loudly — the intended safety property (no silently unscoped/mis-currencied rows).

## 12) Migration audit & test contract (unchanged from Audit 1 §10)

- **Runner audit standard** (`gate5_1/PHASE_D_MIGRATION_RUNNER_AUDIT.md`): fresh apply 0-error on real PostgreSQL 17.11 + PostGIS 3.5.2; rerun ⇒ ledger skip + byte-identical inventory; mid-file failure ⇒ full rollback probe; seed idempotency.
- **Behavior tests (DB level):** unknown status rejected; every unregistered transition rejected (incl. backward); completed/expired results UPDATE+DELETE rejected; completed/expired comparables UPDATE+DELETE rejected; requested/processing corrections allowed; currency mismatch rejected / match accepted; `organization_id` NULL rejected; `completed_at`/`expires_at` consistency rules; permission seeds present; both indexes present.
- **App phase:** repository/service/controller/DTO (decimal-as-string `@IsNumberString` policy), permission guards (view-only write = 403), org-scoped 404-no-leak, events + audit wiring, unit + integration suites, OpenAPI validation, typecheck/lint/build, secret scan.
- PG16 compatibility remains `UNVERIFIED_EXTERNAL_ENVIRONMENT` (ENVIRONMENT_VARIANCE.md — carried to Final Production Acceptance).

## 13) Scope lock (unchanged)

No frontend · no unrelated refactor · no Projects/CRM/Messaging redesign · no method-configuration table (TBD 4 deferred) · no adjustment-breakdown table (TBD 5 deferred) · no auto-expiry scheduler · no IRR implementation · no FX rules · no invented business parameters.
