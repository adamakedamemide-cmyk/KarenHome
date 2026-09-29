import { Injectable, NotFoundException } from '@nestjs/common';
import { AdvertisingRepository } from '@platform/db';

/** Campaign administration (§8) — placement/targeting/budget management. */
@Injectable()
export class AdvertisingAdminService {
  constructor(private readonly ads: AdvertisingRepository) {}

  async listSlots() {
    return this.ads.listSlots();
  }

  async createAdvertiser(input: { organizationId: string; name: string; contact?: Record<string, unknown> | undefined }): Promise<{ id: string }> {
    return { id: await this.ads.createAdvertiser(input) };
  }

  async createCampaign(input: { advertiserId: string; name: string; startAt: string; endAt: string; pricingModel?: string | undefined; priceAmount?: string | undefined; currencyCode?: string | undefined }): Promise<{ id: string }> {
    const startAt = new Date(input.startAt);
    const endAt = new Date(input.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      throw new NotFoundException({ code: 'VALIDATION_ERROR', message: 'Invalid campaign window' });
    }
    return {
      id: await this.ads.createCampaign({
        advertiserId: input.advertiserId,
        name: input.name,
        startAt,
        endAt,
        pricingModel: (input.pricingModel as 'CPM' | 'CPC' | 'FIXED' | 'UNDECIDED') ?? 'UNDECIDED',
        priceAmount: input.priceAmount ?? null,
        currencyCode: input.currencyCode ?? null,
      }),
    };
  }

  async setCampaignStatus(id: string, status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'ENDED' | 'REJECTED'): Promise<void> {
    await this.ads.setCampaignStatus(id, status);
  }

  async createCreative(input: { campaignId: string; name: string; targetUrl: string; mediaAssetId?: string | undefined }): Promise<{ id: string }> {
    return { id: await this.ads.createCreative({ campaignId: input.campaignId, name: input.name, targetUrl: input.targetUrl, mediaAssetId: input.mediaAssetId ?? null }) };
  }

  async upsertTarget(input: { campaignId: string; dimension: string; operator?: string | undefined; value: unknown; weight?: string | undefined }): Promise<void> {
    await this.ads.upsertTarget({
      campaignId: input.campaignId,
      dimension: input.dimension as 'PAGE_TYPE',
      operator: (input.operator as 'IN' | 'NOT_IN' | 'EQUALS') ?? 'IN',
      value: input.value ?? {},
      weight: input.weight ? Number(input.weight) : 1,
    });
  }

  async createBudget(input: { campaignId: string; budgetType: 'TOTAL' | 'DAILY' | 'MONTHLY'; limitAmount: string; currencyCode: string }): Promise<{ id: string }> {
    return { id: await this.ads.createBudget(input) };
  }

  async report(campaignId: string, date: string): Promise<{ aggregates: { impressions: number; clicks: number; validClicks: number } }> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new NotFoundException({ code: 'VALIDATION_ERROR', message: 'date must be YYYY-MM-DD' });
    const aggregates = await this.ads.dailyAggregates(campaignId, date);
    return { aggregates };
  }
}
