import { Injectable } from '@nestjs/common';
import { JobRepository, ListingRepository, PostgresDatabase, SearchIndexRepository } from '@platform/db';
import { MetricsRegistry } from '../../../common/observability/metrics';
import { AppConfig } from '../../../common/config/app-config';
import type { SearchEngine, SearchQuery, SearchResult } from '../domain/search-engine.port';
import { PgFtsEngine } from '../infrastructure/pg-fts.engine';
import { OpenSearchEngine } from '../infrastructure/opensearch.engine';

/**
 * Gate 4 §11 — Search orchestration: engine selection (OpenSearch when
 * healthy, PG FTS verified fallback), document building, RebuildSearchIndex
 * command (job-driven) and index lag observability.
 */
@Injectable()
export class SearchService {
  readonly pgEngine: PgFtsEngine;
  private readonly osEngine: OpenSearchEngine | null;
  private osHealthy = false;
  private osCheckedAt = 0;

  constructor(
    private readonly db: PostgresDatabase,
    private readonly listings: ListingRepository,
    private readonly indexState: SearchIndexRepository,
    private readonly jobs: JobRepository,
    private readonly metrics: MetricsRegistry,
    private readonly config: AppConfig,
  ) {
    this.pgEngine = new PgFtsEngine(db);
    this.osEngine = config.opensearchUrl ? new OpenSearchEngine(config.opensearchUrl) : null;
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    return this.metrics.observe('search_duration_ms', 'Search request duration', { engine: 'any' }, async () => {
      const engine = await this.selectEngine();
      const result = await engine.search(query);
      this.metrics.counter('search_requests_total', 'Search requests', { engine: result.engine });
      return result;
    });
  }

  async health(): Promise<{ engine: string; openSearchConfigured: boolean; openSearchHealthy: boolean; pg: { healthy: boolean; detail?: string }; indexLag: { pending: number; failed: number; indexed: number; oldestPendingSeconds: number | null } }> {
    const pgHealth = await this.pgEngine.healthcheck();
    const osHealth = this.osEngine ? await this.osEngine.healthcheck() : { healthy: false, detail: 'not_configured' };
    const lag = await this.indexState.stats();
    return {
      engine: this.osEngine && osHealth.healthy ? 'opensearch' : 'pg-fts',
      openSearchConfigured: this.osEngine !== null,
      openSearchHealthy: this.osEngine !== null && osHealth.healthy,
      pg: pgHealth,
      indexLag: lag,
    };
  }

  /** Build the canonical search document for one listing (bounded joins). */
  async buildListingDoc(listingId: string): Promise<Record<string, unknown> | null> {
    const r = await this.db.query<{
      listing_id: string; status: string; transaction_type: string; title: string; description: string | null;
      price: string; currency_code: string; price_period: string; published_at: Date | null;
      property_type_code: string | null; geo_node_id: string | null; lon: string | null; lat: string | null;
    }>(
      `SELECT l.id AS listing_id, l.status::text AS status, l.transaction_type::text AS transaction_type,
              l.title, l.description, l.price::text AS price, l.currency_code, l.price_period::text AS price_period,
              l.published_at, pt.code AS property_type_code, pl.geo_node_id,
              ST_X(pl.location_point::geometry)::text AS lon, ST_Y(pl.location_point::geometry)::text AS lat
       FROM marketplace.listings l
       JOIN property.properties p ON p.id = l.property_id
       LEFT JOIN property.property_types pt ON pt.id = p.property_type_id
       LEFT JOIN property.property_locations pl ON pl.property_id = p.id AND pl.is_primary = true
       WHERE l.id = $1::uuid AND l.deleted_at IS NULL`,
      [listingId],
    );
    const row = r.rows[0];
    if (!row) return null;
    return {
      listingId: row.listing_id,
      status: row.status,
      transactionType: row.transaction_type,
      titleText: row.title,
      descriptionText: row.description ?? '',
      price: row.price,
      currencyCode: row.currency_code,
      pricePeriod: row.price_period,
      propertyTypeCode: row.property_type_code,
      geoNodeId: row.geo_node_id,
      locationPointWkt: row.lon && row.lat ? `POINT (${row.lon} ${row.lat})` : null,
      publishedAt: row.published_at,
    };
  }

  /** Index one listing through the active engine + state bookkeeping. */
  async indexOne(listingId: string): Promise<'indexed' | 'missing'> {
    const doc = await this.buildListingDoc(listingId);
    if (!doc) {
      await this.indexState.removePending(listingId);
      return 'missing';
    }
    const engine = await this.selectEngine();
    await engine.indexDoc(doc);
    await this.indexState.markIndexed(listingId, doc);
    this.metrics.counter('search_index_docs_total', 'Search documents indexed', { engine: engine.name });
    return 'indexed';
  }

  /** §11 — RebuildSearchIndex command: enqueue the chunked rebuild job. */
  async requestRebuild(actorUserId: string): Promise<{ jobId: string }> {
    const jobId = await this.jobs.enqueue({
      queue: 'search',
      jobType: 'search.rebuild',
      payload: { requestedBy: actorUserId, chunkSize: 500 },
      dedupKey: 'search.rebuild',
      maxAttempts: 3,
    });
    return { jobId };
  }

  private async selectEngine(): Promise<SearchEngine> {
    if (this.osEngine) {
      if (Date.now() - this.osCheckedAt > 30_000) {
        const health = await this.osEngine.healthcheck();
        this.osHealthy = health.healthy;
        this.osCheckedAt = Date.now();
        this.metrics.gauge('search_opensearch_healthy', 'OpenSearch reachability', {}, health.healthy ? 1 : 0);
      }
      if (this.osHealthy) return this.osEngine;
      this.metrics.counter('search_fallback_total', 'Search degraded to PG FTS', {});
    }
    return this.pgEngine;
  }
}
