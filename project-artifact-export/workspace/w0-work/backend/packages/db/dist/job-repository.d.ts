import { PostgresDatabase, type QueryExecutor } from './postgres-database';
export interface JobRecord {
    id: string;
    queue: string;
    jobType: string;
    payload: Record<string, unknown>;
    status: 'pending' | 'running' | 'succeeded' | 'failed' | 'dead' | 'cancelled';
    attempts: number;
    maxAttempts: number;
    runAt: Date;
    lockedAt: Date | null;
    lockedBy: string | null;
    lastError: string | null;
    dedupKey: string | null;
    createdAt: Date;
    updatedAt: Date;
    finishedAt: Date | null;
}
export interface EnqueueJobInput {
    queue: string;
    jobType: string;
    payload: Record<string, unknown>;
    runAt?: Date | undefined;
    maxAttempts?: number | undefined;
    dedupKey?: string | undefined;
    createdBy?: string | undefined;
}
/**
 * PostgreSQL-backed job queue for Gate 4 workers.
 * Claiming uses FOR UPDATE SKIP LOCKED (same protocol as the outbox),
 * so N concurrent workers can never double-claim a job.
 */
export declare class JobRepository {
    private readonly db;
    constructor(db: PostgresDatabase);
    /** Enqueue a job. dedupKey enforces at most one live (pending/running) job. */
    enqueue(input: EnqueueJobInput, executor?: QueryExecutor): Promise<string>;
    /** Atomically claim a batch: pending → running, attempts++, run row started. */
    claimBatch(workerId: string, queue: string, limit?: number): Promise<JobRecord[]>;
    complete(jobId: string, workerId: string): Promise<void>;
    /** Fail a job: retry with backoff while attempts < max_attempts, else dead-letter. */
    fail(jobId: string, workerId: string, errorMessage: string, backoffSeconds: number): Promise<'retry' | 'dead'>;
    /** Requeue jobs whose worker died mid-run (locked too long). */
    requeueStale(staleSeconds: number): Promise<number>;
    requeueDead(jobId: string): Promise<void>;
    getById(jobId: string): Promise<JobRecord | null>;
    stats(): Promise<Array<{
        queue: string;
        status: string;
        count: string;
    }>>;
}
