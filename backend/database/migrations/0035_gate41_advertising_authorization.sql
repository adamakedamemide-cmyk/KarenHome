-- ============================================================================
-- 0035_gate41_advertising_authorization.sql — Karen Home Gate 4.1
-- Phase E/H fix: advertising admin authorization + organization isolation.
-- Gate 4 registered gap: AdvertisingAdminController carried only
-- AccessTokenGuard (no permission model, no org scoping).
-- This migration adds the permission codes the API now enforces
-- (advertising.view / advertising.manage) via the 0030 effective-permission
-- engine. Structural only — zero commercial values (OD-03/OD-04).
-- ============================================================================

BEGIN;

INSERT INTO iam.permissions (code, description) VALUES
    ('advertising.view',   'View advertising campaigns and reports'),
    ('advertising.manage', 'Manage advertisers, campaigns, creatives, targets and budgets')
ON CONFLICT (code) DO NOTHING;

-- platform_admin keeps its "everything" invariant (same pattern as seed_reference).
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM iam.roles r JOIN iam.permissions p
  ON p.code IN ('advertising.view', 'advertising.manage')
WHERE r.code = 'platform_admin'
ON CONFLICT DO NOTHING;

-- org_admin: organization-scoped advertising administration.
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM iam.roles r JOIN iam.permissions p
  ON p.code IN ('advertising.view', 'advertising.manage')
WHERE r.code = 'org_admin'
ON CONFLICT DO NOTHING;

COMMIT;
