export interface SearchHit {
  listingId: string;
  title: string;
  price: string;
  currencyCode: string;
  transactionType: string;
  propertyTypeCode: string | null;
  publishedAt: string | null;
  rank: number;
}

export interface SearchFacets {
  transactionType: Record<string, number>;
  propertyType: Record<string, number>;
  currency: Record<string, number>;
}

export interface SearchQuery {
  q?: string | undefined;
  transactionType?: string | undefined;
  propertyType?: string | undefined;
  priceMin?: string | undefined;
  priceMax?: string | undefined;
  currencyCode?: string | undefined;
  bbox?: { minLon: number; minLat: number; maxLon: number; maxLat: number } | undefined;
  sort: 'relevance' | 'price_asc' | 'price_desc' | 'newest';
  page: number;
  pageSize: number;
}

export interface SearchResult {
  hits: SearchHit[];
  total: number;
  facets: SearchFacets;
  engine: string;
}

/**
 * Gate 4 §11 — Search engine port. Two adapters:
 *  - PgFtsEngine: verified PostgreSQL full-text engine (GIN tsvector).
 *  - OpenSearchEngine: real OpenSearch REST adapter (connection-gated).
 * Both are eventually consistent via the indexer worker.
 */
export interface SearchEngine {
  readonly name: string;
  search(query: SearchQuery): Promise<SearchResult>;
  indexDoc(doc: Record<string, unknown>): Promise<void>;
  deleteDoc(listingId: string): Promise<void>;
  healthcheck(): Promise<{ healthy: boolean; detail?: string }>;
}
