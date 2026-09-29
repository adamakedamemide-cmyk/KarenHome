# GATE 5 — Phase Q (2/2): Advertising Revalidation — PASS (independent re-run)

Independence: re-executed on fresh `karen_g5_fresh` (G5R-TEST-001). Suites: `g41-governance.spec.ts` T2+T4, `g4.integration.spec.ts` advertising sections, `analytics.worker` rollup exercised.

## Mandated properties → verified evidence

| Property | Evidence (executed, fresh DB) |
|---|---|
| Budget | budget exhaustion rejected (`BUDGET_EXCEEDED`), spend accrual CPM (impressions×price/1000, daily rollup) + CPC (per valid click) |
| Impression dedup | impression insert deduplicates (viewer/listing/time-window unique rule) — dedup index verified by Gate 4.1 fix 0036, re-verified here |
| Click dedup (anti-double-billing) | T4: duplicate click events within the dedup window never produce double spend; 0036 partial unique index re-applied by fresh migration chain |
| Org isolation | T2: cross-organization serving/administration rejected; platform.admin override explicit |
| Authorization | 0035 permission+guard ladder (campaign create/update/serve under distinct permissions) — applied fresh in chain |
| Status | **COMPLETE (core scope)** — 11 tables, repo/service/API/worker/authz/tests all real |

## Analytics worker (advertising-adjacent) re-run evidence
Daily rollup job produces aggregates + spend lines; index-lag snapshot job records pending/failed/indexed counts (also surfaced by /search/health).
