# Security Credential Gate — Rotation Status

Status: **SECURITY GATE = PAUSED** (owner directive, 2026-10-01) · **REASON**: Agent Runtime has no supported/working persistent GitHub credential injection — three independent runtimes proved `GITHUB_TOKEN = UNAVAILABLE`; the Secret Store binding does not reach agent shells. · **NEXT**: move Git execution to a persistent supported environment OR obtain verified platform-level secret injection. · Until then: no new probe sessions, no chat credentials, no predecessor tokens, no fallback credentials, no token storage in `.git`/`.env`/workspace. · `DESIGN REVIEW = NOT STARTED` · `0040 = NOT STARTED` · `DEVELOPMENT = NONE`.
Directive context (owner, 2026-10-01): no new token from chat, no secret value requests — ONLY the persistent Z.ai Secret Store (`GITHUB_TOKEN`) may supply the runtime. Chat-transit tokens are NOT acceptable as credentials.

No credential values, no fingerprints, no reconstruction-enabling metadata in this document. Presence-only and result-only evidence.

## 0) Preservation register (owner-directed, 2026-10-01, read-only — six checks)

| # | Directive | Result |
|---|---|---|
| 1 | Preserve current local repository | **PASS** — HEAD `00cadd0…` == remote main (anonymous ls-remote, no credential) |
| 2 | Preserve uncommitted Round-12 governance documents | **PASS** — exactly 2 modified files intact in worktree |
| 3 | Ensure no credential file exists in the repository | **PASS** — `.git/credentials` ABSENT; helper = env-only script, stores no value |
| 4 | Ensure remote URL contains no token | **PASS** — clean https URL, no userinfo |
| 5 | Ensure worktree contains no unintended content changes | **PASS** — 2 dirty entries = exactly the Round-12 docs; 0 other deltas; token-pattern scans CLEAN (HEAD + modified docs) |
| 6 | Do not discard Round-12 governance changes | **PASS** — carried forward untouched to the next trusted environment |

## 0-b) Capability Discovery — supported persistent Git-write channel (owner-directed, 2026-10-01, read-only — FINAL)

| Channel | Result |
|---|---|
| GitHub CLI (`gh`) | ABSENT — binary not installed; no `~/.config/gh`; no auth status possible |
| SSH (`ssh` / `ssh-agent` / `ssh-add` / `~/.ssh`) | ALL ABSENT |
| Git credential config (system / global / local) | Only the repo-local env-only helper (path-only value); no system/global credential config; no `insteadOf` URL rewriting |
| Platform env integration (40 env names, presence-only) | No GitHub/token/secret/auth/integration names — runtime vars only (`CLAWHUB_*`, `SIGMA_APP_NAME`) |
| Platform-managed GitHub App / remote Git credential dirs | None (`~/.config`, `~/.z-ai`, `~/.zai`, `~/.zcode` all ABSENT) |
| `z-ai` CLI capabilities | AI-only (chat / vision / tts / asr / image / image-edit / image-search / video / async-result / function) — no git/github/auth/secrets subcommands |
| Persistent remote workspace / dev environment | NONE — rootfs is an ephemeral overlay (`c-…-rootfs`); project files persist via platform snapshot, but no Git write authentication comes with it |
| Project `.env` | Exists (1 line, project-local); no `GITHUB_TOKEN` reference; contents never read |

**Verdict (Case B — FINAL for this environment):**

```text
GIT-WRITE CHANNEL = UNAVAILABLE
SECURITY GATE     = PAUSED
DEVELOPMENT       = FROZEN
ROUND 12          = PRESERVED
PHASE E           = NOT STARTED
NEXT ACTION       = OWNER MUST PROVIDE A SUPPORTED PERSISTENT GIT-WRITE CHANNEL
```

No further probing will be performed (owner directive). NO CHAT TOKEN USED = TRUE · NO SECRET WRITTEN TO REPO = TRUE.

## 1) Verification state (2026-10-01, third rotation-verification session — re-confirmed)

| # | Check | Result |
|---|---|---|
| 1 | `GITHUB_TOKEN` env at session start | **UNAVAILABLE — Secret Store binding did not inject into this runtime (re-confirmed in a fresh 3rd-session runtime; fresh-shell re-test identical; token-like env names: 0)** |
| 2 | Injection sweep (exhaustive) | env name-scan (token/github/secret/cred patterns): 0 · `/proc/self/environ`: 0 · `/proc/1/environ`: unreadable + 0 · secrets dirs (`~/.secrets`, `/run/secrets`, `/var/run/secrets`, project `.zai-secrets`): ALL ABSENT · shell profiles + project `.env*`: no references · z-ai CLI: absent |
| 3 | Predecessor fine-grained specimen revocation probe (§4) | **200 — STILL VALID** (the only fine-grained value ever observed is still able to authenticate the API) |
| 4 | Legacy classic PAT probe | **IMPOSSIBLE BY DESIGN** — value shredded from runtime in the prior session (A3); no copy exists; revocation is owner-attested only and cannot be re-verified from here |
| 5 | Git operations | NOT EXECUTED with any credential this session — no credential exists in runtime; chat-provided values NOT used (directive) |
| 6 | `LOCAL HEAD == origin/main` | TRUE at `00cadd0` (inherited from prior session's proven state; last session's real push also serves as the last successful remote contact) |
| 7 | Working tree | 1114 sandbox mode-only flips (0 content delta) restored to index modes → clean except this doc + ledger update (left uncommitted — push impossible without credential) |

## 2) Why RED

1. **Binding delivery failed**: the runtime must receive `GITHUB_TOKEN` directly from the Secret Store. It did not — in this AND the previous session. Without it, `credential source = persistent Secret Store` is unverifiable and every session would depend on chat provisioning, which the owner has now forbidden.
2. **Predecessor still valid (200)**: either the observed fine-grained value IS the token bound in the Secret Store (in which case the binding simply is not reaching runtimes and needs re-saving/restart), or it is an unrevoked leftover (in which case it must be revoked). Both readings keep the gate RED until the store delivery is proven.

## 3) Owner actions (exact)

1. **Fix the Secret Store binding**: project settings → Secrets → name `GITHUB_TOKEN` → save → **restart/recreate the session** so the runtime is recreated with the injected env. The first check of the next session (`test -n "$GITHUB_TOKEN"`) is the binding proof — nothing else counts.
2. **Token hygiene**: exactly ONE fine-grained PAT should remain valid — the one bound in the store (KarenHome only · Contents R+W · Metadata R · nothing else). Every OTHER token (classic PATs, any other fine-grained PATs) must be revoked in GitHub → Settings → Developer settings.
3. Optional confirmation: the PAT UI permission list must show no Administration / Workflow / Actions / Delete / Org scopes.

## 4) Acceptance chain for the NEXT session (unchanged, in order)

1. `GITHUB_TOKEN=AVAILABLE` WITHOUT any chat provisioning → `SOURCE = Z.ai persistent Secret Store`.
2. Format `github_pat_` · API identity = owner · scope probe = exactly 1 repo · permissions object: pull=true, push=true, **admin=false**, maintain=false.
3. `git fetch origin` → LOCAL==REMOTE → `git push --dry-run origin main` SUCCESS.
4. Predecessor probes: every previously observed value (where a copy still exists) must return **401**; the current store token returns 200.
5. Residual checks: `.git/credentials` ABSENT · helper env-only · remote URL clean · secret scan CLEAN.
6. Commit + push the pending round-12 governance updates as the first checkpoint, then continue: Design Review (B) → 0040 (C/D) → tests (E). Until then: `0040 = NOT STARTED`.
