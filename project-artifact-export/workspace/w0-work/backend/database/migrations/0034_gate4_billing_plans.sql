-- ============================================================================
-- 0034_gate4_billing_plans.sql — Karen Home Gate 4
-- Subscription plan versioning + entitlements (mandate §14).
-- Plan/PlanVersion/Entitlement/SubscriptionEvent. Existing billing.subscriptions
-- is extended additively with plan_version_id. Historical subscriptions are
-- never mutated by future plan versions (version + events discipline).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS billing.plans (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code        text NOT NULL UNIQUE,
    name        text NOT NULL,
    description text,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing.plan_versions (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id        uuid NOT NULL REFERENCES billing.plans(id) ON DELETE CASCADE,
    version        integer NOT NULL CHECK (version > 0),
    entitlements   jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(entitlements) = 'object'),
    effective_from timestamptz NOT NULL,
    effective_to   timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (plan_id, version),
    CHECK (effective_to IS NULL OR effective_to > effective_from)
);
CREATE INDEX IF NOT EXISTS ix_plan_versions_plan ON billing.plan_versions (plan_id, version DESC);

CREATE TABLE IF NOT EXISTS billing.entitlements (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_version_id uuid NOT NULL REFERENCES billing.plan_versions(id) ON DELETE CASCADE,
    code            text NOT NULL,
    limit_value     numeric(20,4) CHECK (limit_value IS NULL OR limit_value >= 0),
    config          jsonb NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (plan_version_id, code)
);

CREATE TABLE IF NOT EXISTS billing.subscription_events (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id uuid NOT NULL REFERENCES billing.subscriptions(id) ON DELETE CASCADE,
    event_type      text NOT NULL,
    payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_subscription_events_sub
    ON billing.subscription_events (subscription_id, created_at DESC);

-- Additive link from existing frozen subscription table to plan versions.
ALTER TABLE billing.subscriptions
    ADD COLUMN IF NOT EXISTS plan_version_id uuid REFERENCES billing.plan_versions(id);

CREATE INDEX IF NOT EXISTS ix_subscriptions_active
    ON billing.subscriptions (status, current_period_end);

COMMIT;
