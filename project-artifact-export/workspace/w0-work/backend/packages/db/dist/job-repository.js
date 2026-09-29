"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobRepository = void 0;
function mapJob(row) {
    return {
        id: row.id,
        queue: row.queue,
        jobType: row.job_type,
        payload: (row.payload ?? {}),
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
class JobRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    /** Enqueue a job. dedupKey enforces at most one live (pending/running) job. */
    async enqueue(input, executor = this.db) {
        const inserted = await executor.query(`INSERT INTO platform.jobs(queue, job_type, payload, run_at, max_attempts, dedup_key, created_by)
       VALUES ($1, $2, $3::jsonb, COALESCE($4::timestamptz, now()), COALESCE($5, 5), $6, $7)
       ON CONFLICT (dedup_key)
       WHERE dedup_key IS NOT NULL AND status IN ('pending','running')
       DO NOTHING
       RETURNING id`, [
            input.queue,
            input.jobType,
            JSON.stringify(input.payload ?? {}),
            input.runAt ?? null,
            input.maxAttempts ?? null,
            input.dedupKey ?? null,
            input.createdBy ?? null,
        ]);
        if (inserted.rows[0]?.id)
            return inserted.rows[0].id;
        // Conflict on live dedup key → return the existing live job id.
        const existing = await executor.query(`SELECT id FROM platform.jobs
       WHERE dedup_key = $1 AND status IN ('pending','running')
       ORDER BY created_at LIMIT 1`, [input.dedupKey ?? '']);
        const existingId = existing.rows[0]?.id;
        if (!existingId)
            throw new Error('JOB_ENQUEUE_FAILED');
        return existingId;
    }
    /** Atomically claim a batch: pending → running, attempts++, run row started. */
    async claimBatch(workerId, queue, limit = 10) {
        return this.db.transaction(async (client) => {
            const claimed = await client.query(`WITH candidates AS (
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
         RETURNING j.*`, [queue, limit, workerId]);
            for (const row of claimed.rows) {
                await client.query(`INSERT INTO platform.job_runs(job_id, worker_id, attempt, status)
           VALUES ($1::uuid, $2, $3, 'started')`, [row.id, workerId, row.attempts]);
            }
            return claimed.rows.map(mapJob);
        });
    }
    async complete(jobId, workerId) {
        await this.db.transaction(async (client) => {
            await client.query(`UPDATE platform.jobs
         SET status = 'succeeded', finished_at = now(), updated_at = now(),
             locked_at = NULL, locked_by = NULL, last_error = NULL
         WHERE id = $1::uuid`, [jobId]);
            await client.query(`UPDATE platform.job_runs
         SET status = 'succeeded', finished_at = now(),
             duration_ms = GREATEST(0, EXTRACT(EPOCH FROM (now() - started_at)) * 1000)::integer
         WHERE job_id = $1::uuid AND worker_id = $2 AND status = 'started'`, [jobId, workerId]);
        });
    }
    /** Fail a job: retry with backoff while attempts < max_attempts, else dead-letter. */
    async fail(jobId, workerId, errorMessage, backoffSeconds) {
        const outcome = await this.db.transaction(async (client) => {
            const current = await client.query(`SELECT attempts, max_attempts FROM platform.jobs WHERE id = $1::uuid FOR UPDATE`, [jobId]);
            const row = current.rows[0];
            if (!row)
                throw new Error('JOB_NOT_FOUND');
            const dead = row.attempts >= row.max_attempts;
            if (dead) {
                await client.query(`UPDATE platform.jobs
           SET status = 'dead', last_error = $2, finished_at = now(), updated_at = now(),
               locked_at = NULL, locked_by = NULL
           WHERE id = $1::uuid`, [jobId, errorMessage.slice(0, 2000)]);
            }
            else {
                await client.query(`UPDATE platform.jobs
           SET status = 'pending', run_at = now() + make_interval(secs => $2),
               last_error = $3, updated_at = now(), locked_at = NULL, locked_by = NULL
           WHERE id = $1::uuid`, [jobId, Math.max(0, backoffSeconds), errorMessage.slice(0, 2000)]);
            }
            await client.query(`UPDATE platform.job_runs
         SET status = 'failed', finished_at = now(), error = $2,
             duration_ms = GREATEST(0, EXTRACT(EPOCH FROM (now() - started_at)) * 1000)::integer
         WHERE job_id = $1::uuid AND worker_id = $3 AND status = 'started'`, [jobId, errorMessage.slice(0, 2000), workerId]);
            return dead ? 'dead' : 'retry';
        });
        return outcome;
    }
    /** Requeue jobs whose worker died mid-run (locked too long). */
    async requeueStale(staleSeconds) {
        const result = await this.db.query(`UPDATE platform.jobs
       SET status = 'pending', run_at = now(), locked_at = NULL, locked_by = NULL, updated_at = now()
       WHERE status = 'running' AND locked_at < now() - make_interval(secs => $1)
       RETURNING id`, [staleSeconds]);
        return result.rowCount ?? 0;
    }
    async requeueDead(jobId) {
        await this.db.query(`UPDATE platform.jobs
       SET status = 'pending', attempts = 0, run_at = now(), finished_at = NULL,
           locked_at = NULL, locked_by = NULL, updated_at = now()
       WHERE id = $1::uuid AND status = 'dead'`, [jobId]);
    }
    async getById(jobId) {
        const result = await this.db.query(`SELECT * FROM platform.jobs WHERE id = $1::uuid`, [jobId]);
        return result.rows[0] ? mapJob(result.rows[0]) : null;
    }
    async stats() {
        const result = await this.db.query(`SELECT queue, status, count(*)::text AS count FROM platform.jobs GROUP BY queue, status ORDER BY queue, status`);
        return result.rows;
    }
}
exports.JobRepository = JobRepository;
