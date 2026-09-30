-- ============================================================================
-- 0039_gate51_projects_domain.sql — Gate 5.1 Phase D (Projects Domain Closure)
-- ADDITIVE ONLY (Schema Diff invariant: REMOVED = 0).
--   1. configurable status vocabularies + DB-enforced transitions for projects
--      and units (status columns are text in the frozen base schema — this
--      migration makes them governed, not free-form)
--   2. updated_at touch triggers
--   3. access-path indexes
--   4. permission catalog seeds: project.view / project.manage
-- NOTE: no business values are invented — the vocabularies below are the
-- minimal documented lifecycle; extending them is an INSERT, not a migration.
-- ============================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Status vocabularies + transition rules
-- ---------------------------------------------------------------------------
CREATE TABLE project.status_values (
    entity text NOT NULL,
    status text NOT NULL,
    PRIMARY KEY (entity, status)
);

INSERT INTO project.status_values (entity, status) VALUES
    ('project', 'planned'),
    ('project', 'pre_sale'),
    ('project', 'under_construction'),
    ('project', 'completed'),
    ('project', 'suspended'),
    ('project', 'cancelled'),
    ('unit',    'available'),
    ('unit',    'reserved'),
    ('unit',    'sold'),
    ('unit',    'unavailable')
ON CONFLICT DO NOTHING;

CREATE TABLE project.status_transitions (
    entity text NOT NULL,
    from_status text NOT NULL,
    to_status text NOT NULL,
    PRIMARY KEY (entity, from_status, to_status)
);

INSERT INTO project.status_transitions (entity, from_status, to_status) VALUES
    ('project', 'planned',             'pre_sale'),
    ('project', 'planned',             'under_construction'),
    ('project', 'planned',             'cancelled'),
    ('project', 'pre_sale',            'under_construction'),
    ('project', 'pre_sale',            'suspended'),
    ('project', 'pre_sale',            'cancelled'),
    ('project', 'under_construction',  'suspended'),
    ('project', 'under_construction',  'completed'),
    ('project', 'under_construction',  'cancelled'),
    ('project', 'suspended',           'under_construction'),
    ('project', 'suspended',           'cancelled'),
    ('unit',    'available',           'reserved'),
    ('unit',    'available',           'unavailable'),
    ('unit',    'reserved',            'sold'),
    ('unit',    'reserved',            'available'),
    ('unit',    'reserved',            'unavailable'),
    ('unit',    'sold',                'available') -- documented unwind path
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION project.enforce_status_transition()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
    IF TG_TABLE_NAME = 'projects' THEN
        IF NOT EXISTS (SELECT 1 FROM project.status_values WHERE entity = 'project' AND status = NEW.status) THEN
            RAISE EXCEPTION 'PROJECT_UNKNOWN_STATUS: % is not a registered project status', NEW.status;
        END IF;
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            IF NOT EXISTS (
                SELECT 1 FROM project.status_transitions t
                 WHERE t.entity = 'project' AND t.from_status = OLD.status AND t.to_status = NEW.status
            ) THEN
                RAISE EXCEPTION 'PROJECT_INVALID_TRANSITION: % -> %', OLD.status, NEW.status;
            END IF;
            NEW.updated_at = now();
        END IF;
    ELSIF TG_TABLE_NAME = 'units' THEN
        IF NOT EXISTS (SELECT 1 FROM project.status_values WHERE entity = 'unit' AND status = NEW.status) THEN
            RAISE EXCEPTION 'UNIT_UNKNOWN_STATUS: % is not a registered unit status', NEW.status;
        END IF;
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            IF NOT EXISTS (
                SELECT 1 FROM project.status_transitions t
                 WHERE t.entity = 'unit' AND t.from_status = OLD.status AND t.to_status = NEW.status
            ) THEN
                RAISE EXCEPTION 'UNIT_INVALID_TRANSITION: % -> %', OLD.status, NEW.status;
            END IF;
            NEW.updated_at = now();
        END IF;
    END IF;
    RETURN NEW;
END;
$fn$;

CREATE TRIGGER trg_projects_status
    BEFORE UPDATE OF status ON project.projects
    FOR EACH ROW EXECUTE FUNCTION project.enforce_status_transition();

CREATE TRIGGER trg_units_status
    BEFORE UPDATE OF status ON project.units
    FOR EACH ROW EXECUTE FUNCTION project.enforce_status_transition();

-- ---------------------------------------------------------------------------
-- 2. updated_at touch triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION project.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$fn$;

CREATE TRIGGER trg_projects_touch
    BEFORE UPDATE ON project.projects
    FOR EACH ROW EXECUTE FUNCTION project.touch_updated_at();

CREATE TRIGGER trg_units_touch
    BEFORE UPDATE ON project.units
    FOR EACH ROW EXECUTE FUNCTION project.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Access-path indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_projects_developer ON project.projects (developer_organization_id);
CREATE INDEX idx_project_buildings_project ON project.project_buildings (project_id);
CREATE INDEX idx_project_floors_building ON project.project_floors (building_id);
CREATE INDEX idx_units_project ON project.units (project_id, status);
CREATE INDEX idx_units_building ON project.units (building_id, status);
CREATE INDEX idx_unit_prices_unit ON project.unit_prices (unit_id, valid_from DESC);
CREATE INDEX idx_payment_plans_project ON project.payment_plans (project_id) WHERE active;

-- ---------------------------------------------------------------------------
-- 4. Permission catalog seeds (additive)
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, description) VALUES
    ('project.view',   'Read developer projects, buildings, floors and units'),
    ('project.manage', 'Create and manage developer projects and their hierarchy')
ON CONFLICT (code) DO NOTHING;

COMMIT;
