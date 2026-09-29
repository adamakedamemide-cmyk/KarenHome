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
exports.NotificationsController = exports.QuietHoursDto = exports.PreferenceDto = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const access_token_guard_1 = require("../../../common/auth/access-token.guard");
const current_user_decorator_1 = require("../../../common/auth/current-user.decorator");
const db_1 = require("@platform/db");
const notification_service_1 = require("../application/notification.service");
class PreferenceDto {
    notificationType;
    channel;
    enabled;
}
exports.PreferenceDto = PreferenceDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], PreferenceDto.prototype, "notificationType", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['in_app', 'email', 'sms', 'push']),
    __metadata("design:type", String)
], PreferenceDto.prototype, "channel", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], PreferenceDto.prototype, "enabled", void 0);
class QuietHoursDto {
    startTime;
    endTime;
    timezone;
}
exports.QuietHoursDto = QuietHoursDto;
__decorate([
    (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):[0-5]\d$/),
    __metadata("design:type", String)
], QuietHoursDto.prototype, "startTime", void 0);
__decorate([
    (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):[0-5]\d$/),
    __metadata("design:type", String)
], QuietHoursDto.prototype, "endTime", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], QuietHoursDto.prototype, "timezone", void 0);
let NotificationsController = class NotificationsController {
    notifications;
    service;
    constructor(notifications, service) {
        this.notifications = notifications;
        this.service = service;
    }
    async listUnread(user, limit) {
        const bounded = Math.min(100, Math.max(1, Number(limit ?? '25') || 25));
        return { data: await this.notifications.listUnread(user.id, bounded) };
    }
    async markRead(id, user) {
        await this.notifications.markRead(id, user.id);
        return { data: { read: true } };
    }
    async setPreference(user, dto) {
        await this.notifications.setUserPreference(user.id, dto.notificationType, dto.channel, dto.enabled);
        return { data: { updated: true } };
    }
    async setQuietHours(user, dto) {
        await this.notifications.setQuietHours({ userId: user.id, startTime: dto.startTime, endTime: dto.endTime, timezone: dto.timezone });
        return { data: { updated: true } };
    }
    async getQuietHours(user) {
        return { data: await this.notifications.getQuietHours(user.id) };
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "listUnread", null);
__decorate([
    (0, common_1.Post)(':id/read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "markRead", null);
__decorate([
    (0, common_1.Post)('preferences'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, PreferenceDto]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "setPreference", null);
__decorate([
    (0, common_1.Post)('quiet-hours'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, QuietHoursDto]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "setQuietHours", null);
__decorate([
    (0, common_1.Get)('quiet-hours'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationsController.prototype, "getQuietHours", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, common_1.Controller)('notifications'),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __metadata("design:paramtypes", [db_1.NotificationRepository,
        notification_service_1.NotificationService])
], NotificationsController);
