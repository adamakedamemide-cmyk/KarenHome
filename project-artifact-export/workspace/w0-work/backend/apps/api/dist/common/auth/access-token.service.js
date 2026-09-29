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
exports.AccessTokenService = void 0;
const common_1 = require("@nestjs/common");
const jose_1 = require("jose");
const app_config_1 = require("../config/app-config");
let AccessTokenService = class AccessTokenService {
    config;
    constructor(config) {
        this.config = config;
    }
    async sign(user) {
        return new jose_1.SignJWT({ status: user.status, tokenType: 'access' })
            .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
            .setSubject(user.id)
            .setIssuer(this.config.jwtIssuer)
            .setAudience(this.config.jwtAudience)
            .setIssuedAt()
            .setExpirationTime(`${this.config.accessTtlSeconds}s`)
            .sign(this.config.jwtSecret);
    }
    async verify(token) {
        const { payload } = await (0, jose_1.jwtVerify)(token, this.config.jwtSecret, {
            issuer: this.config.jwtIssuer,
            audience: this.config.jwtAudience,
            algorithms: ['HS256'],
        });
        if (!payload.sub || payload.tokenType !== 'access' || typeof payload.status !== 'string') {
            throw new Error('Invalid access token claims');
        }
        return { id: payload.sub, status: payload.status };
    }
    /** Short-lived MFA challenge token (§15) — NOT an access token. */
    async signMfaChallenge(userId) {
        return new jose_1.SignJWT({ tokenType: 'mfa_challenge' })
            .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
            .setSubject(userId)
            .setIssuer(this.config.jwtIssuer)
            .setAudience(this.config.jwtAudience)
            .setIssuedAt()
            .setExpirationTime('5m')
            .sign(this.config.jwtSecret);
    }
    async verifyMfaChallenge(token) {
        const { payload } = await (0, jose_1.jwtVerify)(token, this.config.jwtSecret, {
            issuer: this.config.jwtIssuer,
            audience: this.config.jwtAudience,
            algorithms: ['HS256'],
        });
        if (!payload.sub || payload.tokenType !== 'mfa_challenge')
            throw new Error('Invalid MFA challenge claims');
        return payload.sub;
    }
};
exports.AccessTokenService = AccessTokenService;
exports.AccessTokenService = AccessTokenService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [app_config_1.AppConfig])
], AccessTokenService);
