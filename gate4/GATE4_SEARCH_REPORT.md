# GATE4_SEARCH_REPORT (§11)

## Architecture (eventually consistent, per mandate)

```
PostgreSQL (listings) → audit.outbox_events → OutboxWorker → platform.jobs (search.index/delete/rebuild)
  → SearchIndexerWorker → [PG FTS doc store (authoritative, VERIFIED)] + [OpenSearch REST push when configured (UNVERIFIED live)]
```

## Implemented

- **State:** `marketplace.listing_search` (status pending/indexed/failed, attempts, lag fields) + `marketplace.listing_search_docs` (status/transaction_type/price/currency/property_type/geo point/published_at + **generated tsvector** with GIN `ix_lsd_fts`, GiST geo, filter indexes).
- **Engine port (`SearchEngine`)** with two adapters:
  - **PgFtsEngine — VERIFIED:** `websearch_to_tsquery('simple')` full text (injection-safe by parameterization — E6), filters (transaction type, property type, currency, price min/max), **map bounding box** via GiST `&&` envelope, facets (transaction/property/currency) in one round-trip, closed-set sorting (relevance via ts_rank / price / newest), **bounded pagination** (page ≥ 1, pageSize ≤ 100).
  - **OpenSearchEngine — IMPLEMENTED, UNVERIFIED live:** real REST DSL (multi_match, term/range filters, geo_bounding_box, terms aggs, sort) over fetch with timeouts; selected only when `OPENSEARCH_URL` configured AND cluster health passes (30s cache); automatic degrade to PG FTS with `search_fallback_total` metric + log (never a silent fake).
- **Index lifecycle:** worker claims pending/failed SKIP LOCKED; doc builder is shared (`SearchIndexRepository.buildDoc`) so API and worker produce identical documents; failures → retry/dead-letter via the job queue.
- **`RebuildSearchIndex`:** `POST /api/v1/admin/search/rebuild` (platform.admin) → chunked rebuild job (500/批) re-enqueues per-listing index jobs; `GET /admin/search/index-state` exposes pending/failed/indexed + oldest-pending seconds (index lag); `GET /api/v1/search/health` reports engine selection + lag.
- **Removal:** ListingDeleted → search.delete deletes state + doc (both engines).

## Verification

- G18 SQL: doc upsert + tsv match on fresh DB.
- J9 (real PG): publish-path listing indexed; FTS hit by unique marker; injection-safe (destructive string returns 200, table intact).
- E9: /search paths in OpenAPI. Bbox/facets exercised by PgFtsEngine SQL (single-round-trip design).
- Index failure path: covered by job retry/dead-letter semantics (J1) + failed status in state table.

## Honest notes

- Ranking is ts_rank-based (foundation per mandate §11 "Ranking Foundation"); a real ranking model (quality/promotion blend) is a later gate.
- OpenSearch indexing from the worker is fire-and-verified-by-log (PG remains authoritative); cross-engine consistency metrics are recorded, not enforced.
