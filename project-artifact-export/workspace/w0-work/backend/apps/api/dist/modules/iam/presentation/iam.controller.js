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
exports.IamController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../../../common/auth/current-user.decorator");
const access_token_guard_1 = require("../../../common/auth/access-token.guard");
const iam_service_1 = require("../application/iam.service");
const login_dto_1 = require("./dto/login.dto");
const refresh_dto_1 = require("./dto/refresh.dto");
const register_dto_1 = require("./dto/register.dto");
let IamController = class IamController {
    iam;
    constructor(iam) {
        this.iam = iam;
    }
    async register(dto) { return { data: await this.iam.register(dto) }; }
    async login(dto, request) { return { data: await this.iam.login(dto.email, dto.password, requestMeta(request)) }; }
    async refresh(dto, request) { return { data: await this.iam.refresh(dto.refreshToken, requestMeta(request)) }; }
    async logout(dto) { await this.iam.logout(dto.refreshToken); }
    async me(user) { return { data: await this.iam.me(user.id) }; }
};
exports.IamController = IamController;
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], IamController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], IamController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refresh_dto_1.RefreshDto, Object]),
    __metadata("design:returntype", Promise)
], IamController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refresh_dto_1.RefreshDto]),
    __metadata("design:returntype", Promise)
], IamController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IamController.prototype, "me", null);
exports.IamController = IamController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [iam_service_1.IamService])
], IamController);
function requestMeta(request) {
    const userAgent = typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : undefined;
    const deviceId = typeof request.headers['x-device-id'] === 'string' ? request.headers['x-device-id'] : undefined;
    return { ip: request.ip, requestId: String(request.id ?? ''), ...(userAgent !== undefined ? { userAgent } : {}), ...(deviceId !== undefined ? { deviceId } : {}) };
}
