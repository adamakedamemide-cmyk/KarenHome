import { JobRepository, PostgresDatabase, type JobRecord } from '@platform/db';
export interface WorkerContext {
    db: PostgresDatabase;
    jobs: JobRepository;
    workerId: string;
    backoffBaseSeconds: number;
    backoffMaxSeconds: number;
    log: (message: string, fields?: Record<string, unknown>) => void;
}
export interface WorkerDefinition {
    name: string;
    queue: string;
    pollIntervalMs: number;
    batchSize: number;
    handler: (job: JobRecord, ctx: WorkerContext) => Promise<void>;
}
/**
 * Gate 4 §12 — job loop with retry/backoff/idempotency/DLQ/observability.
 * Every job is claimed atomically (FOR UPDATE SKIP LOCKED, attempts++ in
 * platform.jobs). Failures retry with exponential backoff until
 * max_attempts, then dead-letter (status='dead', requeue via admin API).
 * All transitions are recorded in platform.job_runs.
 */
export declare class WorkerRunner {
    private readonly definitions;
    private readonly ctx;
    private running;
    private readonly timers;
    constructor(definitions: WorkerDefinition[], ctx: WorkerContext);
    start(): void;
    stop(): Promise<void>;
}
