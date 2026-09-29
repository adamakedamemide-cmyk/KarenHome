# CURRENT_PROJECT_STATE.md — Karen Home

Generated: 2026-09-29 (Asia/Tehran) — by the mandatory PROJECT ARTIFACT EXPORT task.
This file describes the exact state frozen inside `Karen_Home_Project_Artifacts_CURRENT_v1.zip`.

## Git State

| Field | Value |
|---|---|
| Current Git Commit (HEAD) | `dc2eb5cba56b885114515d1897aba4ab3c9f5cf5` |
| Last Gate commit | `4fdb484` — "GATE4: core backend, domains, workers, platform infra (0032-0034) — PARTIAL proceed-capable, 60/60 tests, 5/5 races, 37/37+22/22 SQL, REMOVED 0" |
| Post-gate governance commits | `9b020af` (archive manifest + self-hash), `73c9c0a` (worklog), `dc2eb5c` (state refresh) |
| Current Git Tag | `gate4-final` (also present: `gate3-db-final`) |
| Current Branch | `main` |
| Working tree | clean at export time (no uncommitted project changes) |
| Git remote | none (self-contained local repository; `.git/` itself excluded from the bundle — see SENSITIVE_DATA_REDACTIONS.md / EXPORT_EXCLUSIONS.md) |

## Gate / Governance State

| Field | Value |
|---|---|
| Current Gate | **Gate 4 — Core Backend, Application Domain, Workers & Platform Infrastructure** |
| Gate 4 Status | **PARTIAL (proceed-capable; zero critical security or data-integrity issues)** |
| Registered evidence basis | W0 = PASS, Gate 3-DB = PASS (Reported Execution Evidence, user-registered) |
| Frontend / Mobile / AI | **Forbidden until explicit next user mandate** (Gate 4 governance) |
| Audit chain | Gate 0-R (SHA `af3a60e5…`) → W0 + Gate 3-DB (snapshot `f79a3348…`) → Gate 4 (snapshot `40bd5ee4…`) |

## Database State

| Field | Value |
|---|---|
| Migration Head | `0034_gate4_billing_plans.sql` (chain 0001…0034 + `seed_reference.sql`; ledger-managed, applied as 13 steps) |
| Current Database Schema Version | Gate 4 schema (schema diff vs Gate 3: REMOVED 0 / ADDED 189, all additive) |
| Schema Snapshot (Gate 4) | `download/gate4/schema-snapshot-g4.sql` — SHA-256 `40bd5ee4ca9ff3e71c17389883c6c9bad7b0c35ba2b627a80740e2819299fe62` |
| Database Name used for Verification | **`karen_g4_fresh`** (canonical fresh-apply verification DB) |
| Other databases on the local instance | `karen_ere` (main working DB), `karen_g4` (test), `karen_g3_base` / `karen_g3_fresh` / `karen_g3_scratch` (historical Gate 3 verification) |

## Toolchain Versions (verified live at export time)

| Component | Version |
|---|---|
| Node.js | v24.21.0 |
| pnpm | 10.15.0 |
| PostgreSQL | 16.10 (micromamba env `karen`) |
| PostGIS | 3.5.0 |
| Redis | 8.10.1 |
| OS | Linux sandbox (Debian-based) |

## Verification Status (latest recorded execution evidence — Gate 4)

| Check | Result | Evidence file |
|---|---|---|
| Fresh migration apply | **PASS — 13/13 steps, 0 ERROR** | `download/gate4/evidence/g4-apply-fresh.log` |
| Typecheck | **PASS — 0 errors** | `download/gate4/evidence/g4-typecheck-final.log` |
| Lint | **PASS — 0 problems** | `download/gate4/evidence/g4-lint-final.log` |
| Build | **PASS — 0 errors, 4 packages** | `download/gate4/evidence/g4-build-final.log` |
| Unit/Integration/E2E/Red-team tests | **PASS — 60/60 (12 suites)** | `download/gate4/evidence/g4-test-final.log`, `g4-test-db-final.log` |
| Concurrency tests | **PASS — 5/5** | `download/gate4/evidence/g4-concurrency.log` |
| SQL invariant suite (Gate 3, re-run on G4 fresh) | **PASS — 37/37** | `download/gate4/evidence/g3-verification-on-g4-fresh.log` |
| SQL invariant suite (Gate 4) | **PASS — 22/22** | `download/gate4/evidence/g4-verification.log` |
| Schema diff | **REMOVED 0 / ADDED 189** | `download/gate4/evidence/g4-schema-diff.json` |
| Performance p95 (simple / search / authed) | 1.0 / 1.2 / 1.7 ms vs targets 300/500/400 — **sandbox-local caveat** | `download/gate4/evidence/g4-benchmark-results.txt` |
| EXPLAIN/ANALYZE checks | performed on hot-path queries | `download/gate4/evidence/g4-explain-analyze.txt` |
| Red team | 15 scenarios: 12 blocked + regression-tested, 2 N/A, **1 partial** | `download/gate4/GATE4_RED_TEAM_REPORT.md` |

## Known UNVERIFIED Integrations (honest register, §27)

- OpenSearch engine adapter — implemented behind `SearchEngine` port, **not verified against a live OpenSearch cluster** (verified engine = PostgreSQL FTS `PgFtsEngine`).
- SMTP email vendor, Twilio SMS vendor, FCM push vendor — adapters present, **no live vendor verification**.
- OAuth providers (Google/Facebook) — provider abstraction implemented, **no live vendor verification**.
- ClamAV security-scan adapter and S3/CDN storage adapter — interfaces defined, **not verified against real services**.
- CAPTCHA provider — abstraction only, no vendor wired.

## Known Partial Items

- Messaging service, CRM / Contracts / Projects / Valuation domain depth (registered for future gates).
- Worker-native metrics endpoint (observability currently via structured logs + counters).
- Full `@ApiProperty` OpenAPI annotations (contract-drift CI gate registered; annotations incomplete).
- Red-team scenario coverage: 1 partial scenario (registered in `GATE4_RED_TEAM_REPORT.md`).

## Known Risks

- Performance numbers are **sandbox-local**; production targets require re-measurement on production-like infra (ADR required to change targets).
- `dist/` build output is **committed to git** (138 files) — retained in this export for HEAD fidelity; rebuildable via `pnpm build`.
- Root `.env` is tracked in git (contains only a non-secret `DATABASE_URL` pointer; no credential). Hygiene risk flagged: avoid ever committing real credentials.
- `docker-compose.postgres.yml` contains a well-known **local dev default password** — REDACTED in this export (see SENSITIVE_DATA_REDACTIONS.md); rotate before any non-local use.
- `pgcrypto`-based TOTP secrets are encrypted at rest (AES-256-GCM) but MFA is a **foundation**, not a completed feature.

## Open Decisions

- **Approved (user-issued):** OD-01, OD-02, OD-03, OD-04, OD-08, OD-09, OD-13 (see `download/w0/W0_OPEN_DECISIONS.md`).
- **Still open:** OD-05, OD-06, OD-07, OD-10, OD-11, OD-12, OD-14, OD-15, OD-16, OD-17.
- **Explicitly UNDECIDED (values pending, engine ready):** commission percentages, subscription plan prices — zero invented business values enforced (seed stays empty of commercial numbers).

## Bundle Self-Description

- This snapshot = 756 original project files (exact original-path mirror under `workspace/`) + 11 generated governance documents in `00_manifest/` + path index in `99_original_paths/`.
- Per-file audit metadata (16 fields incl. SHA-256): `00_manifest/PROJECT_ARTIFACT_EXPORT_MANIFEST.md` (+ machine-readable `.csv`).
- Integrity: `00_manifest/SHA256SUMS`, counts in `00_manifest/FILE_COUNTS.txt`.
