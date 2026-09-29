import { PostgresDatabase, type QueryExecutor } from './postgres-database';
export interface MfaFactor {
    id: string;
    userId: string;
    factorType: 'totp';
    secretCipher: string;
    status: 'pending' | 'active' | 'disabled';
    verifiedAt: Date | null;
}
export interface OAuthAccount {
    id: string;
    userId: string;
    provider: 'google' | 'facebook';
    providerUserId: string;
    providerEmail: string | null;
}
export interface ActiveSession {
    id: string;
    userId: string;
    deviceId: string | null;
    expiresAt: Date;
    createdAt: Date;
}
/**
 * Gate 4 IAM hardening persistence: verification tokens (email/phone/password
 * reset — hashed at rest), MFA (TOTP) factors, OAuth account links and
 * login-attempt telemetry feeding the anti-bot foundation (§15/§16).
 */
export declare class IamHardeningRepository {
    private readonly db;
    constructor(db: PostgresDatabase);
    createEmailVerification(input: {
        userId: string;
        tokenHash: string;
        expiresAt: Date;
        createdIp?: string | undefined;
    }, executor?: QueryExecutor): Promise<void>;
    latestEmailVerificationSentAt(userId: string): Promise<Date | null>;
    /** Consume a verification token exactly once (idempotency by consumed_at). */
    consumeEmailVerification(tokenHash: string): Promise<{
        userId: string;
    } | 'NOT_FOUND' | 'CONSUMED' | 'EXPIRED'>;
    markPrimaryEmailVerified(userId: string, executor?: QueryExecutor): Promise<void>;
    createPhoneVerification(input: {
        userId: string;
        phoneE164: string;
        codeHash: string;
        expiresAt: Date;
    }, executor?: QueryExecutor): Promise<void>;
    verifyPhoneOtp(input: {
        userId: string;
        phoneE164: string;
        codeHash: string;
    }): Promise<'OK' | 'NOT_FOUND' | 'EXPIRED' | 'CONSUMED' | 'TOO_MANY_ATTEMPTS' | 'MISMATCH'>;
    addPhoneIfAbsent(userId: string, phoneE164: string, executor?: QueryExecutor): Promise<void>;
    createPasswordReset(input: {
        userId: string;
        tokenHash: string;
        expiresAt: Date;
        createdIp?: string | undefined;
    }, executor?: QueryExecutor): Promise<void>;
    consumePasswordReset(tokenHash: string): Promise<{
        userId: string;
    } | 'NOT_FOUND' | 'CONSUMED' | 'EXPIRED'>;
    updatePasswordHash(userId: string, passwordHash: string): Promise<void>;
    upsertPendingMfaFactor(userId: string, secretCipher: string, executor?: QueryExecutor): Promise<string>;
    findMfaFactor(factorId: string, userId: string): Promise<MfaFactor | null>;
    findPendingMfaFactor(userId: string): Promise<MfaFactor | null>;
    findActiveMfaFactor(userId: string): Promise<MfaFactor | null>;
    activateMfaFactor(factorId: string): Promise<void>;
    disableMfaFactor(userId: string, factorId: string): Promise<void>;
    touchMfaUsed(factorId: string): Promise<void>;
    findOAuthIdentity(provider: string, providerUserId: string): Promise<OAuthAccount | null>;
    linkOAuthIdentity(input: {
        userId: string;
        provider: string;
        providerUserId: string;
        providerEmail?: string | undefined;
    }, executor?: QueryExecutor): Promise<void>;
    recordLoginAttempt(input: {
        email?: string | undefined;
        userId?: string | undefined;
        success: boolean;
        ip?: string | undefined;
        userAgent?: string | undefined;
    }, executor?: QueryExecutor): Promise<void>;
    countRecentFailuresByEmail(email: string, sinceSeconds: number): Promise<number>;
    countRecentFailuresByIp(ip: string, sinceSeconds: number): Promise<number>;
    listActiveSessions(userId: string): Promise<ActiveSession[]>;
    revokeAllSessions(userId: string, executor?: QueryExecutor): Promise<number>;
}
