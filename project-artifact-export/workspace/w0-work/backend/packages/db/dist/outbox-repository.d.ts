import { PostgresDatabase, type QueryExecutor } from './postgres-database';
export interface IntegrationEvent {
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    eventVersion: 1;
    payload: Record<string, unknown>;
}
export declare class OutboxRepository {
    private readonly db;
    constructor(db: PostgresDatabase);
    append(event: IntegrationEvent, executor?: QueryExecutor): Promise<string>;
    leaseBatch(workerId: string, limit?: number): Promise<Array<{
        id: string;
        eventType: string;
        aggregateId: string;
        payload: Record<string, unknown>;
    }>>;
    markPublished(id: string, workerId: string): Promise<void>;
    markFailed(id: string, workerId: string, errorMessage: string): Promise<void>;
}
