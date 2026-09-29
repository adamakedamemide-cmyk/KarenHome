# GATE4_1_PERFORMANCE_REPORT — Phase R

Generated: 2026-09-29 · Prior Gate 4 numbers (1.0/1.2/1.7 ms) are kept **HISTORICAL ONLY** — everything below is a fresh, independent run on karen_g41_final.

## API p95 (live HTTP, n=300 per scenario, 0 errors)

| Scenario | p50 | p95 | p99 | Target | Verdict |
|---|---|---|---|---|---|
| simple_liveness | 0.3 ms | **1.3 ms** | 4.8 ms | 300 ms | WITHIN_TARGET |
| search_fts | 0.2 ms | **1.1 ms** | 2.6 ms | 500 ms | WITHIN_TARGET |
| authenticated_me (JWT + DB) | 0.3 ms | **2.6 ms** | 8.3 ms | 400 ms | WITHIN_TARGET |

Evidence: `evidence/D_benchmark.log` (authenticated scenario now included — real login token against fresh DB; Gate 4 had skipped it).

## DB query p95 proxy
- EXPLAIN ANALYZE samples on core tables: 0.019–0.068 ms execution (`evidence/D_db_p95.log`).
- `pg_stat_statements` not enabled in sandbox — registered as instrumentation gap (OPEN_ISSUES #7).

## Worker latency / queue lag
- Job runner latency fields logged per job (`durationMs`); queue-depth and index-lag via `/admin/jobs/stats` + `/admin/search/index-state`; index-lag snapshot worker stores oldest-pending-seconds. Under empty-queue sandbox conditions these measure idle health (real values captured in logs); sustained-load numbers require a load generator against real traffic — registered as UNVERIFIED under load (sandbox caveat, same as Gate 4).

## Memory / CPU (steady-state sample, `evidence/D_resources.log`)

| Process | CPU | RSS |
|---|---|---|
| API (node) | 1.9% | 108 MB |
| PostgreSQL 16.10 | 0.0% | 26 MB |
| Redis 8.10.1 | 0.1% | 12 MB |

## Verdict
Performance = **PASS** (all measurable targets met with wide margins, now including the authenticated path); load-scale claims remain honestly sandbox-bounded.
