-- ============================================================================
-- 0032_gate4_platform_infrastructure.sql — Karen Home Gate 4
-- Additive-only platform infrastructure:
--   S1  platform.jobs / platform.job_runs          (worker job queue + DLQ + runs audit)
--   S2  legal.user_agreement_acceptances           (publication policy prerequisite)
--   S3  notification.quiet_hours / org prefs       (notification preference engine)
--   S4  platform.risk_events / platform.blocks     (anti-bot foundation + is_blocked fn)
--   S5  marketplace.listing_search(_docs)          (search index state + PG FTS store)
--   S6  marketplace.media_assets pipeline columns  (media worker state, additive ALTER)
-- Provenance: Gate 4 mandate §12/§10/§11/§16/§13/§6. No business values invented.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- S1. Job queue (retry/backoff/dead-letter/idempotency/observability)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform.jobs (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    queue         text        NOT NULL,
    job_type      text        NOT NULL,
    payload       jsonb       NOT NULL DEFAULT '{}'::jsonb,
    status        text        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','running','succeeded','failed','dead','cancelled')),
    attempts      integer     NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    max_attempts  integer     NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
    run_at        timestamptz NOT NULL DEFAULT now(),
    locked_at     timestamptz,
    locked_by     text,
    last_error    text,
    dedup_key     text,
    created_by    text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    finished_at   timestamptz
);

-- Idempotency: at most one live job per dedup key.
CREATE UNIQUE INDEX IF NOT EXISTS uq_jobs_dedup_live
    ON platform.jobs (dedup_key)
    WHERE dedup_key IS NOT NULL AND status IN ('pending','running');

-- Claim path: SKIP LOCKED consumers scan pending per queue ordered by run_at.
CREATE INDEX IF NOT EXISTS ix_jobs_claimable
    ON platform.jobs (queue, run_at)
    WHERE status = 'pending';

-- Stale-runner requeue sweep.
CREATE INDEX IF NOT EXISTS ix_jobs_stale
    ON platform.jobs (locked_at)
    WHERE status = 'running';

-- Dead-letter inspection.
CREATE INDEX IF NOT EXISTS ix_jobs_dead
    ON platform.jobs (queue, updated_at DESC)
    WHERE status = 'dead';

CREATE TABLE IF NOT EXISTS platform.job_runs (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id       uuid NOT NULL REFERENCES platform.jobs(id) ON DELETE CASCADE,
    worker_id    text NOT NULL,
    attempt      integer NOT NULL,
    status       text NOT NULL CHECK (status IN ('started','succeeded','failed')),
    error        text,
    duration_ms  integer CHECK (duration_ms IS NULL OR duration_ms >= 0),
    started_at   timestamptz NOT NULL DEFAULT now(),
    finished_at  timestamptz
);
CREATE INDEX IF NOT EXISTS ix_job_runs_job ON platform.job_runs (job_id, started_at DESC);

-- ---------------------------------------------------------------------------
-- S2. User agreement acceptances (Listing Publication Policy input)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS legal.user_agreement_acceptances (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    agreement_code    text NOT NULL,
    agreement_version integer NOT NULL CHECK (agreement_version > 0),
    accepted_at       timestamptz NOT NULL DEFAULT now(),
    ip                inet,
    request_id        uuid,
    UNIQUE (user_id, agreement_code, agreement_version)
);
CREATE INDEX IF NOT EXISTS ix_agreement_acceptances_user
    ON legal.user_agreement_acceptances (user_id, agreement_code);

-- ---------------------------------------------------------------------------
-- S3. Notification preference engine extension (quiet hours + org prefs)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification.quiet_hours (
    user_id    uuid PRIMARY KEY REFERENCES iam.users(id) ON DELETE CASCADE,
    start_time time NOT NULL,
    end_time   time NOT NULL,
    timezone   text NOT NULL DEFAULT 'UTC',
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification.organization_preferences (
    organization_id   uuid NOT NULL REFERENCES org.organizations(id) ON DELETE CASCADE,
    notification_type text NOT NULL,
    channel           text NOT NULL CHECK (channel IN ('in_app','email','sms','push')),
    enabled           boolean NOT NULL DEFAULT true,
    PRIMARY KEY (organization_id, notification_type, channel)
);

-- ---------------------------------------------------------------------------
-- S4. Anti-bot foundation (risk events, temporary blocks, is_blocked())
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform.risk_events (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_type text NOT NULL CHECK (subject_type IN ('ip','user','email','phone','session')),
    subject_key  text NOT NULL,
    signal       text NOT NULL,
    score        numeric(5,4) NOT NULL CHECK (score >= 0 AND score <= 1),
    metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_risk_events_subject
    ON platform.risk_events (subject_type, subject_key, created_at DESC);

CREATE TABLE IF NOT EXISTS platform.blocks (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_type text NOT NULL CHECK (subject_type IN ('ip','user','email','phone')),
    subject_key  text NOT NULL,
    reason       text NOT NULL,
    blocked_by   text NOT NULL DEFAULT 'anti_bot',
    expires_at   timestamptz NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_blocks_active
    ON platform.blocks (subject_type, subject_key, expires_at DESC);

CREATE OR REPLACE FUNCTION platform.is_blocked(
    p_subject_type text,
    p_subject_key  text
) RETURNS boolean
LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM platform.blocks
        WHERE subject_type = p_subject_type
          AND subject_key  = p_subject_key
          AND expires_at > now()
    )
$$;

-- ---------------------------------------------------------------------------
-- S5. Search: index state + PostgreSQL FTS document store
-- (OpenSearch adapter consumes the same state; this store is the verified
--  PG engine of Gate 4 per mandate §11 — eventually consistent via workers.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketplace.listing_search (
    listing_id      uuid PRIMARY KEY REFERENCES marketplace.listings(id) ON DELETE CASCADE,
    doc             jsonb NOT NULL DEFAULT '{}'::jsonb,
    status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','indexed','failed')),
    attempts        integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    last_error      text,
    indexed_at      timestamptz,
    source_event_at timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_listing_search_status
    ON marketplace.listing_search (status, updated_at);

CREATE TABLE IF NOT EXISTS marketplace.listing_search_docs (
    listing_id       uuid PRIMARY KEY REFERENCES marketplace.listings(id) ON DELETE CASCADE,
    status           marketplace.listing_status NOT NULL,
    transaction_type marketplace.transaction_type NOT NULL,
    title_text       text NOT NULL DEFAULT '',
    description_text text NOT NULL DEFAULT '',
    price            numeric(20,4) NOT NULL CHECK (price >= 0),
    currency_code    char(3) NOT NULL REFERENCES platform.currencies(code),
    price_period     marketplace.price_period NOT NULL,
    property_type_code text,
    geo_node_id      uuid REFERENCES geo.nodes(id),
    location_point   geography(Point,4326),
    published_at     timestamptz,
    tsv              tsvector GENERATED ALWAYS AS
                     (to_tsvector('simple', coalesce(title_text,'') || ' ' || coalesce(description_text,''))) STORED
);
CREATE INDEX IF NOT EXISTS ix_lsd_fts ON marketplace.listing_search_docs USING GIN (tsv);
CREATE INDEX IF NOT EXISTS ix_lsd_filters ON marketplace.listing_search_docs (status, transaction_type, price);
CREATE INDEX IF NOT EXISTS ix_lsd_geo ON marketplace.listing_search_docs USING GIST (location_point);
CREATE INDEX IF NOT EXISTS ix_lsd_published ON marketplace.listing_search_docs (published_at DESC);

-- ---------------------------------------------------------------------------
-- S6. Media pipeline state (additive ALTER — documented per CHANGE_CONTROL)
-- ---------------------------------------------------------------------------
ALTER TABLE marketplace.media_assets
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','processing','ready','failed','quarantined')),
    ADD COLUMN IF NOT EXISTS scan_status text NOT NULL DEFAULT 'pending'
        CHECK (scan_status IN ('pending','clean','infected','skipped')),
    ADD COLUMN IF NOT EXISTS scan_provider text,
    ADD COLUMN IF NOT EXISTS original_object_key text,
    ADD COLUMN IF NOT EXISTS is_original_retained boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS processing_error text,
    ADD COLUMN IF NOT EXISTS duplicate_of uuid REFERENCES marketplace.media_assets(id);

CREATE INDEX IF NOT EXISTS ix_media_status_pending
    ON marketplace.media_assets (status)
    WHERE status <> 'ready';
CREATE INDEX IF NOT EXISTS ix_media_phash
    ON marketplace.media_assets (perceptual_hash)
    WHERE perceptual_hash IS NOT NULL;

COMMIT;
