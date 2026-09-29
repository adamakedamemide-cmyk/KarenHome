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

interface JobRow {
  id: string;
  queue: string;
  job_type: string;
  payload: unknown;
  status: JobRecord['status'];
  attempts: number;
  max_attempts: number;
  run_at: Date;
  locked_at: Date | null;
  locked_by: string | null;
  last_error: string | null;
  dedup_key: string | null;
  created_at: Date;
  updated_at: Date;
  finished_at: Date | null;
}

function mapJob(row: JobRow): JobRecord {
  return {
    id: row.id,
    queue: row.queue,
    jobType: row.job_type,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    runAt: row.run_at,
    lockedAt: row.locked_at,
    lockedBy: row.locked_by,
    lastError: row.last_error,
    dedupKey: row.dedup_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    finishedAt: row.finished_at,
  };
}

/**
 * PostgreSQL-backed job queue for Gate 4 workers.
 * Claiming uses FOR UPDATE SKIP LOCKED (same protocol as the outbox),
 * so N concurrent workers can never double-claim a job.
 */
export class JobRepository {
  constructor(private readonly db: PostgresDatabase) {}

  /** Enqueue a job. dedupKey enforces at most one live (pending/running) job. */
  async enqueue(input: EnqueueJobInput, executor: QueryExecutor = this.db): Promise<string> {
    const inserted = await executor.query<{ id: string }>(
      `INSERT INTO platform.jobs(queue, job_type, payload, run_at, max_attempts, dedup_key, created_by)
       VALUES ($1, $2, $3::jsonb, COALESCE($4::timestamptz, now()), COALESCE($5, 5), $6, $7)
       ON CONFLICT (dedup_key)
       WHERE dedup_key IS NOT NULL AND status IN ('pending','running')
       DO NOTHING
       RETURNING id`,
      [
        input.queue,
        input.jobType,
        JSON.stringify(input.payload ?? {}),
        input.runAt ?? null,
        input.maxAttempts ?? null,
        input.dedupKey ?? null,
        input.createdBy ?? null,
      ],
    );
    if (inserted.rows[0]?.id) return inserted.rows[0].id;
    // Conflict on live dedup key → return the existing live job id.
    const existing = await executor.query<{ id: string }>(
      `SELECT id FROM platform.jobs
       WHERE dedup_key = $1 AND status IN ('pending','running')
       ORDER BY created_at LIMIT 1`,
      [input.dedupKey ?? ''],
    );
    const existingId = existing.rows[0]?.id;
    if (!existingId) throw new Error('JOB_ENQUEUE_FAILED');
    return existingId;
  }

  /** Atomically claim a batch: pending → running, attempts++, run row started. */
  async claimBatch(workerId: string, queue: string, limit = 10): Promise<JobRecord[]> {
    return this.db.transaction(async (client) => {
      const claimed = await client.query<JobRow>(
        `WITH candidates AS (
           SELECT id FROM platform.jobs
           WHERE status = 'pending' AND queue = $1 AND run_at <= now()
           ORDER BY run_at, created_at
           FOR UPDATE SKIP LOCKED
           LIMIT $2
         )
         UPDATE platform.jobs j
         SET status = 'running', locked_at = now(), locked_by = $3,
             attempts = j.attempts + 1, updated_at = now()
         FROM candidates c
         WHERE j.id = c.id
         RETURNING j.*`,
        [queue, limit, workerId],
      );
      for (const row of claimed.rows) {
        await client.query(
          `INSERT INTO platform.job_runs(job_id, worker_id, attempt, status)
           VALUES ($1::uuid, $2, $3, 'started')`,
          [row.id, workerId, row.attempts],
        );
      }
      return claimed.rows.map(mapJob);
    });
  }

  async complete(jobId: string, workerId: string): Promise<void> {
    await this.db.transaction(async (client) => {
      await client.query(
        `UPDATE platform.jobs
         SET status = 'succeeded', finished_at = now(), updated_at = now(),
             locked_at = NULL, locked_by = NULL, last_error = NULL
         WHERE id = $1::uuid`,
        [jobId],
      );
      await client.query(
        `UPDATE platform.job_runs
         SET status = 'succeeded', finished_at = now(),
             duration_ms = GREATEST(0, EXTRACT(EPOCH FROM (now() - started_at)) * 1000)::integer
         WHERE job_id = $1::uuid AND worker_id = $2 AND status = 'started'`,
        [jobId, workerId],
      );
    });
  }

  /** Fail a job: retry with backoff while attempts < max_attempts, else dead-letter. */
  async fail(jobId: string, workerId: string, errorMessage: string, backoffSeconds: number): Promise<'retry' | 'dead'> {
    const outcome = await this.db.transaction(async (client) => {
      const current = await client.query<{ attempts: number; max_attempts: number }>(
        `SELECT attempts, max_attempts FROM platform.jobs WHERE id = $1::uuid FOR UPDATE`,
        [jobId],
      );
      const row = current.rows[0];
      if (!row) throw new Error('JOB_NOT_FOUND');
      const dead = row.attempts >= row.max_attempts;
      if (dead) {
        await client.query(
          `UPDATE platform.jobs
           SET status = 'dead', last_error = $2, finished_at = now(), updated_at = now(),
               locked_at = NULL, locked_by = NULL
           WHERE id = $1::uuid`,
          [jobId, errorMessage.slice(0, 2000)],
        );
      } else {
        await client.query(
          `UPDATE platform.jobs
           SET status = 'pending', run_at = now() + make_interval(secs => $2),
               last_error = $3, updated_at = now(), locked_at = NULL, locked_by = NULL
           WHERE id = $1::uuid`,
          [jobId, Math.max(0, backoffSeconds), errorMessage.slice(0, 2000)],
        );
      }
      await client.query(
        `UPDATE platform.job_runs
         SET status = 'failed', finished_at = now(), error = $2,
             duration_ms = GREATEST(0, EXTRACT(EPOCH FROM (now() - started_at)) * 1000)::integer
         WHERE job_id = $1::uuid AND worker_id = $3 AND status = 'started'`,
        [jobId, errorMessage.slice(0, 2000), workerId],
      );
      return dead ? 'dead' as const : 'retry' as const;
    });
    return outcome;
  }

  /** Requeue jobs whose worker died mid-run (locked too long). */
  async requeueStale(staleSeconds: number): Promise<number> {
    const result = await this.db.query(
      `UPDATE platform.jobs
       SET status = 'pending', run_at = now(), locked_at = NULL, locked_by = NULL, updated_at = now()
       WHERE status = 'running' AND locked_at < now() - make_interval(secs => $1)
       RETURNING id`,
      [staleSeconds],
    );
    return result.rowCount ?? 0;
  }

  async requeueDead(jobId: string): Promise<void> {
    await this.db.query(
      `UPDATE platform.jobs
       SET status = 'pending', attempts = 0, run_at = now(), finished_at = NULL,
           locked_at = NULL, locked_by = NULL, updated_at = now()
       WHERE id = $1::uuid AND status = 'dead'`,
      [jobId],
    );
  }

  async getById(jobId: string): Promise<JobRecord | null> {
    const result = await this.db.query<JobRow>(`SELECT * FROM platform.jobs WHERE id = $1::uuid`, [jobId]);
    return result.rows[0] ? mapJob(result.rows[0]) : null;
  }

  async stats(): Promise<Array<{ queue: string; status: string; count: string }>> {
    const result = await this.db.query<{ queue: string; status: string; count: string }>(
      `SELECT queue, status, count(*)::text AS count FROM platform.jobs GROUP BY queue, status ORDER BY queue, status`,
    );
    return result.rows;
  }
}
