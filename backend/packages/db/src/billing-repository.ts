import { PostgresDatabase } from './postgres-database';

export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface PlanVersion {
  id: string;
  planId: string;
  version: number;
  entitlements: Record<string, unknown>;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

export interface SubscriptionRecord {
  id: string;
  organizationId: string | null;
  userId: string | null;
  planVersionId: string | null;
  productPriceId: string | null;
  status: 'trialing' | 'active' | 'past_due' | 'paused' | 'cancelled' | 'expired';
  startedAt: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  autoRenew: boolean;
  cancelledAt: Date | null;
}

/**
 * Billing / Subscription persistence (frozen base billing.* + migration 0034).
 * Plan versioning discipline: subscriptions point to an immutable plan_version;
 * changing plans creates a NEW subscription row + events — historical rows are
 * never rewritten, so future plan changes cannot corrupt past subscriptions.
 */
export class BillingRepository {
  constructor(private readonly db: PostgresDatabase) {}

  async createPlan(input: { code: string; name: string; description?: string | undefined }): Promise<Plan> {
    const r = await this.db.query<{ id: string; code: string; name: string; description: string | null; is_active: boolean }>(
      `INSERT INTO billing.plans(code, name, description) VALUES ($1, $2, $3)
       RETURNING id, code, name, description, is_active`,
      [input.code, input.name, input.description ?? null],
    );
    const row = r.rows[0];
    if (!row) throw new Error('PLAN_CREATE_FAILED');
    return { id: row.id, code: row.code, name: row.name, description: row.description, isActive: row.is_active };
  }

  async listPlans(): Promise<Plan[]> {
    const r = await this.db.query<{ id: string; code: string; name: string; description: string | null; is_active: boolean }>(
      `SELECT id, code, name, description, is_active FROM billing.plans ORDER BY code`,
    );
    return r.rows.map((row) => ({ id: row.id, code: row.code, name: row.name, description: row.description, isActive: row.is_active }));
  }

  async getPlanByCode(code: string): Promise<Plan | null> {
    const r = await this.db.query<{ id: string; code: string; name: string; description: string | null; is_active: boolean }>(
      `SELECT id, code, name, description, is_active FROM billing.plans WHERE code = $1`,
      [code],
    );
    const row = r.rows[0];
    return row ? { id: row.id, code: row.code, name: row.name, description: row.description, isActive: row.is_active } : null;
  }

  async getPlanById(planId: string): Promise<Plan | null> {
    const r = await this.db.query<{ id: string; code: string; name: string; description: string | null; is_active: boolean }>(
      `SELECT id, code, name, description, is_active FROM billing.plans WHERE id = $1::uuid`,
      [planId],
    );
    const row = r.rows[0];
    return row ? { id: row.id, code: row.code, name: row.name, description: row.description, isActive: row.is_active } : null;
  }

  async listPlanVersions(planId: string, limit = 10): Promise<PlanVersion[]> {
    const r = await this.db.query<{ id: string; plan_id: string; version: number; entitlements: unknown; effective_from: Date; effective_to: Date | null }>(
      `SELECT id, plan_id, version, entitlements, effective_from, effective_to FROM billing.plan_versions
       WHERE plan_id = $1::uuid ORDER BY version DESC LIMIT $2`,
      [planId, limit],
    );
    return r.rows.map((row) => ({ id: row.id, planId: row.plan_id, version: row.version, entitlements: row.entitlements as Record<string, unknown>, effectiveFrom: row.effective_from, effectiveTo: row.effective_to }));
  }

  async createPlanVersion(input: { planId: string; version: number; entitlements: Record<string, unknown>; effectiveFrom: Date; effectiveTo?: Date | null }): Promise<PlanVersion> {
    const r = await this.db.query<{ id: string; plan_id: string; version: number; entitlements: unknown; effective_from: Date; effective_to: Date | null }>(
      `INSERT INTO billing.plan_versions(plan_id, version, entitlements, effective_from, effective_to)
       VALUES ($1::uuid, $2, $3::jsonb, $4::timestamptz, $5::timestamptz)
       RETURNING id, plan_id, version, entitlements, effective_from, effective_to`,
      [input.planId, input.version, JSON.stringify(input.entitlements), input.effectiveFrom, input.effectiveTo ?? null],
    );
    const row = r.rows[0];
    if (!row) throw new Error('PLAN_VERSION_CREATE_FAILED');
    return { id: row.id, planId: row.plan_id, version: row.version, entitlements: row.entitlements as Record<string, unknown>, effectiveFrom: row.effective_from, effectiveTo: row.effective_to };
  }

  async getPlanVersion(planVersionId: string): Promise<PlanVersion | null> {
    const r = await this.db.query<{ id: string; plan_id: string; version: number; entitlements: unknown; effective_from: Date; effective_to: Date | null }>(
      `SELECT id, plan_id, version, entitlements, effective_from, effective_to FROM billing.plan_versions WHERE id = $1::uuid`,
      [planVersionId],
    );
    const row = r.rows[0];
    return row ? { id: row.id, planId: row.plan_id, version: row.version, entitlements: row.entitlements as Record<string, unknown>, effectiveFrom: row.effective_from, effectiveTo: row.effective_to } : null;
  }

  async createSubscription(input: {
    userId?: string | null; organizationId?: string | null; planVersionId?: string | null;
    productPriceId: string;
    currentPeriodStart: Date; currentPeriodEnd: Date; eventType: string;
  }): Promise<SubscriptionRecord> {
    if ((input.userId ? 1 : 0) + (input.organizationId ? 1 : 0) !== 1) throw new Error('SUBSCRIPTION_SUBJECT_REQUIRED');
    return this.db.transaction(async (client) => {
      const r = await client.query<{
        id: string; organization_id: string | null; user_id: string | null; plan_version_id: string | null; product_price_id: string | null;
        status: SubscriptionRecord['status']; started_at: Date; current_period_start: Date; current_period_end: Date;
        auto_renew: boolean; cancelled_at: Date | null;
      }>(
        `INSERT INTO billing.subscriptions(organization_id, user_id, plan_version_id, product_price_id, status, started_at, current_period_start, current_period_end)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'active', now(), $5::timestamptz, $6::timestamptz)
         RETURNING id, organization_id, user_id, plan_version_id, product_price_id, status, started_at,
                   current_period_start, current_period_end, auto_renew, cancelled_at`,
        [input.organizationId ?? null, input.userId ?? null, input.planVersionId ?? null, input.productPriceId, input.currentPeriodStart, input.currentPeriodEnd],
      );
      const row = r.rows[0];
      if (!row) throw new Error('SUBSCRIPTION_CREATE_FAILED');
      await client.query(
        `INSERT INTO billing.subscription_events(subscription_id, event_type, payload)
         VALUES ($1::uuid, $2, $3::jsonb)`,
        [row.id, input.eventType, JSON.stringify({ planVersionId: input.planVersionId ?? null, periodStart: input.currentPeriodStart, periodEnd: input.currentPeriodEnd })],
      );
      return this.mapSubscription(row);
    });
  }

  async getActiveSubscription(subject: { userId?: string | null; organizationId?: string | null }): Promise<SubscriptionRecord | null> {
    const clause = subject.organizationId ? 'organization_id = $1::uuid' : 'user_id = $1::uuid';
    const r = await this.db.query<{
      id: string; organization_id: string | null; user_id: string | null; plan_version_id: string | null; product_price_id: string | null;
      status: SubscriptionRecord['status']; started_at: Date; current_period_start: Date; current_period_end: Date;
      auto_renew: boolean; cancelled_at: Date | null;
    }>(
      `SELECT id, organization_id, user_id, plan_version_id, product_price_id, status, started_at,
              current_period_start, current_period_end, auto_renew, cancelled_at
       FROM billing.subscriptions WHERE ${clause} AND status IN ('trialing','active','past_due')
       ORDER BY started_at DESC LIMIT 1`,
      [subject.organizationId ?? subject.userId ?? ''],
    );
    const row = r.rows[0];
    return row ? this.mapSubscription(row) : null;
  }

  async getSubscriptionById(subscriptionId: string): Promise<SubscriptionRecord | null> {
    const r = await this.db.query<{
      id: string; organization_id: string | null; user_id: string | null; plan_version_id: string | null; product_price_id: string | null;
      status: SubscriptionRecord['status']; started_at: Date; current_period_start: Date; current_period_end: Date;
      auto_renew: boolean; cancelled_at: Date | null;
    }>(
      `SELECT id, organization_id, user_id, plan_version_id, product_price_id, status, started_at,
              current_period_start, current_period_end, auto_renew, cancelled_at
       FROM billing.subscriptions WHERE id = $1::uuid`,
      [subscriptionId],
    );
    const row = r.rows[0];
    return row ? this.mapSubscription(row) : null;
  }

  /** Change plan: historical subscription is closed (cancelled), a new one is opened. */
  async changePlan(input: { subscriptionId: string; newPlanVersionId: string; periodStart: Date; periodEnd: Date; reason?: string | undefined }): Promise<SubscriptionRecord> {
    return this.db.transaction(async (client) => {
      const current = await client.query<{ id: string; organization_id: string | null; user_id: string | null; product_price_id: string | null }>(
        `SELECT id, organization_id, user_id, product_price_id FROM billing.subscriptions WHERE id = $1::uuid FOR UPDATE`,
        [input.subscriptionId],
      );
      const row = current.rows[0];
      if (!row) throw new Error('SUBSCRIPTION_NOT_FOUND');
      await client.query(
        `UPDATE billing.subscriptions SET status = 'cancelled', cancelled_at = now() WHERE id = $1::uuid AND status IN ('trialing','active','past_due')`,
        [input.subscriptionId],
      );
      await client.query(
        `INSERT INTO billing.subscription_events(subscription_id, event_type, payload)
         VALUES ($1::uuid, 'PLAN_CHANGED', $2::jsonb)`,
        [input.subscriptionId, JSON.stringify({ reason: input.reason ?? null, newPlanVersionId: input.newPlanVersionId })],
      );
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO billing.subscriptions(organization_id, user_id, plan_version_id, product_price_id, status, started_at, current_period_start, current_period_end)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'active', now(), $5::timestamptz, $6::timestamptz)
         RETURNING id`,
        [row.organization_id, row.user_id, input.newPlanVersionId, row.product_price_id, input.periodStart, input.periodEnd],
      );
      const newId = inserted.rows[0]?.id;
      if (!newId) throw new Error('SUBSCRIPTION_CHANGE_FAILED');
      await client.query(
        `INSERT INTO billing.subscription_events(subscription_id, event_type, payload)
         VALUES ($1::uuid, 'SUBSCRIBED', $2::jsonb)`,
        [newId, JSON.stringify({ planVersionId: input.newPlanVersionId, previousSubscriptionId: input.subscriptionId })],
      );
      const created = await client.query<{
        id: string; organization_id: string | null; user_id: string | null; plan_version_id: string | null; product_price_id: string | null;
        status: SubscriptionRecord['status']; started_at: Date; current_period_start: Date; current_period_end: Date;
        auto_renew: boolean; cancelled_at: Date | null;
      }>(`SELECT id, organization_id, user_id, plan_version_id, product_price_id, status, started_at,
                 current_period_start, current_period_end, auto_renew, cancelled_at FROM billing.subscriptions WHERE id = $1::uuid`, [newId]);
      const row2 = created.rows[0];
      if (!row2) throw new Error('SUBSCRIPTION_CHANGE_FAILED');
      return this.mapSubscription(row2);
    });
  }

  async cancelSubscription(subscriptionId: string, reason?: string | undefined): Promise<void> {
    await this.db.transaction(async (client) => {
      await client.query(
        `UPDATE billing.subscriptions SET status = 'cancelled', cancelled_at = now(), auto_renew = false
         WHERE id = $1::uuid AND status IN ('trialing','active','past_due')`,
        [subscriptionId],
      );
      await client.query(
        `INSERT INTO billing.subscription_events(subscription_id, event_type, payload)
         VALUES ($1::uuid, 'CANCELLED', $2::jsonb)`,
        [subscriptionId, JSON.stringify({ reason: reason ?? null })],
      );
    });
  }

  async listSubscriptionEvents(subscriptionId: string, limit = 50): Promise<Array<{ id: string; eventType: string; payload: Record<string, unknown>; createdAt: Date }>> {
    const r = await this.db.query<{ id: string; event_type: string; payload: unknown; created_at: Date }>(
      `SELECT id, event_type, payload, created_at FROM billing.subscription_events
       WHERE subscription_id = $1::uuid ORDER BY created_at DESC LIMIT $2`,
      [subscriptionId, limit],
    );
    return r.rows.map((row) => ({ id: row.id, eventType: row.event_type, payload: (row.payload ?? {}) as Record<string, unknown>, createdAt: row.created_at }));
  }

  private mapSubscription(row: {
    id: string; organization_id: string | null; user_id: string | null; plan_version_id: string | null; product_price_id: string | null;
    status: SubscriptionRecord['status']; started_at: Date; current_period_start: Date; current_period_end: Date;
    auto_renew: boolean; cancelled_at: Date | null;
  }): SubscriptionRecord {
    return {
      id: row.id, organizationId: row.organization_id, userId: row.user_id, planVersionId: row.plan_version_id,
      productPriceId: row.product_price_id, status: row.status, startedAt: row.started_at,
      currentPeriodStart: row.current_period_start, currentPeriodEnd: row.current_period_end,
      autoRenew: row.auto_renew, cancelledAt: row.cancelled_at,
    };
  }
}
