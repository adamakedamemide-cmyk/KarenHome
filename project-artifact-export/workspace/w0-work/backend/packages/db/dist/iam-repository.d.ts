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
export declare class IamRepository {
    private readonly db;
    constructor(db: PostgresDatabase);
    findUserByEmail(email: string): Promise<IamUser | null>;
    findPrimaryEmail(userId: string): Promise<string | null>;
    findUserById(userId: string, executor?: QueryExecutor): Promise<IamUser | null>;
    findCredentialByUserId(userId: string): Promise<IamCredential | null>;
    createPasswordUser(input: {
        email: string;
        passwordHash: string;
        firstName?: string | undefined;
        lastName?: string | undefined;
        displayName?: string | undefined;
        locale?: string | undefined;
        timezone?: string | undefined;
    }): Promise<IamUser>;
    updateLastLogin(userId: string): Promise<void>;
    createSession(input: {
        userId: string;
        refreshTokenHash: string;
        deviceId?: string | undefined;
        ip?: string | undefined;
        userAgent?: string | undefined;
        expiresAt: Date;
    }, executor?: QueryExecutor): Promise<string>;
    findSessionByRefreshHash(hash: string): Promise<{
        id: string;
        userId: string;
        expiresAt: Date;
        revokedAt: Date | null;
    } | null>;
    rotateRefreshSessionWithToken(input: {
        currentHash: string;
        newHash: string;
        userId: string;
        deviceId?: string | undefined;
        ip?: string | undefined;
        userAgent?: string | undefined;
        expiresAt: Date;
    }, context?: {
        requestId?: string | undefined;
    }): Promise<{
        reused: boolean;
    }>;
    revokeSessionByRefreshHash(hash: string): Promise<void>;
    /**
     * Gate 4 — resolves permissions through the 0030 effective-permission
     * engine: organization roles OR personal-scope grants OR listing
     * assignments (the latter only in the personal, org-less scope).
     */
    listPermissionCodesForUser(userId: string, organizationId?: string): Promise<string[]>;
    isActiveOrganizationMember(userId: string, organizationId: string): Promise<boolean>;
}
