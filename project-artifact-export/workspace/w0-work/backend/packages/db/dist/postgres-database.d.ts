import { PoolClient, QueryResult, QueryResultRow } from 'pg';
export interface DatabaseConfig {
    connectionString: string;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
    ssl?: boolean | {
        rejectUnauthorized: boolean;
    };
}
export interface TransactionContext {
    actorUserId?: string | undefined;
    requestId?: string | undefined;
    statusChangeReason?: string | undefined;
}
export interface QueryExecutor {
    query<T extends QueryResultRow>(text: string, values?: readonly unknown[]): Promise<QueryResult<T>>;
}
export declare class PostgresDatabase {
    private readonly pool;
    constructor(config: DatabaseConfig);
    query<T extends QueryResultRow>(text: string, params?: readonly unknown[]): Promise<QueryResult<T>>;
    transaction<T>(fn: (client: PoolClient) => Promise<T>, context?: TransactionContext): Promise<T>;
    healthcheck(): Promise<void>;
    close(): Promise<void>;
}
