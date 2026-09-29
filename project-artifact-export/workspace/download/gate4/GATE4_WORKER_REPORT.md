# GATE4_WORKER_REPORT (§12)

## Architecture

- New app `apps/worker` (`@platform/worker`, plain TS + tsc) sharing `@platform/db`.
- **Queue:** `platform.jobs` (+ `platform.job_runs` audit). Claim protocol: `FOR UPDATE SKIP LOCKED` — multi-node safe. Stale-runner requeue (900s). Dead-letter = `status='dead'`; admin requeue endpoint `POST /api/v1/admin/jobs/:id/requeue-dead`.
- **Idempotency:** partial-unique `dedup_key` (one live job per key) + deterministic outputs (e.g. media object keys from sha256, report upserts).
- **Retry/Backoff:** exponential `base * 2^(attempts-1)` capped by `JOB_BACKOFF_MAX_SECONDS`; verified in J1 (retry scheduled into the future; dead after max_attempts).
- **Observability:** every claim/fail/complete writes `platform.job_runs`; structured JSON logs with workerId/jobId/attempt/backoff; `GET /api/v1/admin/jobs/stats`.

## The 9 workers

| Worker | Queue | Job types | Status |
|---|---|---|---|
| **OutboxWorker** (dedicated loop over `audit.outbox_events`, leaseBatch SKIP LOCKED) | — | routes events → jobs | **IV** — the §2 Events→Workers bridge; Listing*.v1 → search.index + notifications; markPublished only after routing |
| **SearchIndexerWorker** | search | search.index / search.delete / search.rebuild | **IV** (PG FTS verified; OpenSearch push when `OPENSEARCH_URL` set — UNVERIFIED live) |
| **NotificationWorker** | notifications | notification.dispatch | **IV** — in-app row + preference-gated fan-out to email/sms/push deliveries |
| **EmailWorker** | email | email.verification / email.password_reset / email.deliver | **IV core**; SMTP transport implemented (nodemailer) UNVERIFIED; Console transport verified |
| **SmsWorker** | sms | sms.otp / sms.deliver | **IV core**; Twilio transport implemented UNVERIFIED |
| **MediaWorker** | media | media.process | **IE** — sharp pipeline verified (WebP/variants/EXIF-strip/pHash/dedupe/quarantine); vendor scan UNVERIFIED |
| **FraudWorker** | fraud | fraud.sweep {kind: ad_sweep/budget_sweep} | **IV** — burst invalidation + risk events + audit; moderation case surface deferred (target_id NOT NULL constraint) |
| **AnalyticsWorker** | analytics | analytics.run {kind: ads_rollup / index_lag_snapshot} | **IV** — CPM/CPC spend rollups into advertising.reports; index-lag logs |
| **CleanupWorker** | cleanup | cleanup.run | **IV** — sessions/tokens purge, stale-job requeue, tmp media purge |

Recurring sweeps are self-scheduled by enqueueing deduped jobs (fraud 5m, analytics 10m, cleanup 30m) — no external scheduler required.

## Verified behavior (evidence)

- J1 integration: enqueue→claim single-winner→fail→backoff-in-future→dead→requeueDead(attempts=0).
- C2 race: 8 parallel claimers over 20 jobs — **claimed=20, duplicates=0**.
- Graceful shutdown: SIGTERM/SIGINT stop loops + pool close (code path; manual verify noted).
- `worker:dev` script; `pnpm build` compiles worker with the same strict flags.

## Honest notes (§27)

- Worker metrics endpoint (Prometheus) lives in the API process; the worker emits logs + job_runs (scrapeable via SQL) — a worker-native /metrics is a Gate 5 item.
- Outbox dispatch is at-least-once: handlers must be idempotent — enforced by dedup keys and upserts.
