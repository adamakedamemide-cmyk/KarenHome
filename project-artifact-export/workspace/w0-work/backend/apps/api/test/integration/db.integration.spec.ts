import { describe, expect, it } from '@jest/globals';
import { PostgresDatabase } from '@platform/db';

describe('database integration', () => {
  const enabled = Boolean(process.env.RUN_DB_TESTS && process.env.DATABASE_URL);
  it(enabled ? 'connects to PostgreSQL' : 'is disabled without RUN_DB_TESTS and DATABASE_URL', async () => {
    if (!enabled) return;
    const db = new PostgresDatabase({ connectionString: process.env.DATABASE_URL! });
    await db.healthcheck();
    await db.close();
    expect(true).toBe(true);
  });
});
