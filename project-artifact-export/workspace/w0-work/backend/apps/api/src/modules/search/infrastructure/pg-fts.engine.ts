import { Injectable } from '@nestjs/common';
import { PostgresDatabase } from '@platform/db';
import type { SearchEngine, SearchQuery, SearchResult, SearchHit, SearchFacets } from '../domain/search-engine.port';

const MAX_PAGE_SIZE = 100;

/**
 * Gate 4 §11 — verified PostgreSQL FTS engine over
 * marketplace.listing_search_docs (GIN tsvector + GiST bbox + btree filters).
 * Bounded pagination; single-round-trip facets; map bounding box via
 * ST_MakeEnvelope && geography point.
 */
@Injectable()
export class PgFtsEngine implements SearchEngine {
  readonly name = 'pg-fts';

  constructor(private readonly db: PostgresDatabase) {}

  async search(query: SearchQuery): Promise<SearchResult> {
    const page = Math.max(1, query.page);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize));
    const offset = (page - 1) * pageSize;
    const params: unknown[] = [];
    const conditions: string[] = [`status = 'published'::marketplace.listing_status`];

    const addParam = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };

    const hasQ = Boolean(query.q && query.q.trim());
    if (hasQ) {
      const p = addParam(query.q!.trim());
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
      this.db.query<{
        listing_id: string; title_text: string; price: string; currency_code: string;
        transaction_type: string; property_type_code: string | null; published_at: Date | null; rank: number; total: string;
      }>(sql, params),
      this.db.query<{ by_transaction: unknown; by_property_type: unknown; by_currency: unknown }>(facetSql, params),
    ]);

    const total = Number(hitsResult.rows[0]?.total ?? '0');
    const hits: SearchHit[] = hitsResult.rows.map((row) => ({
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
    const facets: SearchFacets = {
      transactionType: (facetRow?.by_transaction ?? {}) as Record<string, number>,
      propertyType: (facetRow?.by_property_type ?? {}) as Record<string, number>,
      currency: (facetRow?.by_currency ?? {}) as Record<string, number>,
    };

    return { hits, total, facets, engine: this.name };
  }

  async indexDoc(doc: Record<string, unknown>): Promise<void> {
    await this.db.query(
      `INSERT INTO marketplace.listing_search_docs(
         listing_id, status, transaction_type, title_text, description_text, price, currency_code, price_period,
         property_type_code, geo_node_id, location_point, published_at
       ) VALUES ($1::uuid, $2::marketplace.listing_status, $3::marketplace.transaction_type, $4, $5, $6::numeric, $7, $8::marketplace.price_period, $9, $10::uuid,
                 CASE WHEN $11::text IS NULL THEN NULL ELSE ST_GeogFromText($11::text) END, $12::timestamptz)
       ON CONFLICT (listing_id) DO UPDATE SET
         status = EXCLUDED.status, transaction_type = EXCLUDED.transaction_type, title_text = EXCLUDED.title_text,
         description_text = EXCLUDED.description_text, price = EXCLUDED.price, currency_code = EXCLUDED.currency_code,
         price_period = EXCLUDED.price_period, property_type_code = EXCLUDED.property_type_code,
         geo_node_id = EXCLUDED.geo_node_id, location_point = EXCLUDED.location_point, published_at = EXCLUDED.published_at`,
      [
        doc.listingId, doc.status, doc.transactionType, doc.titleText, doc.descriptionText ?? '', doc.price, doc.currencyCode,
        doc.pricePeriod, doc.propertyTypeCode ?? null, doc.geoNodeId ?? null, doc.locationPointWkt ?? null, doc.publishedAt ?? null,
      ],
    );
  }

  async deleteDoc(listingId: string): Promise<void> {
    await this.db.query(`DELETE FROM marketplace.listing_search_docs WHERE listing_id = $1::uuid`, [listingId]);
    await this.db.query(`DELETE FROM marketplace.listing_search WHERE listing_id = $1::uuid`, [listingId]);
  }

  async healthcheck(): Promise<{ healthy: boolean; detail?: string }> {
    try {
      const r = await this.db.query<{ count: string }>(`SELECT count(*)::text AS count FROM marketplace.listing_search_docs`);
      return { healthy: true, detail: `docs=${r.rows[0]?.count ?? '0'}` };
    } catch (error) {
      return { healthy: false, detail: error instanceof Error ? error.message : 'unknown' };
    }
  }
}
