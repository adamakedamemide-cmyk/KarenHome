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
exports.OAuthCallbackDto = exports.MfaLoginDto = exports.MfaCodeDto = exports.PasswordChangeDto = exports.PasswordResetConfirmDto = exports.PasswordResetRequestDto = exports.PhoneVerifyConfirmDto = exports.PhoneVerifyRequestDto = exports.EmailVerifyRequestDto = void 0;
const class_validator_1 = require("class-validator");
class EmailVerifyRequestDto {
    token;
}
exports.EmailVerifyRequestDto = EmailVerifyRequestDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmailVerifyRequestDto.prototype, "token", void 0);
class PhoneVerifyRequestDto {
    phoneE164;
}
exports.PhoneVerifyRequestDto = PhoneVerifyRequestDto;
__decorate([
    (0, class_validator_1.Matches)(/^\+[1-9][0-9]{7,14}$/),
    __metadata("design:type", String)
], PhoneVerifyRequestDto.prototype, "phoneE164", void 0);
class PhoneVerifyConfirmDto {
    phoneE164;
    code;
}
exports.PhoneVerifyConfirmDto = PhoneVerifyConfirmDto;
__decorate([
    (0, class_validator_1.Matches)(/^\+[1-9][0-9]{7,14}$/),
    __metadata("design:type", String)
], PhoneVerifyConfirmDto.prototype, "phoneE164", void 0);
__decorate([
    (0, class_validator_1.Matches)(/^\d{6}$/),
    __metadata("design:type", String)
], PhoneVerifyConfirmDto.prototype, "code", void 0);
class PasswordResetRequestDto {
    email;
}
exports.PasswordResetRequestDto = PasswordResetRequestDto;
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], PasswordResetRequestDto.prototype, "email", void 0);
class PasswordResetConfirmDto {
    token;
    newPassword;
}
exports.PasswordResetConfirmDto = PasswordResetConfirmDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(32),
    __metadata("design:type", String)
], PasswordResetConfirmDto.prototype, "token", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(12),
    __metadata("design:type", String)
], PasswordResetConfirmDto.prototype, "newPassword", void 0);
class PasswordChangeDto {
    currentPassword;
    newPassword;
}
exports.PasswordChangeDto = PasswordChangeDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], PasswordChangeDto.prototype, "currentPassword", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(12),
    __metadata("design:type", String)
], PasswordChangeDto.prototype, "newPassword", void 0);
class MfaCodeDto {
    code;
}
exports.MfaCodeDto = MfaCodeDto;
__decorate([
    (0, class_validator_1.Matches)(/^\d{6}$/),
    __metadata("design:type", String)
], MfaCodeDto.prototype, "code", void 0);
class MfaLoginDto {
    challengeToken;
    code;
}
exports.MfaLoginDto = MfaLoginDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(20),
    __metadata("design:type", String)
], MfaLoginDto.prototype, "challengeToken", void 0);
__decorate([
    (0, class_validator_1.Matches)(/^\d{6}$/),
    __metadata("design:type", String)
], MfaLoginDto.prototype, "code", void 0);
class OAuthCallbackDto {
    code;
}
exports.OAuthCallbackDto = OAuthCallbackDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", String)
], OAuthCallbackDto.prototype, "code", void 0);
