# PHASE E / AUDIT 1 — Valuation Schema Discovery & Design Verdict

Status: **AUDIT COMPLETE — NO MIGRATION PRODUCED, NO APPLICATION CODE PRODUCED** (per directive: `NO AUDIT = NO MIGRATION`)
Verified base: commit after security checkpoint (`LOCAL HEAD == origin/main` proven at audit start).
Method: static schema discovery over the authoritative DDL (`backend/database/base/enterprise_real_estate_schema_frozen_v1.sql`, migrations 0027–0039, errata 0024–0026) + application layer sweep (`apps/api/src`, `packages/contracts`) + governance corpus (gate5/GATE5_VALUATION_AUDIT.md, GATE5_DOMAIN_CLOSURE.md, PROJECT_STATE_SUMMARY.md, master prompt v1.3). All findings carry file:line evidence. Placement note: this document lives at the directive-specified path `docs/governance/gate5_1/`; sibling phase docs (Phase A, Phase D runner audit) live at repo-root `gate5_1/`.

---

## 0) Valuation-term sweep — evidence

Case-insensitive sweep for `valuation | appraisal | estimate | market_value | comparable | price_history | valuation_method` across the repo returned 62 files. Live-surface classification:

| Surface | Hits | Verdict |
|---|---|---|
| `backend/database/base/…frozen_v1.sql` | valuation schema section (lines 1380–1424) + enum (line 76) + indexes (1649–1651) | **AUTHORITATIVE — 3 tables exist** |
| `backend/apps/api/src` | 1 file: `common/antibot/antibot.service.ts:110` | **false positive** — metric name `antibot_evaluations_total`, not valuation |
| `packages/contracts` | 0 | no valuation contracts |
| OpenAPI | 0 paths | no valuation surface |
| gate4/gate5 governance docs, master prompt, artifact exports | remainder | reference/governance material only |

**Application-layer fact (re-verifying Gate 5 Phase O):** no repository, no service, no controller, no DTO, no events, no tests, no OpenAPI paths for valuation exist. `apps/api/src/modules/` = admin, advertising, authorization, billing, commission, crm, health, i18n, iam, legal, listings, media, messaging, notifications, projects, properties, search — **no valuation module**.

Documentation errata registered: `gate5/GATE5_VALUATION_AUDIT.md` line 6 names the tables "`comparables, valuations, valuation_inputs`" — the actual frozen DDL defines **`valuation.cases`, `valuation.results`, `valuation.comparables`**. The DDL is authoritative; the Gate 5 audit prose is corrected by this document.

## 1) Current schema (authoritative)

### 1.1 Valuation domain (base schema, frozen v1 — applied, fresh-chain verified 18/18 in Phase D audit)

```sql
-- base:1385  ENUM base:76
CREATE TYPE valuation.valuation_status AS ENUM ('requested','processing','completed','failed','expired');

CREATE TABLE valuation.cases (                    -- base:1385
    id uuid PK DEFAULT gen_random_uuid(),
    property_id uuid NOT NULL → property.properties(id) ON DELETE RESTRICT,
    requested_by_user_id uuid → iam.users(id) ON DELETE SET NULL,
    status valuation.valuation_status NOT NULL DEFAULT 'requested',
    method text NOT NULL DEFAULT 'comparables',   -- free text; no method configuration table
    model_version text,                           -- nullable
    requested_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,                     -- no completed-status consistency CHECK
    expires_at timestamptz
);                                                -- NO organization_id; NO updated_at; NO status-transition authority

CREATE TABLE valuation.results (                  -- base:1397 — 1:1 with case
    id uuid PK,
    case_id uuid NOT NULL UNIQUE → valuation.cases(id) ON DELETE CASCADE,
    min_value        numeric(20,4) NOT NULL CHECK (>= 0),
    estimated_value  numeric(20,4) NOT NULL CHECK (>= 0),
    max_value        numeric(20,4) NOT NULL CHECK (>= 0),
    currency_code    char(3) NOT NULL → platform.currencies(code),
    confidence       numeric(6,2) CHECK (NULL OR 0..100),
    price_per_m2     numeric(20,4) CHECK (NULL OR >= 0),
    generated_at     timestamptz NOT NULL DEFAULT now(),
    CHECK (min_value <= estimated_value AND estimated_value <= max_value)
);                                                -- UNIQUE(case_id) ⇒ exactly one result per case; no result versioning

CREATE TABLE valuation.comparables (              -- base:1410
    valuation_result_id      uuid NOT NULL → valuation.results(id) ON DELETE CASCADE,
    comparable_property_id   uuid NOT NULL → property.properties(id) ON DELETE RESTRICT,
    comparable_listing_id    uuid → marketplace.listings(id) ON DELETE SET NULL,
    similarity_score         numeric(6,2) CHECK (NULL OR 0..100),
    distance_m               numeric(12,2) CHECK (NULL OR >= 0),
    adjusted_price           numeric(20,4),     -- NO currency column (must inherit result currency — undocumented)
    PK (valuation_result_id, comparable_property_id)
);
```

Indexes (base:1649–1651): `ix_valuation_property (cases(property_id, requested_at DESC))`, `ix_valuation_status (cases(status, requested_at DESC))`, `ix_valuation_comparables_result (comparables(valuation_result_id))`. **Gap: `comparables(comparable_property_id)` is unindexed** (traceability query "which valuations used property X as comparable" would scan).

Triggers: **none** for valuation (no touch, no transition authority, no immutability guard).

### 1.2 Governance mandate already attached to the domain

- Gate 5 Phase O acceptance shape (`gate5/GATE5_VALUATION_AUDIT.md`): outputs MUST carry **Estimate, Range, Confidence, Comparables, Method, Timestamp, Model Version** — DDL fields map 1:1 (`estimated_value`, `min/max_value`, `confidence`, `comparables`, `method`, `generated_at`, `model_version`).
- Gate 5 reclassification: Valuation = **NOT_IMPLEMENTED (schema-complete only)** — ADR-G5-04; primary content of `GATE5_NEXT_GATE.md`.
- Master prompt v1.3 G26 (Valuation / Market Intelligence) names roles incl. Comparable Engine, Model Versioning, Market Data — methodology configuration is a first-class concern.
- Seed policy (`backend/database/seed/seed_reference.sql:1-7`): NO business rates/percentages/prices are ever seeded — same prohibition extends to valuation coefficients.

## 2) Existing reusable entities (canonical map — no duplicates to be created)

| Directive entity | Canonical home (authoritative) | Reuse verdict |
|---|---|---|
| Property | `property.properties` (base:369; public_code identity, status enum, soft delete, `deleted_at` consistent w/ status) + `property.property_locations` (geo_node_id → geo.nodes, PostGIS point, visibility) | **REUSE** — valuation anchor already FK'd |
| Listing | `marketplace.listings` (base:566; `managing_organization_id` org scope, currency NOT NULL, price numeric(20,4)) + `listing_prices` history (EXCLUDE no-overlap, GENERATED tstzrange) | **REUSE** — already referenced by comparables |
| Project | `project.projects` (base:695; `developer_organization_id`, geo_node_id, status vocabulary 0039) | **REUSE** (context target, see §4) |
| Building/Floor/Unit | `project.project_buildings/floors/units` (composite-FK hierarchy integrity, `units.property_id → property.properties`) | **REUSE** (context target, see §4) |
| Organization | `org.organizations` (base:246; type enum, slug) + membership/roles | **REUSE** |
| Geography | `geo.nodes` (adjacency + `geography(Point,4326)` centroid + `geometry(MultiPolygon,4326)` boundary + translations) — PostGIS 3.5.2 live | **REUSE** |
| Currency | `platform.currencies` (char(3) PK, minor_unit 0..6) + `platform.exchange_rates` (numeric(20,10), observed_at, source) | **REUSE** — already FK'd by results |
| Media | `marketplace.media_assets/variants`, `property.property_media`, `property.documents` | REUSE (not needed by valuation MVP) |
| Verification | `verification.cases` (subject user/org/property XOR check) | REUSE pattern reference |
| Audit | `audit.logs` (actor/org/action/entity/before/after jsonb/ip/ua/request_id) | **REUSE** — evidence wiring required |
| Events | `audit.outbox_events` (aggregate_type/id, event_type, payload, retry) | **REUSE** — valuation events required |
| Status authority | `project.status_values/status_transitions` + DB trigger (0039:18-60) | **PATTERN REUSE** for valuation lifecycle |

## 3) Design verdict

```text
B) EXISTING SCHEMA PARTIALLY SUFFICIENT
```

The three frozen tables cover the mandated output shape with exact money types and canonical FKs — no parallel/duplicate model is warranted. Application layer + lifecycle authority + org binding + evidence wiring are entirely absent. All changes must be **additive** (single new migration following the 0039 pattern); the frozen base tables are never altered destructively.

Directive entity mapping:

| Directive design entity | Maps to | Note |
|---|---|---|
| ValuationRequest | `valuation.cases` (status `requested`→`processing`/`failed`) | case IS the request |
| Valuation | `valuation.results` (+ case lifecycle) | 1:1; Estimate/Range/Confidence present |
| ValuationMethod | `cases.method` (text) — **method configuration table MISSING** | CONFIGURABLE/TBD — do not invent methods |
| ValuationComparable | `valuation.comparables` | traceable via RESTRICT FKs |
| ValuationAdjustment | **MISSING** — only scalar `adjusted_price` exists | TBD: breakdown table only if governance requires adjustment-level evidence |
| ValuationSnapshot | results+comparables rows constitute the snapshot (case-per-valuation); **immutability enforcement MISSING** | see G4 |
| ValuationEvidence | **MISSING** — audit.logs + outbox wiring absent | see G6/G7 |

## 4) Required relationships (all canonical — no parallel models)

1. `cases.property_id → property.properties` — EXISTS (RESTRICT). Property remains the single anchor.
2. `results.currency_code → platform.currencies` — EXISTS. Currency explicit at result level.
3. `comparables → results / properties / listings` — EXIST with correct cascade/restrict.
4. **G1 — org binding:** `cases` has NO organization scope. Property has no direct org column (org linkage = `property.owners(organization_id)` user-XOR-org CHECK, base:409; listings carry `managing_organization_id`). RECOMMENDED (decision pending governance): add `cases.organization_id uuid NOT NULL → org.organizations` + DB trigger validating it is consistent with the property's owning/creating org (pattern: `trg_payment_currency` base:1882, `trg_project_developer_org_type`) — mirrors `listings.managing_organization_id` and enables org-scoped 404-no-leak exactly like projects/CRM. Alternative (derive-only via owners) rejected: leaves cross-tenant enforcement implicit and un-indexable.
5. **G2 — context targets:** directive requires Valuation to reference Property/Listing/Unit/Project with canonical IDs. Current model: property anchor only; listing already referenced per-comparable; unit/project reachable transitively (`units.property_id`, `listings.property_id`). RECOMMENDED: keep property-anchored core; add nullable `cases.unit_id → project.units` / `cases.project_id → project.projects` ONLY if governance requires unit/project-scoped valuations; add composite-FK style consistency triggers if added. **No decision taken in audit — TBD.**
6. `cases.requested_by_user_id → iam.users` — EXISTS (personal scope retained).

## 5) Required constraints (to be added by implementation migration — none exist today)

- **G3 — status transition authority:** reuse the 0039 pattern (`valuation.status_values` + `valuation.status_transitions` + BEFORE trigger; propose vocabulary `requested→processing→completed | failed`, `processing→failed`, expiry rule `completed→expired` — transitions TBD by governance). Enum already exists; vocabulary tables make transitions data, not code.
- **G4 — immutability of completed results:** trigger blocking UPDATE/DELETE of `valuation.results` rows belonging to `completed` cases and blocking `comparables` mutation for completed results (snapshot semantics: revaluation = new case ⇒ history preserved). Rule TBD: whether `processing` results may be corrected.
- **G5 — case/result consistency:** `completed_at` ⇔ status `completed` consistency CHECK/trigger; `expires_at` only for completed (proposed).
- **G6 — comparables currency semantics:** `adjusted_price` inherits result currency; either document + enforce via trigger after a currency column is added (pattern: `validate_rent_payment_currency`) or register explicit inheritance rule. TBD (no invented conversion logic — FX via `platform.exchange_rates` only, rates are data).
- **G7 — index for traceability:** `comparables(comparable_property_id)`.
- **G8 — permission seeds:** no `valuation.*` permission exists (sweep verified; seeds use `domain.action` ON CONFLICT DO NOTHING). Proposed naming follows convention: `valuation.view`, `valuation.manage` (+ possibly `valuation.request`) — role mapping TBD.
- Integrity invariants from the directive, current state: non-existent property ✅ FK-blocked · wrong org scope ❌ G1 · unrelated project/unit ❌ G2 · explicit currency ✅ results (comparables ❌ G6) · exact money ✅ (numeric, §7) · immutable history ❌ G4 · comparable traceability ✅ structurally / index gap G7 · auditable evidence ❌ G8/wiring · finalized-mutation protection ❌ G3+G4.

## 6) Authorization model (reuse, no invention)

Existing platform patterns to reuse verbatim: `iam.permissions` + `role_permissions` + `iam.user_permission_grants` (0030 personal scope) + `org.organization_members/member_roles` + `AccessTokenGuard`/permission guards + org-scoped 404-no-leak service behavior (proven in Projects/CRM phases).

| Directive question | Current | Phase E proposal (configurable) |
|---|---|---|
| Create valuation | — | permission `valuation.request` or `valuation.create` (TBD) |
| View | — | `valuation.view` — requester + org members of binding org (G1) |
| Modify draft | — | `valuation.manage` while status ∈ {requested, processing} |
| Finalize | — | transition to `completed` = system/worker authority + `valuation.manage`; DB trigger is authority |
| Cross-org access | — | DENY via org-scoped 404-no-leak |
| Project/unit valuation access | — | additionally require `project.view`/`project.manage` within developer org (TBD) |

## 7) Money / currency model (exact — verified, no float)

- **Storage:** all valuation amounts are `numeric(20,4)` (platform standard, 27 occurrences; areas `numeric(14,2)`, percents/scores `numeric(6,2)/numeric(7,4)`, distances `numeric(12,2)`, FX `numeric(20,10)`). **Airtight sweep: zero `real`/`double precision`/`float`/`float4/8` column types anywhere in base+migrations** (raw-grep hits were header comments "…Real Estate…" only — false positives documented).
- **Currency:** ISO char(3) FK to `platform.currencies` (minor_unit 0..6). Seeds: USD, EUR, GBP, GEL, AZN, TRY, RUB (base:2163). **IRR is NOT seeded** — flag for governance (Persian-market currency policy; NOT invented in this audit).
- **Semantics:** CHECK >= 0 on all value columns; range-ordering CHECK; confidence/similarity bounded 0..100. Rounding: none defined in DDL (TBD at implementation: round to minor_unit at API boundary only — no DB rounding).
- **API representation (platform policy, reuse):** decimal-as-string — `@IsNumberString() @Matches(/^\d+(\.\d{1,4})?$/)` with `currencyCode @Matches(/^[A-Z]{3}$/)` (listings DTO precedent, `modules/listings/presentation/dto/create-listing.dto.ts:9-10`). Valuation DTOs MUST follow the same string-decimal policy; floats never cross the API.
- **Boundary distinction (directive §6) — enforced mapping:** Listing asking price → `marketplace.listings.price`/`listing_prices`; transaction/sale price → listing lifecycle + `ProjectUnitSold.v1` optional price snapshot (0039); rental price → rent schedules + `price_period`; **valuation result → `valuation.results` only**; valuation input → TBD (G2/G6); methodology → `cases.method`/config TBD; comparable evidence → `valuation.comparables` only; historical snapshot → case-per-valuation + `generated_at`. Commission (0027) and listing pricing domains remain untouched — valuation reads nothing from them and writes nothing to them.

## 8) Event / audit model

- Event naming convention (live code): `<Aggregate><Action>.v1` — 37 strings catalogued (Project*, Listing*, Crm*, Message*, Subscription*). Proposed (TBD set): `ValuationRequested.v1`, `ValuationCompleted.v1`, `ValuationFailed.v1` via `audit.outbox_events` (same transaction as mutation — outbox claiming infra exists: errata 0026).
- Audit: `audit.logs` rows for create/transition/finalize with before/after jsonb (pattern proven in Projects/CRM services).
- Gate 5 acceptance: no output surface may claim market value until dataset+model exist — OpenAPI may expose case lifecycle + evidence structure; any "estimate" surfaced without a real model is a governance violation (GATE5_VALUATION_AUDIT).

## 9) Migration impact

- One additive migration at implementation time: `0040_gate51_valuation_domain.sql` (status vocabulary + transitions + trigger, immutability triggers, org binding per G1 decision, consistency constraints, traceability index, permission seeds) — follows 0039 patterns (`ON CONFLICT DO NOTHING`, section-aware transactions, ledger-aware runner).
- Frozen base tables: **no destructive changes**; enum untouched (vocabulary tables supersede).
- Fresh-install / rerun / rollback tests + inventory parity required by the established runner audit standard (`gate5_1/PHASE_D_MIGRATION_RUNNER_AUDIT.md`).

## 10) Required tests at implementation (directive §7 — test contract)

Unit · Integration on real PostgreSQL 17.11+PostGIS 3.5.2 · Authorization (view/manage/finalize) · Cross-project/org isolation (404-no-leak) · Money precision (numeric(20,4) round-trip, string-decimal API) · Currency (FK validity, inheritance rule) · Historical snapshot (completed-result immutability, revaluation=new case) · Audit rows · Invalid-reference rejections · Concurrent mutation (two finalizers — exactly-one-wins via transition authority) · Migration fresh-install · rerun (skipped/identical inventory) · rollback · OpenAPI validation · Secret scan · Typecheck · Lint. Real execution on the established user-space PG infra; **PG16 compatibility run remains UNVERIFIED_EXTERNAL_ENVIRONMENT** (ENVIRONMENT_VARIANCE.md, carried to Final Production Acceptance).

## 11) Open questions / TBD (governance decisions — nothing invented)

1. Org binding approach for `valuation.cases` (recommended: explicit `organization_id` + consistency trigger — G1).
2. Unit/project-scoped valuation targets — needed or property-anchor-only (G2).
3. Status vocabulary + transition set (G3) and who owns `processing` (worker vs user).
4. Method configuration table vs constrained text vocabulary (G8; master-prompt G26 implies configuration).
5. Adjustment-level breakdown table — required or scalar `adjusted_price` sufficient.
6. Comparables currency column + enforcement (G6); IRR currency seed decision.
7. Permission set + role mapping (`valuation.view/manage/request`? — G8).
8. Event set + payload shape (Valuation*.v1).
9. Expiry semantics (`expires_at` — auto-transition or advisory).

## 12) Environment limitations

- Sandbox rebuilt between sessions: verification infra files survived (`scripts/pg-deb`, user-space PG 17.11 + PostGIS 3.5.2) but the server is not running; implementation-phase test runs will restart it (proven procedure). Audit 1 is static DDL/code discovery — no live-DB dependency.
- CI authority remains PG16 (docker absent in sandbox) — carried variance, not a blocker (ENVIRONMENT_VARIANCE.md).
- Push credential: active via env-preferred secure helper; rotation re-flagged (SECURITY_CREDENTIAL_GATE.md) — transparent to Phase E.
