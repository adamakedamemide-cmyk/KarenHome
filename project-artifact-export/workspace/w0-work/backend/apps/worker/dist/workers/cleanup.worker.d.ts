import { type JobRecord } from '@platform/db';
import type { WorkerContext } from '../runner';
/**
 * CleanupWorker (§12): housekeeping sweeps, all idempotent:
 *  - expired/revoked sessions purge
 *  - consumed verification/reset token purge (older than 7 days)
 *  - stale running job requeue (crashed workers)
 *  - orphan temp uploads (older than 24h)
 */
export declare function handleCleanupJob(_job: JobRecord, ctx: WorkerContext): Promise<void>;
