import { PostgresDatabase, type QueryExecutor } from './postgres-database';
export interface SearchIndexStateRow {
    listingId: string;
    status: 'pending' | 'indexed' | 'failed';
    attempts: number;
    lastError: string | null;
    sourceEventAt: Date;
    updatedAt: Date;
}
/**
 * Search index state + PG FTS document store (migration 0032).
 * The indexer worker claims pending/failed entries SKIP LOCKED — retries and
 * dead-letters ride on platform.jobs; lag/failure observability via stats().
 */
export declare class SearchIndexRepository {
    private readonly db;
    constructor(db: PostgresDatabase);
    upsertPending(listingId: string, sourceEventAt: Date, executor?: QueryExecutor): Promise<void>;
    removePending(listingId: string, executor?: QueryExecutor): Promise<void>;
    claimBatch(workerId: string, limit?: number): Promise<SearchIndexStateRow[]>;
    markIndexed(listingId: string, doc: Record<string, unknown>): Promise<void>;
    private upsertSearchDoc;
    markFailed(listingId: string, error: string): Promise<void>;
    stats(): Promise<{
        pending: number;
        failed: number;
        indexed: number;
        oldestPendingSeconds: number | null;
    }>;
    docById(listingId: string): Promise<Record<string, unknown> | null>;
    /**
     * Build the canonical search document for one listing (bounded joins).
     * Shared by the API SearchService and the SearchIndexerWorker so both
     * index identical documents.
     */
    buildDoc(listingId: string, executor?: QueryExecutor): Promise<Record<string, unknown> | null>;
    listListingIdsNeedingIndex(limit: number, offset: number): Promise<string[]>;
}
