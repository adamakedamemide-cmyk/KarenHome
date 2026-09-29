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
exports.AdvertisingAdminService = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@platform/db");
/** Campaign administration (§8) — placement/targeting/budget management. */
let AdvertisingAdminService = class AdvertisingAdminService {
    ads;
    constructor(ads) {
        this.ads = ads;
    }
    async listSlots() {
        return this.ads.listSlots();
    }
    async createAdvertiser(input) {
        return { id: await this.ads.createAdvertiser(input) };
    }
    async createCampaign(input) {
        const startAt = new Date(input.startAt);
        const endAt = new Date(input.endAt);
        if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
            throw new common_1.NotFoundException({ code: 'VALIDATION_ERROR', message: 'Invalid campaign window' });
        }
        return {
            id: await this.ads.createCampaign({
                advertiserId: input.advertiserId,
                name: input.name,
                startAt,
                endAt,
                pricingModel: input.pricingModel ?? 'UNDECIDED',
                priceAmount: input.priceAmount ?? null,
                currencyCode: input.currencyCode ?? null,
            }),
        };
    }
    async setCampaignStatus(id, status) {
        await this.ads.setCampaignStatus(id, status);
    }
    async createCreative(input) {
        return { id: await this.ads.createCreative({ campaignId: input.campaignId, name: input.name, targetUrl: input.targetUrl, mediaAssetId: input.mediaAssetId ?? null }) };
    }
    async upsertTarget(input) {
        await this.ads.upsertTarget({
            campaignId: input.campaignId,
            dimension: input.dimension,
            operator: input.operator ?? 'IN',
            value: input.value ?? {},
            weight: input.weight ? Number(input.weight) : 1,
        });
    }
    async createBudget(input) {
        return { id: await this.ads.createBudget(input) };
    }
    async report(campaignId, date) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
            throw new common_1.NotFoundException({ code: 'VALIDATION_ERROR', message: 'date must be YYYY-MM-DD' });
        const aggregates = await this.ads.dailyAggregates(campaignId, date);
        return { aggregates };
    }
};
exports.AdvertisingAdminService = AdvertisingAdminService;
exports.AdvertisingAdminService = AdvertisingAdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [db_1.AdvertisingRepository])
], AdvertisingAdminService);
