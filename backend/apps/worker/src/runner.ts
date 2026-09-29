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

const TERMINAL_ERRORS = /NOT_FOUND|INVALID_SECRET_ENVELOPE|VALIDATION/;

/**
 * Gate 4 §12 — job loop with retry/backoff/idempotency/DLQ/observability.
 * Every job is claimed atomically (FOR UPDATE SKIP LOCKED, attempts++ in
 * platform.jobs). Failures retry with exponential backoff until
 * max_attempts, then dead-letter (status='dead', requeue via admin API).
 * All transitions are recorded in platform.job_runs.
 */
export class WorkerRunner {
  private running = true;
  private readonly timers: NodeJS.Timeout[] = [];

  constructor(private readonly definitions: WorkerDefinition[], private readonly ctx: WorkerContext) {}

  start(): void {
    this.ctx.log('worker_runner_starting', { workers: this.definitions.map((definition) => definition.name) });
    for (const definition of this.definitions) {
      const loop = async (): Promise<void> => {
        while (this.running) {
          let claimed = 0;
          try {
            const jobs = await this.ctx.jobs.claimBatch(`${this.ctx.workerId}:${definition.name}`, definition.queue, definition.batchSize);
            claimed = jobs.length;
            for (const job of jobs) {
              const started = Date.now();
              try {
                await definition.handler(job, this.ctx);
                await this.ctx.jobs.complete(job.id, `${this.ctx.workerId}:${definition.name}`);
                this.ctx.log('job_completed', { worker: definition.name, jobId: job.id, jobType: job.jobType, durationMs: Date.now() - started, attempt: job.attempts });
              } catch (error) {
                const message = error instanceof Error ? error.message : 'unknown_error';
                const backoff = Math.min(this.ctx.backoffBaseSeconds * 2 ** Math.max(0, job.attempts - 1), this.ctx.backoffMaxSeconds);
                const outcome = await this.ctx.jobs.fail(job.id, `${this.ctx.workerId}:${definition.name}`, message, backoff);
                this.ctx.log('job_failed', { worker: definition.name, jobId: job.id, jobType: job.jobType, error: message, attempt: job.attempts, outcome, backoffSeconds: backoff, terminal: TERMINAL_ERRORS.test(message) });
              }
            }
          } catch (loopError) {
            this.ctx.log('worker_loop_error', { worker: definition.name, error: loopError instanceof Error ? loopError.message : 'unknown' });
          }
          await sleep(claimed >= definition.batchSize ? 50 : definition.pollIntervalMs);
        }
      };
      const timer = setTimeout(() => { void loop(); }, 250);
      this.timers.push(timer);
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    this.ctx.log('worker_runner_stopping', {});
    // Give in-flight jobs a grace period.
    await sleep(1_500);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}
