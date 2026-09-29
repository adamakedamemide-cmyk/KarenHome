# SENSITIVE_DATA_REDACTIONS.md — Karen Home artifact export (2026-09-29)

Rule: no API keys, passwords, JWT secrets, OAuth secrets, DB passwords, SMTP credentials, cloud credentials or private keys are exported.

## 1. Scan scope

- Files scanned (text): **748** — every included file (binary-safe detection skipped 8 binary/provenance files).
- Pattern families: password literals, secret/api-key/token literals (>=12 chars), `BEGIN PRIVATE KEY` blocks, credential-bearing `postgres://user:pass@` URLs.

## 2. REDACTED in exported copy (originals NOT exported)

| Original path | Change | Registered reason |
|---|---|---|
| `w0-work/backend/docker-compose.postgres.yml` | `POSTGRES_PASSWORD: postgres` → `REDACTED_SET_YOUR_OWN_LOCAL_PASSWORD` | Well-known local dev default database password (user rule §13). Set your own value — `RECOVERY_FROM_EXPORT.md` §3 |
| `w0-rebuild/artifacts/…/04_backend_gate2/docker-compose.postgres.yml` | same replacement | Same dev default inside the reference bundle copy |
| `w0-rebuild/artifacts/…/enterprise_real_estate_backend_gate2_x/…/docker-compose.postgres.yml` | same replacement | Same dev default inside the reference bundle twin copy |

## 3. Manual-review hits remaining after classification

| File | Line | Kind | Fragment | Verdict | Action |
|---|---|---|---|---|---|
| (none) | — | — | — | — | — |

## 4. Fixture / placeholder hits (kept by design)

| File | Hits | Classification | Action |
|---|---|---|---|
| `w0-rebuild/artifacts/Karen_Home_Reference_Artifacts_v1/03_backend_gate1/apps/api/test/iam.service.spec.ts` | 1 | test fixture / template placeholder | kept |
| `w0-rebuild/artifacts/Karen_Home_Reference_Artifacts_v1/04_backend_gate2/.env.example` | 1 | test fixture / template placeholder | kept |
| `w0-rebuild/artifacts/Karen_Home_Reference_Artifacts_v1/04_backend_gate2/apps/api/test/iam.service.spec.ts` | 1 | test fixture / template placeholder | kept |
| `w0-rebuild/artifacts/Karen_Home_Reference_Artifacts_v1/enterprise_real_estate_backend_gate1_x/enterprise_real_estate_backend_skeleton_v1/apps/api/test/iam.service.spec.ts` | 1 | test fixture / template placeholder | kept |
| `w0-rebuild/artifacts/Karen_Home_Reference_Artifacts_v1/enterprise_real_estate_backend_gate2_x/enterprise_real_estate_backend_gate2/.env.example` | 1 | test fixture / template placeholder | kept |
| `w0-rebuild/artifacts/Karen_Home_Reference_Artifacts_v1/enterprise_real_estate_backend_gate2_x/enterprise_real_estate_backend_gate2/apps/api/test/iam.service.spec.ts` | 1 | test fixture / template placeholder | kept |
| `w0-work/backend/.env.example` | 1 | test fixture / template placeholder | kept |
| `w0-work/backend/apps/api/dist/common/auth/totp.js` | 1 | test fixture / template placeholder | kept |
| `w0-work/backend/apps/api/dist/common/config/app-config.js` | 2 | test fixture / template placeholder | kept |
| `w0-work/backend/apps/api/dist/common/config/env.validation.js` | 1 | test fixture / template placeholder | kept |
| `w0-work/backend/apps/api/dist/modules/iam/application/iam-hardening.service.js` | 3 | test fixture / template placeholder | kept |
| `w0-work/backend/apps/api/dist/modules/iam/infrastructure/oauth-providers.js` | 3 | test fixture / template placeholder | kept |
| `w0-work/backend/apps/api/src/modules/iam/application/iam-hardening.service.ts` | 1 | test fixture / template placeholder | kept |
| `w0-work/backend/apps/api/test/g4-e2e-redteam.spec.ts` | 6 | test fixture / template placeholder | kept |
| `w0-work/backend/apps/api/test/g4-mfa-antibot.spec.ts` | 4 | test fixture / template placeholder | kept |
| `w0-work/backend/apps/api/test/iam.service.spec.ts` | 2 | test fixture / template placeholder | kept |
| `w0-work/backend/apps/api/test/integration/g4.integration.spec.ts` | 1 | test fixture / template placeholder | kept |

## 5. Special files reviewed

| File | Finding | Disposition |
|---|---|---|
| `.env` (root) | Contains only `DATABASE_URL=file:/home/z/my-project/db/custom.db` (no credential) | Exported as-is |
| `w0-work/backend/.env.example` | Placeholder values only (`replace-with-strong-random-secret…`, `postgres:postgres@127.0.0.1` dev URL) | Exported as-is (designated template) |
| `.git/` history | Root `.env` is tracked in git (no credential) | `.git/` excluded; risk flagged in CURRENT_PROJECT_STATE.md |
