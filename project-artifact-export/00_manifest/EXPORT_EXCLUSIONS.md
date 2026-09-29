# EXPORT_EXCLUSIONS.md — Karen Home artifact export (2026-09-29)

Every item NOT exported, with the exact reason. Nothing else was excluded.

## A. Excluded git-tracked files (63 total)

| Path pattern | Files | Reason |
|---|---|---|
| `w0-rebuild/bin/micromamba` | 1 | Third-party package-manager binary — tooling, not a project artifact. Re-fetch instructions: `00_manifest/RECOVERY_FROM_EXPORT.md` §3 |
| `w0-rebuild/info/**` | 54 | micromamba conda-package metadata + third-party license texts — tooling, not project artifact |
| `w0-rebuild/lib/**` | 3 | micromamba cmake files — tooling, not project artifact |
| `tool-results/*` | 5 | Agent-session tool-output cache (cached reads of schema SQL already present in reference artifacts) — not a project artifact |

## B. Excluded untracked / ignored paths (never part of project state)

| Path | Reason |
|---|---|
| `node_modules/**` | Dependency cache — exactly restorable via `pnpm install` from committed `pnpm-lock.yaml` (user rule §4) |
| `skills/**` | Platform skills (git-ignored) — not project artifacts |
| `.git/` | VCS internals; contains the tracked root `.env` in history (no credential, but hygiene risk) — commit/tag/log preserved in `GIT_STATE.txt` instead |
| `upload/` | Empty user-upload directory |
| `download/project-artifact-export/**` + `Karen_Home_Project_Artifacts_CURRENT_v1.zip` | The export output itself (prevented from self-inclusion) |

## C. Deliberately RETAINED (not excluded) — judgment calls documented

| Item | Reason kept |
|---|---|
| `w0-work/backend/apps/**/dist/**` (138 files) | Committed build output — part of exact HEAD state; rebuildable via `pnpm build` |
| root `.env` | Reviewed: contains only a non-secret `DATABASE_URL` file pointer |
| `w0-work/backend/.env.example` | The designated template file (placeholders only) — required by user rule §12 |
| `w0-rebuild/downloads.zip` + `w0-rebuild/page_or_zip.bin` | Provenance evidence of the reference-bundle download session |
| Both reference-bundle copies (`downloads.zip` SHA `af3a60e5…`, `bundle/Karen_Home_Reference_Artifacts_v1.zip` SHA `9c43fec7…`) | All versions kept per user rule §3 |
