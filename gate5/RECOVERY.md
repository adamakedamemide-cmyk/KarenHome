# RECOVERY — Karen Home (Gate 5 edition)

## Restore a working environment from this repository

1. **Prerequisites**: Node ≥ 22 (tested v24), pnpm 10.15, PostgreSQL 16 + PostGIS (local or TCP), (optional) OpenSearch 2.19.x, Java 21 if running one.
2. **Code**: clone `https://github.com/adamakedamemide-cmyk/KarenHome.git` (branch `main`); backend monorepo lives in `backend/`.
3. **Install**: `cd backend && pnpm install --frozen-lockfile`.
4. **Database (fresh)**:
   - createdb `<name>`;
   - local socket default: `bash scripts/apply-all-migrations.sh <name>`;
   - TCP/remote: `DATABASE_URL=postgresql://<user>:<pass>@<host>:5432/<name> bash scripts/apply-all-migrations.sh <name>` (runner honors DATABASE_URL; verifies 15/15 ledger + 0 errors).
5. **Secrets** (none committed — by design): provide `JWT_SECRET` (≥43 chars), `MFA_ENCRYPTION_KEY` (≥43 chars; **mandatory, fail-fast in NODE_ENV=production**), `DATABASE_URL`; optional: `OPENSEARCH_URL`, `SMTP_URL`, `TWILIO_*`, `OAUTH_GOOGLE_*`/`OAUTH_FACEBOOK_*`, `CLAMD_HOST/PORT`, `MEDIA_*` dirs. Placeholders in `backend/.env.example`.
6. **Search**: with `OPENSEARCH_URL` set, the index self-bootstraps (`listings-v1`, strict mapping) on first index push; health at `GET /api/v1/search/health` (engine + indexLag). Without it, verified PG FTS serves search automatically.
7. **Run**: `pnpm build && node apps/api/dist/main.js` (API) · `node apps/worker/dist/main.js` (workers).
8. **Verify**: `RUN_DB_TESTS=1 DATABASE_URL=… [OPENSEARCH_URL=…] pnpm --filter @platform/api exec jest --runInBand --rootDir apps/api` → expect 83/83 (OpenSearch scenarios auto-skip honestly if `OPENSEARCH_URL` is absent).

## Disaster recovery (drilled in Gate 5 — GATE5_DR_REPORT.md)

- **PostgreSQL**: `pg_dump -Fc` nightly (to be automated — registered); restore: `pg_restore -d <fresh>`; Gate 5 drill achieved 10/10 parity in 592 ms on 679 KB dump.
- **Object storage (local-fs)**: tar snapshot of `MEDIA_STORAGE_DIR`; S3-backed recovery applies after the Gate 6 S3 adapter (ADR-G5-01).
- **Queue/Outbox**: PostgreSQL-native — restoring the DB restores them; workers re-lease automatically (SKIP LOCKED), dead letters requeue via admin API.
- **Redis**: N/A — not part of the stack.

## Historic snapshots

| Snapshot | SHA-256 / where |
|---|---|
| Export CURRENT v1 (`dc2eb5c` lineage) | `ff42f446…` (bundle + `project-artifact-export/`) |
| Gate 4 final archive | `de9cfe9a…` (`karen-home-gate4-final.tar.gz`) |
| Gate 4.1 bundle | `3f6dac71…` (`Karen_Home_Artifacts_Gate4_1_R1.zip`) |
| Gate 5 bundle | see `gate5/FILE_MANIFEST.md` (`Karen_Home_Artifacts_Gate5_R1.zip`) |
| Pre-export git lineage | `project-artifact-export/00_manifest/GIT_STATE.txt` (original history intentionally not on GitHub — no-secrets rule) |
