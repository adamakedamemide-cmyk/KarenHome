import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BillingRepository, IamRepository, OutboxRepository, type Plan, type PlanVersion, type SubscriptionRecord } from '@platform/db';
import type { AuthenticatedUser } from '@platform/contracts';
import { BillingAdminGuard } from './billing-admin.guard';

export interface EntitlementResolution {
  active: boolean;
  planCode: string | null;
  planVersion: number | null;
  entitlements: Record<string, unknown>;
  subscriptionId: string | null;
}

/**
 * Gate 4 §14 — Subscription application service.
 * Plan versioning discipline: a subscription is bound to ONE immutable plan
 * version; plan changes open a NEW subscription row and emit events. Future
 * plan versions never rewrite historical subscriptions (§14 hard rule).
 */
@Injectable()
export class BillingService {
  constructor(
    private readonly billing: BillingRepository,
    private readonly iam: IamRepository,
    private readonly outbox: OutboxRepository,
    private readonly adminGuard: BillingAdminGuard,
  ) {}

  async listPlans(): Promise<Plan[]> {
    return this.billing.listPlans();
  }

  async createPlan(input: { code: string; name: string; description?: string }, actor: AuthenticatedUser): Promise<Plan> {
    await this.adminGuard.requirePlatformAdmin(actor);
    return this.billing.createPlan(input);
  }

  async createPlanVersion(input: { planCode: string; version: number; entitlements: Record<string, unknown>; effectiveFrom?: string }, actor: AuthenticatedUser): Promise<PlanVersion> {
    await this.adminGuard.requirePlatformAdmin(actor);
    const plan = await this.billing.getPlanByCode(input.planCode);
    if (!plan) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Plan not found' });
    const version = await this.billing.createPlanVersion({
      planId: plan.id,
      version: input.version,
      entitlements: input.entitlements,
      effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : new Date(),
    });
    return version;
  }

  async subscribe(input: { userId?: string | undefined; organizationId?: string | undefined; planCode: string; periodDays?: number | undefined; productPriceId?: string | undefined }, actor: AuthenticatedUser): Promise<SubscriptionRecord> {
    await this.authorizeSubject(input, actor);
    const plan = await this.billing.getPlanByCode(input.planCode);
    if (!plan || !plan.isActive) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Plan not found or inactive' });
    const versions = await this.latestPlanVersion(plan.id);
    if (!input.productPriceId) {
      // The frozen schema binds every subscription to a concrete product_price
      // row (§14: plan pricing is a commercial decision — OD-04, no invented values).
      throw Object.assign(new Error('VALIDATION_ERROR'), { code: 'VALIDATION_ERROR' });
    }
    const periodDays = input.periodDays ?? 30;
    const start = new Date();
    const end = new Date(start.getTime() + periodDays * 24 * 3600 * 1000);
    const subscription = await this.billing.createSubscription({
      userId: input.userId ?? null,
      organizationId: input.organizationId ?? null,
      planVersionId: versions.id,
      productPriceId: input.productPriceId,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      eventType: 'SUBSCRIBED',
    });
    await this.outbox.append({
      aggregateType: 'subscription',
      aggregateId: subscription.id,
      eventType: 'SubscriptionStarted.v1',
      eventVersion: 1,
      payload: { subscriptionId: subscription.id, planCode: plan.code, planVersionId: versions.id },
    });
    return subscription;
  }

  async changePlan(subscriptionId: string, newPlanCode: string, actor: AuthenticatedUser, reason?: string): Promise<SubscriptionRecord> {
    const subscription = await this.billing.getSubscriptionById(subscriptionId);
    if (!subscription) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Subscription not found' });
    await this.authorizeSubject({ userId: subscription.userId ?? undefined, organizationId: subscription.organizationId ?? undefined }, actor);
    const plan = await this.billing.getPlanByCode(newPlanCode);
    if (!plan) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Plan not found' });
    const version = await this.latestPlanVersion(plan.id);
    const updated = await this.billing.changePlan({
      subscriptionId,
      newPlanVersionId: version.id,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      reason,
    });
    await this.outbox.append({
      aggregateType: 'subscription',
      aggregateId: updated.id,
      eventType: 'SubscriptionPlanChanged.v1',
      eventVersion: 1,
      payload: { previousSubscriptionId: subscriptionId, planCode: plan.code, planVersionId: version.id },
    });
    return updated;
  }

  async cancel(subscriptionId: string, actor: AuthenticatedUser, reason?: string): Promise<void> {
    const subscription = await this.billing.getSubscriptionById(subscriptionId);
    if (!subscription) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Subscription not found' });
    await this.authorizeSubject({ userId: subscription.userId ?? undefined, organizationId: subscription.organizationId ?? undefined }, actor);
    await this.billing.cancelSubscription(subscriptionId, reason);
  }

  /** Entitlement resolution for subject (user or org): active subscription → immutable plan version entitlements. */
  async resolveEntitlements(subject: { userId?: string; organizationId?: string }): Promise<EntitlementResolution> {
    const subscription = await this.billing.getActiveSubscription({ userId: subject.userId ?? null, organizationId: subject.organizationId ?? null });
    if (!subscription?.planVersionId) {
      return { active: false, planCode: null, planVersion: null, entitlements: {}, subscriptionId: subscription?.id ?? null };
    }
    const planVersion = await this.billing.getPlanVersion(subscription.planVersionId);
    if (!planVersion) return { active: false, planCode: null, planVersion: null, entitlements: {}, subscriptionId: subscription.id };
    const plan = await this.billing.getPlanById(planVersion.planId);
    return {
      active: true,
      planCode: plan?.code ?? null,
      planVersion: planVersion.version,
      entitlements: planVersion.entitlements,
      subscriptionId: subscription.id,
    };
  }

  async listEvents(subscriptionId: string, actor: AuthenticatedUser): Promise<unknown> {
    const subscription = await this.billing.getSubscriptionById(subscriptionId);
    if (!subscription) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Subscription not found' });
    await this.authorizeSubject({ userId: subscription.userId ?? undefined, organizationId: subscription.organizationId ?? undefined }, actor);
    return this.billing.listSubscriptionEvents(subscriptionId);
  }

  private async latestPlanVersion(planId: string): Promise<PlanVersion> {
    // Newest active version effective now — bounded lookup via plan version list (indexed DESC).
    const versions = await this.billing.listPlanVersions(planId, 1);
    const version = versions[0];
    if (!version) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Plan has no versions' });
    return version;
  }

  private async authorizeSubject(input: { userId?: string | undefined; organizationId?: string | undefined }, actor: AuthenticatedUser): Promise<void> {
    if (input.organizationId) {
      if (!await this.iam.isActiveOrganizationMember(actor.id, input.organizationId)) {
        throw new ForbiddenException({ code: 'ORG_SCOPE_REQUIRED', message: 'User is not an active member of the organization' });
      }
      return;
    }
    if (input.userId && input.userId !== actor.id) {
      await this.adminGuard.requirePlatformAdmin(actor);
    }
  }
}
