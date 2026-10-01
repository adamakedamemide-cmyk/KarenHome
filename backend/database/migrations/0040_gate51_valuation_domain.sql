-- ============================================================================
-- 0040_gate51_valuation_domain.sql — Gate 5.1 Phase E (Valuation Domain)
-- ADDITIVE ONLY (Schema Diff invariant: REMOVED = 0).
-- Design authority: docs/governance/gate5_1/PHASE_E_VALUATION_DESIGN_REVIEW.md
--   1. G1  organization binding (requesting-org pattern) + updated_at
--   2. G3  status vocabulary + transition rules (data-driven, 0039 pattern)
--   3. G3+G5 lifecycle authority trigger + case/result consistency + touch
--   4. G6  explicit canonical comparables currency + backfill + trigger
--   5. G7  comparable traceability index
--   6. G4  finalized-result immutability triggers (created AFTER currency
--          backfill so a legacy backfill can never be sealed out)
--   7. G8  permission catalog seeds (valuation.view/create/update/finalize/manage)
-- NOTE: no business values are invented — the vocabulary is exactly the frozen
-- enum values; transitions are the minimal documented lifecycle; the currency
-- backfill uses the only deterministic source (parent result). Extending any
-- of these is an INSERT, not a migration.
-- SAFETY: ALTER ... SET NOT NULL succeeds on fresh chains (empty tables) and
-- fails LOUDLY on non-empty legacy tables by design (no silent unscoped or
-- mis-currencied rows) — backfill of live data is a governance decision.
-- The valuation enum is NOT altered; vocabulary tables supersede it.
-- ============================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. G1 — Organization binding + updated_at (additive columns)
-- ---------------------------------------------------------------------------
ALTER TABLE valuation.cases
    ADD COLUMN organization_id uuid REFERENCES org.organizations(id) ON DELETE RESTRICT;
ALTER TABLE valuation.cases ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE valuation.cases
    ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX idx_valuation_cases_org ON valuation.cases (organization_id, requested_at DESC);

-- ---------------------------------------------------------------------------
-- 2. G3 — Status vocabulary + transition rules
-- ---------------------------------------------------------------------------
CREATE TABLE valuation.status_values (
    entity text NOT NULL,
    status text NOT NULL,
    PRIMARY KEY (entity, status)
);

INSERT INTO valuation.status_values (entity, status) VALUES
    ('case', 'requested'),
    ('case', 'processing'),
    ('case', 'completed'),
    ('case', 'failed'),
    ('case', 'expired')
ON CONFLICT DO NOTHING;

CREATE TABLE valuation.status_transitions (
    entity text NOT NULL,
    from_status text NOT NULL,
    to_status text NOT NULL,
    PRIMARY KEY (entity, from_status, to_status)
);

INSERT INTO valuation.status_transitions (entity, from_status, to_status) VALUES
    ('case', 'requested',  'processing'),
    ('case', 'requested',  'failed'),
    ('case', 'processing', 'completed'),
    ('case', 'processing', 'failed'),
    ('case', 'completed',  'expired')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. G3+G5 — Lifecycle authority + case/result consistency + touch
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION valuation.enforce_case_status_transition()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
    -- NOTE: vocabulary columns are text (data-driven extension = INSERT, not
    -- ALTER TYPE); the case status column is the frozen ENUM → cast required.
    IF NOT EXISTS (
        SELECT 1 FROM valuation.status_values
         WHERE entity = 'case' AND status = NEW.status::text
    ) THEN
        RAISE EXCEPTION 'VALUATION_UNKNOWN_STATUS: % is not a registered valuation status', NEW.status;
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NOT EXISTS (
            SELECT 1 FROM valuation.status_transitions t
             WHERE t.entity = 'case' AND t.from_status = OLD.status::text AND t.to_status = NEW.status::text
        ) THEN
            RAISE EXCEPTION 'VALUATION_INVALID_TRANSITION: % -> %', OLD.status, NEW.status;
        END IF;
        NEW.updated_at = now();
        IF NEW.status = 'completed' THEN
            NEW.completed_at = COALESCE(NEW.completed_at, now());
        END IF;
    END IF;
    -- G5: completed_at ⇔ status consistency (expired inherits NOT NULL — it is
    -- reachable only from completed, where completed_at was already enforced)
    IF NEW.status IN ('requested','processing','failed') AND NEW.completed_at IS NOT NULL THEN
        RAISE EXCEPTION 'VALUATION_COMPLETED_AT_INVALID: completed_at must be NULL for % cases', NEW.status;
    END IF;
    -- G5: expires_at is meaningful only for completed/expired snapshots
    IF NEW.expires_at IS NOT NULL AND NEW.status NOT IN ('completed','expired') THEN
        RAISE EXCEPTION 'VALUATION_EXPIRES_AT_INVALID: expires_at is not allowed for % cases', NEW.status;
    END IF;
    RETURN NEW;
END;
$fn$;

-- Lifecycle entry guard: a new case always starts as 'requested' (the DEFAULT);
-- direct INSERTs cannot bypass the transition authority.
CREATE OR REPLACE FUNCTION valuation.guard_case_insert()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
    IF NEW.status IS DISTINCT FROM 'requested' THEN
        RAISE EXCEPTION 'VALUATION_INSERT_STATUS_INVALID: cases must be created as requested, not %', NEW.status;
    END IF;
    IF NEW.completed_at IS NOT NULL THEN
        RAISE EXCEPTION 'VALUATION_COMPLETED_AT_INVALID: completed_at must be NULL on creation';
    END IF;
    IF NEW.expires_at IS NOT NULL THEN
        RAISE EXCEPTION 'VALUATION_EXPIRES_AT_INVALID: expires_at must be NULL on creation';
    END IF;
    RETURN NEW;
END;
$fn$;

-- Fires on ANY column update (not just OF status): the G5 consistency checks
-- must also guard UPDATEs that leave status untouched (e.g. setting
-- expires_at on a processing case). Transition logic is internally guarded by
-- NEW.status IS DISTINCT FROM OLD.status.
CREATE TRIGGER trg_valuation_cases_status
    BEFORE UPDATE ON valuation.cases
    FOR EACH ROW EXECUTE FUNCTION valuation.enforce_case_status_transition();

CREATE TRIGGER trg_valuation_cases_insert
    BEFORE INSERT ON valuation.cases
    FOR EACH ROW EXECUTE FUNCTION valuation.guard_case_insert();

CREATE OR REPLACE FUNCTION valuation.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$fn$;

CREATE TRIGGER trg_valuation_cases_touch
    BEFORE UPDATE ON valuation.cases
    FOR EACH ROW EXECUTE FUNCTION valuation.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 4. G6 — Explicit canonical comparables currency + deterministic backfill
-- ---------------------------------------------------------------------------
ALTER TABLE valuation.comparables
    ADD COLUMN currency_code char(3) REFERENCES platform.currencies(code);

-- Only deterministic source: the parent result currency (documented
-- inheritance rule — no conversion, no FX logic anywhere).
UPDATE valuation.comparables c
   SET currency_code = r.currency_code
  FROM valuation.results r
 WHERE r.id = c.valuation_result_id;

ALTER TABLE valuation.comparables ALTER COLUMN currency_code SET NOT NULL;

CREATE OR REPLACE FUNCTION valuation.validate_comparable_currency()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE
    v_currency char(3);
BEGIN
    SELECT currency_code INTO v_currency FROM valuation.results WHERE id = NEW.valuation_result_id;
    IF v_currency IS DISTINCT FROM NEW.currency_code THEN
        RAISE EXCEPTION 'VALUATION_CURRENCY_MISMATCH: comparable currency % does not match result currency %', NEW.currency_code, v_currency;
    END IF;
    RETURN NEW;
END;
$fn$;

CREATE TRIGGER trg_comparables_currency
    BEFORE INSERT OR UPDATE OF currency_code ON valuation.comparables
    FOR EACH ROW EXECUTE FUNCTION valuation.validate_comparable_currency();

-- ---------------------------------------------------------------------------
-- 5. G7 — Comparable traceability index
-- ---------------------------------------------------------------------------
CREATE INDEX idx_valuation_comparables_property ON valuation.comparables (comparable_property_id);

-- ---------------------------------------------------------------------------
-- 6. G4 — Finalized-result immutability (created AFTER the currency backfill)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION valuation.guard_result_immutability()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE
    v_case_id uuid;
    v_case_status valuation.valuation_status;
BEGIN
    v_case_id = CASE WHEN TG_OP = 'DELETE' THEN OLD.case_id ELSE NEW.case_id END;
    SELECT status INTO v_case_status FROM valuation.cases WHERE id = v_case_id;
    IF v_case_status IN ('completed','expired') THEN
        RAISE EXCEPTION 'VALUATION_RESULT_IMMUTABLE: case % is %; valuation results are sealed (revaluation = new case)', v_case_id, v_case_status;
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$fn$;

CREATE OR REPLACE FUNCTION valuation.guard_comparable_immutability()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE
    v_case_status valuation.valuation_status;
BEGIN
    SELECT c.status INTO v_case_status
      FROM valuation.cases c
     WHERE c.id = (SELECT r.case_id FROM valuation.results r
                    WHERE r.id = CASE WHEN TG_OP = 'DELETE' THEN OLD.valuation_result_id ELSE NEW.valuation_result_id END);
    IF v_case_status IN ('completed','expired') THEN
        RAISE EXCEPTION 'VALUATION_COMPARABLE_IMMUTABLE: parent case is %; comparables of sealed results are immutable', v_case_status;
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$fn$;

CREATE TRIGGER trg_results_immutability
    BEFORE INSERT OR UPDATE OR DELETE ON valuation.results
    FOR EACH ROW EXECUTE FUNCTION valuation.guard_result_immutability();

CREATE TRIGGER trg_comparables_immutability
    BEFORE INSERT OR UPDATE OR DELETE ON valuation.comparables
    FOR EACH ROW EXECUTE FUNCTION valuation.guard_comparable_immutability();

-- ---------------------------------------------------------------------------
-- 7. G8 — Permission catalog seeds (additive; role mapping = app phase)
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, description) VALUES
    ('valuation.view',     'Read valuations within scope'),
    ('valuation.create',   'Request new valuation cases'),
    ('valuation.update',   'Update valuation cases and results while not finalized'),
    ('valuation.finalize', 'Finalize valuation results (system/worker authority)'),
    ('valuation.manage',   'Manage the valuation domain within the binding organization')
ON CONFLICT (code) DO NOTHING;

COMMIT;
