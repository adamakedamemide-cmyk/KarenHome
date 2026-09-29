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
exports.CommissionSettlementService = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@platform/db");
/**
 * Settlement / adjustment / payout application service (§7).
 * Settlements freeze the calculation amount; payouts reference beneficiaries;
 * adjustments are explicit REVERSAL/CORRECTION records (never silent edits).
 */
let CommissionSettlementService = class CommissionSettlementService {
    commission;
    constructor(commission) {
        this.commission = commission;
    }
    async createRuleWithVersion(input, createdBy) {
        const existing = await this.commission.getRuleByCode(input.code);
        if (existing) {
            const version = await this.commission.createRuleVersion({
                ruleId: existing.id,
                version: Number(input.version),
                paramConfig: input.paramConfig,
                effectiveFrom: new Date(),
            });
            return { ruleId: existing.id, versionId: version.id };
        }
        const rule = await this.commission.createRule({
            code: input.code,
            name: input.name,
            description: input.description,
            partyRole: input.partyRole,
            matches: input.matches,
            createdBy,
        });
        const version = await this.commission.createRuleVersion({
            ruleId: rule.id,
            version: Number(input.version),
            paramConfig: input.paramConfig,
            effectiveFrom: new Date(),
        });
        return { ruleId: rule.id, versionId: version.id };
    }
    async setRuleStatus(ruleId, status) {
        await this.commission.setRuleStatus(ruleId, status);
        return { id: ruleId, status };
    }
    async createSettlement(input, actorUserId) {
        const calculation = await this.commission.getCalculation(input.calculationId);
        if (!calculation)
            throw new common_1.NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Calculation not found' });
        const id = await this.commission.createSettlement({
            calculationId: input.calculationId,
            amount: input.amount,
            currencyCode: input.currencyCode,
            meta: { createdBy: actorUserId },
        });
        return { id };
    }
    async updateSettlementStatus(settlementId, status, settledBy) {
        await this.commission.updateSettlementStatus(settlementId, status, settledBy);
    }
    async createPayout(input) {
        const id = await this.commission.createPayout({
            beneficiaryUserId: input.beneficiaryUserId ?? null,
            beneficiaryOrganizationId: input.beneficiaryOrganizationId ?? null,
            amount: input.amount,
            currencyCode: input.currencyCode,
            reference: input.reference,
        });
        return { id };
    }
    async updatePayoutStatus(payoutId, status) {
        await this.commission.updatePayoutStatus(payoutId, status);
    }
    async getCalculation(calculationId) {
        const calculation = await this.commission.getCalculation(calculationId);
        if (!calculation)
            throw new common_1.NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Calculation not found' });
        return calculation;
    }
};
exports.CommissionSettlementService = CommissionSettlementService;
exports.CommissionSettlementService = CommissionSettlementService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [db_1.CommissionRepository])
], CommissionSettlementService);
