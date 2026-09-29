BEGIN;
CREATE INDEX IF NOT EXISTS ix_listings_property_status ON marketplace.listings(property_id, status);
CREATE INDEX IF NOT EXISTS ix_listings_org_status ON marketplace.listings(managing_organization_id, status);
CREATE INDEX IF NOT EXISTS ix_outbox_unpublished ON audit.outbox_events(published_at, occurred_at);
CREATE INDEX IF NOT EXISTS ix_audit_actor_created ON audit.logs(actor_user_id, created_at DESC);
COMMIT;
