# GATE4_1_WORKER_REPORT — Phase O

Generated: 2026-09-29 · Evidence: worker code inventory + fresh concurrency/test runs on karen_g41_final.

## Shared job infrastructure (all 9 workers)
- Atomic claim `FOR UPDATE SKIP LOCKED` (zero double-claim — proven C2).
- Exponential backoff `base * 2^(attempt-1)` capped; terminal-error classification.
- DLQ: terminal failures → status `dead` + per-attempt audit rows in `platform.job_runs`; ops API `POST /admin/jobs/:id/requeue-dead`, `GET /admin/jobs/stats`.
- Enqueue dedup: partial unique on `dedup_key` for pending/running.
- Stale-run requeue sweep (CleanupWorker + runner).

## Per-worker observability matrix (mandated fields)

| Worker | Jobs processed | Success | Failure | Retry | DLQ | Latency | Queue depth | Last execution |
|---|---|---|---|---|---|---|---|---|
| Outbox (bridge) | leased count (log `outbox_leased`) | published-after-routing | re-lease on failure | loop-level | events never marked published on failure | loop log | `audit.outbox_events` unpublished | structured logs |
| SearchIndexer | job rows | doc upsert | `opensearch_push_failed` log (best-effort) | runner | runner → dead | `durationMs` in logs | index lag stats endpoint | logs |
| Notifications | job rows | delivery rows | job_failed logs | runner | runner | logs | `/admin/jobs/stats` | logs |
| Email | job rows | transport log | job_failed | runner (dedup per user) | runner | logs | stats | logs |
| SMS | job rows | transport log | job_failed | runner (dedup per user+phone) | runner | logs | stats | logs |
| Media | batch 5 | `media_processed {variants, pHash, duplicateOf}` | `media_quarantined` / markFailed | runner maxAttempts 5 | runner | logs | stats | logs |
| Fraud | sweep rows | `fraud_session_sweeped {invalidated}` | job_failed | runner | runner | logs | stats | logs |
| Analytics | rollup rows | `analytics_rollup {impressions, spend}`, `index_lag_snapshot` | job_failed | runner | runner | logs | stats | logs |
| Cleanup | sweeps | `cleanup_done {…counts}` | job_failed | runner | requeues stale | logs | stats | logs |

`/admin/jobs/stats` + `platform.job_runs` provide the mandated processed/success/failure/retry/DLQ/last-execution queries at DB level today (verified real).

## Design for Prometheus worker metrics (registered Phase E #13, target Gate 5)
`jobs_processed_total{worker,type}`, `job_duration_seconds{worker,type}` (histogram), `job_retry_total{worker}`, `job_dlq_total{worker}`, `queue_depth{queue}` (gauge), `job_last_success_timestamp{worker}`. The API-side registry (`/metrics`, renderPrometheus) already proves the exposition pattern; workers will mount the same registry on an internal scrape port. NOT implemented in 4.1 (registered honestly).

## Verdict
Worker observability = **PASS at log+DB-audit level** (real, queryable), Prometheus registry upgrade registered as NON-BLOCKING with concrete design.
