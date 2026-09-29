BEGIN;
ALTER TABLE audit.outbox_events ADD COLUMN IF NOT EXISTS locked_at timestamptz;
ALTER TABLE audit.outbox_events ADD COLUMN IF NOT EXISTS locked_by text;
CREATE INDEX IF NOT EXISTS ix_outbox_claimable ON audit.outbox_events(published_at, locked_at, occurred_at);
COMMIT;
