import { createHash } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { AdvertisingRepository, AntiBotRepository } from '@platform/db';

export interface ServeAdInput {
  slotCode: string;
  sessionHash: string;
  ip: string;
  userAgent?: string | undefined;
  locale?: string | undefined;
  pageType: string;
  geoNodeId?: string | undefined;
}

export interface ServedAd {
  served: true;
  impressionId: string;
  campaignId: string;
  creativeId: string;
  targetUrl: string;
  counted: boolean;
  fraudScore: number;
}

/**
 * Gate 4 §8 — Advertising MVP application service.
 * Placements: homepage / search / listing detail / agency / agent / project /
 * geo pages (11 seeded slots). No auction/RTB — deterministic weight-ordered
 * selection. Anti-fraud by construction: session burst scoring, minute-level
 * impression dedup (partial unique index), click validity window, budget
 * guard enforced by DB trigger (BUDGET_EXCEEDED).
 */
@Injectable()
export class AdvertisingService {
  constructor(
    private readonly ads: AdvertisingRepository,
    private readonly antiBot: AntiBotRepository,
  ) {}

  async serve(input: ServeAdInput): Promise<ServedAd | { served: false; code: 'AD_NOT_SERVED' }> {
    const slot = await this.ads.getSlotByCode(input.slotCode);
    if (!slot || !slot.isActive) return { served: false, code: 'AD_NOT_SERVED' };

    const candidates = await this.ads.findCampaignCandidates(slot.id, input.pageType, new Date());
    const candidate = candidates[0];
    if (!candidate) return { served: false as const, code: 'AD_NOT_SERVED' as const };

    // Impression integrity (§8): burst velocity per session in the last 60s.
    const burst = await this.antiBot.countRecentImpressionBurst(input.sessionHash, 60);
    const fraudScore = Math.min(1, burst >= 30 ? 0.9 : burst >= 10 ? 0.6 : burst >= 5 ? 0.3 : 0);

    const impression = await this.ads.recordImpression({
      campaignId: candidate.campaignId,
      creativeId: candidate.creativeId,
      slotId: slot.id,
      sessionHash: input.sessionHash,
      ipHash: hash32(input.ip),
      userAgentHash: input.userAgent ? hash32(input.userAgent) : null,
      locale: input.locale ?? null,
      pageType: input.pageType,
      geoNodeId: input.geoNodeId ?? null,
      fraudScore,
    });

    const creative = await this.ads.getCreative(candidate.creativeId);
    return {
      served: true as const,
      impressionId: impression.id,
      campaignId: candidate.campaignId,
      creativeId: candidate.creativeId,
      targetUrl: creative?.targetUrl ?? '',
      counted: impression.counted,
      fraudScore,
    };
  }

  async click(impressionId: string, input: { ip: string; userAgent?: string | undefined; referer?: string | undefined }): Promise<{ accepted: boolean; reason?: string }> {
    const impression = await this.ads.getImpression(impressionId);
    if (!impression) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Impression not found' });
    const ageMs = Date.now() - impression.servedAt.getTime();
    const withinWindow = ageMs > 0 && ageMs < 10 * 60_000;
    const lowFraud = Number(impression.fraudScore) < 0.8;
    const isValid = withinWindow && lowFraud;
    await this.ads.recordClick({
      impressionId,
      ipHash: hash32(input.ip),
      userAgentHash: input.userAgent ? hash32(input.userAgent) : null,
      referer: input.referer ?? null,
      fraudScore: Number(impression.fraudScore),
      isValid,
      rejectReason: isValid ? null : withinWindow ? 'stale_impression' : 'high_fraud_score',
    });
    if (!isValid) return { accepted: false, reason: withinWindow ? 'stale_impression' : 'high_fraud_score' };

    const campaign = await this.ads.getCampaign(impression.campaignId);
    if (!campaign) return { accepted: true };
    if (campaign.pricingModel === 'CPC' && campaign.priceAmount) {
      try {
        await this.ads.accrueSpend(campaign.id, 'TOTAL', campaign.priceAmount);
        await this.ads.accrueSpend(campaign.id, 'DAILY', campaign.priceAmount).catch(() => undefined);
      } catch (error) {
        if (error instanceof Error && error.message.includes('BUDGET_EXCEEDED')) {
          return { accepted: false, reason: 'BUDGET_EXCEEDED' };
        }
        throw error;
      }
    }
    return { accepted: true };
  }

  /** Daily rollup for one campaign (also used by AnalyticsWorker). */
  async rollupDaily(campaignId: string, reportDate: string): Promise<void> {
    const campaign = await this.ads.getCampaign(campaignId);
    if (!campaign) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Campaign not found' });
    const aggregates = await this.ads.dailyAggregates(campaignId, reportDate);
    let spend = '0';
    if (campaign.pricingModel === 'CPM' && campaign.priceAmount) {
      spend = ((aggregates.impressions * Number(campaign.priceAmount)) / 1000).toFixed(4);
    } else if (campaign.pricingModel === 'CPC' && campaign.priceAmount) {
      spend = (aggregates.validClicks * Number(campaign.priceAmount)).toFixed(4);
    }
    await this.ads.upsertDailyReport({
      campaignId,
      reportDate,
      impressions: aggregates.impressions,
      clicks: aggregates.clicks,
      validClicks: aggregates.validClicks,
      spend,
      currencyCode: campaign.currencyCode ?? 'USD',
    });
  }
}

function hash32(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}
