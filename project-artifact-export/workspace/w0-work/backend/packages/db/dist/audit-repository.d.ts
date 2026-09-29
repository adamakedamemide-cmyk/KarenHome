import { PostgresDatabase, type QueryExecutor } from './postgres-database';
export declare class AuditRepository {
    private readonly db;
    constructor(db: PostgresDatabase);
    append(input: {
        actorUserId?: string | undefined;
        organizationId?: string | undefined;
        action: string;
        entityType: string;
        entityId?: string | undefined;
        beforeData?: unknown;
        afterData?: unknown;
        ip?: string | undefined;
        userAgent?: string | undefined;
        requestId?: string | undefined;
    }, executor?: QueryExecutor): Promise<void>;
}
