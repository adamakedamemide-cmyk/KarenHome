import { PostgresDatabase, type QueryExecutor } from './postgres-database';

export class AuditRepository {
  constructor(private readonly db: PostgresDatabase) {}

  async append(input: {
    actorUserId?: string | undefined;
    organizationId?: string | undefined;
    action: string;
    entityType: string;
    entityId?: string | undefined;
    beforeData?: unknown;
    afterData?: unknown;
    ip?: string | undefined;
    userAgent?: string | undefined;
    requestId?: string | undefined;
  }, executor: QueryExecutor = this.db): Promise<void> {
    await executor.query(
      `INSERT INTO audit.logs(actor_user_id, organization_id, action, entity_type, entity_id, before_data, after_data, ip, user_agent, request_id)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid, $6::jsonb, $7::jsonb, $8::inet, $9, $10::uuid)`,
      [input.actorUserId ?? null, input.organizationId ?? null, input.action, input.entityType, input.entityId ?? null, input.beforeData ? JSON.stringify(input.beforeData) : null, input.afterData ? JSON.stringify(input.afterData) : null, input.ip ?? null, input.userAgent ?? null, input.requestId ?? null],
    );
  }
}
