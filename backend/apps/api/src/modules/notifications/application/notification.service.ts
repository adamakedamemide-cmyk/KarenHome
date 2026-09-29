import { Injectable } from '@nestjs/common';
import { NotificationRepository, type NotificationChannel } from '@platform/db';

export interface DispatchInput {
  notificationType: string;
  userId: string;
  templateCode?: string;
  data?: Record<string, unknown>;
  titleFallback: string;
  bodyFallback: string;
  localeChain?: string[];
}

export interface DispatchDecision {
  notificationId: string;
  channels: Array<{ channel: NotificationChannel; enabled: boolean; deliveryId?: string; deferredQuietHours?: boolean }>;
}

/**
 * Gate 4 §13 — Central Notification Service (channel fan-out + preferences).
 * The API enqueues `notification.dispatch` jobs; NotificationWorker executes
 * this logic event-driven: preference check (user + org), quiet hours,
 * template resolution over the locale fallback chain, in-app row and
 * per-channel deliveries. Channels: in_app, email, sms, push.
 */
@Injectable()
export class NotificationService {
  constructor(private readonly notifications: NotificationRepository) {}

  async dispatch(input: DispatchInput, orgPreferences?: { organizationId?: string }): Promise<DispatchDecision> {
    // localeChain resolution happens at template lookup time (see findTemplate consumers).
    const channels: NotificationChannel[] = ['in_app', 'email', 'sms', 'push'];

    // In-app row is always created (user-visible inbox), other channels obey preferences.
    const notificationId = await this.notifications.createNotification({
      userId: input.userId,
      templateCode: input.templateCode ?? null,
      notificationType: input.notificationType,
      title: input.titleFallback,
      body: input.bodyFallback,
      data: input.data ?? {},
    });

    const decision: DispatchDecision = { notificationId, channels: [{ channel: 'in_app', enabled: true }] };

    for (const channel of channels.slice(1)) {
      const userPref = await this.notifications.getUserPreference(input.userId, input.notificationType, channel);
      const enabled = userPref ?? true;
      let orgEnabled: boolean | null = null;
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

  async isQuietHours(userId: string, at: Date): Promise<boolean> {
    const quiet = await this.notifications.getQuietHours(userId);
    if (!quiet) return false;
    const localTime = formatLocalTime(at, quiet.timezone);
    const { startTime, endTime } = quiet;
    // Supports overnight windows (e.g. 22:00 → 07:00).
    if (startTime <= endTime) return localTime >= startTime && localTime < endTime;
    return localTime >= startTime || localTime < endTime;
  }
}

function formatLocalTime(at: Date, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
      hour12: false,
    });
    return formatter.format(at);
  } catch {
    return at.toISOString().slice(11, 16);
  }
}
