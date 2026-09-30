# PHASE D — Migration Runner Audit (REAL EXECUTION EVIDENCE)

Gate 5.1 / Phase D prerequisite: audit of the Gate 5.1 migration runner
(`backend/scripts/apply-all-migrations-node.js`) before Projects domain development.
Per governance, this audit is **execution-based** (fresh DB runs, re-runs, failure probes) —
not code inspection alone. Evidence date: 2026-09-30. Environment: PostgreSQL 17.11 +
PostGIS 3.5.2 on 127.0.0.1:5434 (ENVIRONMENT_VARIANCE vs PG16 baseline — see
`docs/governance/ENVIRONMENT_VARIANCE.md`).

## Method

`backend/scripts/audit-migration-runner.sh` performs four phases against a dedicated
database (`karen_g51_audit`), never touching the live evidence DB:

- **PHASE A — fresh full chain**: DROP/CREATE empty DB → run runner → all 18 steps
  (`base → errata_0024..0026 → 0027..0039 → seed_reference`) must apply; ledger rows = 18.
- **PHASE B — idempotent re-run**: run runner again on the same DB → zero statements
  executed; object-inventory hash (tables/views/triggers/functions/indexes/types across
  all non-system schemas) must be identical before/after; ledger steps must equal the
  official STEPS list in order.
- **PHASE C — failure transactionality**: a copy of the runner with an appended bogus
  step (`CREATE TABLE project.audit_bogus_probe` followed by deliberately invalid SQL)
  must exit(2) and leave **no half-applied artifact** (probe table absent) and no ledger row.
- **PHASE D — inventory parity**: fresh-audit DB object inventory must hash-identical to
  the live evidence DB (`karen_g51_fresh`).

## Findings (during audit, real executions)

| ID | Finding | Evidence (pre-fix run) | Resolution |
|----|---------|------------------------|------------|
| F1 | Runner had **no skip-if-applied** — re-running on an applied DB re-executed `base` and errored | `FAILED at step base: type "user_status" already exists` | Ledger-aware skip added; PHASE B now proves 18/18 skipped, zero statements |
| F2 | Failure was **not transactional** — per-statement autocommit left a half-applied artifact | probe: `bogus table exists? 1`, inventory hash drifted (`97134fc393d448b7`) | Per-step transaction management added (see below); probe now: `bogus table exists? 0`, hash **UNCHANGED** |
| F3 | Naive whole-file single-transaction broke `0031_listing_state` (documented PG constraint: new enum value cannot be *used* in the transaction that adds it) | `FAILED at step 0031: unsafe use of new value "pending_verification"` | Runner became **section-aware**: honors each file's own `BEGIN`/`COMMIT` boundaries (0031 Section 1 autocommit by design; Sections 2–4 one transaction); files without explicit `BEGIN` run in one driver transaction; the `platform.schema_migrations` ledger row is inserted inside the final open transaction |

## Post-fix audit results (actual output)

```text
PHASE A: applied=18 skipped=0 of 18 steps === ledger rows: 18
PHASE B: skipped steps: 18 ; (no 'applying' lines = zero statements executed on re-run)
         inventory hash before=def3a292b0e16370 after=def3a292b0e16370 IDENTICAL
         ledger steps: base,errata_0024,…,0038_gate51_crm,0039_gate51_projects,seed_reference
PHASE C: buggy-runner exit=2 ; FAILED at step audit_bogus: syntax error at or near "THIS"
         bogus table exists? 0 ; ledger rows: 18 ; inventory hash UNCHANGED (def3a292b0e16370)
PHASE D: fresh-audit=def3a292b0e16370  live-db=def3a292b0e16370  PARITY OK
```

## Audit verdict

```text
Migration runner (fresh chain)        = VERIFIED
Migration runner (idempotent re-run)  = VERIFIED
Failure transactionality              = VERIFIED (section-level atomicity; 0031 enum
                                        autocommit section documented + idempotent via
                                        ADD VALUE IF NOT EXISTS)
0039 in official steps + ledger       = VERIFIED
Ledger vs real migration state        = VERIFIED (18/18)
Destructive operations on re-run      = NONE (zero statements executed)
```

Status words (non-equivalent): fresh-chain apply = **Tested**; idempotency + failure
rollback = **Tested/Verified on PG 17.11**; PG 16 behavior = **UNVERIFIED_EXTERNAL_ENVIRONMENT**
(carried in `docs/governance/ENVIRONMENT_VARIANCE.md`).
