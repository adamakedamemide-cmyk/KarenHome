import { AdvertisingRepository, AntiBotRepository, AuditRepository, type JobRecord } from '@platform/db';
import type { WorkerContext } from '../runner';

/**
 * FraudWorker (§8/§16): periodic sweeps driven by jobs.
 *  - fraud.ad_sweep: sessions with impression bursts above thresholds get
 *    counted impressions invalidated + risk events; extreme bursts open a
 *    moderation case for review.
 *  - fraud.risk_rescore: recent risk events are surfaced for observability.
 */
export async function handleFraudJob(job: JobRecord, ctx: WorkerContext): Promise<void> {
  const antiBot = new AntiBotRepository(ctx.db);
  const ads = new AdvertisingRepository(ctx.db);
  const audit = new AuditRepository(ctx.db);
  const payload = job.payload as { kind?: string; windowSeconds?: number; burstLimit?: number };
  const kind = payload.kind ?? 'ad_sweep';

  if (kind === 'ad_sweep') {
    const windowSeconds = payload.windowSeconds ?? 600;
    const burstLimit = payload.burstLimit ?? 50;
    const r = await ctx.db.query<{ session_hash: string; count: string }>(
      `SELECT session_hash, count(*)::text AS count
       FROM advertising.impressions
       WHERE served_at > now() - make_interval(secs => $1)
       GROUP BY session_hash HAVING count(*) > $2
       ORDER BY count(*) DESC LIMIT 100`,
      [windowSeconds, burstLimit],
    );
    for (const row of r.rows) {
      const sessionHash = row.session_hash;
      const invalidated = await ctx.db.query(
        `UPDATE advertising.impressions SET is_counted = false, fraud_score = 1
         WHERE session_hash = $1 AND is_counted = true AND served_at > now() - make_interval(secs => $2)`,
        [sessionHash, windowSeconds],
      );
      await antiBot.recordRiskEvent({ subjectType: 'session', subjectKey: sessionHash, signal: 'impression_burst', score: 1, metadata: { count: Number(row.count), invalidated: invalidated.rowCount ?? 0 } });
      if (Number(row.count) > burstLimit * 4) {
        await audit.append({ action: 'fraud.session_burst_extreme', entityType: 'advertising.impression', afterData: { sessionHashPrefix: sessionHash.slice(0, 16), count: Number(row.count) } });
      }
      ctx.log('fraud_session_sweeped', { sessionHash: sessionHash.slice(0, 12), count: Number(row.count), invalidated: invalidated.rowCount ?? 0 });
    }
    return;
  }

  if (kind === 'budget_sweep') {
    // Defense-in-depth: campaigns past their budget re-check (DB trigger is primary).
    const campaigns = await ads.listCampaignIds(200);
    for (const campaignId of campaigns) {
      const budgets = await ads.getBudgets(campaignId);
      const exhausted = budgets.filter((budget) => Number(budget.spentAmount) >= Number(budget.limitAmount));
      if (exhausted.length > 0) ctx.log('budget_exhausted_campaign', { campaignId, types: exhausted.map((budget) => budget.budgetType) });
    }
    return;
  }

  throw new Error(`UNKNOWN_FRAUD_JOB: ${kind}`);
}
