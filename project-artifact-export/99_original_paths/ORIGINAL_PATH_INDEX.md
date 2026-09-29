# ORIGINAL_PATH_INDEX.md — Karen Home artifact export (2026-09-29)

`workspace/` is a **byte-exact, original-path mirror** of the project state at export time. Every file's original path equals its path under `workspace/`. This design was chosen over duplicating files into category folders so that each file exists exactly once (one SHA-256, one manifest row — cleanest for independent audit; the user's rule §5 explicitly allows original-path preservation when it is more important for audit).

Original roots mirrored:

| Original root | Files | Content |
|---|---|---|
| `download/` | 70 | Gate reports, evidence, schema snapshots, manifests, prior Gate 4 archive |
| `w0-work/` | 319 | Backend monorepo (API + worker + packages + database chain) incl. committed `dist/` |
| `w0-rebuild/artifacts/` | 360 | Reference artifacts extraction (Gate 0-R input) |
| `w0-rebuild/bundle/` | 2 | Master Prompt + reference bundle copy |
| `w0-rebuild/` (root files) | 2 | `downloads.zip`, `page_or_zip.bin` (download provenance) |
| root files | 3 | `worklog.md`, `.gitignore`, `.env` |
| **Total** | **756** | plus 11 generated governance docs = 767 files in bundle |

Per-file mapping (original path → export path → SHA-256): see `00_manifest/PROJECT_ARTIFACT_EXPORT_MANIFEST.md` / `.csv`.
