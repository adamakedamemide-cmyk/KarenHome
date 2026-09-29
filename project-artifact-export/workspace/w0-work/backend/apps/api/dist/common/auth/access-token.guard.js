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
exports.AccessTokenGuard = void 0;
const common_1 = require("@nestjs/common");
const access_token_service_1 = require("./access-token.service");
const db_1 = require("@platform/db");
let AccessTokenGuard = class AccessTokenGuard {
    tokens;
    iam;
    constructor(tokens, iam) {
        this.tokens = tokens;
        this.iam = iam;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const raw = request.headers.authorization;
        if (!raw?.startsWith('Bearer '))
            throw new common_1.UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Bearer token required' });
        try {
            const tokenUser = await this.tokens.verify(raw.slice(7));
            const currentUser = await this.iam.findUserById(tokenUser.id);
            if (!currentUser || currentUser.status !== 'active')
                throw new common_1.UnauthorizedException({ code: 'AUTH_SESSION_REVOKED', message: 'User session is no longer active' });
            request.user = { id: currentUser.id, status: currentUser.status };
            return true;
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException)
                throw error;
            throw new common_1.UnauthorizedException({ code: 'INVALID_ACCESS_TOKEN', message: 'Invalid or expired access token' });
        }
    }
};
exports.AccessTokenGuard = AccessTokenGuard;
exports.AccessTokenGuard = AccessTokenGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [access_token_service_1.AccessTokenService, db_1.IamRepository])
], AccessTokenGuard);
