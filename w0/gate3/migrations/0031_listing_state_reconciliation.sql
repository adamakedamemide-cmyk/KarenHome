-- ============================================================================
-- 0031_listing_state_reconciliation.sql — Gate 3-DB
-- OD-09 (APPROVED): Canonical Listing State Machine remains the source of
--   truth; derived states are ONLY read-model projections unless a later
--   documented decision persists them. No derived state may change canonical
--   status independently of the state machine.
-- CR-02 resolution: 12-state model — additive enum values:
--   pending_verification, reserved, under_contract
--   (10 frozen + 3 additive = 13 incl. 'deleted' which was frozen-only).
-- ⚠ PG16: ALTER TYPE ... ADD VALUE may not be used by the same transaction —
--   enum additions run in AUTOCOMMIT sections separated from their consumers.
-- State-machine transition table: CONFIGURABLE rules consulted by trigger.
-- W0-H design origin (0103, SYNTAX_OK); behavior-tested in W0.
-- ============================================================================

-- ---------- Section 1: additive enum values (autocommit) --------------------
ALTER TYPE marketplace.listing_status ADD VALUE IF NOT EXISTS 'pending_verification';
ALTER TYPE marketplace.listing_status ADD VALUE IF NOT EXISTS 'reserved';
ALTER TYPE marketplace.listing_status ADD VALUE IF NOT EXISTS 'under_contract';

BEGIN;

-- ---------- Section 2: canonical transition rules (configurable matrix) -----
CREATE TABLE marketplace.listing_transition_rules (
    from_status marketplace.listing_status NOT NULL,
    to_status marketplace.listing_status NOT NULL,
    requires_verification boolean NOT NULL DEFAULT false,
    requires_payment_or_contract boolean NOT NULL DEFAULT false,
    allowed_roles jsonb NOT NULL DEFAULT '["any"]'::jsonb,
    PRIMARY KEY (from_status, to_status),
    CHECK (jsonb_typeof(allowed_roles) = 'array')
);

-- Canonical 12-state matrix (Master Prompt state machine; CONFIGURABLE):
INSERT INTO marketplace.listing_transition_rules
    (from_status, to_status, requires_verification, requires_payment_or_contract) VALUES
    ('draft',                'pending_verification', true,  false),
    ('draft',                'pending_moderation',   false, false),
    ('draft',                'archived',             false, false),
    ('pending_verification', 'pending_moderation',   false, false),
    ('pending_verification', 'rejected',             false, false),
    ('pending_verification', 'draft',                false, false),
    ('pending_moderation',   'published',            false, false),
    ('pending_moderation',   'rejected',             false, false),
    ('pending_moderation',   'draft',                false, false),
    ('published',            'paused',               false, false),
    ('published',            'reserved',             false, true),
    ('published',            'under_contract',       false, true),
    ('published',            'sold',                 false, true),
    ('published',            'rented',               false, true),
    ('published',            'expired',              false, false),
    ('published',            'archived',             false, false),
    ('paused',               'published',            false, false),
    ('paused',               'archived',             false, false),
    ('paused',               'expired',              false, false),
    ('reserved',             'under_contract',       false, true),
    ('reserved',             'published',            false, false),
    ('reserved',             'sold',                 false, true),
    ('reserved',             'rented',               false, true),
    ('reserved',             'archived',             false, false),
    ('under_contract',       'sold',                 false, false),
    ('under_contract',       'rented',               false, false),
    ('under_contract',       'reserved',             false, false),
    ('under_contract',       'archived',             false, false),
    ('expired',              'published',            false, false),
    ('expired',              'draft',                false, false),
    ('expired',              'archived',             false, false),
    ('rejected',             'draft',                false, false),
    ('rejected',             'archived',             false, false)
ON CONFLICT (from_status, to_status) DO NOTHING;

-- Terminal states: sold, rented, archived, deleted (no outgoing rows above).
-- deleted: reachable from any non-deleted state (cleanup path, frozen contract);
-- handled at function level below so the matrix stays business-only.

-- ---------- Section 3: unified DB-side transition guard ---------------------
-- G3 REAL FINDING: frozen base already hard-codes a 10-state matrix inside
-- marketplace.validate_listing_transition() (trigger trg_listing_status_transition).
-- Left in place it would reject every transition involving the additive states.
-- Per the OD-13 protocol (and errata 0024 precedent) the frozen function is
-- replaced via CREATE OR REPLACE in this numbered migration so the configurable
-- matrix above becomes the single source of truth.
CREATE OR REPLACE FUNCTION marketplace.validate_listing_transition()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
    IF NEW.status = OLD.status THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'deleted' THEN
        RAISE EXCEPTION 'Deleted listing % cannot transition to %', NEW.id, NEW.status;
    END IF;

    -- cleanup path: any non-deleted state may go to deleted (frozen contract)
    IF NEW.status <> 'deleted' AND NOT EXISTS (
        SELECT 1 FROM marketplace.listing_transition_rules r
         WHERE r.from_status = OLD.status
           AND r.to_status = NEW.status
    ) THEN
        RAISE EXCEPTION 'Invalid listing status transition: % -> % (canonical 12-state machine, OD-09)',
            OLD.status, NEW.status USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$fn$;

-- ---------- Section 4: derived read model (OD-09: projection ONLY) ----------
CREATE OR REPLACE VIEW marketplace.v_listing_derived_status AS
SELECT
    l.id AS listing_id,
    l.status AS canonical_status,
    CASE
        WHEN l.status = 'published'
             AND EXISTS (SELECT 1 FROM rental.leases le
                          WHERE le.source_listing_id = l.id
                            AND le.status = 'active')
            THEN 'reserved'
        WHEN l.status = 'published'
             AND EXISTS (SELECT 1 FROM rental.leases le
                          WHERE le.source_listing_id = l.id
                            AND le.status = 'active'
                            AND le.contract_id IS NOT NULL
                            AND EXISTS (SELECT 1 FROM legal.contracts c
                                         WHERE c.id = le.contract_id
                                           AND c.status = 'active'))
            THEN 'under_contract'
        ELSE 'none'
    END AS derived_state
FROM marketplace.listings l;

COMMIT;
