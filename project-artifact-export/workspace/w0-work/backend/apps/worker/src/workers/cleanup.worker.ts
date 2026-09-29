import { readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { JobRepository, type JobRecord } from '@platform/db';
import type { WorkerContext } from '../runner';

/**
 * CleanupWorker (§12): housekeeping sweeps, all idempotent:
 *  - expired/revoked sessions purge
 *  - consumed verification/reset token purge (older than 7 days)
 *  - stale running job requeue (crashed workers)
 *  - orphan temp uploads (older than 24h)
 */
export async function handleCleanupJob(_job: JobRecord, ctx: WorkerContext): Promise<void> {
  const jobs = new JobRepository(ctx.db);

  const sessions = await ctx.db.query(
    `DELETE FROM iam.user_sessions WHERE expires_at < now() - interval '7 days' OR revoked_at < now() - interval '7 days'`,
  );
  const tokens = await ctx.db.query(
    `DELETE FROM iam.email_verification_tokens WHERE consumed_at IS NOT NULL AND consumed_at < now() - interval '7 days'
     OR expires_at < now() - interval '7 days'`,
  );
  await ctx.db.query(
    `DELETE FROM iam.password_reset_tokens WHERE consumed_at IS NOT NULL AND consumed_at < now() - interval '7 days'
     OR expires_at < now() - interval '7 days'`,
  );
  await ctx.db.query(
    `DELETE FROM iam.phone_verification_tokens WHERE consumed_at IS NOT NULL AND consumed_at < now() - interval '7 days'
     OR expires_at < now() - interval '7 days'`,
  );

  const requeued = await jobs.requeueStale(900);

  let purgedTmp = 0;
  const tmpDir = process.env.MEDIA_TMP_DIR ?? '/tmp/karen-media';
  try {
    const entries = await readdir(tmpDir);
    for (const entry of entries) {
      const fullPath = path.join(tmpDir, entry);
      const info = await stat(fullPath).catch(() => null);
      if (info && Date.now() - info.mtimeMs > 24 * 3600 * 1000) {
        await rm(fullPath, { force: true });
        purgedTmp += 1;
      }
    }
  } catch {
    // tmp dir may not exist yet — nothing to purge.
  }

  ctx.log('cleanup_done', {
    sessionsDeleted: sessions.rowCount ?? 0,
    tokensDeleted: tokens.rowCount ?? 0,
    staleJobsRequeued: requeued,
    tmpFilesPurged: purgedTmp,
  });
}
