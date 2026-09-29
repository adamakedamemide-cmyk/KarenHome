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
exports.ListingsController = void 0;
const common_1 = require("@nestjs/common");
const access_token_guard_1 = require("../../../common/auth/access-token.guard");
const current_user_decorator_1 = require("../../../common/auth/current-user.decorator");
const db_1 = require("@platform/db");
const listing_service_1 = require("../application/listing.service");
const create_listing_dto_1 = require("./dto/create-listing.dto");
const state_transition_dto_1 = require("./dto/state-transition.dto");
const attach_media_dto_1 = require("./dto/attach-media.dto");
const listing_search_query_dto_1 = require("./dto/listing-search-query.dto");
const listing_search_service_1 = require("../application/listing-search.service");
let ListingsController = class ListingsController {
    service;
    repository;
    search;
    constructor(service, repository, search) {
        this.service = service;
        this.repository = repository;
        this.search = search;
    }
    create(dto, user) {
        return this.service.create(dto, user);
    }
    async list(query) {
        return this.search.search(query);
    }
    async get(id) {
        return this.service.get(id);
    }
    async readiness(id) {
        return this.service.publicationReadiness(id);
    }
    async transition(id, dto, user) {
        return this.service.transition(id, dto.action, { expectedVersion: dto.expectedVersion, reason: dto.reason }, user);
    }
    // --- Canonical, per-action endpoints (§5) -----------------------------------
    submit(id, dto, user) {
        return this.service.transition(id, 'submit', dto, user);
    }
    submitVerification(id, dto, user) {
        return this.service.transition(id, 'submit_verification', dto, user);
    }
    verify(id, dto, user) {
        return this.service.transition(id, 'verify', dto, user);
    }
    reject(id, dto, user) {
        return this.service.transition(id, 'reject', dto, user);
    }
    publish(id, dto, user) {
        return this.service.transition(id, 'publish', dto, user);
    }
    pause(id, dto, user) {
        return this.service.transition(id, 'pause', dto, user);
    }
    resume(id, dto, user) {
        return this.service.transition(id, 'resume', dto, user);
    }
    reserve(id, dto, user) {
        return this.service.transition(id, 'reserve', dto, user);
    }
    underContract(id, dto, user) {
        return this.service.transition(id, 'under_contract', dto, user);
    }
    sold(id, dto, user) {
        return this.service.transition(id, 'sold', dto, user);
    }
    rented(id, dto, user) {
        return this.service.transition(id, 'rented', dto, user);
    }
    expire(id, dto, user) {
        return this.service.transition(id, 'expire', dto, user);
    }
    archive(id, dto, user) {
        return this.service.transition(id, 'archive', dto, user);
    }
    attachMedia(id, dto, user) {
        return this.service.attachMedia(id, dto, user);
    }
};
exports.ListingsController = ListingsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_listing_dto_1.CreateListingDto, Object]),
    __metadata("design:returntype", void 0)
], ListingsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [listing_search_query_dto_1.ListingSearchQueryDto]),
    __metadata("design:returntype", Promise)
], ListingsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ListingsController.prototype, "get", null);
__decorate([
    (0, common_1.Get)(':id/publication-readiness'),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ListingsController.prototype, "readiness", null);
__decorate([
    (0, common_1.Post)(':id/transition'),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ListingsController.prototype, "transition", null);
__decorate([
    (0, common_1.Post)(':id/submit'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, state_transition_dto_1.StateTransitionDto, Object]),
    __metadata("design:returntype", void 0)
], ListingsController.prototype, "submit", null);
__decorate([
    (0, common_1.Post)(':id/submit-verification'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, state_transition_dto_1.StateTransitionDto, Object]),
    __metadata("design:returntype", void 0)
], ListingsController.prototype, "submitVerification", null);
__decorate([
    (0, common_1.Post)(':id/verify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, state_transition_dto_1.StateTransitionDto, Object]),
    __metadata("design:returntype", void 0)
], ListingsController.prototype, "verify", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, state_transition_dto_1.StateTransitionDto, Object]),
    __metadata("design:returntype", void 0)
], ListingsController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)(':id/publish'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, state_transition_dto_1.StateTransitionDto, Object]),
    __metadata("design:returntype", void 0)
], ListingsController.prototype, "publish", null);
__decorate([
    (0, common_1.Post)(':id/pause'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, state_transition_dto_1.StateTransitionDto, Object]),
    __metadata("design:returntype", void 0)
], ListingsController.prototype, "pause", null);
__decorate([
    (0, common_1.Post)(':id/resume'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, state_transition_dto_1.StateTransitionDto, Object]),
    __metadata("design:returntype", void 0)
], ListingsController.prototype, "resume", null);
__decorate([
    (0, common_1.Post)(':id/reserve'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, state_transition_dto_1.StateTransitionDto, Object]),
    __metadata("design:returntype", void 0)
], ListingsController.prototype, "reserve", null);
__decorate([
    (0, common_1.Post)(':id/under-contract'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, state_transition_dto_1.StateTransitionDto, Object]),
    __metadata("design:returntype", void 0)
], ListingsController.prototype, "underContract", null);
__decorate([
    (0, common_1.Post)(':id/sold'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, state_transition_dto_1.StateTransitionDto, Object]),
    __metadata("design:returntype", void 0)
], ListingsController.prototype, "sold", null);
__decorate([
    (0, common_1.Post)(':id/rented'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, state_transition_dto_1.StateTransitionDto, Object]),
    __metadata("design:returntype", void 0)
], ListingsController.prototype, "rented", null);
__decorate([
    (0, common_1.Post)(':id/expire'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, state_transition_dto_1.StateTransitionDto, Object]),
    __metadata("design:returntype", void 0)
], ListingsController.prototype, "expire", null);
__decorate([
    (0, common_1.Post)(':id/archive'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, state_transition_dto_1.StateTransitionDto, Object]),
    __metadata("design:returntype", void 0)
], ListingsController.prototype, "archive", null);
__decorate([
    (0, common_1.Post)(':id/media'),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, attach_media_dto_1.AttachMediaDto, Object]),
    __metadata("design:returntype", void 0)
], ListingsController.prototype, "attachMedia", null);
exports.ListingsController = ListingsController = __decorate([
    (0, common_1.Controller)('listings'),
    __metadata("design:paramtypes", [listing_service_1.ListingService,
        db_1.ListingRepository,
        listing_search_service_1.ListingSearchService])
], ListingsController);
