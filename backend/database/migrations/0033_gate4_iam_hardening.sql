-- ============================================================================
-- 0033_gate4_iam_hardening.sql — Karen Home Gate 4
-- Additive IAM hardening (mandate §15/§16):
--   email verification, phone OTP, password reset, MFA (TOTP) foundation,
--   OAuth account linking (google/facebook), login attempt telemetry.
-- ============================================================================

BEGIN;

-- Email address verification tokens (hashed at rest; single consumption)
CREATE TABLE IF NOT EXISTS iam.email_verification_tokens (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    token_hash   text NOT NULL UNIQUE,
    expires_at   timestamptz NOT NULL,
    consumed_at  timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    created_ip   inet
);
CREATE INDEX IF NOT EXISTS ix_evt_user ON iam.email_verification_tokens (user_id, created_at DESC);

-- Phone OTP verification (code hashed; attempts capped; resend-throttled in app)
CREATE TABLE IF NOT EXISTS iam.phone_verification_tokens (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    phone_e164   text NOT NULL,
    code_hash    text NOT NULL,
    attempts     integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
    expires_at   timestamptz NOT NULL,
    consumed_at  timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_pvt_user_phone
    ON iam.phone_verification_tokens (user_id, phone_e164, created_at DESC);

-- Password reset tokens (hashed at rest; single consumption)
CREATE TABLE IF NOT EXISTS iam.password_reset_tokens (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    token_hash   text NOT NULL UNIQUE,
    expires_at   timestamptz NOT NULL,
    consumed_at  timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    created_ip   inet
);
CREATE INDEX IF NOT EXISTS ix_prt_user ON iam.password_reset_tokens (user_id, created_at DESC);

-- MFA foundation: TOTP factors. Secret stored encrypted (AES-256-GCM, app-side key).
CREATE TABLE IF NOT EXISTS iam.mfa_factors (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    factor_type   text NOT NULL CHECK (factor_type IN ('totp')),
    secret_cipher text NOT NULL,
    status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','active','disabled')),
    verified_at   timestamptz,
    last_used_at  timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_mfa_active_totp
    ON iam.mfa_factors (user_id)
    WHERE factor_type = 'totp' AND status = 'active';

-- OAuth provider linking (provider abstraction — no hard-coded credentials)
CREATE TABLE IF NOT EXISTS iam.oauth_accounts (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    provider         text NOT NULL CHECK (provider IN ('google','facebook')),
    provider_user_id text NOT NULL,
    provider_email   citext,
    created_at       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_user_id)
);
CREATE INDEX IF NOT EXISTS ix_oauth_user ON iam.oauth_accounts (user_id);

-- Login attempt telemetry (anti-bot velocity + credential stuffing signals)
CREATE TABLE IF NOT EXISTS iam.login_attempts (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email_tried citext,
    user_id    uuid,
    success    boolean NOT NULL,
    ip         inet,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_login_attempts_ip ON iam.login_attempts (ip, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_login_attempts_email ON iam.login_attempts (email_tried, created_at DESC);

COMMIT;
