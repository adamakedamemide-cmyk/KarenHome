"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@platform/db");
const metrics_1 = require("../../../common/observability/metrics");
const app_config_1 = require("../../../common/config/app-config");
const pg_fts_engine_1 = require("../infrastructure/pg-fts.engine");
const opensearch_engine_1 = require("../infrastructure/opensearch.engine");
/**
 * Gate 4 §11 — Search orchestration: engine selection (OpenSearch when
 * healthy, PG FTS verified fallback), document building, RebuildSearchIndex
 * command (job-driven) and index lag observability.
 */
let SearchService = class SearchService {
    db;
    listings;
    indexState;
    jobs;
    metrics;
    config;
    pgEngine;
    osEngine;
    osHealthy = false;
    osCheckedAt = 0;
    constructor(db, listings, indexState, jobs, metrics, config) {
        this.db = db;
        this.listings = listings;
        this.indexState = indexState;
        this.jobs = jobs;
        this.metrics = metrics;
        this.config = config;
        this.pgEngine = new pg_fts_engine_1.PgFtsEngine(db);
        this.osEngine = config.opensearchUrl ? new opensearch_engine_1.OpenSearchEngine(config.opensearchUrl) : null;
    }
    async search(query) {
        return this.metrics.observe('search_duration_ms', 'Search request duration', { engine: 'any' }, async () => {
            const engine = await this.selectEngine();
            const result = await engine.search(query);
            this.metrics.counter('search_requests_total', 'Search requests', { engine: result.engine });
            return result;
        });
    }
    async health() {
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
    async buildListingDoc(listingId) {
        const r = await this.db.query(`SELECT l.id AS listing_id, l.status::text AS status, l.transaction_type::text AS transaction_type,
              l.title, l.description, l.price::text AS price, l.currency_code, l.price_period::text AS price_period,
              l.published_at, pt.code AS property_type_code, pl.geo_node_id,
              ST_X(pl.location_point::geometry)::text AS lon, ST_Y(pl.location_point::geometry)::text AS lat
       FROM marketplace.listings l
       JOIN property.properties p ON p.id = l.property_id
       LEFT JOIN property.property_types pt ON pt.id = p.property_type_id
       LEFT JOIN property.property_locations pl ON pl.property_id = p.id AND pl.is_primary = true
       WHERE l.id = $1::uuid AND l.deleted_at IS NULL`, [listingId]);
        const row = r.rows[0];
        if (!row)
            return null;
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
    async indexOne(listingId) {
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
    async requestRebuild(actorUserId) {
        const jobId = await this.jobs.enqueue({
            queue: 'search',
            jobType: 'search.rebuild',
            payload: { requestedBy: actorUserId, chunkSize: 500 },
            dedupKey: 'search.rebuild',
            maxAttempts: 3,
        });
        return { jobId };
    }
    async selectEngine() {
        if (this.osEngine) {
            if (Date.now() - this.osCheckedAt > 30_000) {
                const health = await this.osEngine.healthcheck();
                this.osHealthy = health.healthy;
                this.osCheckedAt = Date.now();
                this.metrics.gauge('search_opensearch_healthy', 'OpenSearch reachability', {}, health.healthy ? 1 : 0);
            }
            if (this.osHealthy)
                return this.osEngine;
            this.metrics.counter('search_fallback_total', 'Search degraded to PG FTS', {});
        }
        return this.pgEngine;
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [db_1.PostgresDatabase,
        db_1.ListingRepository,
        db_1.SearchIndexRepository,
        db_1.JobRepository,
        metrics_1.MetricsRegistry,
        app_config_1.AppConfig])
], SearchService);
