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

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === '23505';
}

/**
 * Advertising MVP persistence (migration 0028). No auction/RTB — deterministic
 * weight-ordered selection among active campaigns. Anti-fraud integrity:
 * impression dedup via partial unique index, fraud scores stored on events,
 * budget guard enforced by DB trigger (BUDGET_EXCEEDED).
 */
export class AdvertisingRepository {
  constructor(private readonly db: PostgresDatabase) {}

  async getSlotByCode(code: string): Promise<AdSlot | null> {
    const r = await this.db.query<{ id: string; code: string; placement: string; device: string; is_active: boolean }>(
      `SELECT id, code, placement::text AS placement, device::text AS device, is_active FROM advertising.ad_slots WHERE code = $1`,
      [code],
    );
    const row = r.rows[0];
    return row ? { id: row.id, code: row.code, placement: row.placement, device: row.device, isActive: row.is_active } : null;
  }

  async listSlots(): Promise<AdSlot[]> {
    const r = await this.db.query<{ id: string; code: string; placement: string; device: string; is_active: boolean }>(
      `SELECT id, code, placement::text AS placement, device::text AS device, is_active FROM advertising.ad_slots WHERE is_active ORDER BY code`,
    );
    return r.rows.map((row) => ({ id: row.id, code: row.code, placement: row.placement, device: row.device, isActive: row.is_active }));
  }

  async createAdvertiser(input: { organizationId: string; name: string; contact?: Record<string, unknown> | undefined }): Promise<string> {
    const r = await this.db.query<{ id: string }>(
      `INSERT INTO advertising.advertisers(organization_id, name, contact, status)
       VALUES ($1::uuid, $2, $3::jsonb, 'ACTIVE') RETURNING id`,
      [input.organizationId, input.name, JSON.stringify(input.contact ?? {})],
    );
    const id = r.rows[0]?.id;
    if (!id) throw new Error('ADVERTISER_CREATE_FAILED');
    return id;
  }

  async createCampaign(input: {
    advertiserId: string; name: string; startAt: Date; endAt: Date;
    pricingModel?: 'CPM' | 'CPC' | 'FIXED' | 'UNDECIDED'; priceAmount?: string | null; currencyCode?: string | null;
  }): Promise<string> {
    const r = await this.db.query<{ id: string }>(
      `INSERT INTO advertising.campaigns(advertiser_id, name, start_at, end_at, pricing_model, price_amount, currency_code)
       VALUES ($1::uuid, $2, $3::timestamptz, $4::timestamptz, $5, $6::numeric, $7)
       RETURNING id`,
      [input.advertiserId, input.name, input.startAt, input.endAt, input.pricingModel ?? 'UNDECIDED', input.priceAmount ?? null, input.currencyCode ?? null],
    );
    const id = r.rows[0]?.id;
    if (!id) throw new Error('CAMPAIGN_CREATE_FAILED');
    return id;
  }

  async setCampaignStatus(campaignId: string, status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'ENDED' | 'REJECTED'): Promise<void> {
    await this.db.query(`UPDATE advertising.campaigns SET status = $2, updated_at = now() WHERE id = $1::uuid`, [campaignId, status]);
  }

  async createBudget(input: { campaignId: string; budgetType: 'TOTAL' | 'DAILY' | 'MONTHLY'; limitAmount: string; currencyCode: string }): Promise<string> {
    const r = await this.db.query<{ id: string }>(
      `INSERT INTO advertising.budgets(campaign_id, budget_type, limit_amount, currency_code)
       VALUES ($1::uuid, $2, $3::numeric, $4) RETURNING id`,
      [input.campaignId, input.budgetType, input.limitAmount, input.currencyCode],
    );
    const id = r.rows[0]?.id;
    if (!id) throw new Error('BUDGET_CREATE_FAILED');
    return id;
  }

  /** Spend accrual — row-locked; DB trigger raises BUDGET_EXCEEDED on overflow. */
  async accrueSpend(campaignId: string, budgetType: 'TOTAL' | 'DAILY' | 'MONTHLY', amount: string): Promise<void> {
    await this.db.query(
      `UPDATE advertising.budgets SET spent_amount = spent_amount + $3::numeric
       WHERE campaign_id = $1::uuid AND budget_type = $2`,
      [campaignId, budgetType, amount],
    );
  }

  async getBudgets(campaignId: string): Promise<Array<{ budgetType: string; limitAmount: string; spentAmount: string; currencyCode: string }>> {
    const r = await this.db.query<{ budget_type: string; limit_amount: string; spent_amount: string; currency_code: string }>(
      `SELECT budget_type::text AS budget_type, limit_amount::text AS limit_amount, spent_amount::text AS spent_amount, currency_code
       FROM advertising.budgets WHERE campaign_id = $1::uuid`,
      [campaignId],
    );
    return r.rows.map((row) => ({ budgetType: row.budget_type, limitAmount: row.limit_amount, spentAmount: row.spent_amount, currencyCode: row.currency_code }));
  }

  async createCreative(input: { campaignId: string; name: string; targetUrl: string; mediaAssetId?: string | null }): Promise<string> {
    const r = await this.db.query<{ id: string }>(
      `INSERT INTO advertising.creatives(campaign_id, name, target_url, media_asset_id, status)
       VALUES ($1::uuid, $2, $3, $4::uuid, 'APPROVED') RETURNING id`,
      [input.campaignId, input.name, input.targetUrl, input.mediaAssetId ?? null],
    );
    const id = r.rows[0]?.id;
    if (!id) throw new Error('CREATIVE_CREATE_FAILED');
    return id;
  }

  async upsertTarget(input: { campaignId: string; dimension: 'COUNTRY' | 'CITY' | 'DISTRICT' | 'PAGE_TYPE' | 'PROPERTY_TYPE' | 'AUDIENCE_SEGMENT' | 'DEVICE' | 'LANGUAGE' | 'TIME_WINDOW'; operator?: 'IN' | 'NOT_IN' | 'EQUALS'; value: unknown; weight?: number }): Promise<void> {
    await this.db.query(
      `INSERT INTO advertising.targets(campaign_id, dimension, operator, value, weight)
       VALUES ($1::uuid, $2, $3, $4::jsonb, $5)
       ON CONFLICT (campaign_id, dimension) DO UPDATE SET value = EXCLUDED.value, weight = EXCLUDED.weight, operator = EXCLUDED.operator`,
      [input.campaignId, input.dimension, input.operator ?? 'IN', JSON.stringify(input.value ?? {}), input.weight ?? 1],
    );
  }

  /** Deterministic candidate selection for a slot (no auction): window, status, approved creative, budget headroom. */
  async findCampaignCandidates(slotId: string, pageType: string, now: Date): Promise<CampaignCandidate[]> {
    const r = await this.db.query<{
      campaign_id: string; creative_id: string; pricing_model: string; price_amount: string | null; currency_code: string | null; weight: string;
    }>(
      `WITH live AS (
         SELECT c.id AS campaign_id, c.pricing_model::text AS pricing_model, c.price_amount::text AS price_amount, c.currency_code,
                COALESCE((SELECT SUM((t.weight)::numeric) FROM advertising.targets t WHERE t.campaign_id = c.id), 0) AS weight
         FROM advertising.campaigns c
         WHERE c.status = 'ACTIVE' AND c.start_at <= $2::timestamptz AND c.end_at > $2::timestamptz
           AND EXISTS (SELECT 1 FROM advertising.creatives cr WHERE cr.campaign_id = c.id AND cr.status = 'APPROVED')
           AND NOT EXISTS (
             SELECT 1 FROM advertising.budgets b
             WHERE b.campaign_id = c.id AND b.spent_amount >= b.limit_amount
           )
           AND (
             NOT EXISTS (SELECT 1 FROM advertising.targets t WHERE t.campaign_id = c.id AND t.dimension = 'PAGE_TYPE')
             OR EXISTS (
               SELECT 1 FROM advertising.targets t
               WHERE t.campaign_id = c.id AND t.dimension = 'PAGE_TYPE'
                 AND (t.value->'values') @> to_jsonb($3::text)
             )
           )
       )
       SELECT l.campaign_id, cr.id AS creative_id, l.pricing_model, l.price_amount, l.currency_code, l.weight::text AS weight
       FROM live l
       JOIN advertising.creatives cr ON cr.campaign_id = l.campaign_id AND cr.status = 'APPROVED'
       JOIN advertising.ad_slots s ON s.id = $1::uuid
       ORDER BY l.weight DESC, l.campaign_id
       LIMIT 20`,
      [slotId, now, pageType],
    );
    return r.rows.map((row) => ({
      campaignId: row.campaign_id, creativeId: row.creative_id, pricingModel: row.pricing_model,
      priceAmount: row.price_amount, currencyCode: row.currency_code, weight: Number(row.weight ?? '0'),
    }));
  }

  /**
   * Record an impression with minute-level dedup. First attempt counted=true;
   * on unique violation (same session+creative+minute) re-insert counted=false
   * so the event is still auditable but not billable.
   */
  async recordImpression(input: {
    campaignId: string; creativeId: string; slotId: string; sessionHash: string; ipHash?: string | null; userAgentHash?: string | null;
    locale?: string | null; pageType: string; geoNodeId?: string | null; fraudScore: number;
  }): Promise<{ id: string; counted: boolean }> {
    try {
      const r = await this.db.query<{ id: string }>(
        `INSERT INTO advertising.impressions(campaign_id, creative_id, slot_id, session_hash, ip_hash, user_agent_hash, locale, page_type, geo_node_id, fraud_score, is_counted)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9::uuid, $10::numeric, true)
         RETURNING id`,
        [input.campaignId, input.creativeId, input.slotId, input.sessionHash, input.ipHash ?? null, input.userAgentHash ?? null, input.locale ?? null, input.pageType, input.geoNodeId ?? null, input.fraudScore],
      );
      const id = r.rows[0]?.id;
      if (!id) throw new Error('IMPRESSION_INSERT_FAILED');
      return { id, counted: true };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
    const r2 = await this.db.query<{ id: string }>(
      `INSERT INTO advertising.impressions(campaign_id, creative_id, slot_id, session_hash, ip_hash, user_agent_hash, locale, page_type, geo_node_id, fraud_score, is_counted)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9::uuid, $10::numeric, false)
       RETURNING id`,
      [input.campaignId, input.creativeId, input.slotId, input.sessionHash, input.ipHash ?? null, input.userAgentHash ?? null, input.locale ?? null, input.pageType, input.geoNodeId ?? null, input.fraudScore],
    );
    const id2 = r2.rows[0]?.id;
    if (!id2) throw new Error('IMPRESSION_INSERT_FAILED');
    return { id: id2, counted: false };
  }

  async recordClick(input: { impressionId: string; ipHash?: string | null; userAgentHash?: string | null; referer?: string | null; fraudScore: number; isValid: boolean; rejectReason?: string | null }): Promise<string> {
    const r = await this.db.query<{ id: string }>(
      `INSERT INTO advertising.clicks(impression_id, ip_hash, user_agent_hash, referer, fraud_score, is_valid, reject_reason)
       VALUES ($1::uuid, $2, $3, $4, $5::numeric, $6, $7) RETURNING id`,
      [input.impressionId, input.ipHash ?? null, input.userAgentHash ?? null, input.referer ?? null, input.fraudScore, input.isValid, input.rejectReason ?? null],
    );
    const id = r.rows[0]?.id;
    if (!id) throw new Error('CLICK_INSERT_FAILED');
    return id;
  }

  async getImpression(impressionId: string, executor: QueryExecutor = this.db): Promise<{ id: string; campaignId: string; creativeId: string; servedAt: Date; isCounted: boolean; fraudScore: string } | null> {
    const r = await executor.query<{ id: string; campaign_id: string; creative_id: string; served_at: Date; is_counted: boolean; fraud_score: string }>(
      `SELECT id, campaign_id, creative_id, served_at, is_counted, fraud_score::text AS fraud_score
       FROM advertising.impressions WHERE id = $1::uuid`,
      [impressionId],
    );
    const row = r.rows[0];
    return row ? { id: row.id, campaignId: row.campaign_id, creativeId: row.creative_id, servedAt: row.served_at, isCounted: row.is_counted, fraudScore: row.fraud_score } : null;
  }

  async getCreative(creativeId: string): Promise<{ id: string; campaignId: string; targetUrl: string; status: string } | null> {
    const r = await this.db.query<{ id: string; campaign_id: string; target_url: string; status: string }>(
      `SELECT id, campaign_id, target_url, status::text AS status FROM advertising.creatives WHERE id = $1::uuid`,
      [creativeId],
    );
    const row = r.rows[0];
    return row ? { id: row.id, campaignId: row.campaign_id, targetUrl: row.target_url, status: row.status } : null;
  }

  async listCampaignIds(limit = 200): Promise<string[]> {
    const r = await this.db.query<{ id: string }>(
      `SELECT id FROM advertising.campaigns ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    return r.rows.map((row) => row.id);
  }

  async upsertDailyReport(input: { campaignId: string; reportDate: string; impressions: number; clicks: number; validClicks: number; spend: string; currencyCode: string }): Promise<void> {
    await this.db.query(
      `INSERT INTO advertising.reports(campaign_id, report_date, impressions, clicks, valid_clicks, spend, currency_code)
       VALUES ($1::uuid, $2::date, $3, $4, $5, $6::numeric, $7)
       ON CONFLICT (campaign_id, report_date) DO UPDATE SET
         impressions = EXCLUDED.impressions, clicks = EXCLUDED.clicks, valid_clicks = EXCLUDED.valid_clicks,
         spend = EXCLUDED.spend, currency_code = EXCLUDED.currency_code`,
      [input.campaignId, input.reportDate, input.impressions, input.clicks, input.validClicks, input.spend, input.currencyCode],
    );
  }

  async dailyAggregates(campaignId: string, reportDate: string): Promise<{ impressions: number; clicks: number; validClicks: number }> {
    const r = await this.db.query<{ impressions: string; clicks: string; valid_clicks: string }>(
      `SELECT
         (SELECT count(*) FROM advertising.impressions i WHERE i.campaign_id = $1::uuid AND i.is_counted AND i.served_at::date = $2::date)::text AS impressions,
         (SELECT count(*) FROM advertising.clicks k JOIN advertising.impressions i ON i.id = k.impression_id WHERE i.campaign_id = $1::uuid AND k.clicked_at::date = $2::date)::text AS clicks,
         (SELECT count(*) FROM advertising.clicks k JOIN advertising.impressions i ON i.id = k.impression_id WHERE i.campaign_id = $1::uuid AND k.is_valid AND k.clicked_at::date = $2::date)::text AS valid_clicks`,
      [campaignId, reportDate],
    );
    const row = r.rows[0];
    return { impressions: Number(row?.impressions ?? '0'), clicks: Number(row?.clicks ?? '0'), validClicks: Number(row?.valid_clicks ?? '0') };
  }

  async getCampaign(campaignId: string): Promise<{ id: string; pricingModel: string; priceAmount: string | null; currencyCode: string | null; status: string } | null> {
    const r = await this.db.query<{ id: string; pricing_model: string; price_amount: string | null; currency_code: string | null; status: string }>(
      `SELECT id, pricing_model::text AS pricing_model, price_amount::text AS price_amount, currency_code, status::text AS status
       FROM advertising.campaigns WHERE id = $1::uuid`,
      [campaignId],
    );
    const row = r.rows[0];
    return row ? { id: row.id, pricingModel: row.pricing_model, priceAmount: row.price_amount, currencyCode: row.currency_code, status: row.status } : null;
  }
}
