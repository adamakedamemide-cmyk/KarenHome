/**
 * GATE 5 Phase C — OpenSearch document schema + transform (single source of truth).
 *
 * Gate 5 audit found that the API engine (snake_case queries) and the worker
 * indexer (camelCase docs) disagreed on field names, and that WKT strings were
 * pushed into what must be a geo_point field. Both paths now share this
 * module so the wire format can never drift again.
 */

export const OS_LISTINGS_INDEX = 'listings-v1';

/** Idempotent index definition: analyzer, keyword facets, numeric price, geo_point. */
export const OS_LISTINGS_INDEX_DEFINITION = {
  settings: {
    index: {
      number_of_shards: 1,
      number_of_replicas: 0,
      refresh_interval: '1s',
    },
    analysis: {
      analyzer: {
        listing_text_analyzer: {
          type: 'standard',
          stopwords: '_none_',
        },
      },
    },
  },
  mappings: {
    dynamic: 'strict',
    properties: {
      listing_id: { type: 'keyword' },
      status: { type: 'keyword' },
      transaction_type: { type: 'keyword' },
      title_text: { type: 'text', analyzer: 'listing_text_analyzer' },
      description_text: { type: 'text', analyzer: 'listing_text_analyzer' },
      price: { type: 'double' },
      currency_code: { type: 'keyword' },
      price_period: { type: 'keyword' },
      property_type_code: { type: 'keyword' },
      geo_node_id: { type: 'keyword' },
      location_point: { type: 'geo_point' },
      published_at: { type: 'date' },
    },
  },
} as const;

/** "POINT (lon lat)" → OpenSearch geo_point "lat,lon" string. */
export function wktToPointString(wkt: unknown): string | undefined {
  if (typeof wkt !== 'string') return undefined;
  const match = /^POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)$/i.exec(wkt.trim());
  if (!match) return undefined;
  const lon = Number(match[1]);
  const lat = Number(match[2]);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return undefined;
  return `${lat},${lon}`;
}

export interface OsListingDoc {
  listing_id: string;
  status: string;
  transaction_type: string;
  title_text: string;
  description_text: string;
  price: number;
  currency_code: string;
  price_period?: string;
  property_type_code?: string;
  geo_node_id?: string;
  location_point?: string;
  published_at?: string;
}

/**
 * Canonical listing doc (camelCase, from SearchService.buildListingDoc /
 * SearchIndexRepository.buildDoc) → strict OpenSearch mapping shape.
 * Returns null when the doc has no listing id (caller must skip indexing).
 */
export function toOsListingDoc(doc: Record<string, unknown>): OsListingDoc | null {
  const listingId = typeof doc.listingId === 'string' ? doc.listingId : '';
  if (!listingId) return null;
  const publishedAt = doc.publishedAt instanceof Date ? doc.publishedAt.toISOString() : typeof doc.publishedAt === 'string' ? doc.publishedAt : undefined;
  const point = wktToPointString(doc.locationPointWkt);
  const price = Number(doc.price);
  return {
    listing_id: listingId,
    status: String(doc.status ?? 'unknown'),
    transaction_type: String(doc.transactionType ?? ''),
    title_text: String(doc.titleText ?? doc.title_text ?? ''),
    description_text: String(doc.descriptionText ?? doc.description_text ?? ''),
    price: Number.isFinite(price) ? price : 0,
    currency_code: String(doc.currencyCode ?? ''),
    ...(typeof doc.pricePeriod === 'string' && doc.pricePeriod ? { price_period: doc.pricePeriod } : {}),
    ...(typeof doc.propertyTypeCode === 'string' && doc.propertyTypeCode ? { property_type_code: doc.propertyTypeCode } : {}),
    ...(typeof doc.geoNodeId === 'string' && doc.geoNodeId ? { geo_node_id: doc.geoNodeId } : {}),
    ...(point ? { location_point: point } : {}),
    ...(publishedAt ? { published_at: publishedAt } : {}),
  };
}
