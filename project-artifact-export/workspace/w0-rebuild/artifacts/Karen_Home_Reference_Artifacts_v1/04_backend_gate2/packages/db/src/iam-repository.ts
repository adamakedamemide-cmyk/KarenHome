import type { PoolClient } from 'pg';
import { PostgresDatabase, type QueryExecutor } from './postgres-database';

export interface IamUser {
  id: string;
  status: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  locale: string;
  timezone: string;
  createdAt: Date;
}

export interface IamCredential {
  id: string;
  userId: string;
  passwordHash: string | null;
  passkeyCredentialId: string | null;
  passkeyPublicKey: string | null;
}

export interface RotatedSessionResult {
  userId: string;
  reused: boolean;
}

export class IamRepository {
  constructor(private readonly db: PostgresDatabase) {}

  async findUserByEmail(email: string): Promise<IamUser | null> {
    const result = await this.db.query<IamUserRow>(
      `SELECT u.id, u.status::text, u.first_name, u.last_name, u.display_name,
              u.locale, u.timezone, u.created_at
         FROM iam.users u
         JOIN iam.user_emails ue ON ue.user_id = u.id
        WHERE ue.email = $1::citext
          AND u.deleted_at IS NULL
        LIMIT 1`,
      [email],
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async findUserById(userId: string, executor: QueryExecutor = this.db): Promise<IamUser | null> {
    const result = await executor.query<IamUserRow>(
      `SELECT id, status::text, first_name, last_name, display_name,
              locale, timezone, created_at
         FROM iam.users
        WHERE id = $1::uuid
          AND deleted_at IS NULL
        LIMIT 1`,
      [userId],
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async findCredentialByUserId(userId: string): Promise<IamCredential | null> {
    const result = await this.db.query<IamCredentialRow>(
      `SELECT id, user_id, password_hash, passkey_credential_id, passkey_public_key
         FROM iam.credentials
        WHERE user_id = $1::uuid
          AND password_hash IS NOT NULL
        ORDER BY created_at ASC
        LIMIT 1`,
      [userId],
    );
    return result.rows[0] ? mapCredential(result.rows[0]) : null;
  }

  async createPasswordUser(input: {
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    locale?: string;
    timezone?: string;
  }): Promise<IamUser> {
    return this.db.transaction(async (client) => {
      const userResult = await client.query<IamUserRow>(
        `INSERT INTO iam.users (status, first_name, last_name, display_name, locale, timezone)
         VALUES ('pending', $1, $2, $3, $4, $5)
         RETURNING id, status::text, first_name, last_name, display_name, locale, timezone, created_at`,
        [input.firstName ?? null, input.lastName ?? null, input.displayName ?? null, input.locale ?? 'en', input.timezone ?? 'UTC'],
      );
      const user = userResult.rows[0];
      await client.query(
        `INSERT INTO iam.user_emails (user_id, email, is_primary, is_verified)
         VALUES ($1, lower($2)::citext, true, false)`,
        [user.id, input.email],
      );
      await client.query(`INSERT INTO iam.credentials (user_id, password_hash) VALUES ($1, $2)`, [user.id, input.passwordHash]);
      return mapUser(user);
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.db.query(`UPDATE iam.users SET last_login_at = now(), updated_at = now() WHERE id = $1::uuid`, [userId]);
  }

  async createSession(input: {
    userId: string;
    refreshTokenHash: string;
    deviceId?: string;
    ip?: string;
    userAgent?: string;
    expiresAt: Date;
  }, executor: QueryExecutor = this.db): Promise<string> {
    const result = await executor.query<{ id: string }>(
      `INSERT INTO iam.user_sessions (user_id, refresh_token_hash, device_id, ip, user_agent, expires_at)
       VALUES ($1::uuid, $2, $3, $4::inet, $5, $6)
       RETURNING id`,
      [input.userId, input.refreshTokenHash, input.deviceId ?? null, input.ip ?? null, input.userAgent ?? null, input.expiresAt],
    );
    return result.rows[0].id;
  }

  async findSessionByRefreshHash(hash: string): Promise<{ id: string; userId: string; expiresAt: Date; revokedAt: Date | null } | null> {
    const result = await this.db.query<{ id: string; user_id: string; expires_at: Date; revoked_at: Date | null }>(
      `SELECT id, user_id, expires_at, revoked_at FROM iam.user_sessions WHERE refresh_token_hash = $1 LIMIT 1`,
      [hash],
    );
    const row = result.rows[0];
    return row ? { id: row.id, userId: row.user_id, expiresAt: row.expires_at, revokedAt: row.revoked_at } : null;
  }

  async rotateRefreshSessionWithToken(input: {
    currentHash: string;
    newHash: string;
    userId: string;
    deviceId?: string;
    ip?: string;
    userAgent?: string;
    expiresAt: Date;
  }, context: { requestId?: string } = {}): Promise<{ reused: boolean }> {
    return this.db.transaction(async (client) => {
      const result = await client.query<{ id: string; user_id: string; expires_at: Date; revoked_at: Date | null; user_status: string }>(
        `SELECT s.id, s.user_id, s.expires_at, s.revoked_at, u.status::text AS user_status
           FROM iam.user_sessions s
           JOIN iam.users u ON u.id = s.user_id
          WHERE s.refresh_token_hash = $1
          FOR UPDATE OF s`,
        [input.currentHash],
      );
      const session = result.rows[0];
      if (!session) return { reused: false };
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

  async revokeSessionByRefreshHash(hash: string): Promise<void> {
    await this.db.query(`UPDATE iam.user_sessions SET revoked_at = now() WHERE refresh_token_hash = $1 AND revoked_at IS NULL`, [hash]);
  }

  async listPermissionCodesForUser(userId: string, organizationId?: string): Promise<string[]> {
    if (!organizationId) return [];
    const result = await this.db.query<{ code: string }>(
      `SELECT DISTINCT p.code
         FROM iam.permissions p
         JOIN iam.role_permissions rp ON rp.permission_id = p.id
         JOIN org.member_roles mr ON mr.role_id = rp.role_id
         JOIN org.organization_members om ON om.id = mr.member_id
         JOIN org.organizations o ON o.id = om.organization_id
        WHERE om.user_id = $1::uuid
          AND om.organization_id = $2::uuid
          AND om.status = 'active'
          AND o.status = 'active'`,
      [userId, organizationId],
    );
    return result.rows.map((r) => r.code);
  }

  async isActiveOrganizationMember(userId: string, organizationId: string): Promise<boolean> {
    const result = await this.db.query<{ ok: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM org.organization_members om
         JOIN org.organizations o ON o.id = om.organization_id
         WHERE om.user_id = $1::uuid AND om.organization_id = $2::uuid AND om.status = 'active' AND o.status = 'active'
      ) AS ok`,
      [userId, organizationId],
    );
    return result.rows[0]?.ok ?? false;
  }
}

type IamUserRow = {
  id: string; status: string; first_name: string | null; last_name: string | null;
  display_name: string | null; locale: string; timezone: string; created_at: Date;
};

type IamCredentialRow = {
  id: string; user_id: string; password_hash: string | null;
  passkey_credential_id: string | null; passkey_public_key: string | null;
};

function mapUser(row: IamUserRow): IamUser {
  return { id: row.id, status: row.status, firstName: row.first_name, lastName: row.last_name, displayName: row.display_name, locale: row.locale, timezone: row.timezone, createdAt: row.created_at };
}

function mapCredential(row: IamCredentialRow): IamCredential {
  return { id: row.id, userId: row.user_id, passwordHash: row.password_hash, passkeyCredentialId: row.passkey_credential_id, passkeyPublicKey: row.passkey_public_key };
}
