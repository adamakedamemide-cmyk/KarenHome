import { type JobRecord } from '@platform/db';
import type { WorkerContext } from '../runner';
/**
 * AnalyticsWorker (§8/§19): daily ad rollups (CPM accrual happens here —
 * spend = counted impressions × price / 1000; CPC spend accrues per valid
 * click at click time) and index-lag snapshots for observability.
 */
export declare function handleAnalyticsJob(job: JobRecord, ctx: WorkerContext): Promise<void>;
