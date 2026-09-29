"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresDatabase = void 0;
const pg_1 = require("pg");
class PostgresDatabase {
    pool;
    constructor(config) {
        this.pool = new pg_1.Pool({
            connectionString: config.connectionString,
            max: config.max ?? 20,
            idleTimeoutMillis: config.idleTimeoutMillis ?? 30_000,
            connectionTimeoutMillis: config.connectionTimeoutMillis ?? 10_000,
            ssl: config.ssl ?? false,
            application_name: 'enterprise-real-estate-api',
        });
        this.pool.on('error', (error) => {
            // A pooled idle-client error must never crash the process silently.
            console.error('[postgres.pool]', error);
        });
    }
    query(text, params = []) {
        return this.pool.query(text, [...params]);
    }
    async transaction(fn, context = {}) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query("SET LOCAL statement_timeout = '15s'");
            await client.query("SET LOCAL lock_timeout = '5s'");
            if (context.actorUserId)
                await client.query(`SELECT set_config('app.actor_user_id', $1, true)`, [context.actorUserId]);
            if (context.requestId)
                await client.query(`SELECT set_config('app.request_id', $1, true)`, [context.requestId]);
            if (context.statusChangeReason)
                await client.query(`SELECT set_config('app.status_change_reason', $1, true)`, [context.statusChangeReason]);
            const result = await fn(client);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            try {
                await client.query('ROLLBACK');
            }
            catch { /* preserve original error */ }
            throw error;
        }
        finally {
            client.release();
        }
    }
    async healthcheck() {
        await this.query('SELECT 1');
    }
    async close() {
        await this.pool.end();
    }
}
exports.PostgresDatabase = PostgresDatabase;
