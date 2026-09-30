# Security Credential Gate — Rotation Status

Status: **ROTATION VERIFIED-PARTIAL — 2 RED ITEMS OPEN (owner actions)** · Fine-grained credential PROVEN (git read + write path + API) · Classic token file SHREDDED from runtime · Classic token itself STILL VALID on GitHub (revoke pending) · Secret Store binding NOT detected in runtime (credential session-held only) · `0040 = NOT STARTED` · `DESIGN REVIEW = NOT STARTED` · `DEVELOPMENT = NONE` until both RED items close (`NO SECURITY ROTATION = NO 0040`).

Per governance directive, this document records **no credential values, no fingerprints, and no reconstruction-enabling metadata**. Presence-only and result-only evidence.

## 1) Verification matrix (2026-10-01, rotation-verification session)

| # | Check | Result |
|---|---|---|
| 1 | `GITHUB_TOKEN` env at session start (Secret Store binding) | **UNAVAILABLE — binding did not inject into this runtime** (shell env, pid1 environ, shell profiles, z-ai CLI all probed; nothing found) |
| 2 | Credential provisioning | Owner-provided via chat (4th transit — RE-FLAGGED) → loaded into **session env ONLY** (memory; never written to disk, repo, logs, or ledger) |
| 3 | Format | `github_pat_` prefix, length 93 → **FINE-GRAINED** |
| 4 | API identity | `GET /user` = 200, login `adamakedamemide-cmyk` (owner) |
| 5 | Repository scope | `GET /user/repos` → **exactly 1 accessible repo: adamakedamemide-cmyk/KarenHome** |
| 6 | Contents Read | `git fetch origin` exit 0 — env-only (classic token quarantined during the test) |
| 7 | Contents Write | `git push --dry-run origin main` SUCCESS (env-only) + real checkpoint push (ledger round 11) |
| 8 | Permissions object | pull/push/maintain/admin all true — **ADMIN flag NOT over-claimed**: may be a token grant or an owner-role echo; owner must confirm the PAT permission list shows ONLY Contents R+W + Metadata R |
| 9 | Legacy classic token revocation | **RED — API probe with the classic token returned 200 (STILL VALID)** |
| 10 | `.git/credentials/github_token` | **ABSENT — shredded** (file + directory), executed AFTER the new credential was proven (A3 ordering honored) |
| 11 | Credential helper | **env-ONLY** (file fallback removed) — picks up the Secret Store binding automatically once owner binds it |
| 12 | Remote URL / `.git/config` | Clean — no embedded token; config carries the helper PATH only |
| 13 | Secret scan | **CLEAN** — HEAD tree 0 token-pattern hits; history pickaxe hits = benign literals only (`scripts-ci/secret_scan.sh` regexes, gate-doc narratives, one truncated historical fingerprint); remote URL clean |
| 14 | LOCAL == REMOTE | `6c80546…` == `6c80546…` **TRUE** (gate-open baseline, pre-checkpoint) |

### Runtime mechanics discovered (register)

- Environment variables DO NOT persist across tool invocations in this runtime — every gated git/API operation re-imports the credential within the same command shell. All capability evidence above was collected env-only per command.
- The session env dies with the session → the credential is **not persistent** in the runtime. The Secret Store binding (A2) remains MANDATORY for continuity; until it exists, every future session depends on owner-side provisioning.
- Attribution note: the first fetch/dry-run of the session was NOT attributable to the new token (helper file-fallback could have served the still-valid classic token). Evidence was re-collected with the classic file quarantined, env-only — results above are attributable to the fine-grained token alone.

## 2) Owner actions to CLOSE the gate (exact)

1. **Revoke the classic PAT** — GitHub → Settings → Developer settings → Tokens (classic): delete the legacy token. Runtime evidence shows it still authenticates (API 200). No replacement needed; it must simply stop existing.
2. **Bind `GITHUB_TOKEN` in the Z.ai persistent Secret Store** — binding the current fine-grained PAT is acceptable (already KarenHome-only); a FRESH fine-grained PAT bound directly (no chat transit) is preferred since the current one transited chat. Spec unchanged: ONLY KarenHome · Contents R+W · Metadata R · nothing else.

Until both close: `SECURITY ROTATION = RED · 0040 = NOT STARTED · DESIGN REVIEW = NOT STARTED · DEVELOPMENT = NONE`.

## 3) Acceptance chain for the NEXT session (binding fixed)

1. `GITHUB_TOKEN=AVAILABLE` at session start WITHOUT any chat provisioning (binding proof).
2. Format check (`github_pat_`), API identity, scope probe (exactly 1 repo).
3. `git fetch origin` → LOCAL==REMOTE → `git push --dry-run origin main` SUCCESS.
4. Classic-token probe → expect **401** (revoked) — closes RED-1.
5. Secret scan CLEAN · `.git` residual ABSENT · helper env-only confirmed.
6. Ledger round with the all-GREEN matrix → gate GREEN → then Design Review (B) → 0040 (C/D) → tests (E).
