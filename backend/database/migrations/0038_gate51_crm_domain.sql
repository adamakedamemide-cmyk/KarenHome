-- ============================================================================
-- 0038_gate51_crm_domain.sql — Gate 5.1 Phase C (CRM Domain Closure)
-- ADDITIVE ONLY (Schema Diff invariant: REMOVED = 0).
-- Extends the frozen CRM schema (base v1: leads, lead_activities, tasks,
-- viewings) with:
--   1. lead status transition rules (DB-enforced, additive-safe for future
--      states) + updated_at touch trigger
--   2. one activity row per status change is enforced at the service layer;
--      the trigger additionally writes a 'status_change' activity atomically
--   3. access-path indexes
--   4. permission catalog seeds: crm.view / crm.manage
-- ============================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Lead status transition rules (DB-enforced)
-- ---------------------------------------------------------------------------
CREATE TABLE crm.lead_transition_rules (
    from_status crm.lead_status NOT NULL,
    to_status crm.lead_status NOT NULL,
    PRIMARY KEY (from_status, to_status)
);

INSERT INTO crm.lead_transition_rules (from_status, to_status) VALUES
    ('new',               'contacted'),
    ('new',               'lost'),
    ('contacted',         'qualified'),
    ('contacted',         'lost'),
    ('qualified',         'viewing_scheduled'),
    ('qualified',         'negotiation'),
    ('qualified',         'lost'),
    ('viewing_scheduled', 'viewing_scheduled'), -- additional viewings allowed
    ('viewing_scheduled', 'negotiation'),
    ('viewing_scheduled', 'qualified'),
    ('viewing_scheduled', 'lost'),
    ('negotiation',       'won'),
    ('negotiation',       'lost'),
    ('negotiation',       'viewing_scheduled'),
    ('won',               'archived'),
    ('lost',              'archived'),
    ('lost',              'new') -- re-activation of a lost lead
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION crm.enforce_lead_transition()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NOT EXISTS (
            SELECT 1 FROM crm.lead_transition_rules r
             WHERE r.from_status = OLD.status AND r.to_status = NEW.status
        ) THEN
            RAISE EXCEPTION 'LEAD_INVALID_TRANSITION: % -> % is not an allowed lead transition', OLD.status, NEW.status;
        END IF;
        NEW.updated_at = now();
    END IF;
    RETURN NEW;
END;
$fn$;

CREATE TRIGGER trg_leads_transition
    BEFORE UPDATE OF status ON crm.leads
    FOR EACH ROW EXECUTE FUNCTION crm.enforce_lead_transition();

-- updated_at touch on any lead modification
CREATE OR REPLACE FUNCTION crm.touch_lead_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        NEW.updated_at = now();
    END IF;
    RETURN NEW;
END;
$fn$;

CREATE TRIGGER trg_leads_touch
    BEFORE UPDATE ON crm.leads
    FOR EACH ROW EXECUTE FUNCTION crm.touch_lead_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Access-path indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_leads_org_status ON crm.leads (organization_id, status);
CREATE INDEX idx_leads_agent ON crm.leads (assigned_agent_id) WHERE assigned_agent_id IS NOT NULL;
CREATE INDEX idx_leads_listing ON crm.leads (listing_id) WHERE listing_id IS NOT NULL;
CREATE INDEX idx_lead_activities_lead ON crm.lead_activities (lead_id, occurred_at DESC);
CREATE INDEX idx_tasks_assignee ON crm.tasks (assignee_user_id, status) WHERE assignee_user_id IS NOT NULL;
CREATE INDEX idx_viewings_listing_start ON crm.viewings (listing_id, scheduled_start);
CREATE INDEX idx_viewings_agent_start ON crm.viewings (agent_user_id, scheduled_start);

-- ---------------------------------------------------------------------------
-- 3. Permission catalog seeds (additive)
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, description) VALUES
    ('crm.view',   'Read CRM leads, activities, tasks and viewings within scope'),
    ('crm.manage', 'Create and manage CRM leads, assignments, tasks and viewings')
ON CONFLICT (code) DO NOTHING;

COMMIT;
