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
exports.AdminController = exports.PlatformAdminGuard = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const access_token_guard_1 = require("../../../common/auth/access-token.guard");
const current_user_decorator_1 = require("../../../common/auth/current-user.decorator");
const db_1 = require("@platform/db");
const search_service_1 = require("../../search/application/search.service");
const advertising_service_1 = require("../../advertising/application/advertising.service");
let PlatformAdminGuard = class PlatformAdminGuard {
    iam;
    constructor(iam) {
        this.iam = iam;
    }
    async requirePlatformAdmin(actor) {
        const permissions = await this.iam.listPermissionCodesForUser(actor.id);
        if (!permissions.includes('platform.admin')) {
            throw new common_2.ForbiddenException({ code: 'FORBIDDEN', message: 'Platform admin permission is required' });
        }
    }
};
exports.PlatformAdminGuard = PlatformAdminGuard;
exports.PlatformAdminGuard = PlatformAdminGuard = __decorate([
    (0, common_2.Injectable)(),
    __metadata("design:paramtypes", [db_1.IamRepository])
], PlatformAdminGuard);
let AdminController = class AdminController {
    adminGuard;
    jobs;
    search;
    ads;
    indexState;
    constructor(adminGuard, jobs, search, ads, indexState) {
        this.adminGuard = adminGuard;
        this.jobs = jobs;
        this.search = search;
        this.ads = ads;
        this.indexState = indexState;
    }
    /** §11 — RebuildSearchIndex command (job-driven, chunked in the worker). */
    async rebuildSearchIndex(user) {
        await this.adminGuard.requirePlatformAdmin(user);
        return { data: await this.search.requestRebuild(user.id) };
    }
    async getSearchIndexState(user) {
        await this.adminGuard.requirePlatformAdmin(user);
        return { data: await this.indexState.stats() };
    }
    async jobStats(user) {
        await this.adminGuard.requirePlatformAdmin(user);
        return { data: await this.jobs.stats() };
    }
    async requeueDeadJob(id, user) {
        await this.adminGuard.requirePlatformAdmin(user);
        await this.jobs.requeueDead(id);
        return { data: { requeued: true } };
    }
    /** Advertising daily rollup for one campaign/date — full sweep is the worker's job. */
    async adsRollup(user, body) {
        await this.adminGuard.requirePlatformAdmin(user);
        const date = /^\d{4}-\d{2}-\d{2}$/.test(body?.date ?? '') ? body.date : new Date().toISOString().slice(0, 10);
        await this.ads.rollupDaily(body.campaignId, date);
        return { data: { campaignId: body.campaignId, date } };
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Post)('search/rebuild'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "rebuildSearchIndex", null);
__decorate([
    (0, common_1.Get)('search/index-state'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getSearchIndexState", null);
__decorate([
    (0, common_1.Get)('jobs/stats'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "jobStats", null);
__decorate([
    (0, common_1.Post)('jobs/:id/requeue-dead'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "requeueDeadJob", null);
__decorate([
    (0, common_1.Post)('ads/rollup'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "adsRollup", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __metadata("design:paramtypes", [PlatformAdminGuard,
        db_1.JobRepository,
        search_service_1.SearchService,
        advertising_service_1.AdvertisingService,
        db_1.SearchIndexRepository])
], AdminController);
