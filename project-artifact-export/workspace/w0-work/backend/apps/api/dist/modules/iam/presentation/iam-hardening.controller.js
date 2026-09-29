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
exports.IamHardeningController = void 0;
const common_1 = require("@nestjs/common");
const access_token_guard_1 = require("../../../common/auth/access-token.guard");
const current_user_decorator_1 = require("../../../common/auth/current-user.decorator");
const iam_hardening_service_1 = require("../application/iam-hardening.service");
const hardening_dto_1 = require("./dto/hardening.dto");
let IamHardeningController = class IamHardeningController {
    hardening;
    constructor(hardening) {
        this.hardening = hardening;
    }
    // --- Email verification ----------------------------------------------------
    async requestEmailVerification(user, request) {
        return { data: await this.hardening.requestEmailVerification(user.id, requestMeta(request)) };
    }
    async verifyEmail(dto) {
        return { data: await this.hardening.verifyEmail(dto.token) };
    }
    // --- Phone OTP ----------------------------------------------------------------
    async requestPhoneOtp(user, dto) {
        return { data: await this.hardening.requestPhoneOtp(user.id, dto.phoneE164) };
    }
    async verifyPhoneOtp(user, dto) {
        return { data: await this.hardening.verifyPhoneOtp(user.id, dto.phoneE164, dto.code) };
    }
    // --- Password flows ---------------------------------------------------------------
    async requestPasswordReset(dto, request) {
        return { data: await this.hardening.requestPasswordReset(dto.email, requestMeta(request)) };
    }
    async resetPassword(dto) {
        return { data: await this.hardening.resetPassword(dto.token, dto.newPassword) };
    }
    async changePassword(user, dto) {
        return { data: await this.hardening.changePassword(user.id, dto.currentPassword, dto.newPassword) };
    }
    // --- Sessions --------------------------------------------------------------------------
    async listSessions(user) {
        return { data: await this.hardening.listSessions(user.id) };
    }
    async logoutAll(user) {
        return { data: await this.hardening.logoutAll(user.id) };
    }
    // --- MFA (TOTP) --------------------------------------------------------------------------
    async enrollTotp(user) {
        return { data: await this.hardening.enrollTotp(user.id) };
    }
    async activateTotp(user, dto) {
        return { data: await this.hardening.activateTotp(user.id, dto.code) };
    }
    async disableTotp(user, dto) {
        return { data: await this.hardening.disableTotp(user.id, dto.code) };
    }
    async verifyMfaLogin(dto, request) {
        return { data: await this.hardening.verifyMfaLogin(dto.challengeToken, dto.code, requestMeta(request)) };
    }
    // --- OAuth ----------------------------------------------------------------------------------
    async oauthAuthorize(provider, _request) {
        const redirectUri = `${this.hardening.configRedirectBase}/${provider}/callback`;
        return { data: await this.hardening.oauthAuthorizeUrl(provider, redirectUri) };
    }
    async oauthCallback(provider, dto, request) {
        const redirectUri = `${this.hardening.configRedirectBase}/${provider}/callback`;
        return { data: await this.hardening.oauthCallback(provider, dto.code, redirectUri, requestMeta(request)) };
    }
};
exports.IamHardeningController = IamHardeningController;
__decorate([
    (0, common_1.Post)('email/verify-request'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], IamHardeningController.prototype, "requestEmailVerification", null);
__decorate([
    (0, common_1.Post)('email/verify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [hardening_dto_1.EmailVerifyRequestDto]),
    __metadata("design:returntype", Promise)
], IamHardeningController.prototype, "verifyEmail", null);
__decorate([
    (0, common_1.Post)('phone/verify-request'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, hardening_dto_1.PhoneVerifyRequestDto]),
    __metadata("design:returntype", Promise)
], IamHardeningController.prototype, "requestPhoneOtp", null);
__decorate([
    (0, common_1.Post)('phone/verify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, hardening_dto_1.PhoneVerifyConfirmDto]),
    __metadata("design:returntype", Promise)
], IamHardeningController.prototype, "verifyPhoneOtp", null);
__decorate([
    (0, common_1.Post)('password/reset-request'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [hardening_dto_1.PasswordResetRequestDto, Object]),
    __metadata("design:returntype", Promise)
], IamHardeningController.prototype, "requestPasswordReset", null);
__decorate([
    (0, common_1.Post)('password/reset'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [hardening_dto_1.PasswordResetConfirmDto]),
    __metadata("design:returntype", Promise)
], IamHardeningController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Post)('password/change'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, hardening_dto_1.PasswordChangeDto]),
    __metadata("design:returntype", Promise)
], IamHardeningController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Get)('sessions'),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IamHardeningController.prototype, "listSessions", null);
__decorate([
    (0, common_1.Post)('sessions/logout-all'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IamHardeningController.prototype, "logoutAll", null);
__decorate([
    (0, common_1.Post)('mfa/enroll'),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IamHardeningController.prototype, "enrollTotp", null);
__decorate([
    (0, common_1.Post)('mfa/activate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, hardening_dto_1.MfaCodeDto]),
    __metadata("design:returntype", Promise)
], IamHardeningController.prototype, "activateTotp", null);
__decorate([
    (0, common_1.Post)('mfa/disable'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, hardening_dto_1.MfaCodeDto]),
    __metadata("design:returntype", Promise)
], IamHardeningController.prototype, "disableTotp", null);
__decorate([
    (0, common_1.Post)('mfa/verify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [hardening_dto_1.MfaLoginDto, Object]),
    __metadata("design:returntype", Promise)
], IamHardeningController.prototype, "verifyMfaLogin", null);
__decorate([
    (0, common_1.Get)('oauth/:provider/authorize'),
    __param(0, (0, common_1.Param)('provider')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], IamHardeningController.prototype, "oauthAuthorize", null);
__decorate([
    (0, common_1.Post)('oauth/:provider/callback'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('provider')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, hardening_dto_1.OAuthCallbackDto, Object]),
    __metadata("design:returntype", Promise)
], IamHardeningController.prototype, "oauthCallback", null);
exports.IamHardeningController = IamHardeningController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [iam_hardening_service_1.IamHardeningService])
], IamHardeningController);
function requestMeta(request) {
    const userAgent = typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : undefined;
    return { ip: request.ip, requestId: String(request.id ?? ''), ...(userAgent !== undefined ? { userAgent } : {}) };
}
