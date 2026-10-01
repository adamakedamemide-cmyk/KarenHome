# PHASE E / 0040 — Migration Audit Evidence (Final, Single Run)

Status: **FRESH = PASS · RERUN = PASS · ROLLBACK = PASS · BEHAVIOR = PASS**
Environment: real PostgreSQL 17.11 (Debian 17.11-0+deb13u1) + PostGIS 3.5.2, user-space prefix `scripts/pg-deb` (workspace), port 5434, fresh database `karen_g51_e_final`. Runner: `apply-all-migrations-node.js` (ledger-aware, section-aware — PHASE_D standard), `0040_gate51_valuation` registered after `0039_gate51_projects`, before `seed_reference`.
Design authority: `PHASE_E_VALUATION_DESIGN_REVIEW.md` (G1–G8 decisions, zero invented parameters).

## Defects found by targeted verification and fixed IN the migration (pre-commit)

- **Defect A — enum vs text vocabulary comparison:** `status_values.status`/`status_transitions.*` are `text` (data-driven extension = INSERT, never ALTER TYPE) while `cases.status` is the frozen ENUM `valuation.valuation_status` → bare comparison raised `operator does not exist: text = valuation.valuation_status` on every transition. **Fix (type-safe, canonical):** explicit `NEW.status::text` / `OLD.status::text` casts in both EXISTS guards. (0039 did not hit this — its status columns are text in the frozen base.)
- **Defect B — invariant bypass via non-status columns:** trigger was `BEFORE UPDATE OF status`, so `UPDATE cases SET expires_at = …` (any non-status column) bypassed the G5 consistency checks entirely. **Fix:** trigger fires `BEFORE UPDATE` on any column; transition logic is internally guarded by `NEW.status IS DISTINCT FROM OLD.status`; G5 checks now run on every UPDATE (verified: `expires_at` on a processing case is rejected; `updated_at` touch proven across separate transactions).

## Audit matrix (evidence)

| Check | Result | Evidence |
|---|---|---|
| Fresh chain (base→errata→0027–0040→seed) | **PASS** | applied=19 skipped=0, 0 errors (0040 = 27 statements, file-managed transaction) |
| Rerun | **PASS** | applied=0 skipped=19; inventory md5 `ac08112c9c331e1c6374fb8399589091` IDENTICAL before/after; ledger rows 19 IDENTICAL |
| Cross-instance determinism | PASS | two independent fresh builds produced the identical inventory md5 `ac08112c…` |
| Rollback / failure probe | **PASS** | `BEGIN; CREATE TABLE platform.probe_rollback…; SELECT 1/0;` → table absent, ledger unchanged (19) |
| Targeted behavior (27 assertions) | **PASS** | see matrix below; runner: `scripts/verify_0040_behavior.sql` (workspace), committed copy at `backend/scripts/verify_0040_behavior.sql` |

## Targeted behavior matrix (all 27 = t)

- Invalid status relationships: insert with non-`requested` status rejected (`VALUATION_INSERT_STATUS_INVALID`); `requested→completed` rejected (`VALUATION_INVALID_TRANSITION`); backward `completed→processing` rejected; out-of-lifecycle value rejected (outer enum guard; inner vocabulary guard retained for future enum extension).
- Valid status relationships: `requested→processing`, `processing→completed`, `completed→expired`, `requested→failed` all succeed via the transition authority.
- Non-status update cannot bypass invariant: `expires_at` on processing case → `VALUATION_EXPIRES_AT_INVALID` (Defect B regression proof); `completed_at` on failed case → `VALUATION_COMPLETED_AT_INVALID`; cross-transaction touch `t2 > t1` PASS.
- Finalized mutation rejected: results UPDATE/DELETE on `completed` and `expired` cases → `VALUATION_RESULT_IMMUTABLE`; comparables UPDATE/DELETE on sealed results → `VALUATION_COMPARABLE_IMMUTABLE`; corrections while `requested`/`processing` allowed (07/08).
- Cross-org isolation (DB level): `organization_id` NOT NULL binding on every case (24), FK to `org.organizations`; insert without org → not-null violation (01). Row-level 404-no-leak scoping = service layer (implementation phase, per design review §1).
- Cross-project / reference integrity: nonexistent property anchor → FK violation (26); property anchor RESTRICT per frozen base.
- Currency integrity: comparable with mismatched currency → `VALUATION_CURRENCY_MISMATCH` (09); matching currency accepted (10); explicit canonical column NOT NULL, backfill from parent result (deterministic inheritance, no FX logic).
- Comparable traceability: `idx_valuation_comparables_property` present (23) alongside `idx_valuation_cases_org`; seeds verified: 5 status_values, 5 transitions, 5 `valuation.*` permissions (22a–c); `completed_at` auto-set on finalize (11); `expires_at` valid only on completed (17).

## PG16 compatibility

Remains `UNVERIFIED_EXTERNAL_ENVIRONMENT` (ENVIRONMENT_VARIANCE.md — carried to Final Production Acceptance). 0040 contains no enum creation and no non-transactional DDL sections; all statements are standard transactional ALTER/CREATE, so no PG16-specific runner handling is required.
