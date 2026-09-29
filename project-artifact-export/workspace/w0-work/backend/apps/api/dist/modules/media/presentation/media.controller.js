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
exports.MediaController = exports.VARIANT_WIDTHS = void 0;
const node_fs_1 = require("node:fs");
const common_1 = require("@nestjs/common");
const contracts_1 = require("@platform/contracts");
const access_token_guard_1 = require("../../../common/auth/access-token.guard");
const current_user_decorator_1 = require("../../../common/auth/current-user.decorator");
const media_service_1 = require("../application/media.service");
exports.VARIANT_WIDTHS = [1920, 1280, 768, 320];
let MediaController = class MediaController {
    media;
    constructor(media) {
        this.media = media;
    }
    async upload(request, user) {
        const parts = request;
        const data = await parts.file();
        if (!data)
            throw new contracts_1.DomainError('VALIDATION_ERROR', 'error.media_field_required');
        const chunks = [];
        let total = 0;
        for await (const chunk of data.file) {
            total += chunk.length;
            if (total > 104_857_600)
                throw new contracts_1.DomainError('MEDIA_TOO_LARGE', 'error.media_too_large');
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        const created = await this.media.intake({ buffer, declaredMime: data.mimetype, createdBy: user.id });
        return { data: created };
    }
    async get(id) {
        const asset = await this.media.getAsset(id);
        if (!asset)
            throw new common_1.NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Media asset not found' });
        return { data: asset };
    }
    async variant(id, width, reply) {
        const numericWidth = Number(width);
        if (!exports.VARIANT_WIDTHS.includes(numericWidth)) {
            throw new contracts_1.DomainError('VALIDATION_ERROR', 'error.media_variant_unsupported');
        }
        const found = await this.media.readVariant(id, numericWidth);
        if (!found)
            throw new common_1.NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Variant not found' });
        reply.type('image/webp').send((0, node_fs_1.createReadStream)(found.filePath));
    }
};
exports.MediaController = MediaController;
__decorate([
    (0, common_1.Post)('uploads'),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "get", null);
__decorate([
    (0, common_1.Get)(':id/variants/:width'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('width')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "variant", null);
exports.MediaController = MediaController = __decorate([
    (0, common_1.Controller)('media'),
    __metadata("design:paramtypes", [media_service_1.MediaService])
], MediaController);
