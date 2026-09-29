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
export declare class BillingRepository {
    private readonly db;
    constructor(db: PostgresDatabase);
    createPlan(input: {
        code: string;
        name: string;
        description?: string | undefined;
    }): Promise<Plan>;
    listPlans(): Promise<Plan[]>;
    getPlanByCode(code: string): Promise<Plan | null>;
    getPlanById(planId: string): Promise<Plan | null>;
    listPlanVersions(planId: string, limit?: number): Promise<PlanVersion[]>;
    createPlanVersion(input: {
        planId: string;
        version: number;
        entitlements: Record<string, unknown>;
        effectiveFrom: Date;
        effectiveTo?: Date | null;
    }): Promise<PlanVersion>;
    getPlanVersion(planVersionId: string): Promise<PlanVersion | null>;
    createSubscription(input: {
        userId?: string | null;
        organizationId?: string | null;
        planVersionId?: string | null;
        productPriceId: string;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        eventType: string;
    }): Promise<SubscriptionRecord>;
    getActiveSubscription(subject: {
        userId?: string | null;
        organizationId?: string | null;
    }): Promise<SubscriptionRecord | null>;
    getSubscriptionById(subscriptionId: string): Promise<SubscriptionRecord | null>;
    /** Change plan: historical subscription is closed (cancelled), a new one is opened. */
    changePlan(input: {
        subscriptionId: string;
        newPlanVersionId: string;
        periodStart: Date;
        periodEnd: Date;
        reason?: string | undefined;
    }): Promise<SubscriptionRecord>;
    cancelSubscription(subscriptionId: string, reason?: string | undefined): Promise<void>;
    listSubscriptionEvents(subscriptionId: string, limit?: number): Promise<Array<{
        id: string;
        eventType: string;
        payload: Record<string, unknown>;
        createdAt: Date;
    }>>;
    private mapSubscription;
}
