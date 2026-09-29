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
exports.OpenSearchEngine = void 0;
const common_1 = require("@nestjs/common");
const INDEX_NAME = 'listings-v1';
const REQUEST_TIMEOUT_MS = 5_000;
/**
 * Gate 4 §11 — real OpenSearch REST adapter (no auction-style magic, plain
 * JSON DSL over fetch). Connection-gated: when OPENSEARCH_URL is unset or the
 * cluster is unreachable, the SearchService degrades to the verified PG FTS
 * engine and the status is reported by /search/health (honest per §27).
 */
let OpenSearchEngine = class OpenSearchEngine {
    baseUrl;
    name = 'opensearch';
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    async search(query) {
        const from = (Math.max(1, query.page) - 1) * Math.min(100, Math.max(1, query.pageSize));
        const size = Math.min(100, Math.max(1, query.pageSize));
        const must = [];
        const filters = [{ term: { status: 'published' } }];
        if (query.q && query.q.trim()) {
            must.push({
                multi_match: { query: query.q.trim(), fields: ['title_text^3', 'description_text'], type: 'best_fields' },
            });
        }
        if (query.transactionType)
            filters.push({ term: { transaction_type: query.transactionType } });
        if (query.propertyType)
            filters.push({ term: { property_type_code: query.propertyType } });
        if (query.currencyCode)
            filters.push({ term: { currency_code: query.currencyCode } });
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
        const response = await this.request(`/${INDEX_NAME}/_search`, 'POST', body);
        const hits = response.hits.hits.map((row) => {
            const source = row._source;
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
        const toFacet = (agg) => {
            const out = {};
            for (const bucket of agg?.buckets ?? [])
                out[bucket.key] = bucket.doc_count;
            return out;
        };
        const facets = {
            transactionType: toFacet(response.aggregations?.by_transaction),
            propertyType: toFacet(response.aggregations?.by_property_type),
            currency: toFacet(response.aggregations?.by_currency),
        };
        return { hits, total: response.hits.total.value, facets, engine: this.name };
    }
    async indexDoc(doc) {
        const listingId = String(doc.listingId ?? '');
        if (!listingId)
            throw new Error('OPENSEARCH_INDEX_DOC_MISSING_ID');
        const source = { ...doc, location_point: doc.locationPointWkt ? doc.locationPointWkt : undefined };
        await this.request(`/${INDEX_NAME}/_doc/${listingId}?refresh=false`, 'PUT', source);
    }
    async deleteDoc(listingId) {
        await this.request(`/${INDEX_NAME}/_doc/${listingId}`, 'DELETE');
    }
    async healthcheck() {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 1500);
            try {
                const response = await fetch(`${this.baseUrl}/_cluster/health`, { signal: controller.signal });
                return { healthy: response.ok, detail: `status=${response.status}` };
            }
            finally {
                clearTimeout(timer);
            }
        }
        catch (error) {
            return { healthy: false, detail: error instanceof Error ? error.message : 'unreachable' };
        }
    }
    async request(path, method, body, timeoutMs = REQUEST_TIMEOUT_MS) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(`${this.baseUrl}${path}`, {
                method,
                headers: { 'content-type': 'application/json' },
                ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
                signal: controller.signal,
            });
            if (!response.ok) {
                const text = await response.text().catch(() => '');
                throw new Error(`OPENSEARCH_${response.status}: ${text.slice(0, 300)}`);
            }
            if (method === 'DELETE')
                return {};
            return (await response.json());
        }
        finally {
            clearTimeout(timer);
        }
    }
};
exports.OpenSearchEngine = OpenSearchEngine;
exports.OpenSearchEngine = OpenSearchEngine = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [String])
], OpenSearchEngine);
