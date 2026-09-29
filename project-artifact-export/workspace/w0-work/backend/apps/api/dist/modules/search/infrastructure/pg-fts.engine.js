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
exports.PgFtsEngine = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@platform/db");
const MAX_PAGE_SIZE = 100;
/**
 * Gate 4 §11 — verified PostgreSQL FTS engine over
 * marketplace.listing_search_docs (GIN tsvector + GiST bbox + btree filters).
 * Bounded pagination; single-round-trip facets; map bounding box via
 * ST_MakeEnvelope && geography point.
 */
let PgFtsEngine = class PgFtsEngine {
    db;
    name = 'pg-fts';
    constructor(db) {
        this.db = db;
    }
    async search(query) {
        const page = Math.max(1, query.page);
        const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize));
        const offset = (page - 1) * pageSize;
        const params = [];
        const conditions = [`status = 'published'::marketplace.listing_status`];
        const addParam = (value) => {
            params.push(value);
            return `$${params.length}`;
        };
        const hasQ = Boolean(query.q && query.q.trim());
        if (hasQ) {
            const p = addParam(query.q.trim());
            conditions.push(`tsv @@ websearch_to_tsquery('simple', ${p})`);
        }
        if (query.transactionType) {
            const p = addParam(query.transactionType);
            conditions.push(`transaction_type = ${p}::marketplace.transaction_type`);
        }
        if (query.propertyType) {
            const p = addParam(query.propertyType);
            conditions.push(`property_type_code = ${p}`);
        }
        if (query.priceMin !== undefined) {
            const p = addParam(query.priceMin);
            conditions.push(`price >= ${p}::numeric`);
        }
        if (query.priceMax !== undefined) {
            const p = addParam(query.priceMax);
            conditions.push(`price <= ${p}::numeric`);
        }
        if (query.currencyCode) {
            const p = addParam(query.currencyCode);
            conditions.push(`currency_code = ${p}`);
        }
        if (query.bbox) {
            const wkt = addParam(`POLYGON ((${query.bbox.minLon} ${query.bbox.minLat}, ${query.bbox.maxLon} ${query.bbox.minLat}, ${query.bbox.maxLon} ${query.bbox.maxLat}, ${query.bbox.minLon} ${query.bbox.maxLat}, ${query.bbox.minLon} ${query.bbox.minLat}))`);
            conditions.push(`location_point && ST_GeomFromText(${wkt}, 4326)::geography`);
        }
        // Injection safety: user text flows only through bind parameters into
        // websearch_to_tsquery; sort keys are a closed switch; page bounds clamped.
        const orderBy = query.sort === 'price_asc'
            ? 'price ASC'
            : query.sort === 'price_desc'
                ? 'price DESC'
                : query.sort === 'newest'
                    ? 'published_at DESC NULLS LAST'
                    : hasQ ? `rank DESC, published_at DESC NULLS LAST` : 'published_at DESC NULLS LAST';
        const whereClause = conditions.join(' AND ');
        const sql = `
      WITH base AS (
        SELECT listing_id, title_text, price::text AS price, currency_code,
               transaction_type::text AS transaction_type, property_type_code,
               published_at,
               ${hasQ ? `ts_rank(tsv, websearch_to_tsquery('simple', $1))` : '0::real'} AS rank
        FROM marketplace.listing_search_docs
        WHERE ${whereClause}
        ORDER BY ${orderBy}
        LIMIT ${pageSize} OFFSET ${offset}
      )
      SELECT *, count(*) OVER() AS total FROM base`;
        const facetSql = `
      SELECT
        (SELECT COALESCE(jsonb_object_agg(t.transaction_type, t.c), '{}'::jsonb) FROM (
          SELECT transaction_type::text AS transaction_type, count(*) AS c
          FROM marketplace.listing_search_docs WHERE ${whereClause} GROUP BY transaction_type
        ) t) AS by_transaction,
        (SELECT COALESCE(jsonb_object_agg(p.property_type_code, p.c), '{}'::jsonb) FROM (
          SELECT property_type_code, count(*) AS c
          FROM marketplace.listing_search_docs WHERE ${whereClause} AND property_type_code IS NOT NULL GROUP BY property_type_code
        ) p) AS by_property_type,
        (SELECT COALESCE(jsonb_object_agg(cu.currency_code, cu.c), '{}'::jsonb) FROM (
          SELECT currency_code, count(*) AS c
          FROM marketplace.listing_search_docs WHERE ${whereClause} GROUP BY currency_code
        ) cu) AS by_currency`;
        const [hitsResult, facetResult] = await Promise.all([
            this.db.query(sql, params),
            this.db.query(facetSql, params),
        ]);
        const total = Number(hitsResult.rows[0]?.total ?? '0');
        const hits = hitsResult.rows.map((row) => ({
            listingId: row.listing_id,
            title: row.title_text,
            price: row.price,
            currencyCode: row.currency_code,
            transactionType: row.transaction_type,
            propertyTypeCode: row.property_type_code,
            publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
            rank: Number(row.rank ?? 0),
        }));
        const facetRow = facetResult.rows[0];
        const facets = {
            transactionType: (facetRow?.by_transaction ?? {}),
            propertyType: (facetRow?.by_property_type ?? {}),
            currency: (facetRow?.by_currency ?? {}),
        };
        return { hits, total, facets, engine: this.name };
    }
    async indexDoc(doc) {
        await this.db.query(`INSERT INTO marketplace.listing_search_docs(
         listing_id, status, transaction_type, title_text, description_text, price, currency_code, price_period,
         property_type_code, geo_node_id, location_point, published_at
       ) VALUES ($1::uuid, $2::marketplace.listing_status, $3::marketplace.transaction_type, $4, $5, $6::numeric, $7, $8::marketplace.price_period, $9, $10::uuid,
                 CASE WHEN $11::text IS NULL THEN NULL ELSE ST_GeogFromText($11::text) END, $12::timestamptz)
       ON CONFLICT (listing_id) DO UPDATE SET
         status = EXCLUDED.status, transaction_type = EXCLUDED.transaction_type, title_text = EXCLUDED.title_text,
         description_text = EXCLUDED.description_text, price = EXCLUDED.price, currency_code = EXCLUDED.currency_code,
         price_period = EXCLUDED.price_period, property_type_code = EXCLUDED.property_type_code,
         geo_node_id = EXCLUDED.geo_node_id, location_point = EXCLUDED.location_point, published_at = EXCLUDED.published_at`, [
            doc.listingId, doc.status, doc.transactionType, doc.titleText, doc.descriptionText ?? '', doc.price, doc.currencyCode,
            doc.pricePeriod, doc.propertyTypeCode ?? null, doc.geoNodeId ?? null, doc.locationPointWkt ?? null, doc.publishedAt ?? null,
        ]);
    }
    async deleteDoc(listingId) {
        await this.db.query(`DELETE FROM marketplace.listing_search_docs WHERE listing_id = $1::uuid`, [listingId]);
        await this.db.query(`DELETE FROM marketplace.listing_search WHERE listing_id = $1::uuid`, [listingId]);
    }
    async healthcheck() {
        try {
            const r = await this.db.query(`SELECT count(*)::text AS count FROM marketplace.listing_search_docs`);
            return { healthy: true, detail: `docs=${r.rows[0]?.count ?? '0'}` };
        }
        catch (error) {
            return { healthy: false, detail: error instanceof Error ? error.message : 'unknown' };
        }
    }
};
exports.PgFtsEngine = PgFtsEngine;
exports.PgFtsEngine = PgFtsEngine = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [db_1.PostgresDatabase])
], PgFtsEngine);
