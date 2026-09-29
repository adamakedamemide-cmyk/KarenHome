import { Injectable } from '@nestjs/common';
import { OS_LISTINGS_INDEX, OS_LISTINGS_INDEX_DEFINITION, toOsListingDoc } from '@platform/contracts';
import type { SearchEngine, SearchQuery, SearchResult, SearchHit, SearchFacets } from '../domain/search-engine.port';

const INDEX_NAME = OS_LISTINGS_INDEX;
const REQUEST_TIMEOUT_MS = 5_000;

/**
 * Gate 4 §11 — real OpenSearch REST adapter (no auction-style magic, plain
 * JSON DSL over fetch). Connection-gated: when OPENSEARCH_URL is unset or the
 * cluster is unreachable, the SearchService degrades to the verified PG FTS
 * engine and the status is reported by /search/health (honest per §27).
 */
@Injectable()
export class OpenSearchEngine implements SearchEngine {
  readonly name = 'opensearch';
  private indexEnsured = false;

  constructor(private readonly baseUrl: string) {}

  async search(query: SearchQuery): Promise<SearchResult> {
    const from = (Math.max(1, query.page) - 1) * Math.min(100, Math.max(1, query.pageSize));
    const size = Math.min(100, Math.max(1, query.pageSize));
    const must: Array<Record<string, unknown>> = [];
    const filters: Array<Record<string, unknown>> = [{ term: { status: 'published' } }];

    if (query.q && query.q.trim()) {
      must.push({
        multi_match: { query: query.q.trim(), fields: ['title_text^3', 'description_text'], type: 'best_fields' },
      });
    }
    if (query.transactionType) filters.push({ term: { transaction_type: query.transactionType } });
    if (query.propertyType) filters.push({ term: { property_type_code: query.propertyType } });
    if (query.currencyCode) filters.push({ term: { currency_code: query.currencyCode } });
    if (query.priceMin !== undefined || query.priceMax !== undefined) {
      filters.push({ range: { price: { ...(query.priceMin !== undefined ? { gte: Number(query.priceMin) } : {}), ...(query.priceMax !== undefined ? { lte: Number(query.priceMax) } : {}) } } });
    }
    if (query.bbox) {
      filters.push({
        geo_bounding_box: {
          location_point: {
            top_left: { lat: query.bbox.maxLat, lon: query.bbox.minLon },
            bottom_right: { lat: query.bbox.minLat, lon: query.bbox.maxLon },
          },
        },
      });
    }

    const sort = query.sort === 'price_asc'
      ? [{ price: 'asc' }]
      : query.sort === 'price_desc'
        ? [{ price: 'desc' }]
        : query.sort === 'newest'
          ? [{ published_at: 'desc' }]
          : must.length > 0 ? ['_score'] : [{ published_at: 'desc' }];

    const body = {
      from,
      size,
      track_total_hits: true,
      query: { bool: { must: must.length ? must : [{ match_all: {} }], filter: filters } },
      ...(sort.length ? { sort } : {}),
      aggs: {
        by_transaction: { terms: { field: 'transaction_type', size: 20 } },
        by_property_type: { terms: { field: 'property_type_code', size: 50 } },
        by_currency: { terms: { field: 'currency_code', size: 20 } },
      },
    };

    const response = await this.request<{ hits: { total: { value: number }; hits: Array<{ _id: string; _source: Record<string, unknown>; _score?: number }> }; aggregations?: Record<string, { buckets?: Array<{ key: string; doc_count: number }> }> }>(`/${INDEX_NAME}/_search`, 'POST', body);
    const hits: SearchHit[] = response.hits.hits.map((row) => {
      const source = row._source as Record<string, string | null>;
      return {
        listingId: String(source.listing_id ?? row._id),
        title: String(source.title_text ?? ''),
        price: String(source.price ?? '0'),
        currencyCode: String(source.currency_code ?? ''),
        transactionType: String(source.transaction_type ?? ''),
        propertyTypeCode: source.property_type_code ?? null,
        publishedAt: source.published_at ? String(source.published_at) : null,
        rank: row._score ?? 0,
      };
    });
    const toFacet = (agg: { buckets?: Array<{ key: string; doc_count: number }> } | undefined): Record<string, number> => {
      const out: Record<string, number> = {};
      for (const bucket of agg?.buckets ?? []) out[bucket.key] = bucket.doc_count;
      return out;
    };
    const facets: SearchFacets = {
      transactionType: toFacet(response.aggregations?.by_transaction),
      propertyType: toFacet(response.aggregations?.by_property_type),
      currency: toFacet(response.aggregations?.by_currency),
    };
    return { hits, total: response.hits.total.value, facets, engine: this.name };
  }

  /** GATE5-C: idempotent index bootstrap (creation + mapping + analyzer). */
  async ensureIndex(): Promise<void> {
    if (this.indexEnsured) return;
    const response = await this.rawRequest('HEAD', `/${INDEX_NAME}`);
    if (!response.ok) {
      await this.request(`/${INDEX_NAME}`, 'PUT', OS_LISTINGS_INDEX_DEFINITION);
    }
    this.indexEnsured = true;
  }

  async indexDoc(doc: Record<string, unknown>): Promise<void> {
    await this.ensureIndex();
    const source = toOsListingDoc(doc);
    if (!source) throw new Error('OPENSEARCH_INDEX_DOC_MISSING_ID');
    await this.request(`/${INDEX_NAME}/_doc/${source.listing_id}?refresh=false`, 'PUT', source);
  }

  async deleteDoc(listingId: string): Promise<void> {
    await this.request(`/${INDEX_NAME}/_doc/${listingId}`, 'DELETE');
  }

  async healthcheck(): Promise<{ healthy: boolean; detail?: string }> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1500);
      try {
        const response = await fetch(`${this.baseUrl}/_cluster/health`, { signal: controller.signal });
        return { healthy: response.ok, detail: `status=${response.status}` };
      } finally {
        clearTimeout(timer);
      }
    } catch (error) {
      return { healthy: false, detail: error instanceof Error ? error.message : 'unreachable' };
    }
  }

  private async rawRequest(method: 'HEAD' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown, timeoutMs: number = REQUEST_TIMEOUT_MS): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { 'content-type': 'application/json' },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async request<T>(path: string, method: 'POST' | 'PUT' | 'DELETE', body?: unknown, timeoutMs: number = REQUEST_TIMEOUT_MS): Promise<T> {
    const response = await this.rawRequest(method, path, body, timeoutMs);
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`OPENSEARCH_${response.status}: ${text.slice(0, 300)}`);
    }
    if (method === 'DELETE') return {} as T;
    return (await response.json()) as T;
  }
}
