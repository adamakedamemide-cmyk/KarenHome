import { PostgresDatabase, type QueryExecutor } from './postgres-database';

export interface IntegrationEvent {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  eventVersion: 1;
  payload: Record<string, unknown>;
}

export class OutboxRepository {
  constructor(private readonly db: PostgresDatabase) {}

  async append(event: IntegrationEvent, executor: QueryExecutor = this.db): Promise<string> {
    const result = await executor.query<{ id: string }>(
      `INSERT INTO audit.outbox_events(aggregate_type, aggregate_id, event_type, payload)
       VALUES ($1, $2::uuid, $3, $4::jsonb)
       RETURNING id`,
      [event.aggregateType, event.aggregateId, event.eventType, JSON.stringify({ eventVersion: event.eventVersion, ...event.payload })],
    );
    const appended = result.rows[0];
    if (!appended) throw new Error('OUTBOX_APPEND_FAILED');
    return appended.id;
  }

  async leaseBatch(workerId: string, limit = 100): Promise<Array<{ id: string; eventType: string; aggregateId: string; payload: Record<string, unknown> }>> {
    return this.db.transaction(async (client) => {
      const rows = await client.query<{ id: string; event_type: string; aggregate_id: string; payload: Record<string, unknown> }>(
        `WITH candidates AS (
           SELECT id FROM audit.outbox_events
            WHERE published_at IS NULL
              AND (locked_at IS NULL OR locked_at < now() - interval '5 minutes')
            ORDER BY occurred_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT $1
         )
         UPDATE audit.outbox_events o
            SET locked_at = now(), locked_by = $2
           FROM candidates c
          WHERE o.id = c.id
         RETURNING o.id, o.event_type, o.aggregate_id, o.payload`,
        [limit, workerId],
      );
      return rows.rows.map((r) => ({ id: r.id, eventType: r.event_type, aggregateId: r.aggregate_id, payload: r.payload }));
    });
  }

  async markPublished(id: string, workerId: string): Promise<void> {
    await this.db.query(`UPDATE audit.outbox_events SET published_at = now(), locked_at = NULL, locked_by = NULL WHERE id = $1::uuid AND locked_by = $2`, [id, workerId]);
  }

  async markFailed(id: string, workerId: string, errorMessage: string): Promise<void> {
    await this.db.query(`UPDATE audit.outbox_events SET retry_count = retry_count + 1, last_error = $3, locked_at = NULL, locked_by = NULL WHERE id = $1::uuid AND locked_by = $2`, [id, workerId, errorMessage.slice(0, 2000)]);
  }
}
