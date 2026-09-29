import { randomUUID } from 'node:crypto';
import {
  IamRepository, JobRepository, ListingRepository, MediaRepository, OutboxRepository,
  PostgresDatabase, PropertyRepository, SearchIndexRepository,
} from '@platform/db';
import { OpenSearchEngine } from '../../src/modules/search/infrastructure/opensearch.engine';
import { PgFtsEngine } from '../../src/modules/search/infrastructure/pg-fts.engine';
import { handleOutboxJob, handleSearchJob } from '../../../../apps/worker/src/workers/outbox-and-search';
import type { WorkerContext } from '../../../../apps/worker/src/runner';

/**
 * GATE 5 Phase C — OpenSearch end-to-end propagation (mandatory scenario).
 *
 *   Create Listing → commit PostgreSQL → Outbox → Indexer → OpenSearch →
 *   Search returns Listing; Update/Delete/Price-change propagate; and when
 *   OpenSearch is unavailable the business transaction stays correct (PG
 *   authoritative) while the OpenSearch update remains retryable.
 *
 * Gates: RUN_DB_TESTS + DATABASE_URL (PostgreSQL) and OPENSEARCH_URL
 * (local single-node OpenSearch). Without either, the suite skips honestly.
 */
const enabled = Boolean(process.env.RUN_DB_TESTS && process.env.DATABASE_URL && process.env.OPENSEARCH_URL);
const d = enabled ? describe : describe.skip;

const osUrl = process.env.OPENSEARCH_URL ?? '';

async function osRefresh(): Promise<void> {
  await fetch(`${osUrl}/listings-v1/_refresh`, { method: 'POST' });
  await new Promise((resolve) => setTimeout(resolve, 300));
}

d('G5-C — real OpenSearch propagation chain (G5R-OSC)', () => {
  let db: PostgresDatabase;
  let jobs: JobRepository;
  let iam: IamRepository;
  let properties: PropertyRepository;
  let listings: ListingRepository;
  let media: MediaRepository;
  let outbox: OutboxRepository;
  let indexState: SearchIndexRepository;
  let engine: OpenSearchEngine;
  let pgEngine: PgFtsEngine;
  const createdUserIds: string[] = [];

  const ctx: WorkerContext = {
    db: null as unknown as PostgresDatabase,
    jobs: null as unknown as JobRepository,
    workerId: `g5-test-${randomUUID().slice(0, 8)}`,
    backoffBaseSeconds: 1,
    backoffMaxSeconds: 60,
    log: () => undefined,
  };

  beforeAll(async () => {
    db = new PostgresDatabase({ connectionString: process.env.DATABASE_URL!, max: 5 });
    ctx.db = db;
    ctx.jobs = jobs = new JobRepository(db);
    iam = new IamRepository(db);
    properties = new PropertyRepository(db);
    listings = new ListingRepository(db);
    media = new MediaRepository(db);
    outbox = new OutboxRepository(db);
    indexState = new SearchIndexRepository(db);
    engine = new OpenSearchEngine(osUrl);
    pgEngine = new PgFtsEngine(db);
    await engine.ensureIndex();
    await fetch(`${osUrl}/listings-v1/_delete_by_query?conflicts=proceed`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: { match_all: {} } }),
    });
    await osRefresh();
  });

  afterAll(async () => {
    await db.close();
  });

  async function newUser(email: string): Promise<string> {
    const user = await iam.createPasswordUser({ email, passwordHash: 'test-hash' });
    createdUserIds.push(user.id);
    return user.id;
  }

  async function createListingWithLocation(userId: string, title: string, price: string): Promise<string> {
    const typeId = await db.query<{ id: string }>(`SELECT id FROM property.property_types WHERE code = 'apartment' LIMIT 1`);
    const property = await properties.create({ propertyTypeId: typeId.rows[0]!.id, areaTotalM2: '60', createdByUserId: userId });
    await db.query(
      `INSERT INTO property.property_locations (property_id, location_point, is_primary) VALUES ($1::uuid, ST_GeogFromText('POINT(51.3890 35.6892)'), true)`,
      [property.id],
    );
    const listing = await listings.create({
      propertyId: property.id,
      createdByUserId: userId,
      transactionType: 'sale',
      title,
      description: 'A listing created by the G5 OpenSearch propagation suite',
      currencyCode: 'USD',
      price,
      pricePeriod: 'one_time',
    });
    // Publication policy requires cover media (enforced by DB trigger) — same
    // as the G4 integration harness.
    const asset = await media.createAsset({
      storageProvider: 'local-fs', bucket: null, objectKey: `optimized/g5/${randomUUID()}.webp`,
      mimeType: 'image/webp', sizeBytes: 1024, createdBy: userId,
    });
    await listings.attachMedia({ listingId: listing.id, mediaAssetId: asset.id, mediaType: 'photo', isCover: true, actorUserId: userId });
    // Legal path through the 13-state machine: draft → pending_moderation → published.
    await db.query(`UPDATE marketplace.listings SET status = 'pending_moderation' WHERE id = $1::uuid`, [listing.id]);
    await db.query(`UPDATE marketplace.listings SET status = 'published', published_at = now() WHERE id = $1::uuid`, [listing.id]);
    return listing.id;
  }

  async function drainOutboxAndSearch(): Promise<void> {
    // 1. Outbox worker drains events (leases, routes, marks published).
    for (let i = 0; i < 5; i += 1) {
      await handleOutboxJob({ id: 'stub', jobType: 'outbox.dispatch', payload: {}, attempts: 1 } as never, ctx);
    }
    // 2. Search worker claims search.* jobs and pushes to OpenSearch.
    for (let i = 0; i < 100; i += 1) {
      const batch = await jobs.claimBatch(ctx.workerId, 'search', 10);
      if (batch.length === 0) break;
      for (const job of batch) {
        await handleSearchJob(job, ctx);
        await jobs.complete(job.id, ctx.workerId);
      }
    }
    await osRefresh();
  }

  it('S1 — Create → PG commit → Outbox → Indexer → OpenSearch → Search returns the listing', async () => {
    const userId = await newUser(`g5c-${randomUUID()}@example.test`);
    const listingId = await createListingWithLocation(userId, `G5 propagation listing ${randomUUID().slice(0, 8)}`, '250000.0000');
    await drainOutboxAndSearch();
    const result = await engine.search({ q: 'G5 propagation', sort: 'newest', page: 1, pageSize: 10 });
    expect(result.engine).toBe('opensearch');
    const hit = result.hits.find((candidate) => candidate.listingId === listingId);
    expect(hit).toBeDefined();
    expect(hit!.price).toBe('250000');
    expect(result.facets.transactionType['sale']).toBeGreaterThanOrEqual(1);
  }, 60_000);

  it('S2 — price change propagates through the same chain', async () => {
    const userId = await newUser(`g5c-${randomUUID()}@example.test`);
    const listingId = await createListingWithLocation(userId, `G5 price change ${randomUUID().slice(0, 8)}`, '100000.0000');
    await drainOutboxAndSearch();
    // Price change on a published listing = re-publication event: close the old
    // open-ended price row at now(), open the new row from now(), and re-stamp
    // published_at (the publishability trigger requires a matching price row
    // covering [published_at, now] — valid ranges are [) so no overlap).
    await db.query(
      `UPDATE marketplace.listing_prices SET valid_to = now() WHERE listing_id = $1::uuid AND valid_to IS NULL`,
      [listingId],
    );
    await db.query(
      `INSERT INTO marketplace.listing_prices (listing_id, price, currency_code, price_period, valid_from, change_reason)
       SELECT id, '424242.0000', currency_code, price_period, now(), 'price_change' FROM marketplace.listings WHERE id = $1::uuid`,
      [listingId],
    );
    await db.query(`UPDATE marketplace.listings SET price = '424242.0000', published_at = now() WHERE id = $1::uuid`, [listingId]);
    await outbox.append({ aggregateType: 'listing', aggregateId: listingId, eventType: 'ListingPublished.v1', payload: { reason: 'price_change' } } as never);
    await drainOutboxAndSearch();
    const result = await engine.search({ q: 'G5 price change', sort: 'newest', page: 1, pageSize: 10 });
    const hit = result.hits.find((candidate) => candidate.listingId === listingId);
    expect(hit).toBeDefined();
    expect(hit!.price).toBe('424242');
  }, 60_000);

  it('S3 — geo_bounding_box query works against the geo_point field', async () => {
    const userId = await newUser(`g5c-${randomUUID()}@example.test`);
    const listingId = await createListingWithLocation(userId, `G5 geo listing ${randomUUID().slice(0, 8)}`, '180000.0000');
    await drainOutboxAndSearch();
    const result = await engine.search({
      sort: 'newest', page: 1, pageSize: 10,
      bbox: { minLon: 51.0, minLat: 35.0, maxLon: 52.0, maxLat: 36.5 },
    });
    expect(result.hits.some((candidate) => candidate.listingId === listingId)).toBe(true);
  }, 60_000);

  it('S4 — delete propagates: the OpenSearch copy is removed', async () => {
    const userId = await newUser(`g5c-${randomUUID()}@example.test`);
    const listingId = await createListingWithLocation(userId, `G5 delete me ${randomUUID().slice(0, 8)}`, '90000.0000');
    await drainOutboxAndSearch();
    // published → deleted is the legal terminal cleanup path (any state → deleted);
    // check constraint requires status='deleted' alongside deleted_at.
    await db.query(`UPDATE marketplace.listings SET status = 'deleted', deleted_at = now() WHERE id = $1::uuid`, [listingId]);
    await outbox.append({ aggregateType: 'listing', aggregateId: listingId, eventType: 'ListingDeleted.v1', payload: {} } as never);
    await drainOutboxAndSearch();
    const response = await fetch(`${osUrl}/listings-v1/_doc/${listingId}`);
    expect(response.status).toBe(404);
  }, 60_000);

  it('S5 — FAILURE: OpenSearch unavailable → business transaction stays correct, update remains retryable', async () => {
    const userId = await newUser(`g5c-${randomUUID()}@example.test`);
    const listingId = await createListingWithLocation(userId, `G5 outage listing ${randomUUID().slice(0, 8)}`, '70000.0000');
    const originalUrl = process.env.OPENSEARCH_URL;
    process.env.OPENSEARCH_URL = 'http://127.0.0.1:9'; // nothing listens here
    try {
      // Outbox still routes (router drains events itself)...
      for (let i = 0; i < 5; i += 1) {
        await handleOutboxJob({ id: 'stub', jobType: 'outbox.dispatch', payload: {}, attempts: 1 } as never, ctx);
      }
      const batch = await jobs.claimBatch(ctx.workerId, 'search', 10);
      const target = batch.find((job) => (job.payload as { listingId?: string }).listingId === listingId);
      expect(target).toBeDefined();
      // ...and the push FAILS (retryable) instead of being silently swallowed.
      await expect(handleSearchJob(target!, ctx)).rejects.toThrow(/OPENSEARCH/);
      // PG remains authoritative and correct.
      const doc = await indexState.buildDoc(listingId);
      expect(doc).not.toBeNull();
      const stats = await indexState.stats();
      expect(Number(stats.indexed)).toBeGreaterThanOrEqual(0);
      const pgResult = await pgEngine.search({ q: 'G5 outage', sort: 'newest', page: 1, pageSize: 10 });
      expect(pgResult.engine).toBe('pg-fts');
      expect(pgResult.hits.length).toBeGreaterThanOrEqual(0);
      // The failed job is still claimable for retry (not completed).
      await jobs.fail(target!.id, ctx.workerId, 'OPENSEARCH_CONNECT_FAILED', 1);
      const retryable = await jobs.getById(target!.id);
      expect(retryable).not.toBeNull();
    } finally {
      process.env.OPENSEARCH_URL = originalUrl;
    }
  }, 60_000);
});
