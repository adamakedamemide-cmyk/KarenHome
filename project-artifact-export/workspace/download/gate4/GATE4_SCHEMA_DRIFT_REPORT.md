# GATE4_SCHEMA_DRIFT_REPORT (§26)

## Method

Same instrumented catalog as Gate 3 (`scripts/catalog-dump.sql`): TABLE / COLUMN / ENUM / FUNCTION / TRIGGER / INDEX / VIEW inventory, diffed between `karen_g3_fresh` (Gate 3 baseline, 10 ledger steps) and `karen_g4_fresh` (Gate 4 full chain, 13 ledger steps).

## Result

| Metric | Value |
|---|---|
| Baseline entries | 1,431 |
| Gate 4 entries | 1,620 |
| **REMOVED** | **0** ✅ |
| **ADDED** | 189 (21 TABLEs, 140 COLUMNs, 35 INDEXes incl. unique partials, 1 FUNCTION `platform.is_blocked`, GIN/GiST/btree families) |
| ENUM changes | none in Gate 4 (13 listing states already set by 0031) |
| TRIGGER changes | none removed; none altered |

Full diff: `evidence/g4-schema-diff.json`. Fresh chain log: `evidence/g4-apply-fresh.log` (**13/13 steps, 0 ERROR**).

## Gate 4 additions (all additive, CHANGE_CONTROL-disciplined)

- **0032 platform infrastructure:** platform.jobs/job_runs (queue+DLQ+runs), platform.risk_events/blocks (+is_blocked()), legal.user_agreement_acceptances, notification.quiet_hours/organization_preferences, marketplace.listing_search/listing_search_docs (generated tsvector + GIN/GiST), media_assets pipeline columns (additive ALTER, 7 columns + 2 indexes).
- **0033 IAM hardening:** email/phone/password-reset tokens, mfa_factors (unique active TOTP), oauth_accounts, login_attempts.
- **0034 billing plans:** plans/plan_versions/entitlements/subscription_events + additive `subscriptions.plan_version_id`.

## Verified invariants

- Gate 3 suite on karen_g4_fresh: **37/37 PASS** (`evidence/g3-verification-on-g4-fresh.log`). One check evolved, documented: `ledger_complete` now asserts the frozen 10 steps are present while later gates append (`n >= 10`) — the ledger grew to 13 exactly as designed; no check was deleted or weakened.
- Gate 4 suite: **22/22 PASS** (`evidence/g4-verification.log`).

## Snapshots

- Gate 4 schema snapshot: `download/gate4/schema-snapshot-g4.sql` — SHA-256 `40bd5ee4ca9ff3e71c17389883c6c9bad7b0c35ba2b627a80740e2819299fe62` (9,494 lines).
- Gate 3 snapshot retained: SHA `f79a3348…` (download/w0/gate3/).

## ADR note (performance targets, §20)

ADR-G4-P1: p95 targets (300/500/400 ms) confirmed as architecture targets; sandbox-local measurements (1.0/1.2/1.7 ms) are not SLOs — production-topology re-measurement required before any target change is considered.
