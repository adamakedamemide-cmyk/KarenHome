"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxRepository = void 0;
class OutboxRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async append(event, executor = this.db) {
        const result = await executor.query(`INSERT INTO audit.outbox_events(aggregate_type, aggregate_id, event_type, payload)
       VALUES ($1, $2::uuid, $3, $4::jsonb)
       RETURNING id`, [event.aggregateType, event.aggregateId, event.eventType, JSON.stringify({ eventVersion: event.eventVersion, ...event.payload })]);
        const appended = result.rows[0];
        if (!appended)
            throw new Error('OUTBOX_APPEND_FAILED');
        return appended.id;
    }
    async leaseBatch(workerId, limit = 100) {
        return this.db.transaction(async (client) => {
            const rows = await client.query(`WITH candidates AS (
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
         RETURNING o.id, o.event_type, o.aggregate_id, o.payload`, [limit, workerId]);
            return rows.rows.map((r) => ({ id: r.id, eventType: r.event_type, aggregateId: r.aggregate_id, payload: r.payload }));
        });
    }
    async markPublished(id, workerId) {
        await this.db.query(`UPDATE audit.outbox_events SET published_at = now(), locked_at = NULL, locked_by = NULL WHERE id = $1::uuid AND locked_by = $2`, [id, workerId]);
    }
    async markFailed(id, workerId, errorMessage) {
        await this.db.query(`UPDATE audit.outbox_events SET retry_count = retry_count + 1, last_error = $3, locked_at = NULL, locked_by = NULL WHERE id = $1::uuid AND locked_by = $2`, [id, workerId, errorMessage.slice(0, 2000)]);
    }
}
exports.OutboxRepository = OutboxRepository;
