"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("@platform/db");
const runner_1 = require("./runner");
const outbox_and_search_1 = require("./workers/outbox-and-search");
const notifications_1 = require("./workers/notifications");
const media_worker_1 = require("./workers/media.worker");
const fraud_worker_1 = require("./workers/fraud.worker");
const analytics_worker_1 = require("./workers/analytics.worker");
const cleanup_worker_1 = require("./workers/cleanup.worker");
/**
 * Karen Home — Gate 4 Worker Application (§12).
 * Nine workers: OutboxWorker (event backbone loop), SearchIndexerWorker,
 * NotificationWorker, EmailWorker, SmsWorker, MediaWorker, FraudWorker,
 * AnalyticsWorker, CleanupWorker. Every job: retry + backoff + idempotency
 * (dedup keys + deterministic outputs) + dead-letter + structured logging.
 */
const DATABASE_URL = process.env.DATABASE_URL ?? '';
if (!DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
}
function log(message, fields) {
    console.log(JSON.stringify({ ts: new Date().toISOString(), level: 'info', service: 'karen-worker', message, ...fields }));
}
async function main() {
    const db = new db_1.PostgresDatabase({ connectionString: DATABASE_URL, max: Number(process.env.DATABASE_POOL_MAX ?? '10') });
    const jobs = new db_1.JobRepository(db);
    const workerId = `worker-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
    const ctx = {
        db,
        jobs,
        workerId,
        backoffBaseSeconds: Number(process.env.JOB_BACKOFF_BASE_SECONDS ?? '5'),
        backoffMaxSeconds: Number(process.env.JOB_BACKOFF_MAX_SECONDS ?? '3600'),
        log,
    };
    const queueWorkers = [
        { name: 'SearchIndexerWorker', queue: 'search', pollIntervalMs: 500, batchSize: 50, handler: outbox_and_search_1.handleSearchJob },
        { name: 'NotificationWorker', queue: 'notifications', pollIntervalMs: 500, batchSize: 25, handler: notifications_1.handleNotificationJob },
        { name: 'EmailWorker', queue: 'email', pollIntervalMs: 500, batchSize: 25, handler: notifications_1.handleEmailJob },
        { name: 'SmsWorker', queue: 'sms', pollIntervalMs: 500, batchSize: 25, handler: notifications_1.handleSmsJob },
        { name: 'MediaWorker', queue: 'media', pollIntervalMs: 500, batchSize: 5, handler: media_worker_1.handleMediaJob },
        { name: 'FraudWorker', queue: 'fraud', pollIntervalMs: 5_000, batchSize: 5, handler: fraud_worker_1.handleFraudJob },
        { name: 'AnalyticsWorker', queue: 'analytics', pollIntervalMs: 5_000, batchSize: 5, handler: analytics_worker_1.handleAnalyticsJob },
        { name: 'CleanupWorker', queue: 'cleanup', pollIntervalMs: 60_000, batchSize: 2, handler: cleanup_worker_1.handleCleanupJob },
    ];
    const runner = new runner_1.WorkerRunner(queueWorkers, ctx);
    runner.start();
    // OutboxWorker: dedicated loop over audit.outbox_events (SKIP LOCKED lease),
    // bridging integration events into the job queues (§2 Events → Workers).
    let outboxRunning = true;
    const outboxLoop = async () => {
        while (outboxRunning) {
            try {
                await (0, outbox_and_search_1.handleOutboxJob)({ id: '', queue: 'outbox', jobType: 'outbox.dispatch', payload: {}, status: 'running', attempts: 1, maxAttempts: 1, runAt: new Date(), lockedAt: null, lockedBy: null, lastError: null, dedupKey: null, createdAt: new Date(), updatedAt: new Date(), finishedAt: null }, ctx);
            }
            catch (error) {
                log('outbox_loop_error', { error: error instanceof Error ? error.message : 'unknown' });
            }
            await new Promise((resolve) => { setTimeout(resolve, Number(process.env.OUTBOX_POLL_MS ?? '300')); });
        }
    };
    void outboxLoop();
    // Self-scheduling maintenance jobs keep sweeps alive without an external scheduler.
    const scheduleRecurring = async (queue, jobType, payload, everyMs) => {
        for (;;) {
            await jobs.enqueue({ queue, jobType, payload, dedupKey: `recurring:${jobType}`, maxAttempts: 3 }).catch(() => undefined);
            await new Promise((resolve) => { setTimeout(resolve, everyMs); });
        }
    };
    void scheduleRecurring('fraud', 'fraud.sweep', { kind: 'ad_sweep' }, Number(process.env.FRAUD_SWEEP_MS ?? '300000'));
    void scheduleRecurring('analytics', 'analytics.run', { kind: 'ads_rollup' }, Number(process.env.ANALYTICS_ROLLUP_MS ?? '600000'));
    void scheduleRecurring('cleanup', 'cleanup.run', {}, Number(process.env.CLEANUP_MS ?? '1800000'));
    const shutdown = async (signal) => {
        log('worker_shutdown', { signal });
        outboxRunning = false;
        await runner.stop();
        await db.close();
        process.exit(0);
    };
    process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
    process.on('SIGINT', () => { void shutdown('SIGINT'); });
    log('worker_started', { workerId, queues: queueWorkers.map((definition) => definition.queue) });
}
void main();
