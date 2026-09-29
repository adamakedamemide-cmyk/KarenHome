# GATE 5 — Phase U: Disaster Recovery Report (G5R-DR-001)

Evidence: `gate5/evidence/G5R-DR-001.log` (raw drill log). Drill date: 2026-09-29, executed on the live local PostgreSQL 16.10.

## 1. REAL PostgreSQL backup/restore drill — PASS

| Step | Result |
|---|---|
| `pg_dump -Fc karen_g5_fresh` | ✅ 191 ms, 679,851 bytes, SHA-256 `3ca0f8553b5c83450a75cbd3be96830caf03b434dc7ab4612562d9b84a1b39f6` |
| Drop + recreate `karen_g5_restore` + `pg_restore` | ✅ 592 ms, no errors |
| Row-count parity (users 296, listings 114, properties 114, commission.rules 24, advertising.clicks 4, outbox 217, jobs 291, ledger_entries, schema_migrations 15) | ✅ **10/10 MATCH**, 0 mismatches |
| Content spot-checks (user row incl. primary email; listing row public_code/status/price) | ✅ identical |
| Migration ledger integrity | ✅ `platform.schema_migrations` = 15 entries in restore (full chain incl. 0036 + seed_reference) |

## 2. Recovery path coverage

| Path | Status |
|---|---|
| Database backup/restore | ✅ **executed for real** (above) |
| Migration replay | ✅ equivalent path exercised 3× this gate: fresh apply of the full chain (base + errata + 0027–0036 + seed) = 15/15, 0 errors (G5R-DB-001, and every fresh-DB test run) |
| Object storage recovery | ✅ drill executed for the verified `local-fs` engine: tar snapshot of media storage (20,480 bytes, sha `8e77190c4f8a9795…`) + documented restore = untar to `MEDIA_STORAGE_DIR`; **S3/object-store recovery = N/A until the S3 adapter exists (ADR-G5-01)** |
| Queue recovery | ✅ by construction: `platform.jobs` is PostgreSQL-native (claiming = `FOR UPDATE SKIP LOCKED`); a restored DB contains the queue — crash recovery is automatic (claimed-but-dead jobs re-runnable by `run_at`/lease expiry semantics); dead-letter requeue endpoint verified in suites |
| Outbox recovery | ✅ same: `audit.outbox_events` is DB-native; unpublished events re-dispatched by the outbox worker (at-least-once, verified in Phase C chain incl. retryable failure mode) |
| Redis recovery | **N/A — no Redis exists in this stack** (no cache/lock layer; nothing to recover). Any future Redis adoption must add its own recovery runbook (registered) |

## 3. Registered gaps (honest)

- Backups are manual drills; **no scheduled/automated backup job or off-site copy exists yet** — required before production (registered in `GATE5_NEXT_GATE.md`).
- PITR (WAL archiving) not configured — same registration.
- The drill covers the single-node topology that actually exists; multi-AZ/replicated topologies are deployment-stage work.
