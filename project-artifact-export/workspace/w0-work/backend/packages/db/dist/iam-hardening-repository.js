"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IamHardeningRepository = void 0;
/**
 * Gate 4 IAM hardening persistence: verification tokens (email/phone/password
 * reset — hashed at rest), MFA (TOTP) factors, OAuth account links and
 * login-attempt telemetry feeding the anti-bot foundation (§15/§16).
 */
class IamHardeningRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    // --- Email verification -------------------------------------------------
    async createEmailVerification(input, executor = this.db) {
        await executor.query(`INSERT INTO iam.email_verification_tokens(user_id, token_hash, expires_at, created_ip)
       VALUES ($1::uuid, $2, $3::timestamptz, $4::inet)`, [input.userId, input.tokenHash, input.expiresAt, input.createdIp ?? null]);
    }
    async latestEmailVerificationSentAt(userId) {
        const r = await this.db.query(`SELECT created_at FROM iam.email_verification_tokens WHERE user_id = $1::uuid ORDER BY created_at DESC LIMIT 1`, [userId]);
        return r.rows[0]?.created_at ?? null;
    }
    /** Consume a verification token exactly once (idempotency by consumed_at). */
    async consumeEmailVerification(tokenHash) {
        return this.db.transaction(async (client) => {
            const r = await client.query(`SELECT id, user_id, consumed_at, expires_at FROM iam.email_verification_tokens
         WHERE token_hash = $1 FOR UPDATE`, [tokenHash]);
            const row = r.rows[0];
            if (!row)
                return 'NOT_FOUND';
            if (row.consumed_at)
                return 'CONSUMED';
            if (row.expires_at.getTime() < Date.now())
                return 'EXPIRED';
            await client.query(`UPDATE iam.email_verification_tokens SET consumed_at = now() WHERE id = $1::uuid`, [row.id]);
            return { userId: row.user_id };
        });
    }
    async markPrimaryEmailVerified(userId, executor = this.db) {
        await executor.query(`UPDATE iam.user_emails SET is_verified = true, verified_at = COALESCE(verified_at, now())
       WHERE user_id = $1::uuid AND is_primary = true`, [userId]);
        await executor.query(`UPDATE iam.users SET status = 'active' WHERE id = $1::uuid AND status = 'pending'`, [userId]);
    }
    // --- Phone OTP -----------------------------------------------------------
    async createPhoneVerification(input, executor = this.db) {
        await executor.query(`INSERT INTO iam.phone_verification_tokens(user_id, phone_e164, code_hash, expires_at)
       VALUES ($1::uuid, $2, $3, $4::timestamptz)`, [input.userId, input.phoneE164, input.codeHash, input.expiresAt]);
    }
    async verifyPhoneOtp(input) {
        return this.db.transaction(async (client) => {
            const r = await client.query(`SELECT id, attempts, max_attempts, consumed_at, expires_at, code_hash FROM iam.phone_verification_tokens
         WHERE user_id = $1::uuid AND phone_e164 = $2
         ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [input.userId, input.phoneE164]);
            const row = r.rows[0];
            if (!row)
                return 'NOT_FOUND';
            if (row.consumed_at)
                return 'CONSUMED';
            if (row.expires_at.getTime() < Date.now())
                return 'EXPIRED';
            if (row.attempts >= row.max_attempts)
                return 'TOO_MANY_ATTEMPTS';
            if (row.code_hash !== input.codeHash) {
                await client.query(`UPDATE iam.phone_verification_tokens SET attempts = attempts + 1 WHERE id = $1::uuid`, [row.id]);
                return 'MISMATCH';
            }
            await client.query(`UPDATE iam.phone_verification_tokens SET consumed_at = now() WHERE id = $1::uuid`, [row.id]);
            await client.query(`UPDATE iam.user_phones SET is_verified = true, verified_at = COALESCE(verified_at, now())
         WHERE user_id = $1::uuid AND phone_e164 = $2`, [input.userId, input.phoneE164]);
            return 'OK';
        });
    }
    async addPhoneIfAbsent(userId, phoneE164, executor = this.db) {
        await executor.query(`INSERT INTO iam.user_phones(user_id, phone_e164, is_primary, is_verified)
       SELECT $1::uuid, $2, false, false
       WHERE NOT EXISTS (SELECT 1 FROM iam.user_phones WHERE user_id = $1::uuid AND phone_e164 = $2)`, [userId, phoneE164]);
    }
    // --- Password reset -------------------------------------------------------
    async createPasswordReset(input, executor = this.db) {
        await executor.query(`INSERT INTO iam.password_reset_tokens(user_id, token_hash, expires_at, created_ip)
       VALUES ($1::uuid, $2, $3::timestamptz, $4::inet)`, [input.userId, input.tokenHash, input.expiresAt, input.createdIp ?? null]);
    }
    async consumePasswordReset(tokenHash) {
        return this.db.transaction(async (client) => {
            const r = await client.query(`SELECT id, user_id, consumed_at, expires_at FROM iam.password_reset_tokens
         WHERE token_hash = $1 FOR UPDATE`, [tokenHash]);
            const row = r.rows[0];
            if (!row)
                return 'NOT_FOUND';
            if (row.consumed_at)
                return 'CONSUMED';
            if (row.expires_at.getTime() < Date.now())
                return 'EXPIRED';
            await client.query(`UPDATE iam.password_reset_tokens SET consumed_at = now() WHERE id = $1::uuid`, [row.id]);
            return { userId: row.user_id };
        });
    }
    async updatePasswordHash(userId, passwordHash) {
        await this.db.transaction(async (client) => {
            await client.query(`UPDATE iam.credentials SET password_hash = $2, last_password_change_at = now() WHERE user_id = $1::uuid`, [userId, passwordHash]);
            await client.query(`UPDATE iam.user_sessions SET revoked_at = now() WHERE user_id = $1::uuid AND revoked_at IS NULL`, [userId]);
        });
    }
    // --- MFA (TOTP foundation) ------------------------------------------------
    async upsertPendingMfaFactor(userId, secretCipher, executor = this.db) {
        const r = await executor.query(`INSERT INTO iam.mfa_factors(user_id, factor_type, secret_cipher, status)
       VALUES ($1::uuid, 'totp', $2, 'pending')
       ON CONFLICT (user_id) WHERE factor_type = 'totp' AND status = 'active'
       DO NOTHING
       RETURNING id`, [userId, secretCipher]);
        const inserted = r.rows[0]?.id;
        if (inserted)
            return inserted;
        // No active factor → replace any pending/disabled one atomically.
        return this.db.transaction(async (client) => {
            await client.query(`DELETE FROM iam.mfa_factors WHERE user_id = $1::uuid AND status <> 'active'`, [userId]);
            const ins = await client.query(`INSERT INTO iam.mfa_factors(user_id, factor_type, secret_cipher, status)
         VALUES ($1::uuid, 'totp', $2, 'pending') RETURNING id`, [userId, secretCipher]);
            const id = ins.rows[0]?.id;
            if (!id)
                throw new Error('MFA_FACTOR_CREATE_FAILED');
            return id;
        });
    }
    async findMfaFactor(factorId, userId) {
        const r = await this.db.query(`SELECT id, user_id, factor_type, secret_cipher, status, verified_at FROM iam.mfa_factors
       WHERE id = $1::uuid AND user_id = $2::uuid`, [factorId, userId]);
        const row = r.rows[0];
        if (!row)
            return null;
        return { id: row.id, userId: row.user_id, factorType: 'totp', secretCipher: row.secret_cipher, status: row.status, verifiedAt: row.verified_at };
    }
    async findPendingMfaFactor(userId) {
        const r = await this.db.query(`SELECT id, user_id, secret_cipher FROM iam.mfa_factors
       WHERE user_id = $1::uuid AND factor_type = 'totp' AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`, [userId]);
        const row = r.rows[0];
        if (!row)
            return null;
        return { id: row.id, userId: row.user_id, factorType: 'totp', secretCipher: row.secret_cipher, status: 'pending', verifiedAt: null };
    }
    async findActiveMfaFactor(userId) {
        const r = await this.db.query(`SELECT id, user_id, secret_cipher, verified_at FROM iam.mfa_factors
       WHERE user_id = $1::uuid AND factor_type = 'totp' AND status = 'active'`, [userId]);
        const row = r.rows[0];
        if (!row)
            return null;
        return { id: row.id, userId: row.user_id, factorType: 'totp', secretCipher: row.secret_cipher, status: 'active', verifiedAt: row.verified_at };
    }
    async activateMfaFactor(factorId) {
        await this.db.query(`UPDATE iam.mfa_factors SET status = 'active', verified_at = now(), updated_at = now()
       WHERE id = $1::uuid AND status = 'pending'`, [factorId]);
    }
    async disableMfaFactor(userId, factorId) {
        await this.db.query(`UPDATE iam.mfa_factors SET status = 'disabled', updated_at = now()
       WHERE id = $1::uuid AND user_id = $2::uuid AND status = 'active'`, [factorId, userId]);
    }
    async touchMfaUsed(factorId) {
        await this.db.query(`UPDATE iam.mfa_factors SET last_used_at = now() WHERE id = $1::uuid`, [factorId]);
    }
    // --- OAuth account links ---------------------------------------------------
    async findOAuthIdentity(provider, providerUserId) {
        const r = await this.db.query(`SELECT id, user_id, provider, provider_user_id, provider_email::text AS provider_email
       FROM iam.oauth_accounts WHERE provider = $1 AND provider_user_id = $2`, [provider, providerUserId]);
        const row = r.rows[0];
        if (!row)
            return null;
        return { id: row.id, userId: row.user_id, provider: row.provider, providerUserId: row.provider_user_id, providerEmail: row.provider_email };
    }
    async linkOAuthIdentity(input, executor = this.db) {
        await executor.query(`INSERT INTO iam.oauth_accounts(user_id, provider, provider_user_id, provider_email)
       VALUES ($1::uuid, $2, $3, $4::citext)
       ON CONFLICT (provider, provider_user_id) DO NOTHING`, [input.userId, input.provider, input.providerUserId, input.providerEmail ?? null]);
    }
    // --- Login attempt telemetry (anti-bot input) --------------------------------
    async recordLoginAttempt(input, executor = this.db) {
        await executor.query(`INSERT INTO iam.login_attempts(email_tried, user_id, success, ip, user_agent)
       VALUES ($1::citext, $2::uuid, $3, $4::inet, $5)`, [input.email ?? null, input.userId ?? null, input.success, input.ip ?? null, input.userAgent ?? null]);
    }
    async countRecentFailuresByEmail(email, sinceSeconds) {
        const r = await this.db.query(`SELECT count(*)::text AS count FROM iam.login_attempts
       WHERE email_tried = $1::citext AND success = false AND created_at > now() - make_interval(secs => $2)`, [email, sinceSeconds]);
        return Number(r.rows[0]?.count ?? '0');
    }
    async countRecentFailuresByIp(ip, sinceSeconds) {
        const r = await this.db.query(`SELECT count(*)::text AS count FROM iam.login_attempts
       WHERE ip = $1::inet AND success = false AND created_at > now() - make_interval(secs => $2)`, [ip, sinceSeconds]);
        return Number(r.rows[0]?.count ?? '0');
    }
    // --- Sessions ---------------------------------------------------------------
    async listActiveSessions(userId) {
        const r = await this.db.query(`SELECT id, user_id, device_id, expires_at, created_at FROM iam.user_sessions
       WHERE user_id = $1::uuid AND revoked_at IS NULL AND expires_at > now()
       ORDER BY created_at DESC`, [userId]);
        return r.rows.map((row) => ({ id: row.id, userId: row.user_id, deviceId: row.device_id, expiresAt: row.expires_at, createdAt: row.created_at }));
    }
    async revokeAllSessions(userId, executor = this.db) {
        const r = await executor.query(`UPDATE iam.user_sessions SET revoked_at = now() WHERE user_id = $1::uuid AND revoked_at IS NULL`, [userId]);
        return r.rowCount ?? 0;
    }
}
exports.IamHardeningRepository = IamHardeningRepository;
