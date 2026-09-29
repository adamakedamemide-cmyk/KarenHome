# Karen Home — Authoritative Project Workspace

Multi-tenant, multi-language real-estate platform (Core Backend).

**This repository is the AUTHORITATIVE PROJECT WORKSPACE** (mandated 2026-09-29).
Every action that creates or changes code, migrations, tests, docs, configuration,
evidence or repository state is committed and pushed here. `No Push = No Completed Action`.

## Governance status
- W0 = PASS (finalized) · Gate 3-DB = PASS · Gate 4 = PARTIAL (proceed-capable)
- **Gate 4.1 in progress**: Repository Integrity + Core Backend Closure + Production Readiness Audit
- Frontend / public UI / mobile remain FORBIDDEN until a new user mandate.

## Layout
| Path | Purpose |
|------|---------|
| `backend/` | Live monorepo source of truth (apps/api, apps/worker, packages/*, db/migrations 0001..0034) |
| `gate4_1/` | Gate 4.1 deliverables + independent evidence |
| `gate4/` | Gate 4 reports + evidence (historical, frozen at export) |
| `w0/` | W0 + Gate 3-DB reports + evidence (historical, frozen at export) |
| `project-artifact-export/` | FROZEN export snapshot (CURRENT v1, commit dc2eb5c) — audit artifact, do not mutate |
| `Karen_Home_Project_Artifacts_CURRENT_v1.zip` | Self-contained audit bundle, SHA-256 ff42f446c0c38144b29c9f384d72d9a509fc8b1f61d5979b672023345ab0b3ad |

## Notes
- `backend/docker-compose.postgres.yml` uses `REDACTED_SET_YOUR_OWN_LOCAL_PASSWORD` by governance
  (no secrets are ever committed; real `.env` files are gitignored).
- Raw pre-export git history (tags gate3-db-final / gate4-final) is preserved in
  `project-artifact-export/00_manifest/GIT_STATE.txt`; it was not pushed to comply with the
  no-secrets rule. All new history and tags live on this repository.
- Standing rule after every action: `git status → git diff → git add -A → git commit → git push origin main`,
  with a secret scan before every push.
