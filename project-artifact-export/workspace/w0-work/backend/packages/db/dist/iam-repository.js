"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IamRepository = void 0;
class IamRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async findUserByEmail(email) {
        const result = await this.db.query(`SELECT u.id, u.status::text, u.first_name, u.last_name, u.display_name,
              u.locale, u.timezone, u.created_at
         FROM iam.users u
         JOIN iam.user_emails ue ON ue.user_id = u.id
        WHERE ue.email = $1::citext
          AND u.deleted_at IS NULL
        LIMIT 1`, [email]);
        return result.rows[0] ? mapUser(result.rows[0]) : null;
    }
    async findPrimaryEmail(userId) {
        const r = await this.db.query(`SELECT email::text AS email FROM iam.user_emails WHERE user_id = $1::uuid AND is_primary = true LIMIT 1`, [userId]);
        return r.rows[0]?.email ?? null;
    }
    async findUserById(userId, executor = this.db) {
        const result = await executor.query(`SELECT id, status::text, first_name, last_name, display_name,
              locale, timezone, created_at
         FROM iam.users
        WHERE id = $1::uuid
          AND deleted_at IS NULL
        LIMIT 1`, [userId]);
        return result.rows[0] ? mapUser(result.rows[0]) : null;
    }
    async findCredentialByUserId(userId) {
        const result = await this.db.query(`SELECT id, user_id, password_hash, passkey_credential_id, passkey_public_key
         FROM iam.credentials
        WHERE user_id = $1::uuid
          AND password_hash IS NOT NULL
        ORDER BY created_at ASC
        LIMIT 1`, [userId]);
        return result.rows[0] ? mapCredential(result.rows[0]) : null;
    }
    async createPasswordUser(input) {
        return this.db.transaction(async (client) => {
            const userResult = await client.query(`INSERT INTO iam.users (status, first_name, last_name, display_name, locale, timezone)
         VALUES ('pending', $1, $2, $3, $4, $5)
         RETURNING id, status::text, first_name, last_name, display_name, locale, timezone, created_at`, [input.firstName ?? null, input.lastName ?? null, input.displayName ?? null, input.locale ?? 'en', input.timezone ?? 'UTC']);
            const user = userResult.rows[0];
            if (!user)
                throw new Error('USER_CREATE_FAILED');
            await client.query(`INSERT INTO iam.user_emails (user_id, email, is_primary, is_verified)
         VALUES ($1, lower($2)::citext, true, false)`, [user.id, input.email]);
            await client.query(`INSERT INTO iam.credentials (user_id, password_hash) VALUES ($1, $2)`, [user.id, input.passwordHash]);
            return mapUser(user);
        });
    }
    async updateLastLogin(userId) {
        await this.db.query(`UPDATE iam.users SET last_login_at = now(), updated_at = now() WHERE id = $1::uuid`, [userId]);
    }
    async createSession(input, executor = this.db) {
        const result = await executor.query(`INSERT INTO iam.user_sessions (user_id, refresh_token_hash, device_id, ip, user_agent, expires_at)
       VALUES ($1::uuid, $2, $3, $4::inet, $5, $6)
       RETURNING id`, [input.userId, input.refreshTokenHash, input.deviceId ?? null, input.ip ?? null, input.userAgent ?? null, input.expiresAt]);
        const created = result.rows[0];
        if (!created)
            throw new Error('SESSION_CREATE_FAILED');
        return created.id;
    }
    async findSessionByRefreshHash(hash) {
        const result = await this.db.query(`SELECT id, user_id, expires_at, revoked_at FROM iam.user_sessions WHERE refresh_token_hash = $1 LIMIT 1`, [hash]);
        const row = result.rows[0];
        return row ? { id: row.id, userId: row.user_id, expiresAt: row.expires_at, revokedAt: row.revoked_at } : null;
    }
    async rotateRefreshSessionWithToken(input, context = {}) {
        return this.db.transaction(async (client) => {
            const result = await client.query(`SELECT s.id, s.user_id, s.expires_at, s.revoked_at, u.status::text AS user_status
           FROM iam.user_sessions s
           JOIN iam.users u ON u.id = s.user_id
          WHERE s.refresh_token_hash = $1
          FOR UPDATE OF s`, [input.currentHash]);
            const session = result.rows[0];
            if (!session)
                return { reused: false };
            if (session.revoked_at) {
                await client.query(`UPDATE iam.user_sessions SET revoked_at = COALESCE(revoked_at, now()) WHERE user_id = $1::uuid AND revoked_at IS NULL`, [session.user_id]);
                await client.query(`INSERT INTO audit.logs(actor_user_id, action, entity_type, entity_id, after_data, request_id) VALUES ($1::uuid, 'refresh_token_reuse_detected', 'iam.user_session', $2::uuid, $3::jsonb, $4::uuid)`, [session.user_id, session.id, JSON.stringify({ reason: 'revoked_refresh_token_reused' }), context.requestId ?? null]);
                return { reused: true };
            }
            if (session.user_id !== input.userId || session.expires_at.getTime() <= Date.now() || session.user_status !== 'active') {
                await client.query(`UPDATE iam.user_sessions SET revoked_at = now() WHERE id = $1::uuid`, [session.id]);
                return { reused: false };
            }
            await client.query(`UPDATE iam.user_sessions SET revoked_at = now() WHERE id = $1::uuid`, [session.id]);
            await this.createSession({ userId: input.userId, refreshTokenHash: input.newHash, deviceId: input.deviceId, ip: input.ip, userAgent: input.userAgent, expiresAt: input.expiresAt }, client);
            return { reused: false };
        }, { requestId: context.requestId });
    }
    async revokeSessionByRefreshHash(hash) {
        await this.db.query(`UPDATE iam.user_sessions SET revoked_at = now() WHERE refresh_token_hash = $1 AND revoked_at IS NULL`, [hash]);
    }
    /**
     * Gate 4 — resolves permissions through the 0030 effective-permission
     * engine: organization roles OR personal-scope grants OR listing
     * assignments (the latter only in the personal, org-less scope).
     */
    async listPermissionCodesForUser(userId, organizationId) {
        const result = await this.db.query(`SELECT DISTINCT permission_code FROM iam.effective_permissions($1::uuid, $2::uuid)`, [userId, organizationId ?? null]);
        return result.rows.map((r) => r.permission_code);
    }
    async isActiveOrganizationMember(userId, organizationId) {
        const result = await this.db.query(`SELECT EXISTS (
        SELECT 1 FROM org.organization_members om
         JOIN org.organizations o ON o.id = om.organization_id
         WHERE om.user_id = $1::uuid AND om.organization_id = $2::uuid AND om.status = 'active' AND o.status = 'active'
      ) AS ok`, [userId, organizationId]);
        return result.rows[0]?.ok ?? false;
    }
}
exports.IamRepository = IamRepository;
function mapUser(row) {
    return { id: row.id, status: row.status, firstName: row.first_name, lastName: row.last_name, displayName: row.display_name, locale: row.locale, timezone: row.timezone, createdAt: row.created_at };
}
function mapCredential(row) {
    return { id: row.id, userId: row.user_id, passwordHash: row.password_hash, passkeyCredentialId: row.passkey_credential_id, passkeyPublicKey: row.passkey_public_key };
}
