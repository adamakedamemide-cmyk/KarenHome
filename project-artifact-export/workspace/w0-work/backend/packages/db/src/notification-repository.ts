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
export class NotificationRepository {
  constructor(private readonly db: PostgresDatabase) {}

  async upsertTemplate(input: { code: string; locale: string; channel: string; subjectTemplate?: string | undefined; bodyTemplate: string }): Promise<void> {
    await this.db.query(
      `INSERT INTO notification.templates(code, locale, channel, subject_template, body_template, active)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (code, locale, channel) DO UPDATE SET
         subject_template = EXCLUDED.subject_template, body_template = EXCLUDED.body_template, active = true`,
      [input.code, input.locale, input.channel, input.subjectTemplate ?? null, input.bodyTemplate],
    );
  }

  async findTemplate(code: string, locale: string, channel: string): Promise<NotificationTemplate | null> {
    const r = await this.db.query<{ id: string; code: string; locale: string; channel: string; subject_template: string | null; body_template: string }>(
      `SELECT id, code, locale, channel, subject_template, body_template FROM notification.templates
       WHERE code = $1 AND locale = $2 AND channel = $3 AND active = true`,
      [code, locale, channel],
    );
    const row = r.rows[0];
    return row ? { id: row.id, code: row.code, locale: row.locale, channel: row.channel, subjectTemplate: row.subject_template, bodyTemplate: row.body_template } : null;
  }

  async setUserPreference(userId: string, notificationType: string, channel: NotificationChannel, enabled: boolean): Promise<void> {
    await this.db.query(
      `INSERT INTO notification.user_preferences(user_id, notification_type, channel, enabled)
       VALUES ($1::uuid, $2, $3, $4)
       ON CONFLICT (user_id, notification_type, channel) DO UPDATE SET enabled = EXCLUDED.enabled`,
      [userId, notificationType, channel, enabled],
    );
  }

  async getUserPreference(userId: string, notificationType: string, channel: NotificationChannel): Promise<boolean | null> {
    const r = await this.db.query<{ enabled: boolean }>(
      `SELECT enabled FROM notification.user_preferences WHERE user_id = $1::uuid AND notification_type = $2 AND channel = $3`,
      [userId, notificationType, channel],
    );
    return r.rows[0]?.enabled ?? null;
  }

  async setOrgPreference(organizationId: string, notificationType: string, channel: NotificationChannel, enabled: boolean): Promise<void> {
    await this.db.query(
      `INSERT INTO notification.organization_preferences(organization_id, notification_type, channel, enabled)
       VALUES ($1::uuid, $2, $3, $4)
       ON CONFLICT (organization_id, notification_type, channel) DO UPDATE SET enabled = EXCLUDED.enabled`,
      [organizationId, notificationType, channel, enabled],
    );
  }

  async getOrgPreference(organizationId: string, notificationType: string, channel: NotificationChannel): Promise<boolean | null> {
    const r = await this.db.query<{ enabled: boolean }>(
      `SELECT enabled FROM notification.organization_preferences WHERE organization_id = $1::uuid AND notification_type = $2 AND channel = $3`,
      [organizationId, notificationType, channel],
    );
    return r.rows[0]?.enabled ?? null;
  }

  async setQuietHours(input: { userId: string; startTime: string; endTime: string; timezone: string }): Promise<void> {
    await this.db.query(
      `INSERT INTO notification.quiet_hours(user_id, start_time, end_time, timezone)
       VALUES ($1::uuid, $2::time, $3::time, $4)
       ON CONFLICT (user_id) DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, timezone = EXCLUDED.timezone, updated_at = now()`,
      [input.userId, input.startTime, input.endTime, input.timezone],
    );
  }

  async getQuietHours(userId: string): Promise<{ startTime: string; endTime: string; timezone: string } | null> {
    const r = await this.db.query<{ start_time: string; end_time: string; timezone: string }>(
      `SELECT to_char(start_time, 'HH24:MI') AS start_time, to_char(end_time, 'HH24:MI') AS end_time, timezone FROM notification.quiet_hours WHERE user_id = $1::uuid`,
      [userId],
    );
    const row = r.rows[0];
    return row ? { startTime: row.start_time, endTime: row.end_time, timezone: row.timezone } : null;
  }

  async createNotification(input: { userId: string; templateCode?: string | null; notificationType: string; title: string; body: string; data?: Record<string, unknown> }, executor: QueryExecutor = this.db): Promise<string> {
    const r = await executor.query<{ id: string }>(
      `INSERT INTO notification.notifications(user_id, template_code, notification_type, title, body, data)
       VALUES ($1::uuid, $2, $3, $4, $5, $6::jsonb) RETURNING id`,
      [input.userId, input.templateCode ?? null, input.notificationType, input.title, input.body, JSON.stringify(input.data ?? {})],
    );
    const id = r.rows[0]?.id;
    if (!id) throw new Error('NOTIFICATION_CREATE_FAILED');
    return id;
  }

  async createDelivery(input: { notificationId: string; channel: string; provider: string }, executor: QueryExecutor = this.db): Promise<string> {
    const r = await executor.query<{ id: string }>(
      `INSERT INTO notification.deliveries(notification_id, channel, provider, status, attempts)
       VALUES ($1::uuid, $2, $3, 'pending', 0) RETURNING id`,
      [input.notificationId, input.channel, input.provider],
    );
    const id = r.rows[0]?.id;
    if (!id) throw new Error('DELIVERY_CREATE_FAILED');
    return id;
  }

  async markDeliverySent(deliveryId: string, providerReference?: string | undefined): Promise<void> {
    await this.db.query(
      `UPDATE notification.deliveries SET status = 'sent', sent_at = now(), provider_reference = COALESCE($2, provider_reference)
       WHERE id = $1::uuid`,
      [deliveryId, providerReference ?? null],
    );
  }

  async markDeliveryFailed(deliveryId: string, error: string): Promise<void> {
    await this.db.query(
      `UPDATE notification.deliveries SET status = 'failed', attempts = attempts + 1, last_error = $2
       WHERE id = $1::uuid`,
      [deliveryId, error.slice(0, 1000)],
    );
  }

  async listUnread(userId: string, limit = 25): Promise<NotificationRecord[]> {
    const r = await this.db.query<{ id: string; user_id: string; template_code: string | null; notification_type: string; title: string; body: string; data: unknown; read_at: Date | null; created_at: Date }>(
      `SELECT id, user_id, template_code, notification_type, title, body, data, read_at, created_at
       FROM notification.notifications WHERE user_id = $1::uuid AND read_at IS NULL
       ORDER BY created_at DESC LIMIT $2`,
      [userId, limit],
    );
    return r.rows.map((row) => ({
      id: row.id, userId: row.user_id, templateCode: row.template_code, notificationType: row.notification_type,
      title: row.title, body: row.body, data: (row.data ?? {}) as Record<string, unknown>, readAt: row.read_at, createdAt: row.created_at,
    }));
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    await this.db.query(
      `UPDATE notification.notifications SET read_at = now() WHERE id = $1::uuid AND user_id = $2::uuid AND read_at IS NULL`,
      [notificationId, userId],
    );
  }
}
