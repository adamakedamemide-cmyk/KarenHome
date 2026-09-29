import { PostgresDatabase, type QueryExecutor } from './postgres-database';
export interface AdSlot {
    id: string;
    code: string;
    placement: string;
    device: string;
    isActive: boolean;
}
export interface CampaignCandidate {
    campaignId: string;
    creativeId: string;
    pricingModel: string;
    priceAmount: string | null;
    currencyCode: string | null;
    weight: number;
}
/**
 * Advertising MVP persistence (migration 0028). No auction/RTB — deterministic
 * weight-ordered selection among active campaigns. Anti-fraud integrity:
 * impression dedup via partial unique index, fraud scores stored on events,
 * budget guard enforced by DB trigger (BUDGET_EXCEEDED).
 */
export declare class AdvertisingRepository {
    private readonly db;
    constructor(db: PostgresDatabase);
    getSlotByCode(code: string): Promise<AdSlot | null>;
    listSlots(): Promise<AdSlot[]>;
    createAdvertiser(input: {
        organizationId: string;
        name: string;
        contact?: Record<string, unknown> | undefined;
    }): Promise<string>;
    createCampaign(input: {
        advertiserId: string;
        name: string;
        startAt: Date;
        endAt: Date;
        pricingModel?: 'CPM' | 'CPC' | 'FIXED' | 'UNDECIDED';
        priceAmount?: string | null;
        currencyCode?: string | null;
    }): Promise<string>;
    setCampaignStatus(campaignId: string, status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'ENDED' | 'REJECTED'): Promise<void>;
    createBudget(input: {
        campaignId: string;
        budgetType: 'TOTAL' | 'DAILY' | 'MONTHLY';
        limitAmount: string;
        currencyCode: string;
    }): Promise<string>;
    /** Spend accrual — row-locked; DB trigger raises BUDGET_EXCEEDED on overflow. */
    accrueSpend(campaignId: string, budgetType: 'TOTAL' | 'DAILY' | 'MONTHLY', amount: string): Promise<void>;
    getBudgets(campaignId: string): Promise<Array<{
        budgetType: string;
        limitAmount: string;
        spentAmount: string;
        currencyCode: string;
    }>>;
    createCreative(input: {
        campaignId: string;
        name: string;
        targetUrl: string;
        mediaAssetId?: string | null;
    }): Promise<string>;
    upsertTarget(input: {
        campaignId: string;
        dimension: 'COUNTRY' | 'CITY' | 'DISTRICT' | 'PAGE_TYPE' | 'PROPERTY_TYPE' | 'AUDIENCE_SEGMENT' | 'DEVICE' | 'LANGUAGE' | 'TIME_WINDOW';
        operator?: 'IN' | 'NOT_IN' | 'EQUALS';
        value: unknown;
        weight?: number;
    }): Promise<void>;
    /** Deterministic candidate selection for a slot (no auction): window, status, approved creative, budget headroom. */
    findCampaignCandidates(slotId: string, pageType: string, now: Date): Promise<CampaignCandidate[]>;
    /**
     * Record an impression with minute-level dedup. First attempt counted=true;
     * on unique violation (same session+creative+minute) re-insert counted=false
     * so the event is still auditable but not billable.
     */
    recordImpression(input: {
        campaignId: string;
        creativeId: string;
        slotId: string;
        sessionHash: string;
        ipHash?: string | null;
        userAgentHash?: string | null;
        locale?: string | null;
        pageType: string;
        geoNodeId?: string | null;
        fraudScore: number;
    }): Promise<{
        id: string;
        counted: boolean;
    }>;
    recordClick(input: {
        impressionId: string;
        ipHash?: string | null;
        userAgentHash?: string | null;
        referer?: string | null;
        fraudScore: number;
        isValid: boolean;
        rejectReason?: string | null;
    }): Promise<string>;
    getImpression(impressionId: string, executor?: QueryExecutor): Promise<{
        id: string;
        campaignId: string;
        creativeId: string;
        servedAt: Date;
        isCounted: boolean;
        fraudScore: string;
    } | null>;
    getCreative(creativeId: string): Promise<{
        id: string;
        campaignId: string;
        targetUrl: string;
        status: string;
    } | null>;
    listCampaignIds(limit?: number): Promise<string[]>;
    upsertDailyReport(input: {
        campaignId: string;
        reportDate: string;
        impressions: number;
        clicks: number;
        validClicks: number;
        spend: string;
        currencyCode: string;
    }): Promise<void>;
    dailyAggregates(campaignId: string, reportDate: string): Promise<{
        impressions: number;
        clicks: number;
        validClicks: number;
    }>;
    getCampaign(campaignId: string): Promise<{
        id: string;
        pricingModel: string;
        priceAmount: string | null;
        currencyCode: string | null;
        status: string;
    } | null>;
}
