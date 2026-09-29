# GATE4_PERFORMANCE_REPORT (§20/§21)

## Targets vs measured (real HTTP against the built server, sandbox-local)

| Scenario | n | p50 | p95 | p99 | Target p95 | Verdict |
|---|---|---|---|---|---|---|
| simple (GET /api/v1/health/live) | 300 | 0.3 ms | **1.0 ms** | 2.0 ms | < 300 ms | **WITHIN_TARGET** |
| search (GET /api/v1/search/listings?q=…) | 300 | 0.2 ms | **1.2 ms** | 3.9 ms | < 500 ms | **WITHIN_TARGET** |
| authenticated (GET /api/v1/auth/me — JWT verify + DB user load) | 300 | 0.2 ms | **1.7 ms** | 5.8 ms | < 400 ms | **WITHIN_TARGET** |

- Method: warmup 20 + 300 sequential samples per scenario; `errors=0`, `badStatus=0` in all runs (raw results: `evidence/g4-benchmark-results.txt`).
- **Caveat (honest, §27):** measurement is sandbox-local (client and server on the same host, no TLS, no network RTT). The mandate declares these numbers as *Target Architecture* gates; re-measurement under production topology is required before using them as SLOs. ADR note registered in `GATE4_SCHEMA_DRIFT_REPORT.md` companion (targets unchanged).

## EXPLAIN (ANALYZE) — key queries (real PG, karen_g4)

| Query | Planning | Execution | Notes |
|---|---|---|---|
| FTS search over listing_search_docs (status+tsv) | 0.52 ms | **0.049 ms** | index-supported; GIN available (ix_lsd_fts) — tiny corpus note: index choice was filter-driven on 4-row corpus |
| Permission resolution `iam.effective_permissions` (org-less) | 1.69 ms | **0.147 ms** | the 0030 engine used by every guarded endpoint |
| Job claim scan (pending + queue + run_at) | 0.57 ms | **0.068 ms** | SKIP LOCKED claim path (C2 race verified) |

Raw output: `evidence/g4-explain-analyze.txt`.

## Query discipline (§21)

- No N+1: search facets single round-trip; publication policy single CTE round-trip; doc builder bounded joins.
- Pagination: every list endpoint clamps page/pageSize (max 100); searches are LIMIT-bounded.
- Transactions: repo-owned with 15s statement / 5s lock timeouts (frozen from PostgresDatabase); locks: FOR UPDATE on parent rows only (property/listing), SKIP LOCKED for queues; optimistic `version` for listings.
- PHash duplicate analysis is bounded (2000 candidates, exact hamming in app) — documented cost envelope.

## Honest notes

- No continuous benchmark harness in CI yet — `scripts/g4-benchmark.js` is runnable and documented.
- Media pipeline timing benchmarks not run (job-level latency depends on image corpus; registered).
