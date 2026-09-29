-- ============================================================================
-- 0030_iam_personal_scope_authorization.sql — Gate 3-DB
-- OD-08 (APPROVED): Two-layer authorization model.
--   Layer 1 — Personal Scope: user-owned resources. An Individual Owner must
--     NEVER be forced to create an Organization to manage their own assets.
--   Layer 2 — Organization Scope: membership + role + permission + assignment.
--   Applies to: Property | Listing | Lead | Contract | Payment | Commission |
--               Verification | Documents
--   UI visibility NEVER substitutes backend authorization.
-- W0-I design origin (0104, SYNTAX_OK); gap proven experimentally (IAM-14).
-- Design note: resource ownership already exists in frozen schema
--   (property.owners.user_id, listings.created_by_user_id) — this migration
--   adds the GRANT side (explicit personal permissions + listing assignments)
--   and a resolution function usable by services and by row-level policies.
-- ============================================================================
BEGIN;

CREATE TABLE iam.user_permission_grants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    permission_id uuid NOT NULL REFERENCES iam.permissions(id) ON DELETE CASCADE,
    source text NOT NULL DEFAULT 'DIRECT'
        CHECK (source IN ('DIRECT', 'PERSONAL_OWNERSHIP', 'DELEGATION')),
    resource_type text
        CHECK (resource_type IN ('property', 'listing', 'lead', 'contract', 'payment',
                                 'commission', 'verification', 'document')),
    resource_id uuid,
    granted_by uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    expires_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, permission_id, source, resource_type, resource_id)
);

CREATE TABLE marketplace.listing_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES marketplace.listings(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE RESTRICT,
    assignment_type text NOT NULL
        CHECK (assignment_type IN ('AGENT', 'MARKETER', 'SUPPORT', 'VIEWER')),
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
    granted_by uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    granted_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz,
    expires_at timestamptz,
    UNIQUE (listing_id, user_id, assignment_type),
    CHECK (revoked_at IS NULL OR status = 'REVOKED')
);

CREATE INDEX ix_user_permission_grants_user ON iam.user_permission_grants(user_id, permission_id);
CREATE INDEX ix_user_permission_grants_resource ON iam.user_permission_grants(resource_type, resource_id);
CREATE INDEX ix_listing_assignments_user ON marketplace.listing_assignments(user_id, status);

-- --- effective permission resolution (two-layer) ---------------------------
CREATE OR REPLACE FUNCTION iam.effective_permissions(
    p_user_id uuid,
    p_organization_id uuid DEFAULT NULL
)
RETURNS TABLE (permission_code text, source text)
LANGUAGE sql STABLE AS $fn$
    SELECT rp2.code, 'ORG_ROLE'::text
      FROM org.organization_members m
      JOIN org.member_roles mr ON mr.member_id = m.id
      JOIN iam.role_permissions rp ON rp.role_id = mr.role_id
      JOIN iam.permissions rp2 ON rp2.id = rp.permission_id
     WHERE m.user_id = p_user_id
       AND m.status = 'active'
       AND (p_organization_id IS NULL OR m.organization_id = p_organization_id)
    UNION
    SELECT p.code,
           CASE g.source
               WHEN 'PERSONAL_OWNERSHIP' THEN 'PERSONAL_OWNERSHIP'
               WHEN 'DELEGATION' THEN 'DELEGATION'
               ELSE 'DIRECT'
           END
      FROM iam.user_permission_grants g
      JOIN iam.permissions p ON p.id = g.permission_id
     WHERE g.user_id = p_user_id
       AND (g.expires_at IS NULL OR g.expires_at > now())
    UNION
    SELECT 'listing.manage'::text, 'LISTING_ASSIGNMENT'::text
      FROM marketplace.listing_assignments la
     WHERE la.user_id = p_user_id
       AND la.status = 'ACTIVE'
       AND (la.expires_at IS NULL OR la.expires_at > now())
       AND p_organization_id IS NULL;
$fn$;

-- Personal scope check: is the user an owner (user-level) of a property?
CREATE OR REPLACE FUNCTION iam.is_property_owner(
    p_user_id uuid,
    p_property_id uuid
)
RETURNS boolean LANGUAGE sql STABLE AS $fn$
    SELECT EXISTS (
        SELECT 1 FROM property.owners o
         WHERE o.property_id = p_property_id
           AND o.user_id = p_user_id
    );
$fn$;

-- Personal scope check: is the user the creating user of a listing?
CREATE OR REPLACE FUNCTION iam.is_listing_owner(
    p_user_id uuid,
    p_listing_id uuid
)
RETURNS boolean LANGUAGE sql STABLE AS $fn$
    SELECT EXISTS (
        SELECT 1 FROM marketplace.listings l
         WHERE l.id = p_listing_id
           AND l.created_by_user_id = p_user_id
    );
$fn$;

COMMIT;
