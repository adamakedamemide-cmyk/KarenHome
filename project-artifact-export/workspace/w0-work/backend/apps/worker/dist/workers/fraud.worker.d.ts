import { type JobRecord } from '@platform/db';
import type { WorkerContext } from '../runner';
/**
 * FraudWorker (§8/§16): periodic sweeps driven by jobs.
 *  - fraud.ad_sweep: sessions with impression bursts above thresholds get
 *    counted impressions invalidated + risk events; extreme bursts open a
 *    moderation case for review.
 *  - fraud.risk_rescore: recent risk events are surfaced for observability.
 */
export declare function handleFraudJob(job: JobRecord, ctx: WorkerContext): Promise<void>;
