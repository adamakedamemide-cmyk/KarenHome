"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAnalyticsJob = handleAnalyticsJob;
const db_1 = require("@platform/db");
/**
 * AnalyticsWorker (§8/§19): daily ad rollups (CPM accrual happens here —
 * spend = counted impressions × price / 1000; CPC spend accrues per valid
 * click at click time) and index-lag snapshots for observability.
 */
async function handleAnalyticsJob(job, ctx) {
    const ads = new db_1.AdvertisingRepository(ctx.db);
    const payload = job.payload;
    const kind = payload.kind ?? 'ads_rollup';
    if (kind === 'ads_rollup') {
        const date = payload.date ?? new Date().toISOString().slice(0, 10);
        const campaignIds = payload.campaignId ? [payload.campaignId] : await ads.listCampaignIds(500);
        for (const campaignId of campaignIds) {
            const campaign = await ads.getCampaign(campaignId);
            if (!campaign)
                continue;
            const aggregates = await ads.dailyAggregates(campaignId, date);
            let spend = '0';
            if (campaign.pricingModel === 'CPM' && campaign.priceAmount) {
                spend = ((aggregates.impressions * Number(campaign.priceAmount)) / 1000).toFixed(4);
            }
            else if (campaign.pricingModel === 'CPC' && campaign.priceAmount) {
                spend = (aggregates.validClicks * Number(campaign.priceAmount)).toFixed(4);
            }
            await ads.upsertDailyReport({
                campaignId,
                reportDate: date,
                impressions: aggregates.impressions,
                clicks: aggregates.clicks,
                validClicks: aggregates.validClicks,
                spend,
                currencyCode: campaign.currencyCode ?? 'USD',
            });
            ctx.log('analytics_rollup', { campaignId, date, impressions: aggregates.impressions, spend });
        }
        return;
    }
    if (kind === 'index_lag_snapshot') {
        const r = await ctx.db.query(`SELECT count(*) FILTER (WHERE status = 'pending')::text AS pending,
              count(*) FILTER (WHERE status = 'failed')::text AS failed,
              count(*) FILTER (WHERE status = 'indexed')::text AS indexed,
              EXTRACT(EPOCH FROM (now() - MIN(updated_at)))::text AS oldest
       FROM marketplace.listing_search`);
        const row = r.rows[0];
        ctx.log('index_lag_snapshot', {
            pending: Number(row?.pending ?? '0'),
            failed: Number(row?.failed ?? '0'),
            indexed: Number(row?.indexed ?? '0'),
            oldestPendingSeconds: row?.oldest != null ? Math.round(Number(row.oldest)) : null,
        });
        return;
    }
    throw new Error(`UNKNOWN_ANALYTICS_JOB: ${kind}`);
}
