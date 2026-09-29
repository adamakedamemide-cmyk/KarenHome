-- ============================================================================
-- seed_reference.sql — Gate 3-DB (idempotent)
-- OD-03/OD-04 constraints: NO commission percentages, NO subscription prices,
-- NO advertising rates are seeded. Only structural reference data:
-- permission catalog + role mapping (authorization is a structural contract).
-- ============================================================================
BEGIN;

INSERT INTO iam.permissions (code, description) VALUES
    -- property
    ('property.create',      'Create property records'),
    ('property.read',        'Read property records'),
    ('property.update',      'Update property records'),
    ('property.delete',      'Delete property records'),
    ('property.manage_owners','Assign/remove property owners'),
    -- listing
    ('listing.create',       'Create listings'),
    ('listing.read',         'Read listings'),
    ('listing.update',       'Update listings'),
    ('listing.submit',       'Submit listing for verification/moderation'),
    ('listing.publish',      'Publish listings'),
    ('listing.moderate',     'Moderate listings (approve/reject)'),
    ('listing.archive',      'Archive listings'),
    -- lead / contract / payment / commission / verification / document
    ('lead.read',            'Read leads'),
    ('lead.update',          'Update leads'),
    ('contract.manage',      'Manage contracts'),
    ('payment.manage',       'Manage payments'),
    ('commission.view',      'View commission data'),
    ('commission.manage',    'Manage commission rules and settlements'),
    ('verification.request', 'Request verification'),
    ('verification.decide',  'Approve/reject verification cases'),
    ('document.upload',      'Upload documents'),
    ('document.read',        'Read documents'),
    -- organization
    ('org.manage',           'Manage organization settings and members'),
    ('org.members.manage',   'Invite/remove organization members'),
    -- platform
    ('platform.admin',       'Full platform administration'),
    ('platform.settings',    'Manage platform settings and feature flags')
ON CONFLICT (code) DO NOTHING;

-- platform_admin: everything
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM iam.roles r CROSS JOIN iam.permissions p
WHERE r.code = 'platform_admin'
ON CONFLICT DO NOTHING;

-- org_admin: organization + property/listing/lead/contract/payment scope
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM iam.roles r JOIN iam.permissions p
  ON p.code IN ('property.create','property.read','property.update','property.delete','property.manage_owners',
                'listing.create','listing.read','listing.update','listing.submit','listing.publish','listing.archive',
                'lead.read','lead.update','contract.manage','payment.manage','commission.view','commission.manage',
                'verification.request','document.upload','document.read','org.manage','org.members.manage')
WHERE r.code = 'org_admin'
ON CONFLICT DO NOTHING;

-- agent: assigned listing/lead work
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM iam.roles r JOIN iam.permissions p
  ON p.code IN ('property.read','listing.create','listing.read','listing.update','listing.submit',
                'lead.read','lead.update','document.upload','document.read','commission.view')
WHERE r.code = 'agent'
ON CONFLICT DO NOTHING;

-- developer_manager
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM iam.roles r JOIN iam.permissions p
  ON p.code IN ('property.read','listing.read','listing.create','listing.update','contract.manage','payment.manage')
WHERE r.code = 'developer_manager'
ON CONFLICT DO NOTHING;

-- support_agent: read-mostly
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM iam.roles r JOIN iam.permissions p
  ON p.code IN ('property.read','listing.read','lead.read','lead.update','document.read','verification.request')
WHERE r.code = 'support_agent'
ON CONFLICT DO NOTHING;

-- moderator
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM iam.roles r JOIN iam.permissions p
  ON p.code IN ('listing.read','listing.moderate','listing.archive','verification.decide','document.read')
WHERE r.code = 'moderator'
ON CONFLICT DO NOTHING;

-- user: personal scope basics
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM iam.roles r JOIN iam.permissions p
  ON p.code IN ('property.create','property.read','listing.create','listing.read','listing.submit',
                'document.upload','document.read','verification.request')
WHERE r.code = 'user'
ON CONFLICT DO NOTHING;

COMMIT;
