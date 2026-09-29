-- ============================================================================
-- 0027_commission_domain.sql — Gate 3-DB
-- OD-03 (APPROVED): Commission model confirmed; NO percentage/amount invented.
--                    Engine fully configurable + versioned; every calculation
--                    snapshot-based (rule changes never re-price old deals).
-- W0-E design origin: download/w0 design 0100 (validated SYNTAX_OK on PG16).
-- Dimensions per OD-03: Owner | Agent | Marketer | Organization |
--   Transaction Type | Property Type | Geography | Price Band | Campaign |
--   Referral  (all expressed in rules.matches JSONB; NULL/absent = wildcard)
-- Status vocabulary per OD-03: TBD | CONFIGURABLE | UNDECIDED (+ lifecycle).
-- ============================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS commission;

CREATE TABLE commission.rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    description text,
    party_role text NOT NULL,
    matches jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'UNDECIDED'
        CHECK (status IN ('TBD', 'CONFIGURABLE', 'UNDECIDED', 'ACTIVE', 'RETIRED')),
    created_by uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (jsonb_typeof(matches) = 'object')
);

CREATE TABLE commission.rule_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id uuid NOT NULL REFERENCES commission.rules(id) ON DELETE CASCADE,
    version integer NOT NULL CHECK (version > 0),
    param_config jsonb NOT NULL,
    param_status text NOT NULL DEFAULT 'UNDECIDED'
        CHECK (param_status IN ('TBD', 'CONFIGURABLE', 'UNDECIDED', 'ACTIVE')),
    effective_from timestamptz,
    effective_to timestamptz,
    created_by uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (rule_id, version),
    CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from)
);

CREATE TABLE commission.calculations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid REFERENCES marketplace.listings(id) ON DELETE SET NULL,
    contract_id uuid REFERENCES legal.contracts(id) ON DELETE SET NULL,
    party_user_id uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    party_organization_id uuid REFERENCES org.organizations(id) ON DELETE SET NULL,
    party_role text NOT NULL,
    rule_id uuid REFERENCES commission.rules(id) ON DELETE SET NULL,
    rule_version_id uuid NOT NULL REFERENCES commission.rule_versions(id) ON DELETE RESTRICT,
    rule_snapshot jsonb NOT NULL,
    input_snapshot jsonb NOT NULL,
    calc_mode text NOT NULL,
    calc_amount numeric(20, 4),
    currency_code char(3) NOT NULL REFERENCES platform.currencies(code),
    calculated_by uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    calculated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (calc_amount IS NULL OR calc_amount >= 0)
);

CREATE TABLE commission.calculation_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    calculation_id uuid NOT NULL REFERENCES commission.calculations(id) ON DELETE CASCADE,
    line_type text NOT NULL,
    amount numeric(20, 4) NOT NULL CHECK (amount >= 0),
    currency_code char(3) NOT NULL REFERENCES platform.currencies(code),
    meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE commission.settlements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    calculation_id uuid NOT NULL REFERENCES commission.calculations(id) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'SETTLED', 'CANCELLED', 'UNDECIDED')),
    amount numeric(20, 4) NOT NULL CHECK (amount >= 0),
    currency_code char(3) NOT NULL REFERENCES platform.currencies(code),
    settled_at timestamptz,
    settled_by uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    meta jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE commission.adjustments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    calculation_id uuid NOT NULL REFERENCES commission.calculations(id) ON DELETE RESTRICT,
    adjustment_type text NOT NULL CHECK (adjustment_type IN ('REVERSAL', 'CORRECTION')),
    amount numeric(20, 4) NOT NULL,
    currency_code char(3) NOT NULL REFERENCES platform.currencies(code),
    reason text NOT NULL,
    created_by uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (amount <> 0)
);

CREATE TABLE commission.payouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    beneficiary_user_id uuid REFERENCES iam.users(id) ON DELETE RESTRICT,
    beneficiary_organization_id uuid REFERENCES org.organizations(id) ON DELETE RESTRICT,
    amount numeric(20, 4) NOT NULL CHECK (amount > 0),
    currency_code char(3) NOT NULL REFERENCES platform.currencies(code),
    status text NOT NULL DEFAULT 'REQUESTED'
        CHECK (status IN ('REQUESTED', 'APPROVED', 'PAID', 'FAILED', 'CANCELLED', 'UNDECIDED')),
    paid_at timestamptz,
    reference text,
    meta jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK ((beneficiary_user_id IS NULL) <> (beneficiary_organization_id IS NULL))
);

-- --- Snapshot immutability (W0-E core guarantee) ---------------------------
CREATE OR REPLACE FUNCTION commission.forbid_mutation()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
    RAISE EXCEPTION 'IMMUTABLE_RECORD: % rows are snapshot-based and cannot be modified (OD-03/W0-E)', TG_TABLE_NAME;
END;
$fn$;

CREATE TRIGGER trg_rule_versions_immutable
    BEFORE UPDATE OR DELETE ON commission.rule_versions
    FOR EACH ROW EXECUTE FUNCTION commission.forbid_mutation();

CREATE TRIGGER trg_calculations_immutable
    BEFORE UPDATE OR DELETE ON commission.calculations
    FOR EACH ROW EXECUTE FUNCTION commission.forbid_mutation();

CREATE TRIGGER trg_calculation_lines_immutable
    BEFORE UPDATE OR DELETE ON commission.calculation_lines
    FOR EACH ROW EXECUTE FUNCTION commission.forbid_mutation();

-- Retiring a rule must not break historical calculations
CREATE OR REPLACE FUNCTION commission.guard_rule_delete()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
    IF EXISTS (SELECT 1 FROM commission.calculations c WHERE c.rule_id = OLD.id) THEN
        RAISE EXCEPTION 'RULE_IN_USE: rule has snapshot-backed calculations; use status=RETIRED instead';
    END IF;
    RETURN OLD;
END;
$fn$;

CREATE TRIGGER trg_rules_guard_delete
    BEFORE DELETE ON commission.rules
    FOR EACH ROW EXECUTE FUNCTION commission.guard_rule_delete();

CREATE TRIGGER trg_rules_updated_at BEFORE UPDATE ON commission.rules
    FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE INDEX ix_rule_versions_rule ON commission.rule_versions(rule_id, version DESC);
CREATE INDEX ix_calculations_party ON commission.calculations(party_user_id, party_organization_id);
CREATE INDEX ix_calculations_listing ON commission.calculations(listing_id);
CREATE INDEX ix_settlements_status ON commission.settlements(status, created_at);
CREATE INDEX ix_payouts_beneficiary ON commission.payouts(beneficiary_user_id, beneficiary_organization_id);

-- Engine ships EMPTY (OD-03): zero seeded rules, zero invented percentages.
-- Business numbers arrive only via owner-approved configuration (Gate 6 seed).

COMMIT;
