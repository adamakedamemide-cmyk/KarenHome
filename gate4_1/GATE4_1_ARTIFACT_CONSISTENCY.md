# GATE4_1_ARTIFACT_CONSISTENCY_CHECKS

Generated: 2026-09-29T15:47:36Z

- **PASS** — C1 export SHA256SUMS vs repo mirror — checked=763 mismatch=0 missing=1 (1 expected: workspace/.env removed from live repo per no-real-.env rule; documented) ['MISSING workspace/.env']
- **PASS** — C2 CURRENT v1 bundle SHA-256 — ff42f446c0c38144b29c9f384d72d9a509fc8b1f61d5979b672023345ab0b3ad
- **PASS** — C3 ZIP integrity testzip + entries — entries=767
- **PASS** — C4 Gate4 FILE_MANIFEST hashes vs repo files — entries=73 match=73 mismatch=0 missing=0 []
- **FAIL** — C5 migration chain = 13 runner steps (base + errata 0024f/0025/0026 + 0027..0034) — base=yes errata=4 files (0024 provenance-tracked + fixed variant per W0-CF-02) migrations=8 (0027_commission_domain.sql..0034_gate4_billing_plans.sql) → runner steps=12
- **PASS** — C6 Gate3+Gate4 schema snapshot SHAs — g4=40bd5ee4ca9ff3e7… g3=f79a3348e0f9e080… file=w0/gate3/schema-snapshot-g3.sql
- **PASS** — C7 contracts package present + DTO layer located — @platform/contracts src files=2 (errors.ts=DomainError code model, index.ts) | api DTO files=11 — 'Contracts depth' remains a REGISTERED GAP (Phase E)
- **PASS** — C8 SQL verification suites present — critical-invariants.sql, g3-verification.sql, g4-verification.sql

**Overall: BLOCKER — FAILURES PRESENT**

Registered deviations: exactly 1 — `project-artifact-export/workspace/.env` exists in the frozen
ZIP bundle but was removed from the live repo mirror per the standing no-real-.env rule;
the file itself is credential-free (audited, see SENSITIVE_DATA_REDACTIONS.md).
