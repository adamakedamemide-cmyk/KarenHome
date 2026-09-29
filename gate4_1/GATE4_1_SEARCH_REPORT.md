# GATE4_1_SEARCH_REPORT — Phase J

Generated: 2026-09-29 · Evidence: fresh runs on karen_g41_final (`D_jest_final.log`, `D_benchmark.log`), code inventory.

## Status split (mandated)

| Engine | Status |
|---|---|
| PgFtsEngine (PostgreSQL FTS + PostGIS) | **LOCAL VERIFIED** |
| OpenSearchEngine (external provider) | **UNVERIFIED_EXTERNAL** — registered; adapter is a real REST implementation; PG store is always authoritative; push is best-effort with logged failure |

## Feature matrix — LOCAL VERIFIED (PgFtsEngine)

| Feature | Implementation | Verified by |
|---|---|---|
| Filters | transactionType, propertyType, priceMin/Max, currency | J9 + suite |
| Full-text ranking | `tsv @@ websearch_to_tsquery('simple')` + `ts_rank` | J9 |
| Facets | single-round-trip aggregates (transaction/propertyType/currency) | suite path |
| Geo / map bbox | `location_point && ST_GeomFromText(POLYGON)::geography` | suite path |
| Pagination | clamped max 100, bounded sort keys (injection-safe switch) | E6 + code |
| Indexing | `marketplace.listing_search_docs` upsert (GIN tsvector + GiST bbox) | fresh apply 15/15 |
| Retry / Dead Letter | search queue → shared runner (backoff → dead) + admin requeue | worker inventory |
| Rebuild | `POST /admin/search/rebuild` chunked job, dedupKey `search.rebuild`, maxAttempts 3 | worker code |
| Index lag | `SearchIndexRepository.stats()` → `/admin/search/index-state` + `/search/health` + analytics snapshot | code + suite |
| Performance | search_fts p95 = **1.1 ms** (target 500 ms) — live HTTP, 300 req | `D_benchmark.log` |

## UNVERIFIED_EXTERNAL notes (OpenSearch)
- Client sends only `content-type` — **no auth headers supported yet** (code gap for credentialed clusters; registered OPEN_ISSUES #5).
- Health-probe routing with 30 s cache + `search_fallback_total` counter keeps PG authoritative on any failure → failure mode defined and regression-safe.
- Contract parity: multi_match `title_text^3`, term/range filters, geo_bounding_box, terms-agg facets, pagination, `_score` sort — implemented but not exercised against a live cluster.

## Verdict
Search = **PASS for the local contract** (verified, performant); external provider honestly `UNVERIFIED_EXTERNAL`.
