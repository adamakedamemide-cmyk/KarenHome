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
exports.AdvertisingAdminController = exports.AdsController = exports.UpsertTargetDto = exports.CreateBudgetDto = exports.CreateCreativeDto = exports.CreateCampaignDto = exports.CreateAdvertiserDto = exports.ClickAdDto = exports.ServeAdDto = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const access_token_guard_1 = require("../../../common/auth/access-token.guard");
const advertising_service_1 = require("../application/advertising.service");
const advertising_admin_service_1 = require("../application/advertising-admin.service");
class ServeAdDto {
    slotCode;
    sessionHash;
    locale;
    pageType;
    geoNodeId;
}
exports.ServeAdDto = ServeAdDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], ServeAdDto.prototype, "slotCode", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    (0, class_validator_1.MaxLength)(128),
    __metadata("design:type", String)
], ServeAdDto.prototype, "sessionHash", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(10),
    __metadata("design:type", String)
], ServeAdDto.prototype, "locale", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(32),
    __metadata("design:type", String)
], ServeAdDto.prototype, "pageType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ServeAdDto.prototype, "geoNodeId", void 0);
class ClickAdDto {
    referer;
}
exports.ClickAdDto = ClickAdDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", String)
], ClickAdDto.prototype, "referer", void 0);
class CreateAdvertiserDto {
    organizationId;
    name;
    contact;
}
exports.CreateAdvertiserDto = CreateAdvertiserDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateAdvertiserDto.prototype, "organizationId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(128),
    __metadata("design:type", String)
], CreateAdvertiserDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateAdvertiserDto.prototype, "contact", void 0);
class CreateCampaignDto {
    advertiserId;
    name;
    startAt;
    endAt;
    pricingModel;
    priceAmount;
    currencyCode;
}
exports.CreateCampaignDto = CreateCampaignDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "advertiserId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(128),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "startAt", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "endAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['CPM', 'CPC', 'FIXED', 'UNDECIDED']),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "pricingModel", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "priceAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^[A-Z]{3}$/),
    __metadata("design:type", String)
], CreateCampaignDto.prototype, "currencyCode", void 0);
class CreateCreativeDto {
    campaignId;
    name;
    targetUrl;
    mediaAssetId;
}
exports.CreateCreativeDto = CreateCreativeDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateCreativeDto.prototype, "campaignId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(128),
    __metadata("design:type", String)
], CreateCreativeDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(5),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", String)
], CreateCreativeDto.prototype, "targetUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateCreativeDto.prototype, "mediaAssetId", void 0);
class CreateBudgetDto {
    campaignId;
    budgetType;
    limitAmount;
    currencyCode;
}
exports.CreateBudgetDto = CreateBudgetDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateBudgetDto.prototype, "campaignId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['TOTAL', 'DAILY', 'MONTHLY']),
    __metadata("design:type", String)
], CreateBudgetDto.prototype, "budgetType", void 0);
__decorate([
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], CreateBudgetDto.prototype, "limitAmount", void 0);
__decorate([
    (0, class_validator_1.Matches)(/^[A-Z]{3}$/),
    __metadata("design:type", String)
], CreateBudgetDto.prototype, "currencyCode", void 0);
class UpsertTargetDto {
    campaignId;
    dimension;
    operator;
    value;
    weight;
}
exports.UpsertTargetDto = UpsertTargetDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UpsertTargetDto.prototype, "campaignId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['COUNTRY', 'CITY', 'DISTRICT', 'PAGE_TYPE', 'PROPERTY_TYPE', 'AUDIENCE_SEGMENT', 'DEVICE', 'LANGUAGE', 'TIME_WINDOW']),
    __metadata("design:type", String)
], UpsertTargetDto.prototype, "dimension", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['IN', 'NOT_IN', 'EQUALS']),
    __metadata("design:type", String)
], UpsertTargetDto.prototype, "operator", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpsertTargetDto.prototype, "value", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumberString)(),
    __metadata("design:type", String)
], UpsertTargetDto.prototype, "weight", void 0);
let AdsController = class AdsController {
    ads;
    admin;
    constructor(ads, admin) {
        this.ads = ads;
        this.admin = admin;
    }
    async serve(dto, request) {
        const result = await this.ads.serve({
            slotCode: dto.slotCode,
            sessionHash: dto.sessionHash,
            ip: request.ip,
            userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : undefined,
            locale: dto.locale,
            pageType: dto.pageType,
            geoNodeId: dto.geoNodeId,
        });
        return { data: result };
    }
    async click(id, dto, request) {
        const result = await this.ads.click(id, {
            ip: request.ip,
            userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : undefined,
            referer: dto.referer,
        });
        return { data: result };
    }
    async slots() {
        return { data: await this.admin.listSlots() };
    }
};
exports.AdsController = AdsController;
__decorate([
    (0, common_1.Post)('serve'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ServeAdDto, Object]),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "serve", null);
__decorate([
    (0, common_1.Post)('impressions/:id/click'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ClickAdDto, Object]),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "click", null);
__decorate([
    (0, common_1.Get)('slots'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "slots", null);
exports.AdsController = AdsController = __decorate([
    (0, common_1.Controller)('ads'),
    __metadata("design:paramtypes", [advertising_service_1.AdvertisingService, advertising_admin_service_1.AdvertisingAdminService])
], AdsController);
let AdvertisingAdminController = class AdvertisingAdminController {
    admin;
    constructor(admin) {
        this.admin = admin;
    }
    createAdvertiser(dto) {
        return this.admin.createAdvertiser(dto).then((advertiser) => ({ data: advertiser }));
    }
    createCampaign(dto) {
        return this.admin.createCampaign(dto).then((campaign) => ({ data: campaign }));
    }
    setCampaignStatus(id, body) {
        return this.admin.setCampaignStatus(id, body.status).then(() => ({ data: { id, status: body.status } }));
    }
    createCreative(id, dto) {
        return this.admin.createCreative({ ...dto, campaignId: id }).then((creative) => ({ data: creative }));
    }
    upsertTarget(id, dto) {
        return this.admin.upsertTarget({ ...dto, campaignId: id }).then(() => ({ data: { accepted: true } }));
    }
    createBudget(id, dto) {
        return this.admin.createBudget({ ...dto, campaignId: id }).then((budget) => ({ data: budget }));
    }
    report(id, date) {
        return this.admin.report(id, date).then((report) => ({ data: report }));
    }
};
exports.AdvertisingAdminController = AdvertisingAdminController;
__decorate([
    (0, common_1.Post)('advertisers'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateAdvertiserDto]),
    __metadata("design:returntype", void 0)
], AdvertisingAdminController.prototype, "createAdvertiser", null);
__decorate([
    (0, common_1.Post)('campaigns'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateCampaignDto]),
    __metadata("design:returntype", void 0)
], AdvertisingAdminController.prototype, "createCampaign", null);
__decorate([
    (0, common_1.Post)('campaigns/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdvertisingAdminController.prototype, "setCampaignStatus", null);
__decorate([
    (0, common_1.Post)('campaigns/:id/creatives'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreateCreativeDto]),
    __metadata("design:returntype", void 0)
], AdvertisingAdminController.prototype, "createCreative", null);
__decorate([
    (0, common_1.Post)('campaigns/:id/targets'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpsertTargetDto]),
    __metadata("design:returntype", void 0)
], AdvertisingAdminController.prototype, "upsertTarget", null);
__decorate([
    (0, common_1.Post)('campaigns/:id/budgets'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreateBudgetDto]),
    __metadata("design:returntype", void 0)
], AdvertisingAdminController.prototype, "createBudget", null);
__decorate([
    (0, common_1.Get)('campaigns/:id/report/:date'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdvertisingAdminController.prototype, "report", null);
exports.AdvertisingAdminController = AdvertisingAdminController = __decorate([
    (0, common_1.Controller)('admin/ads'),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __metadata("design:paramtypes", [advertising_admin_service_1.AdvertisingAdminService])
], AdvertisingAdminController);
