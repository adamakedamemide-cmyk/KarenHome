import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AdvertisingRepository, IamRepository } from '@platform/db';
import type { AuthenticatedUser } from '@platform/contracts';

/**
 * Caller context for admin operations — the authenticated actor plus the
 * organization scope sent by the client (x-organization-id header).
 */
export interface AdminContext {
  actor: AuthenticatedUser;
  organizationId?: string | undefined;
}

/**
 * Campaign administration (§8) — placement/targeting/budget management.
 *
 * Gate 4.1 (Phase E/H fix): every admin operation now enforces
 *   1. a permission requirement (advertising.manage) — enforced by
 *      PermissionsGuard at the controller boundary, and
 *   2. organization isolation — the resource's owning organization must match
 *      the caller's declared organization scope, unless the caller holds the
 *      platform.admin permission (resolved through the 0030 engine).
 */
@Injectable()
export class AdvertisingAdminService {
  constructor(
    private readonly ads: AdvertisingRepository,
    private readonly iam: IamRepository,
  ) {}

  async listSlots() {
    return this.ads.listSlots();
  }

  private async authorizeOrganization(ctx: AdminContext, resourceOrganizationId: string): Promise<void> {
    const permissions = await this.iam.listPermissionCodesForUser(ctx.actor.id, ctx.organizationId ?? resourceOrganizationId);
    if (permissions.includes('platform.admin')) return;
    if (!ctx.organizationId || ctx.organizationId !== resourceOrganizationId) {
      throw new ForbiddenException({ code: 'RESOURCE_NOT_OWNED', message: 'Resource belongs to another organization' });
    }
  }

  async createAdvertiser(ctx: AdminContext, input: { organizationId: string; name: string; contact?: Record<string, unknown> | undefined }): Promise<{ id: string }> {
    await this.authorizeOrganization(ctx, input.organizationId);
    return { id: await this.ads.createAdvertiser(input) };
  }

  async createCampaign(ctx: AdminContext, input: { advertiserId: string; name: string; startAt: string; endAt: string; pricingModel?: string | undefined; priceAmount?: string | undefined; currencyCode?: string | undefined }): Promise<{ id: string }> {
    const advertiser = await this.ads.advertiserOrganization(input.advertiserId);
    if (!advertiser) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Advertiser not found' });
    await this.authorizeOrganization(ctx, advertiser.organizationId);
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

  async setCampaignStatus(ctx: AdminContext, id: string, status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'ENDED' | 'REJECTED'): Promise<void> {
    await this.authorizeCampaign(ctx, id);
    await this.ads.setCampaignStatus(id, status);
  }

  async createCreative(ctx: AdminContext, input: { campaignId: string; name: string; targetUrl: string; mediaAssetId?: string | undefined }): Promise<{ id: string }> {
    await this.authorizeCampaign(ctx, input.campaignId);
    return { id: await this.ads.createCreative({ campaignId: input.campaignId, name: input.name, targetUrl: input.targetUrl, mediaAssetId: input.mediaAssetId ?? null }) };
  }

  async upsertTarget(ctx: AdminContext, input: { campaignId: string; dimension: string; operator?: string | undefined; value: unknown; weight?: string | undefined }): Promise<void> {
    await this.authorizeCampaign(ctx, input.campaignId);
    await this.ads.upsertTarget({
      campaignId: input.campaignId,
      dimension: input.dimension as 'PAGE_TYPE',
      operator: (input.operator as 'IN' | 'NOT_IN' | 'EQUALS') ?? 'IN',
      value: input.value ?? {},
      weight: input.weight ? Number(input.weight) : 1,
    });
  }

  async createBudget(ctx: AdminContext, input: { campaignId: string; budgetType: 'TOTAL' | 'DAILY' | 'MONTHLY'; limitAmount: string; currencyCode: string }): Promise<{ id: string }> {
    await this.authorizeCampaign(ctx, input.campaignId);
    return { id: await this.ads.createBudget(input) };
  }

  async report(ctx: AdminContext, campaignId: string, date: string): Promise<{ aggregates: { impressions: number; clicks: number; validClicks: number } }> {
    await this.authorizeCampaign(ctx, campaignId);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new NotFoundException({ code: 'VALIDATION_ERROR', message: 'date must be YYYY-MM-DD' });
    const aggregates = await this.ads.dailyAggregates(campaignId, date);
    return { aggregates };
  }

  private async authorizeCampaign(ctx: AdminContext, campaignId: string): Promise<void> {
    const org = await this.ads.campaignOrganization(campaignId);
    if (!org) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Campaign not found' });
    await this.authorizeOrganization(ctx, org.organizationId);
  }
}
