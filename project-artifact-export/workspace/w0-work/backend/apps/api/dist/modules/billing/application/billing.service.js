"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingService = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@platform/db");
const billing_admin_guard_1 = require("./billing-admin.guard");
/**
 * Gate 4 §14 — Subscription application service.
 * Plan versioning discipline: a subscription is bound to ONE immutable plan
 * version; plan changes open a NEW subscription row and emit events. Future
 * plan versions never rewrite historical subscriptions (§14 hard rule).
 */
let BillingService = class BillingService {
    billing;
    iam;
    outbox;
    adminGuard;
    constructor(billing, iam, outbox, adminGuard) {
        this.billing = billing;
        this.iam = iam;
        this.outbox = outbox;
        this.adminGuard = adminGuard;
    }
    async listPlans() {
        return this.billing.listPlans();
    }
    async createPlan(input, actor) {
        await this.adminGuard.requirePlatformAdmin(actor);
        return this.billing.createPlan(input);
    }
    async createPlanVersion(input, actor) {
        await this.adminGuard.requirePlatformAdmin(actor);
        const plan = await this.billing.getPlanByCode(input.planCode);
        if (!plan)
            throw new common_1.NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Plan not found' });
        const version = await this.billing.createPlanVersion({
            planId: plan.id,
            version: input.version,
            entitlements: input.entitlements,
            effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : new Date(),
        });
        return version;
    }
    async subscribe(input, actor) {
        await this.authorizeSubject(input, actor);
        const plan = await this.billing.getPlanByCode(input.planCode);
        if (!plan || !plan.isActive)
            throw new common_1.NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Plan not found or inactive' });
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
    async changePlan(subscriptionId, newPlanCode, actor, reason) {
        const subscription = await this.billing.getSubscriptionById(subscriptionId);
        if (!subscription)
            throw new common_1.NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Subscription not found' });
        await this.authorizeSubject({ userId: subscription.userId ?? undefined, organizationId: subscription.organizationId ?? undefined }, actor);
        const plan = await this.billing.getPlanByCode(newPlanCode);
        if (!plan)
            throw new common_1.NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Plan not found' });
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
    async cancel(subscriptionId, actor, reason) {
        const subscription = await this.billing.getSubscriptionById(subscriptionId);
        if (!subscription)
            throw new common_1.NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Subscription not found' });
        await this.authorizeSubject({ userId: subscription.userId ?? undefined, organizationId: subscription.organizationId ?? undefined }, actor);
        await this.billing.cancelSubscription(subscriptionId, reason);
    }
    /** Entitlement resolution for subject (user or org): active subscription → immutable plan version entitlements. */
    async resolveEntitlements(subject) {
        const subscription = await this.billing.getActiveSubscription({ userId: subject.userId ?? null, organizationId: subject.organizationId ?? null });
        if (!subscription?.planVersionId) {
            return { active: false, planCode: null, planVersion: null, entitlements: {}, subscriptionId: subscription?.id ?? null };
        }
        const planVersion = await this.billing.getPlanVersion(subscription.planVersionId);
        if (!planVersion)
            return { active: false, planCode: null, planVersion: null, entitlements: {}, subscriptionId: subscription.id };
        const plan = await this.billing.getPlanById(planVersion.planId);
        return {
            active: true,
            planCode: plan?.code ?? null,
            planVersion: planVersion.version,
            entitlements: planVersion.entitlements,
            subscriptionId: subscription.id,
        };
    }
    async listEvents(subscriptionId, actor) {
        const subscription = await this.billing.getSubscriptionById(subscriptionId);
        if (!subscription)
            throw new common_1.NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Subscription not found' });
        await this.authorizeSubject({ userId: subscription.userId ?? undefined, organizationId: subscription.organizationId ?? undefined }, actor);
        return this.billing.listSubscriptionEvents(subscriptionId);
    }
    async latestPlanVersion(planId) {
        // Newest active version effective now — bounded lookup via plan version list (indexed DESC).
        const versions = await this.billing.listPlanVersions(planId, 1);
        const version = versions[0];
        if (!version)
            throw new common_1.NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Plan has no versions' });
        return version;
    }
    async authorizeSubject(input, actor) {
        if (input.organizationId) {
            if (!await this.iam.isActiveOrganizationMember(actor.id, input.organizationId)) {
                throw new common_1.ForbiddenException({ code: 'ORG_SCOPE_REQUIRED', message: 'User is not an active member of the organization' });
            }
            return;
        }
        if (input.userId && input.userId !== actor.id) {
            await this.adminGuard.requirePlatformAdmin(actor);
        }
    }
};
exports.BillingService = BillingService;
exports.BillingService = BillingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [db_1.BillingRepository,
        db_1.IamRepository,
        db_1.OutboxRepository,
        billing_admin_guard_1.BillingAdminGuard])
], BillingService);
