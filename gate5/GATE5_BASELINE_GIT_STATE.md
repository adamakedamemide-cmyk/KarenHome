# GATE5_BASELINE_GIT_STATE — Phase A Snapshot

Captured at Gate 5 start (2026-09-30, Asia/Tehran session).

## Repository

| Field | Value |
|---|---|
| Origin URL | `https://github.com/adamakedamemide-cmyk/KarenHome.git` |
| Branch | `main` |
| HEAD | `64378178ae861e9a80325804492e9c16253f8533` |
| HEAD subject | `GATE4.1 Phase T: deliverables, FILE_MANIFEST, SHA256SUMS, bundle Karen_Home_Artifacts_Gate4_1_R1.zip` |
| HEAD commit date (UTC) | `2026-09-29 16:28:14 +0000` |
| Tags pointing at HEAD | `gate4-1-final` |
| Tags in repo | `gate3-db-final`, `gate4-final`, `gate4-1-final` |
| `origin/main` (ls-remote) | `64378178ae861e9a80325804492e9c16253f8533` — **in sync with local HEAD** |
| Working tree | clean before Gate 5 files (only untracked `gate5/` created by Phase A itself) |
| Stale-tracking note | local `origin/main` ref was stale (`e27a546`) at session start; `git fetch origin` refreshed it to `6437817`; `git ls-remote origin main` was used as ground truth. No history divergence existed. |

## Commit Chain (authoritative main)

```text
6437817 GATE4.1 Phase T: deliverables, FILE_MANIFEST, SHA256SUMS, bundle Karen_Home_Artifacts_Gate4_1_R1.zip
d5d292d GATE4.1 Phases E/G/H/L/Q: real fixes + governance test suite (4/4) + final full re-verification
6a7c968 GATE4.1 Phase C correction: C5 chain-step formula fixed — all 8 consistency checks PASS
3827abb GATE4.1 Phase B+C: file-by-file audit (1023 files, MD+CSV) + artifact consistency checks — PASS
9665ed8 GATE4.1 Phase D: full independent re-verification — ALL GREEN, evidence logs committed
229069d GATE4.1: add live backend/ as authoritative source + authoritative README + gitignores + secret-scan tooling
4b51e98 GATE4.1 Phase A: repository recovery & full inventory evidence
e27a546 PROJECT ARTIFACT EXPORT — Karen Home CURRENT v1 (self-contained audit snapshot)
```

## Git Red Lines (standing, unchanged)

- No force push. No history rewrite. No `reset --hard` against user changes.
- No secrets / real `.env` in commits. Secret scan before every push.
- Every action ends with: `git status` → `git diff` → `git add -A` → `git commit` → `git push origin main` → report SHA.
- If no changes: "No repository changes; nothing to push."

## Baseline Database State (for Phase U / Phase R isolation)

Pre-existing databases on local PostgreSQL 16.10 (carried over from earlier
gates; Gate 5 will NOT re-use them for evidence): `karen_ere`, `karen_g3_base`,
`karen_g3_fresh`, `karen_g3_scratch`, `karen_g4`, `karen_g4_fresh`,
`karen_g41_fresh`, `karen_g41_final`. Gate 5 creates its own `karen_g5_*`
databases only.
