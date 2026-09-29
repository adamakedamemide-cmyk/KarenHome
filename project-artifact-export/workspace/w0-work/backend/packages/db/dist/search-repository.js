"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchIndexRepository = void 0;
/**
 * Search index state + PG FTS document store (migration 0032).
 * The indexer worker claims pending/failed entries SKIP LOCKED — retries and
 * dead-letters ride on platform.jobs; lag/failure observability via stats().
 */
class SearchIndexRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async upsertPending(listingId, sourceEventAt, executor = this.db) {
        await executor.query(`INSERT INTO marketplace.listing_search(listing_id, status, source_event_at)
       VALUES ($1::uuid, 'pending', $2::timestamptz)
       ON CONFLICT (listing_id) DO UPDATE SET status = 'pending', source_event_at = EXCLUDED.source_event_at, updated_at = now()`, [listingId, sourceEventAt]);
    }
    async removePending(listingId, executor = this.db) {
        await executor.query(`DELETE FROM marketplace.listing_search WHERE listing_id = $1::uuid`, [listingId]);
        await executor.query(`DELETE FROM marketplace.listing_search_docs WHERE listing_id = $1::uuid`, [listingId]);
    }
    async claimBatch(workerId, limit = 50) {
        return this.db.transaction(async (client) => {
            const r = await client.query(`UPDATE marketplace.listing_search ls
         SET attempts = ls.attempts + 1, updated_at = now()
         FROM (
           SELECT listing_id FROM marketplace.listing_search
           WHERE status IN ('pending','failed')
           ORDER BY updated_at
           FOR UPDATE SKIP LOCKED LIMIT $1
         ) c
         WHERE ls.listing_id = c.listing_id
         RETURNING ls.listing_id, ls.status, ls.attempts, ls.last_error, ls.source_event_at, ls.updated_at`, [limit]);
            void workerId;
            return r.rows.map((row) => ({
                listingId: row.listing_id, status: row.status, attempts: row.attempts,
                lastError: row.last_error, sourceEventAt: row.source_event_at, updatedAt: row.updated_at,
            }));
        });
    }
    async markIndexed(listingId, doc) {
        await this.db.transaction(async (client) => {
            await client.query(`INSERT INTO marketplace.listing_search(listing_id, status, indexed_at)
         VALUES ($1::uuid, 'indexed', now())
         ON CONFLICT (listing_id) DO UPDATE SET status = 'indexed', indexed_at = now(), last_error = NULL, updated_at = now()`, [listingId]);
            await this.upsertSearchDoc(client, doc);
        });
    }
    async upsertSearchDoc(client, doc) {
        await client.query(`INSERT INTO marketplace.listing_search_docs(
         listing_id, status, transaction_type, title_text, description_text, price, currency_code, price_period,
         property_type_code, geo_node_id, location_point, published_at
       ) VALUES ($1::uuid, $2::marketplace.listing_status, $3::marketplace.transaction_type, $4, $5, $6::numeric, $7, $8::marketplace.price_period, $9, $10::uuid,
                 CASE WHEN $11::text IS NULL THEN NULL ELSE ST_GeogFromText($11::text) END, $12::timestamptz)
       ON CONFLICT (listing_id) DO UPDATE SET
         status = EXCLUDED.status, transaction_type = EXCLUDED.transaction_type, title_text = EXCLUDED.title_text,
         description_text = EXCLUDED.description_text, price = EXCLUDED.price, currency_code = EXCLUDED.currency_code,
         price_period = EXCLUDED.price_period, property_type_code = EXCLUDED.property_type_code,
         geo_node_id = EXCLUDED.geo_node_id, location_point = EXCLUDED.location_point, published_at = EXCLUDED.published_at`, [
            doc.listingId, doc.status, doc.transactionType, doc.titleText, doc.descriptionText, doc.price, doc.currencyCode,
            doc.pricePeriod, doc.propertyTypeCode ?? null, doc.geoNodeId ?? null, doc.locationPointWkt ?? null, doc.publishedAt ?? null,
        ]);
    }
    async markFailed(listingId, error) {
        await this.db.query(`UPDATE marketplace.listing_search SET status = 'failed', last_error = $2, updated_at = now()
       WHERE listing_id = $1::uuid`, [listingId, error.slice(0, 1000)]);
    }
    async stats() {
        const r = await this.db.query(`SELECT
         count(*) FILTER (WHERE status = 'pending')::text AS pending,
         count(*) FILTER (WHERE status = 'failed')::text AS failed,
         count(*) FILTER (WHERE status = 'indexed')::text AS indexed,
         (SELECT EXTRACT(EPOCH FROM (now() - MIN(updated_at)))::text FROM marketplace.listing_search WHERE status IN ('pending','failed')) AS oldest_pending
       FROM marketplace.listing_search`);
        const row = r.rows[0];
        return {
            pending: Number(row?.pending ?? '0'),
            failed: Number(row?.failed ?? '0'),
            indexed: Number(row?.indexed ?? '0'),
            oldestPendingSeconds: row?.oldest_pending != null ? Number(row.oldest_pending) : null,
        };
    }
    async docById(listingId) {
        const r = await this.db.query(`SELECT listing_id, status::text, transaction_type::text, title_text, description_text, price::text, currency_code,
              price_period::text, property_type_code, geo_node_id, published_at
       FROM marketplace.listing_search_docs WHERE listing_id = $1::uuid`, [listingId]);
        return r.rows[0] ?? null;
    }
    /**
     * Build the canonical search document for one listing (bounded joins).
     * Shared by the API SearchService and the SearchIndexerWorker so both
     * index identical documents.
     */
    async buildDoc(listingId, executor = this.db) {
        const r = await executor.query(`SELECT l.id AS listing_id, l.status::text AS status, l.transaction_type::text AS transaction_type,
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
    async listListingIdsNeedingIndex(limit, offset) {
        const r = await this.db.query(`SELECT id FROM marketplace.listings WHERE deleted_at IS NULL ORDER BY updated_at LIMIT $1 OFFSET $2`, [limit, offset]);
        return r.rows.map((row) => row.id);
    }
}
exports.SearchIndexRepository = SearchIndexRepository;
