import { PostgresDatabase, type QueryExecutor } from './postgres-database';
export interface PublicationPolicyInputRow {
    sellerVerified: boolean;
    agreementAccepted: boolean;
    openModerationCases: number;
    openFraudCases: number;
    propertyStatus: string | null;
    propertyHasPrimaryLocation: boolean;
    hasCurrentPrice: boolean;
    photoCount: number;
    coverCount: number;
    titleLength: number;
    descriptionLength: number;
}
/**
 * Publication Policy inputs (mandate §6). One bounded round-trip per listing;
 * the policy decision itself is pure and unit-tested in the application layer.
 */
export declare class PublicationPolicyRepository {
    private readonly db;
    constructor(db: PostgresDatabase);
    /** Payment-or-contract evidence for reserved/under_contract/sold/rented transitions (§5). */
    hasActiveLeaseForListing(listingId: string): Promise<boolean>;
    collect(listingId: string, opts: {
        agreementCode: string;
        agreementVersion: number;
        requireSellerVerification: boolean;
    }): Promise<PublicationPolicyInputRow>;
}
/** Anti-bot block check used by auth-sensitive endpoints (§16). */
export declare class AntiBotRepository {
    private readonly db;
    constructor(db: PostgresDatabase);
    isBlocked(subjectType: 'ip' | 'user' | 'email' | 'phone', subjectKey: string): Promise<boolean>;
    recordRiskEvent(input: {
        subjectType: 'ip' | 'user' | 'email' | 'phone' | 'session';
        subjectKey: string;
        signal: string;
        score: number;
        metadata?: Record<string, unknown>;
    }, executor?: QueryExecutor): Promise<void>;
    createBlock(input: {
        subjectType: 'ip' | 'user' | 'email' | 'phone';
        subjectKey: string;
        reason: string;
        expiresAt: Date;
        blockedBy?: string | undefined;
    }, executor?: QueryExecutor): Promise<void>;
    countRecentIpFailures(ip: string, windowSeconds: number): Promise<number>;
    countRecentEmailFailures(email: string, windowSeconds: number): Promise<number>;
    countRecentImpressionBurst(sessionHash: string, windowSeconds: number, executor?: QueryExecutor): Promise<number>;
}
