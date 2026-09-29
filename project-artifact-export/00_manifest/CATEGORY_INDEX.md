# CATEGORY_INDEX.md — Karen Home artifact export (2026-09-29)

The export preserves ORIGINAL paths (under `workspace/`) instead of duplicating files into physical category folders — this guarantees one copy = one SHA-256 = one manifest row (no duplication ambiguity). The category of every file is registered in the manifest (`Category` / `Module` / `Gate` columns). This index maps the requested categories to where they live.

| Requested category | Location in this bundle | Notes |
|---|---|---|
| Source Code / Backend / API | `workspace/w0-work/backend/apps/api/src/**` | NestJS API modules |
| Worker | `workspace/w0-work/backend/apps/worker/**` | 9 background workers |
| Packages | `workspace/w0-work/backend/packages/{db,contracts}/**` | DB access + shared contracts |
| Database Migrations | `workspace/w0-work/backend/database/migrations/**` + `workspace/download/w0/gate3/migrations/**` | 0001..0034 chain + Gate 3 copies |
| Database Schema | `workspace/w0-work/backend/database/base/**` | Frozen Database Contract v1 |
| Database Errata | `workspace/w0-work/backend/database/errata/**` | 0024/0025/0026 |
| SQL Verification | `workspace/w0-work/backend/database/verify/**` + Gate 3/4 evidence SQL | 37/37 + 22/22 suites |
| Tests (unit/integration/E2E/red-team/performance) | `workspace/w0-work/backend/apps/**/test/**`, `**/*.spec.ts`, `scripts/g4-concurrency.js`, `scripts/bench*.js` | |
| OpenAPI / Contracts / DTOs | `workspace/w0-rebuild/artifacts/**/openapi/**`, `packages/contracts/**`, `**/dto/**` | |
| Domain Models / Repositories / Services / Controllers | `workspace/w0-work/backend/apps/api/src/**` (domain/application/infrastructure/presentation) | |
| Workers / Configuration / Scripts | `apps/worker/**`, `**/*.json`, `*.mjs`, `docker-compose*`, `.env.example`, `scripts/**` | |
| Documentation / ADR / Gate Reports / Audit Reports | `workspace/w0-work/backend/docs/**`, `download/w0/gate3/adr/**`, `download/gate4/GATE4_*.md`, `download/w0/**` | |
| Evidence / Logs / Benchmark results | `workspace/download/gate4/evidence/**`, `workspace/download/w0/**/evidence/**` | |
| Schema Snapshots / Schema Diff | `download/gate4/schema-snapshot-g4.*`, `download/w0/gate3/schema-snapshot-g3.*`, `evidence/*schema-diff*` | |
| Manifest / Recovery Documentation / Project State | `00_manifest/**`, `download/gate4/FILE_MANIFEST*`, `download/PROJECT_STATE_SUMMARY.md`, `worklog.md` | |
