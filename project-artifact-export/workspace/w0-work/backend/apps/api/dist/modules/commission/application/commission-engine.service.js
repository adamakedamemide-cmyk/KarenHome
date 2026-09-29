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
exports.CommissionEngineService = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@platform/db");
const EPSILON = 0.0001;
/**
 * Gate 4 §7 — Commission Engine.
 * - Rule selection: ACTIVE rules, version effective at occurred_at, most
 *   specific matches first; missing dimension = not satisfied.
 * - Every calculation stores rule_snapshot + input_snapshot (immutability is
 *   DB-enforced by migration 0027 triggers).
 * - Future rule versions can NEVER alter historical calculations: selection
 *   is bound to occurred_at and snapshots are frozen at insert.
 * - Supported factors: percentage, fixed, min/max caps, splits, role,
 *   organization, transaction type, property type, geography, campaign,
 *   referral, effective date, currency.
 */
let CommissionEngineService = class CommissionEngineService {
    commission;
    iam;
    constructor(commission, iam) {
        this.commission = commission;
        this.iam = iam;
    }
    async calculate(input, actor) {
        const occurredAt = input.occurredAt ?? new Date();
        const candidates = await this.commission.findApplicableRuleVersions(input.partyRole, occurredAt);
        const dimensions = this.buildDimensions(input);
        const selected = this.selectRule(candidates, dimensions);
        if (!selected) {
            throw new common_1.NotFoundException({ code: 'COMMISSION_RULE_NOT_FOUND', message: 'No applicable commission rule version is effective for this input' });
        }
        const paramConfig = selected.version.paramConfig;
        const mode = paramConfig.mode;
        if (mode !== 'percentage' && mode !== 'fixed') {
            throw new common_1.UnprocessableEntityException({ code: 'VALIDATION_ERROR', message: 'Rule version param_config.mode must be percentage or fixed' });
        }
        const base = Number(input.baseAmount);
        if (!Number.isFinite(base) || base < 0) {
            throw new common_1.UnprocessableEntityException({ code: 'VALIDATION_ERROR', message: 'baseAmount must be a non-negative decimal string' });
        }
        const currency = this.resolveCurrency(paramConfig, input.currencyCode);
        let amount = mode === 'percentage' ? (base * Number(paramConfig.amount ?? 0)) / 100 : Number(paramConfig.amount ?? 0);
        if (paramConfig.min !== undefined && amount < Number(paramConfig.min))
            amount = Number(paramConfig.min);
        if (paramConfig.max !== undefined && amount > Number(paramConfig.max))
            amount = Number(paramConfig.max);
        const calcAmount = round4(amount);
        const lines = [
            { lineType: 'base', amount: input.baseAmount, currencyCode: currency },
            { lineType: 'commission', amount: calcAmount, currencyCode: currency, meta: { mode } },
        ];
        const splits = Array.isArray(paramConfig.splits) ? paramConfig.splits : [];
        if (splits.length > 0) {
            const totalShare = splits.reduce((sum, split) => sum + Number(split.share ?? 0), 0);
            if (Math.abs(totalShare - 100) > EPSILON) {
                throw new common_1.UnprocessableEntityException({ code: 'VALIDATION_ERROR', message: 'Commission split shares must sum to 100' });
            }
            for (const split of splits) {
                lines.push({
                    lineType: `split:${String(split.role ?? 'unknown')}`,
                    amount: round4((Number(calcAmount) * Number(split.share ?? 0)) / 100),
                    currencyCode: currency,
                    meta: { share: split.share ?? null },
                });
            }
        }
        const ruleSnapshot = {
            ruleId: selected.rule.id,
            ruleCode: selected.rule.code,
            ruleName: selected.rule.name,
            partyRole: selected.rule.partyRole,
            matches: selected.rule.matches,
            versionId: selected.version.id,
            version: selected.version.version,
            paramConfig: selected.version.paramConfig,
            effectiveFrom: selected.version.effectiveFrom.toISOString(),
            effectiveTo: selected.version.effectiveTo ? selected.version.effectiveTo.toISOString() : null,
        };
        const inputSnapshot = {
            ...dimensions,
            baseAmount: input.baseAmount,
            currencyCode: input.currencyCode,
            listingId: input.listingId ?? null,
            occurredAt: occurredAt.toISOString(),
            calculatedBy: actor.id,
        };
        const calculation = await this.commission.createCalculation({
            listingId: input.listingId ?? null,
            partyUserId: input.partyUserId ?? null,
            partyOrganizationId: input.partyOrganizationId ?? null,
            partyRole: input.partyRole,
            ruleId: selected.rule.id,
            ruleVersionId: selected.version.id,
            ruleSnapshot,
            inputSnapshot,
            calcMode: mode,
            calcAmount: calcAmount,
            currencyCode: currency,
            calculatedBy: actor.id,
        });
        await this.commission.addCalculationLines(calculation.id, lines);
        return {
            calculationId: calculation.id,
            ruleCode: selected.rule.code,
            ruleVersion: selected.version.version,
            calcMode: mode,
            calcAmount: calcAmount,
            currencyCode: currency,
            lines: lines.map((line) => ({ lineType: line.lineType, amount: line.amount, currencyCode: line.currencyCode })),
            ruleSnapshot,
            inputSnapshot,
        };
    }
    async requireCommissionPermission(actor, permission, organizationId) {
        const permissions = await this.iam.listPermissionCodesForUser(actor.id, organizationId);
        if (!permissions.includes(permission)) {
            throw new common_1.ForbiddenException({ code: 'FORBIDDEN', message: `Required permission is missing: ${permission}` });
        }
    }
    buildDimensions(input) {
        return {
            transaction_type: input.transactionType ?? null,
            property_type: input.propertyType ?? null,
            geo_node_id: input.geoNodeId ?? null,
            organization_id: input.partyOrganizationId ?? null,
            campaign_id: input.campaignId ?? null,
            referral_code: input.referralCode ?? null,
            currency_code: input.currencyCode,
            listing_id: input.listingId ?? null,
        };
    }
    selectRule(candidates, dimensions) {
        for (const candidate of candidates) {
            if (this.matchesSatisfied(candidate.rule.matches, dimensions, dimensions.baseAmount)) {
                return candidate;
            }
        }
        return null;
    }
    matchesSatisfied(matches, dimensions, baseAmount) {
        const keys = Object.keys(matches ?? {});
        for (const key of keys) {
            const expected = matches[key];
            const actual = dimensions[key];
            if (key === 'price_band' && expected !== null && typeof expected === 'object') {
                const band = expected;
                const value = Number(baseAmount ?? '0');
                if (band.min !== undefined && value < Number(band.min))
                    return false;
                if (band.max !== undefined && value > Number(band.max))
                    return false;
                continue;
            }
            if (expected === null || expected === undefined)
                continue; // wildcard
            if (actual !== expected)
                return false;
        }
        return true;
    }
    resolveCurrency(paramConfig, inputCurrency) {
        if (typeof paramConfig.currency === 'string' && /^[A-Z]{3}$/.test(paramConfig.currency))
            return paramConfig.currency;
        return inputCurrency;
    }
};
exports.CommissionEngineService = CommissionEngineService;
exports.CommissionEngineService = CommissionEngineService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [db_1.CommissionRepository, db_1.IamRepository])
], CommissionEngineService);
function round4(value) {
    return (Math.round(value * 10000) / 10000).toFixed(4);
}
