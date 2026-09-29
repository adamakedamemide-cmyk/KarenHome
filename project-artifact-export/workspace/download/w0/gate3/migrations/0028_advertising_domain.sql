-- ============================================================================
-- 0028_advertising_domain.sql — Gate 3-DB
-- OD-04 (APPROVED): Advertising platform confirmed as independent domain.
--   MVP placements: Homepage | Search | Listing Detail | Agency | Agent |
--                   Project | Geo Pages (+ Category/Dashboard reserved slots)
--   NO Auction / Real-Time Bidding / Ad Exchange in MVP (no bid tables by
--   design; requires separate formal approval later).
--   NO invented pricing: CPM/CPC amounts ship NULL/UNDECIDED only.
-- W0-F design origin: download/w0 design 0101 (SYNTAX_OK on PG16).
-- Fraud/abuse control (W0-F requirement): hashed IPs, UA hash, validity flags,
--   fraud scores, per-session impression dedup guard index.
-- ============================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS advertising;

CREATE TABLE advertising.advertisers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES org.organizations(id) ON DELETE RESTRICT,
    name text NOT NULL,
    contact jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'BLOCKED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (jsonb_typeof(contact) = 'object')
);

CREATE TABLE advertising.campaign_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    advertiser_id uuid NOT NULL REFERENCES advertising.advertisers(id) ON DELETE CASCADE,
    name text NOT NULL,
    objective text,
    status text NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE advertising.campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    advertiser_id uuid NOT NULL REFERENCES advertising.advertisers(id) ON DELETE RESTRICT,
    campaign_group_id uuid REFERENCES advertising.campaign_groups(id) ON DELETE SET NULL,
    name text NOT NULL,
    status text NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'ENDED', 'REJECTED')),
    start_at timestamptz,
    end_at timestamptz,
    pricing_model text NOT NULL DEFAULT 'UNDECIDED'
        CHECK (pricing_model IN ('CPM', 'CPC', 'FIXED', 'UNDECIDED', 'TBD', 'CONFIGURABLE')),
    price_amount numeric(20, 4)
        CHECK (price_amount IS NULL OR price_amount >= 0),
    currency_code char(3) REFERENCES platform.currencies(code),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (end_at IS NULL OR start_at IS NULL OR end_at > start_at),
    CHECK ((pricing_model IN ('CPM', 'CPC', 'FIXED')) = (price_amount IS NOT NULL AND currency_code IS NOT NULL))
);

CREATE TABLE advertising.ad_slots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    placement text NOT NULL
        CHECK (placement IN ('HOMEPAGE', 'SEARCH_RESULTS', 'LISTING_DETAIL', 'AGENCY_PAGE',
                             'AGENT_PAGE', 'PROJECT_PAGE', 'GEO_PAGE', 'CATEGORY_PAGE', 'DASHBOARD')),
    device text NOT NULL DEFAULT 'ALL' CHECK (device IN ('ALL', 'DESKTOP', 'MOBILE')),
    format text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE advertising.creatives (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES advertising.campaigns(id) ON DELETE CASCADE,
    name text NOT NULL,
    media_asset_id uuid REFERENCES marketplace.media_assets(id) ON DELETE SET NULL,
    target_url text NOT NULL,
    status text NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED')),
    checksum text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE advertising.targets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES advertising.campaigns(id) ON DELETE CASCADE,
    dimension text NOT NULL
        CHECK (dimension IN ('COUNTRY', 'CITY', 'DISTRICT', 'PAGE_TYPE', 'PROPERTY_TYPE',
                             'AUDIENCE_SEGMENT', 'DEVICE', 'LANGUAGE', 'TIME_WINDOW')),
    operator text NOT NULL DEFAULT 'IN' CHECK (operator IN ('IN', 'NOT_IN', 'EQUALS')),
    value jsonb NOT NULL,
    weight integer NOT NULL DEFAULT 100 CHECK (weight BETWEEN 0 AND 100),
    UNIQUE (campaign_id, dimension)
);

CREATE TABLE advertising.impressions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES advertising.campaigns(id) ON DELETE CASCADE,
    creative_id uuid NOT NULL REFERENCES advertising.creatives(id) ON DELETE CASCADE,
    slot_id uuid NOT NULL REFERENCES advertising.ad_slots(id) ON DELETE RESTRICT,
    session_hash text NOT NULL,
    ip_hash text,
    user_agent_hash text,
    locale text,
    page_type text,
    geo_node_id uuid REFERENCES geo.nodes(id) ON DELETE SET NULL,
    served_at timestamptz NOT NULL DEFAULT now(),
    is_counted boolean NOT NULL DEFAULT true,
    fraud_score numeric(5, 4) CHECK (fraud_score IS NULL OR fraud_score BETWEEN 0 AND 1)
);

CREATE TABLE advertising.clicks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    impression_id uuid NOT NULL REFERENCES advertising.impressions(id) ON DELETE CASCADE,
    clicked_at timestamptz NOT NULL DEFAULT now(),
    ip_hash text,
    user_agent_hash text,
    referer text,
    is_valid boolean NOT NULL DEFAULT true,
    fraud_score numeric(5, 4) CHECK (fraud_score IS NULL OR fraud_score BETWEEN 0 AND 1),
    reject_reason text
);

CREATE TABLE advertising.budgets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES advertising.campaigns(id) ON DELETE CASCADE,
    budget_type text NOT NULL CHECK (budget_type IN ('TOTAL', 'DAILY', 'MONTHLY')),
    limit_amount numeric(20, 4) NOT NULL CHECK (limit_amount > 0),
    currency_code char(3) NOT NULL REFERENCES platform.currencies(code),
    spent_amount numeric(20, 4) NOT NULL DEFAULT 0 CHECK (spent_amount >= 0),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (campaign_id, budget_type),
    CHECK (spent_amount <= limit_amount)
);

CREATE TABLE advertising.billing (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    advertiser_id uuid NOT NULL REFERENCES advertising.advertisers(id) ON DELETE RESTRICT,
    period_start date NOT NULL,
    period_end date NOT NULL,
    status text NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'ISSUED', 'PAID', 'VOID', 'UNDECIDED')),
    amount numeric(20, 4) CHECK (amount IS NULL OR amount >= 0),
    currency_code char(3) REFERENCES platform.currencies(code),
    invoice_reference text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (period_end > period_start)
);

CREATE TABLE advertising.reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES advertising.campaigns(id) ON DELETE CASCADE,
    report_date date NOT NULL,
    impressions bigint NOT NULL DEFAULT 0 CHECK (impressions >= 0),
    clicks bigint NOT NULL DEFAULT 0 CHECK (clicks >= 0),
    valid_clicks bigint NOT NULL DEFAULT 0 CHECK (valid_clicks >= 0),
    spend numeric(20, 4) CHECK (spend IS NULL OR spend >= 0),
    currency_code char(3) REFERENCES platform.currencies(code),
    UNIQUE (campaign_id, report_date)
);

-- Fraud control: dedup guard — one counted impression per (session, creative, minute bucket)
-- NB: date_trunc over timestamptz is timezone-dependent (not IMMUTABLE);
-- cast to UTC wall-clock so the index expression is immutable.
CREATE UNIQUE INDEX uq_impression_dedup
    ON advertising.impressions(session_hash, creative_id,
        date_trunc('minute', served_at AT TIME ZONE 'UTC'))
    WHERE is_counted;

CREATE INDEX ix_impressions_campaign_served ON advertising.impressions(campaign_id, served_at DESC);
CREATE INDEX ix_clicks_impression ON advertising.clicks(impression_id);
CREATE INDEX ix_clicks_validity ON advertising.clicks(is_valid, clicked_at DESC);
CREATE INDEX ix_targets_campaign ON advertising.targets(campaign_id);
CREATE INDEX ix_campaigns_status_dates ON advertising.campaigns(status, start_at, end_at);

CREATE TRIGGER trg_advertisers_updated_at BEFORE UPDATE ON advertising.advertisers
    FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();
CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON advertising.campaigns
    FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();
CREATE TRIGGER trg_budgets_updated_at BEFORE UPDATE ON advertising.budgets
    FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

-- Budget overspend guard (concurrency-safe via row lock on UPDATE)
CREATE OR REPLACE FUNCTION advertising.guard_budget_limit()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
    IF NEW.spent_amount > NEW.limit_amount THEN
        RAISE EXCEPTION 'BUDGET_EXCEEDED: campaign % budget % exceeded', NEW.campaign_id, NEW.budget_type;
    END IF;
    RETURN NEW;
END;
$fn$;

CREATE TRIGGER trg_budgets_limit BEFORE UPDATE OR INSERT ON advertising.budgets
    FOR EACH ROW EXECUTE FUNCTION advertising.guard_budget_limit();

-- MVP slots seeded structurally (no commercial values — OD-04)
INSERT INTO advertising.ad_slots (code, placement, device, format) VALUES
    ('home_hero',          'HOMEPAGE',       'ALL',     'banner'),
    ('home_sidebar',       'HOMEPAGE',       'ALL',     'banner'),
    ('search_top',         'SEARCH_RESULTS', 'ALL',     'native'),
    ('search_inline',      'SEARCH_RESULTS', 'ALL',     'native'),
    ('listing_detail_top', 'LISTING_DETAIL', 'ALL',     'banner'),
    ('agency_profile',     'AGENCY_PAGE',    'ALL',     'banner'),
    ('agent_profile',      'AGENT_PAGE',     'ALL',     'banner'),
    ('project_page',       'PROJECT_PAGE',   'ALL',     'banner'),
    ('geo_page_top',       'GEO_PAGE',       'ALL',     'banner'),
    ('category_top',       'CATEGORY_PAGE',  'ALL',     'banner'),
    ('dashboard_side',     'DASHBOARD',      'ALL',     'banner')
ON CONFLICT (code) DO NOTHING;

COMMIT;
