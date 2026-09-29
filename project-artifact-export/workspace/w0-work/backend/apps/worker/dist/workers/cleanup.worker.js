"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCleanupJob = handleCleanupJob;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const db_1 = require("@platform/db");
/**
 * CleanupWorker (§12): housekeeping sweeps, all idempotent:
 *  - expired/revoked sessions purge
 *  - consumed verification/reset token purge (older than 7 days)
 *  - stale running job requeue (crashed workers)
 *  - orphan temp uploads (older than 24h)
 */
async function handleCleanupJob(_job, ctx) {
    const jobs = new db_1.JobRepository(ctx.db);
    const sessions = await ctx.db.query(`DELETE FROM iam.user_sessions WHERE expires_at < now() - interval '7 days' OR revoked_at < now() - interval '7 days'`);
    const tokens = await ctx.db.query(`DELETE FROM iam.email_verification_tokens WHERE consumed_at IS NOT NULL AND consumed_at < now() - interval '7 days'
     OR expires_at < now() - interval '7 days'`);
    await ctx.db.query(`DELETE FROM iam.password_reset_tokens WHERE consumed_at IS NOT NULL AND consumed_at < now() - interval '7 days'
     OR expires_at < now() - interval '7 days'`);
    await ctx.db.query(`DELETE FROM iam.phone_verification_tokens WHERE consumed_at IS NOT NULL AND consumed_at < now() - interval '7 days'
     OR expires_at < now() - interval '7 days'`);
    const requeued = await jobs.requeueStale(900);
    let purgedTmp = 0;
    const tmpDir = process.env.MEDIA_TMP_DIR ?? '/tmp/karen-media';
    try {
        const entries = await (0, promises_1.readdir)(tmpDir);
        for (const entry of entries) {
            const fullPath = node_path_1.default.join(tmpDir, entry);
            const info = await (0, promises_1.stat)(fullPath).catch(() => null);
            if (info && Date.now() - info.mtimeMs > 24 * 3600 * 1000) {
                await (0, promises_1.rm)(fullPath, { force: true });
                purgedTmp += 1;
            }
        }
    }
    catch {
        // tmp dir may not exist yet — nothing to purge.
    }
    ctx.log('cleanup_done', {
        sessionsDeleted: sessions.rowCount ?? 0,
        tokensDeleted: tokens.rowCount ?? 0,
        staleJobsRequeued: requeued,
        tmpFilesPurged: purgedTmp,
    });
}
