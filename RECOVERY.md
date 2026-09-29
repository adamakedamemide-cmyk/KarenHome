# RECOVERY — Karen Home from the Authoritative Repository

Generated: 2026-09-29 (Gate 4.1) · Scope: recover the EXACT current state from this repository alone.

## 0. Prerequisites
- Node ≥ 22 (reference: v24.21.0), pnpm 10.15.0 (`npm i -g pnpm@10.15.0`)
- PostgreSQL 16 + PostGIS 3.5 + Redis (reference env: conda-forge builds)
- bash + psql client

## 1. Recover the source
```bash
git clone https://github.com/adamakedamemide-cmyk/KarenHome.git
cd KarenHome/backend
pnpm install --frozen-lockfile
```

## 2. Configure the environment (NO secrets are committed — by design)
```bash
cp .env.example .env   # then edit:
# DATABASE_URL=postgresql://<user>:<YOUR-OWN-PASSWORD>@127.0.0.1:5432/real_estate
# JWT_SECRET=<random ≥43 chars>
# MFA_ENCRYPTION_KEY=<random ≥43 chars>   # REQUIRED in production (fail-fast)
# Optional: OPENSEARCH_URL, SMTP_*, TWILIO_*, OAuth client ids — absent = documented fallback paths
```
Local DB container (compose uses a REDACTED placeholder — set your own password):
```bash
POSTGRES_PASSWORD=<your-own> docker compose -f docker-compose.postgres.yml up -d
```

## 3. Rebuild the database EXACTLY as verified
```bash
createdb real_estate && psql -d real_estate -c "CREATE EXTENSION postgis;"
bash scripts/apply-all-migrations.sh real_estate   # 15 steps, ledger in platform.schema_migrations, must end: 0 errors
```
Verify:
```bash
for s in critical-invariants g3-verification g4-verification; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "database/verify/$s.sql"; done
# expect: 6/6 booleans, 37/37 PASS, 22/22 PASS
```

## 4. Verify the build and tests
```bash
pnpm typecheck && pnpm lint && pnpm build     # all must be 0-error
RUN_DB_TESTS=1 DATABASE_URL=... pnpm test      # expect 64/64, 13/13 suites
node scripts/g3-concurrency.js && node scripts/g4-concurrency.js   # 3/3 + 5/5
```

## 5. Run the services
```bash
pnpm api:dev      # API on :3000 (docs at /docs when enabled) — benchmark: node scripts/g4-benchmark.js
pnpm worker:dev   # 9 workers + outbox loop
```

## 6. Recover the EXACT Gate 4.1 verified state
- Commit: the Gate 4.1 delivery SHA (tag `gate4-1-final` on this repo)
- Verification DB used for evidence: fresh `karen_g41_final` via step 3 (any fresh DB name is equivalent — the chain is deterministic)
- Schema snapshot: `gate4_1/evidence/schema-snapshot-g41.sql` (9494 lines, SHA `bdcd5586…`)
- Historical frozen artifacts: `Karen_Home_Project_Artifacts_CURRENT_v1.zip` (SHA `ff42f446…`) + `karen-home-gate4-final.tar.gz` (SHA `de9cfe9a…`) — verified in `gate4_1/GATE4_1_ARTIFACT_CONSISTENCY.md`

## 7. Governance notes
- `backend/docker-compose.postgres.yml` and `.env.example` contain placeholders ONLY.
- Real `.env` is gitignored and must never be committed (standing rule; secret scan runs pre-push and in CI).
- Frozen `project-artifact-export/` is an audit artifact — do not mutate it; deviation note (credential-free .env removed from the live mirror) is registered in `gate4_1/GATE4_1_ARTIFACT_CONSISTENCY.md`.
