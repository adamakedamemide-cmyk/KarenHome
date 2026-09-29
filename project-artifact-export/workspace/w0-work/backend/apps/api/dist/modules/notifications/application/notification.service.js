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
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@platform/db");
/**
 * Gate 4 §13 — Central Notification Service (channel fan-out + preferences).
 * The API enqueues `notification.dispatch` jobs; NotificationWorker executes
 * this logic event-driven: preference check (user + org), quiet hours,
 * template resolution over the locale fallback chain, in-app row and
 * per-channel deliveries. Channels: in_app, email, sms, push.
 */
let NotificationService = class NotificationService {
    notifications;
    constructor(notifications) {
        this.notifications = notifications;
    }
    async dispatch(input, orgPreferences) {
        // localeChain resolution happens at template lookup time (see findTemplate consumers).
        const channels = ['in_app', 'email', 'sms', 'push'];
        // In-app row is always created (user-visible inbox), other channels obey preferences.
        const notificationId = await this.notifications.createNotification({
            userId: input.userId,
            templateCode: input.templateCode ?? null,
            notificationType: input.notificationType,
            title: input.titleFallback,
            body: input.bodyFallback,
            data: input.data ?? {},
        });
        const decision = { notificationId, channels: [{ channel: 'in_app', enabled: true }] };
        for (const channel of channels.slice(1)) {
            const userPref = await this.notifications.getUserPreference(input.userId, input.notificationType, channel);
            const enabled = userPref ?? true;
            let orgEnabled = null;
            if (orgPreferences?.organizationId) {
                orgEnabled = await this.notifications.getOrgPreference(orgPreferences.organizationId, input.notificationType, channel);
            }
            const finalEnabled = orgEnabled === null ? enabled : enabled && orgEnabled;
            if (!finalEnabled) {
                decision.channels.push({ channel, enabled: false });
                continue;
            }
            const deliveryId = await this.notifications.createDelivery({ notificationId, channel, provider: `${channel}-worker` });
            decision.channels.push({ channel, enabled: true, deliveryId });
        }
        return decision;
    }
    async isQuietHours(userId, at) {
        const quiet = await this.notifications.getQuietHours(userId);
        if (!quiet)
            return false;
        const localTime = formatLocalTime(at, quiet.timezone);
        const { startTime, endTime } = quiet;
        // Supports overnight windows (e.g. 22:00 → 07:00).
        if (startTime <= endTime)
            return localTime >= startTime && localTime < endTime;
        return localTime >= startTime || localTime < endTime;
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [db_1.NotificationRepository])
], NotificationService);
function formatLocalTime(at, timezone) {
    try {
        const formatter = new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: timezone,
            hour12: false,
        });
        return formatter.format(at);
    }
    catch {
        return at.toISOString().slice(11, 16);
    }
}
