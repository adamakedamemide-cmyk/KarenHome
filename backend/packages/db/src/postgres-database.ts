import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

export interface DatabaseConfig {
  connectionString: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

export interface TransactionContext {
  actorUserId?: string | undefined;
  requestId?: string | undefined;
  statusChangeReason?: string | undefined;
}

export interface QueryExecutor {
  query<T extends QueryResultRow>(text: string, values?: readonly unknown[]): Promise<QueryResult<T>>;
}

export class PostgresDatabase {
  private readonly pool: Pool;

  constructor(config: DatabaseConfig) {
    this.pool = new Pool({
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

  query<T extends QueryResultRow>(text: string, params: readonly unknown[] = []): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, [...params]);
  }

  async transaction<T>(fn: (client: PoolClient) => Promise<T>, context: TransactionContext = {}): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL statement_timeout = '15s'");
      await client.query("SET LOCAL lock_timeout = '5s'");
      if (context.actorUserId) await client.query(`SELECT set_config('app.actor_user_id', $1, true)`, [context.actorUserId]);
      if (context.requestId) await client.query(`SELECT set_config('app.request_id', $1, true)`, [context.requestId]);
      if (context.statusChangeReason) await client.query(`SELECT set_config('app.status_change_reason', $1, true)`, [context.statusChangeReason]);
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { /* preserve original error */ }
      throw error;
    } finally {
      client.release();
    }
  }

  async healthcheck(): Promise<void> {
    await this.query('SELECT 1');
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
