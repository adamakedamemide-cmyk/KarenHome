import { PostgresDatabase, type QueryExecutor } from './postgres-database';
export interface NotificationTemplate {
    id: string;
    code: string;
    locale: string;
    channel: string;
    subjectTemplate: string | null;
    bodyTemplate: string;
}
export interface NotificationRecord {
    id: string;
    userId: string;
    templateCode: string | null;
    notificationType: string;
    title: string;
    body: string;
    data: Record<string, unknown>;
    readAt: Date | null;
    createdAt: Date;
}
export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';
/**
 * Central Notification persistence (frozen base notification.* + 0032 quiet
 * hours / org preferences). Event-driven dispatch lives in the worker.
 */
export declare class NotificationRepository {
    private readonly db;
    constructor(db: PostgresDatabase);
    upsertTemplate(input: {
        code: string;
        locale: string;
        channel: string;
        subjectTemplate?: string | undefined;
        bodyTemplate: string;
    }): Promise<void>;
    findTemplate(code: string, locale: string, channel: string): Promise<NotificationTemplate | null>;
    setUserPreference(userId: string, notificationType: string, channel: NotificationChannel, enabled: boolean): Promise<void>;
    getUserPreference(userId: string, notificationType: string, channel: NotificationChannel): Promise<boolean | null>;
    setOrgPreference(organizationId: string, notificationType: string, channel: NotificationChannel, enabled: boolean): Promise<void>;
    getOrgPreference(organizationId: string, notificationType: string, channel: NotificationChannel): Promise<boolean | null>;
    setQuietHours(input: {
        userId: string;
        startTime: string;
        endTime: string;
        timezone: string;
    }): Promise<void>;
    getQuietHours(userId: string): Promise<{
        startTime: string;
        endTime: string;
        timezone: string;
    } | null>;
    createNotification(input: {
        userId: string;
        templateCode?: string | null;
        notificationType: string;
        title: string;
        body: string;
        data?: Record<string, unknown>;
    }, executor?: QueryExecutor): Promise<string>;
    createDelivery(input: {
        notificationId: string;
        channel: string;
        provider: string;
    }, executor?: QueryExecutor): Promise<string>;
    markDeliverySent(deliveryId: string, providerReference?: string | undefined): Promise<void>;
    markDeliveryFailed(deliveryId: string, error: string): Promise<void>;
    listUnread(userId: string, limit?: number): Promise<NotificationRecord[]>;
    markRead(notificationId: string, userId: string): Promise<void>;
}
