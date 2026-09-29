import { PostgresDatabase, JobRepository } from '@platform/db';
import { WorkerRunner, type WorkerContext, type WorkerDefinition } from './runner';
import { handleOutboxJob, handleSearchJob } from './workers/outbox-and-search';
import { handleNotificationJob, handleEmailJob, handleSmsJob } from './workers/notifications';
import { handleMediaJob } from './workers/media.worker';
import { handleFraudJob } from './workers/fraud.worker';
import { handleAnalyticsJob } from './workers/analytics.worker';
import { handleCleanupJob } from './workers/cleanup.worker';

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

function log(message: string, fields?: Record<string, unknown>): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level: 'info', service: 'karen-worker', message, ...fields }));
}

async function main(): Promise<void> {
  const db = new PostgresDatabase({ connectionString: DATABASE_URL, max: Number(process.env.DATABASE_POOL_MAX ?? '10') });
  const jobs = new JobRepository(db);
  const workerId = `worker-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  const ctx: WorkerContext = {
    db,
    jobs,
    workerId,
    backoffBaseSeconds: Number(process.env.JOB_BACKOFF_BASE_SECONDS ?? '5'),
    backoffMaxSeconds: Number(process.env.JOB_BACKOFF_MAX_SECONDS ?? '3600'),
    log,
  };

  const queueWorkers: WorkerDefinition[] = [
    { name: 'SearchIndexerWorker', queue: 'search', pollIntervalMs: 500, batchSize: 50, handler: handleSearchJob },
    { name: 'NotificationWorker', queue: 'notifications', pollIntervalMs: 500, batchSize: 25, handler: handleNotificationJob },
    { name: 'EmailWorker', queue: 'email', pollIntervalMs: 500, batchSize: 25, handler: handleEmailJob },
    { name: 'SmsWorker', queue: 'sms', pollIntervalMs: 500, batchSize: 25, handler: handleSmsJob },
    { name: 'MediaWorker', queue: 'media', pollIntervalMs: 500, batchSize: 5, handler: handleMediaJob },
    { name: 'FraudWorker', queue: 'fraud', pollIntervalMs: 5_000, batchSize: 5, handler: handleFraudJob },
    { name: 'AnalyticsWorker', queue: 'analytics', pollIntervalMs: 5_000, batchSize: 5, handler: handleAnalyticsJob },
    { name: 'CleanupWorker', queue: 'cleanup', pollIntervalMs: 60_000, batchSize: 2, handler: handleCleanupJob },
  ];

  const runner = new WorkerRunner(queueWorkers, ctx);
  runner.start();

  // OutboxWorker: dedicated loop over audit.outbox_events (SKIP LOCKED lease),
  // bridging integration events into the job queues (§2 Events → Workers).
  let outboxRunning = true;
  const outboxLoop = async (): Promise<void> => {
    while (outboxRunning) {
      try {
        await handleOutboxJob({ id: '', queue: 'outbox', jobType: 'outbox.dispatch', payload: {}, status: 'running', attempts: 1, maxAttempts: 1, runAt: new Date(), lockedAt: null, lockedBy: null, lastError: null, dedupKey: null, createdAt: new Date(), updatedAt: new Date(), finishedAt: null }, ctx);
      } catch (error) {
        log('outbox_loop_error', { error: error instanceof Error ? error.message : 'unknown' });
      }
      await new Promise((resolve) => { setTimeout(resolve, Number(process.env.OUTBOX_POLL_MS ?? '300')); });
    }
  };
  void outboxLoop();

  // Self-scheduling maintenance jobs keep sweeps alive without an external scheduler.
  const scheduleRecurring = async (queue: string, jobType: string, payload: Record<string, unknown>, everyMs: number): Promise<void> => {
    for (;;) {
      await jobs.enqueue({ queue, jobType, payload, dedupKey: `recurring:${jobType}`, maxAttempts: 3 }).catch(() => undefined);
      await new Promise((resolve) => { setTimeout(resolve, everyMs); });
    }
  };
  void scheduleRecurring('fraud', 'fraud.sweep', { kind: 'ad_sweep' }, Number(process.env.FRAUD_SWEEP_MS ?? '300000'));
  void scheduleRecurring('analytics', 'analytics.run', { kind: 'ads_rollup' }, Number(process.env.ANALYTICS_ROLLUP_MS ?? '600000'));
  void scheduleRecurring('cleanup', 'cleanup.run', {}, Number(process.env.CLEANUP_MS ?? '1800000'));

  const shutdown = async (signal: string): Promise<void> => {
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
