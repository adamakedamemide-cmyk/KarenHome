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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommissionController = exports.PayoutStatusDto = exports.CreatePayoutDto = exports.SettlementStatusDto = exports.CreateSettlementDto = exports.RuleStatusDto = exports.CreateCommissionRuleDto = exports.CalculateCommissionDto = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const access_token_guard_1 = require("../../../common/auth/access-token.guard");
const current_user_decorator_1 = require("../../../common/auth/current-user.decorator");
const commission_engine_service_1 = require("../application/commission-engine.service");
const commission_settlement_service_1 = require("../application/commission-settlement.service");
class CalculateCommissionDto {
    listingId;
    partyRole;
    partyUserId;
    partyOrganizationId;
    baseAmount;
    currencyCode;
    transactionType;
    propertyType;
    geoNodeId;
    campaignId;
    referralCode;
}
exports.CalculateCommissionDto = CalculateCommissionDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CalculateCommissionDto.prototype, "listingId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['Owner', 'Agent', 'Marketer', 'Organization']),
    __metadata("design:type", String)
], CalculateCommissionDto.prototype, "partyRole", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CalculateCommissionDto.prototype, "partyUserId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CalculateCommissionDto.prototype, "partyOrganizationId", void 0);
__decorate([
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], CalculateCommissionDto.prototype, "baseAmount", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(3),
    __metadata("design:type", String)
], CalculateCommissionDto.prototype, "currencyCode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CalculateCommissionDto.prototype, "transactionType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CalculateCommissionDto.prototype, "propertyType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CalculateCommissionDto.prototype, "geoNodeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CalculateCommissionDto.prototype, "campaignId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CalculateCommissionDto.prototype, "referralCode", void 0);
class CreateCommissionRuleDto {
    code;
    name;
    description;
    partyRole;
    matches;
    version;
    paramConfig;
}
exports.CreateCommissionRuleDto = CreateCommissionRuleDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], CreateCommissionRuleDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(128),
    __metadata("design:type", String)
], CreateCommissionRuleDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateCommissionRuleDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['Owner', 'Agent', 'Marketer', 'Organization']),
    __metadata("design:type", String)
], CreateCommissionRuleDto.prototype, "partyRole", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateCommissionRuleDto.prototype, "matches", void 0);
__decorate([
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], CreateCommissionRuleDto.prototype, "version", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateCommissionRuleDto.prototype, "paramConfig", void 0);
class RuleStatusDto {
    status;
}
exports.RuleStatusDto = RuleStatusDto;
__decorate([
    (0, class_validator_1.IsIn)(['TBD', 'CONFIGURABLE', 'UNDECIDED', 'ACTIVE', 'RETIRED']),
    __metadata("design:type", String)
], RuleStatusDto.prototype, "status", void 0);
class CreateSettlementDto {
    calculationId;
    amount;
    currencyCode;
}
exports.CreateSettlementDto = CreateSettlementDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateSettlementDto.prototype, "calculationId", void 0);
__decorate([
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], CreateSettlementDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(3),
    __metadata("design:type", String)
], CreateSettlementDto.prototype, "currencyCode", void 0);
class SettlementStatusDto {
    status;
}
exports.SettlementStatusDto = SettlementStatusDto;
__decorate([
    (0, class_validator_1.IsIn)(['PENDING', 'APPROVED', 'SETTLED', 'CANCELLED']),
    __metadata("design:type", String)
], SettlementStatusDto.prototype, "status", void 0);
class CreatePayoutDto {
    beneficiaryUserId;
    beneficiaryOrganizationId;
    amount;
    currencyCode;
    reference;
}
exports.CreatePayoutDto = CreatePayoutDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreatePayoutDto.prototype, "beneficiaryUserId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreatePayoutDto.prototype, "beneficiaryOrganizationId", void 0);
__decorate([
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], CreatePayoutDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(3),
    __metadata("design:type", String)
], CreatePayoutDto.prototype, "currencyCode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(128),
    __metadata("design:type", String)
], CreatePayoutDto.prototype, "reference", void 0);
class PayoutStatusDto {
    status;
}
exports.PayoutStatusDto = PayoutStatusDto;
__decorate([
    (0, class_validator_1.IsIn)(['REQUESTED', 'APPROVED', 'PAID', 'FAILED', 'CANCELLED']),
    __metadata("design:type", String)
], PayoutStatusDto.prototype, "status", void 0);
let CommissionController = class CommissionController {
    engine;
    settlement;
    constructor(engine, settlement) {
        this.engine = engine;
        this.settlement = settlement;
    }
    async calculate(dto, user) {
        await this.engine.requireCommissionPermission(user, 'commission.manage', dto.partyOrganizationId);
        return { data: await this.engine.calculate(dto, user) };
    }
    async getCalculation(id, user) {
        await this.engine.requireCommissionPermission(user, 'commission.view');
        return { data: await this.settlement.getCalculation(id) };
    }
    async createRule(dto, user) {
        await this.engine.requireCommissionPermission(user, 'commission.manage');
        return { data: await this.settlement.createRuleWithVersion(dto, user.id) };
    }
    async setRuleStatus(id, dto, user) {
        await this.engine.requireCommissionPermission(user, 'commission.manage');
        return { data: await this.settlement.setRuleStatus(id, dto.status) };
    }
    async createSettlement(dto, user) {
        await this.engine.requireCommissionPermission(user, 'commission.manage');
        return { data: await this.settlement.createSettlement(dto, user.id) };
    }
    async setSettlementStatus(id, dto, user) {
        await this.engine.requireCommissionPermission(user, 'commission.manage');
        await this.settlement.updateSettlementStatus(id, dto.status, user.id);
        return { data: { id, status: dto.status } };
    }
    async createPayout(dto, user) {
        await this.engine.requireCommissionPermission(user, 'commission.manage');
        return { data: await this.settlement.createPayout(dto) };
    }
    async setPayoutStatus(id, dto, user) {
        await this.engine.requireCommissionPermission(user, 'commission.manage');
        await this.settlement.updatePayoutStatus(id, dto.status);
        return { data: { id, status: dto.status } };
    }
};
exports.CommissionController = CommissionController;
__decorate([
    (0, common_1.Post)('calculations'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CalculateCommissionDto, Object]),
    __metadata("design:returntype", Promise)
], CommissionController.prototype, "calculate", null);
__decorate([
    (0, common_1.Get)('calculations/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CommissionController.prototype, "getCalculation", null);
__decorate([
    (0, common_1.Post)('rules'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateCommissionRuleDto, Object]),
    __metadata("design:returntype", Promise)
], CommissionController.prototype, "createRule", null);
__decorate([
    (0, common_1.Post)('rules/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, RuleStatusDto, Object]),
    __metadata("design:returntype", Promise)
], CommissionController.prototype, "setRuleStatus", null);
__decorate([
    (0, common_1.Post)('settlements'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateSettlementDto, Object]),
    __metadata("design:returntype", Promise)
], CommissionController.prototype, "createSettlement", null);
__decorate([
    (0, common_1.Post)('settlements/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, SettlementStatusDto, Object]),
    __metadata("design:returntype", Promise)
], CommissionController.prototype, "setSettlementStatus", null);
__decorate([
    (0, common_1.Post)('payouts'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreatePayoutDto, Object]),
    __metadata("design:returntype", Promise)
], CommissionController.prototype, "createPayout", null);
__decorate([
    (0, common_1.Post)('payouts/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, PayoutStatusDto, Object]),
    __metadata("design:returntype", Promise)
], CommissionController.prototype, "setPayoutStatus", null);
exports.CommissionController = CommissionController = __decorate([
    (0, common_1.Controller)('commission'),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __metadata("design:paramtypes", [commission_engine_service_1.CommissionEngineService,
        commission_settlement_service_1.CommissionSettlementService])
], CommissionController);
