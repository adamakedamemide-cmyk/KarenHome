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
exports.BillingController = exports.CancelSubscriptionDto = exports.ChangePlanDto = exports.SubscribeDto = exports.CreatePlanVersionDto = exports.CreatePlanDto = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const access_token_guard_1 = require("../../../common/auth/access-token.guard");
const current_user_decorator_1 = require("../../../common/auth/current-user.decorator");
const billing_service_1 = require("../application/billing.service");
class CreatePlanDto {
    code;
    name;
    description;
}
exports.CreatePlanDto = CreatePlanDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], CreatePlanDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(128),
    __metadata("design:type", String)
], CreatePlanDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreatePlanDto.prototype, "description", void 0);
class CreatePlanVersionDto {
    planCode;
    version;
    entitlements;
    effectiveFrom;
}
exports.CreatePlanVersionDto = CreatePlanVersionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], CreatePlanVersionDto.prototype, "planCode", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100000),
    __metadata("design:type", Number)
], CreatePlanVersionDto.prototype, "version", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreatePlanVersionDto.prototype, "entitlements", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePlanVersionDto.prototype, "effectiveFrom", void 0);
class SubscribeDto {
    userId;
    organizationId;
    planCode;
    periodDays;
    productPriceId;
}
exports.SubscribeDto = SubscribeDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SubscribeDto.prototype, "userId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SubscribeDto.prototype, "organizationId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], SubscribeDto.prototype, "planCode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(365),
    __metadata("design:type", Number)
], SubscribeDto.prototype, "periodDays", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SubscribeDto.prototype, "productPriceId", void 0);
class ChangePlanDto {
    planCode;
    reason;
}
exports.ChangePlanDto = ChangePlanDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], ChangePlanDto.prototype, "planCode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], ChangePlanDto.prototype, "reason", void 0);
class CancelSubscriptionDto {
    reason;
}
exports.CancelSubscriptionDto = CancelSubscriptionDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CancelSubscriptionDto.prototype, "reason", void 0);
let BillingController = class BillingController {
    billing;
    constructor(billing) {
        this.billing = billing;
    }
    listPlans() {
        return this.billing.listPlans().then((plans) => ({ data: plans }));
    }
    createPlan(dto, user) {
        return this.billing.createPlan(dto, user).then((plan) => ({ data: plan }));
    }
    createPlanVersion(dto, user) {
        return this.billing.createPlanVersion(dto, user).then((version) => ({ data: version }));
    }
    subscribe(dto, user) {
        return this.billing.subscribe(dto, user).then((subscription) => ({ data: subscription }));
    }
    changePlan(id, dto, user) {
        return this.billing.changePlan(id, dto.planCode, user, dto.reason).then((subscription) => ({ data: subscription }));
    }
    cancel(id, dto, user) {
        return this.billing.cancel(id, user, dto.reason).then(() => ({ data: { cancelled: true } }));
    }
    listEvents(id, user) {
        return this.billing.listEvents(id, user).then((events) => ({ data: events }));
    }
    myEntitlements(user) {
        return this.billing.resolveEntitlements({ userId: user.id }).then((resolution) => ({ data: resolution }));
    }
    orgEntitlements(id) {
        return this.billing.resolveEntitlements({ organizationId: id }).then((resolution) => ({ data: resolution }));
    }
};
exports.BillingController = BillingController;
__decorate([
    (0, common_1.Get)('plans'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "listPlans", null);
__decorate([
    (0, common_1.Post)('plans'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreatePlanDto, Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "createPlan", null);
__decorate([
    (0, common_1.Post)('plans/versions'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreatePlanVersionDto, Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "createPlanVersion", null);
__decorate([
    (0, common_1.Post)('subscriptions'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SubscribeDto, Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "subscribe", null);
__decorate([
    (0, common_1.Post)('subscriptions/:id/change-plan'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ChangePlanDto, Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "changePlan", null);
__decorate([
    (0, common_1.Post)('subscriptions/:id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CancelSubscriptionDto, Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "cancel", null);
__decorate([
    (0, common_1.Get)('subscriptions/:id/events'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "listEvents", null);
__decorate([
    (0, common_1.Get)('entitlements'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "myEntitlements", null);
__decorate([
    (0, common_1.Get)('organizations/:id/entitlements'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "orgEntitlements", null);
exports.BillingController = BillingController = __decorate([
    (0, common_1.Controller)('billing'),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __metadata("design:paramtypes", [billing_service_1.BillingService])
], BillingController);
