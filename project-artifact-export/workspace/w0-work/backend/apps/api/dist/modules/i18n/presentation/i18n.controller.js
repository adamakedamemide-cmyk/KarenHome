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
exports.I18nController = exports.TranslationPermissionGuard = exports.UpsertListingTranslationDto = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const access_token_guard_1 = require("../../../common/auth/access-token.guard");
const current_user_decorator_1 = require("../../../common/auth/current-user.decorator");
const db_1 = require("@platform/db");
const i18n_service_1 = require("../application/i18n.service");
class UpsertListingTranslationDto {
    locale;
    title;
    description;
    slug;
    seoTitle;
    seoDescription;
    status;
}
exports.UpsertListingTranslationDto = UpsertListingTranslationDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[a-z]{2}(-[A-Z]{2})?$/),
    __metadata("design:type", String)
], UpsertListingTranslationDto.prototype, "locale", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], UpsertListingTranslationDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(10000),
    __metadata("design:type", String)
], UpsertListingTranslationDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], UpsertListingTranslationDto.prototype, "slug", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], UpsertListingTranslationDto.prototype, "seoTitle", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(300),
    __metadata("design:type", String)
], UpsertListingTranslationDto.prototype, "seoDescription", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['DRAFT', 'PUBLISHED']),
    __metadata("design:type", String)
], UpsertListingTranslationDto.prototype, "status", void 0);
/** Permission gate: listing.update via org roles OR personal-scope grants (0030). */
let TranslationPermissionGuard = class TranslationPermissionGuard {
    iam;
    constructor(iam) {
        this.iam = iam;
    }
    async requireListingEdit(userId, organizationId) {
        const permissions = await this.iam.listPermissionCodesForUser(userId, organizationId);
        if (!permissions.includes('listing.update')) {
            throw new common_2.ForbiddenException({ code: 'FORBIDDEN', message: 'listing.update permission is required' });
        }
    }
};
exports.TranslationPermissionGuard = TranslationPermissionGuard;
exports.TranslationPermissionGuard = TranslationPermissionGuard = __decorate([
    (0, common_2.Injectable)(),
    __metadata("design:paramtypes", [db_1.IamRepository])
], TranslationPermissionGuard);
let I18nController = class I18nController {
    i18n;
    listings;
    permissionGuard;
    constructor(i18n, listings, permissionGuard) {
        this.i18n = i18n;
        this.listings = listings;
        this.permissionGuard = permissionGuard;
    }
    async config(locale) {
        const chain = await this.i18n.resolveFallbackChain(locale || 'en');
        return { data: { locale: locale || 'en', fallbackChain: chain } };
    }
    async translateListing(id, locale) {
        const effective = await this.i18n.translateListing(id, locale || 'en');
        if (!effective)
            throw new common_2.NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Listing not found' });
        return { data: effective };
    }
    async upsertTranslation(id, dto, user) {
        const listing = await this.listings.getById(id);
        if (!listing)
            throw new common_2.NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Listing not found' });
        await this.permissionGuard.requireListingEdit(user.id, listing.managingOrganizationId ?? undefined);
        await this.i18n.upsertListingTranslation({
            listingId: id,
            locale: dto.locale,
            title: dto.title,
            description: dto.description,
            slug: dto.slug,
            seoTitle: dto.seoTitle,
            seoDescription: dto.seoDescription,
            status: dto.status,
        });
        return { data: { upserted: true, locale: dto.locale } };
    }
};
exports.I18nController = I18nController;
__decorate([
    (0, common_1.Get)('config'),
    __param(0, (0, common_1.Query)('locale')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], I18nController.prototype, "config", null);
__decorate([
    (0, common_1.Get)('listings/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('locale')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], I18nController.prototype, "translateListing", null);
__decorate([
    (0, common_1.Post)('listings/:id/translations'),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpsertListingTranslationDto, Object]),
    __metadata("design:returntype", Promise)
], I18nController.prototype, "upsertTranslation", null);
exports.I18nController = I18nController = __decorate([
    (0, common_1.Controller)('i18n'),
    __metadata("design:paramtypes", [i18n_service_1.I18nService,
        db_1.ListingRepository,
        TranslationPermissionGuard])
], I18nController);
