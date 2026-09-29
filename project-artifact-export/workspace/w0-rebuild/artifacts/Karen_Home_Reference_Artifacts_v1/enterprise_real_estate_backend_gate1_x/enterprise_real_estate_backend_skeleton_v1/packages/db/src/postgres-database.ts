import { Pool, PoolClient, QueryResultRow } from 'pg';

export interface DatabaseConfig {
  connectionString: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  ssl?: boolean | { rejectUnauthorized: boolean };
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
  }

  query<T extends QueryResultRow>(text: string, params: readonly unknown[] = []): Promise<{ rows: T[]; rowCount: number | null }> {
    return this.pool.query<T>(text, [...params]);
  }

  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL statement_timeout = '15s'");
      await client.query("SET LOCAL lock_timeout = '5s'");
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
