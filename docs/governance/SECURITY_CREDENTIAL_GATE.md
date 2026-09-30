# Security Credential Gate — Rotation Status

Status: **ROTATION IN PROGRESS — EXTERNALLY BLOCKED (owner actions pending)** · Interim credential ACTIVE for checkpoint pushes only · `0040 = NOT STARTED` until gate green (`NO SECURITY ROTATION = NO 0040`).
Directive chain: classic PAT (over-privileged, chat-transit) ⇒ NOT acceptable as final credential ⇒ mandatory rotation to fine-grained minimum-scope PAT stored ONLY in the Z.ai persistent Secret Store.

Per governance directive, this document records **no credential values, no fingerprints, and no reconstruction-enabling metadata**. Presence-only and result-only evidence.

## 1) Current runtime state (2026-09-30, rotation session)

| Check | Result |
|---|---|
| `GITHUB_TOKEN` env (Secret Store binding) | **UNAVAILABLE** — binding not yet present in this runtime |
| Fine-grained PAT available anywhere | **NO** |
| `.git/credentials/github_token` | EXISTS — format **classic** (INTERIM ONLY, kept per A3 ordering: removal happens AFTER new credential is proven) |
| Credential helper | env-preferred / protected-file fallback (path-only config) — will automatically prefer the bound Secret Store token once it appears |
| Interim classic dry-run push | SUCCESS — explicitly labeled **INTERIM, NOT the permanent credential** |

## 2) Due diligence — why the rotation is externally blocked

| Capability | Probe | Verdict |
|---|---|---|
| Create fine-grained PAT via API | `POST /user/fine_grained_tokens` → **404** | GitHub provides NO self-service API for fine-grained PAT creation (UI-only) |
| Z.ai Secret Store write access from runtime | SDK + `z-ai` CLI sweep | No secrets subcommand / API — the Secret Store is owner-side project settings; binding injects `GITHUB_TOKEN` into sandbox runtimes |
| Classic PAT self-revoke via API | Not possible for PATs | Owner-side action |

## 3) Required OWNER actions (exact, per directive A1–A3)

1. **A1 — Create fine-grained PAT** (GitHub → Settings → Developer settings → Fine-grained tokens):
   ```text
   Repository access = ONLY adamakedamemide-cmyk/KarenHome
   Permissions       = Contents: Read and Write (+ Metadata: read, auto)
   MUST NOT include  = workflow / administration / delete_repo / enterprise / org hooks / any other scope
   ```
2. **A2 — Bind in Z.ai persistent Secret Store**: project settings → Secrets → name `GITHUB_TOKEN`, value = new fine-grained token, bound to this project's runtime. NEVER via chat, `.git/`, `.env`, source code, repository, reports, artifacts, PUSH_LEDGER.
3. **Revoke the classic PAT** (same Developer settings page) — external action; runtime cannot perform it. It must be registered as done by owner; classic must not remain the project's permanent credential.

## 4) Runtime execution immediately after binding (next session, in order)

1. `GITHUB_TOKEN=AVAILABLE` presence check + format check (expect `github_pat_…`, fine-grained).
2. API permission proof (read-only): repo `permissions.push = true`, no legacy scopes header.
3. `git fetch origin` → `rev-parse HEAD` vs `origin/main` → `git push --dry-run origin main`.
4. **A3 removal**: delete `.git/credentials/github_token` + credentials dir; helper becomes env-only (Secret Store-bound); verify NO embedded credential in remote URL.
5. Full re-verification + secret scan (0 hits) — acceptance:
   ```text
   GITHUB_TOKEN = AVAILABLE        Embedded Token = ABSENT
   Old .git token file = ABSENT    Secret Scan = CLEAN
   LOCAL HEAD == origin/main       DRY-RUN = SUCCESS
   ```
6. Only then: Design Review (B) → 0040 (C/D) → tests (E) per directive. Until then `0040 = NOT STARTED`.

## 5) Interim state register (honest, temporary)

- The classic PAT remains the **interim push capability** for governance checkpoint pushes ONLY (ledger/documentation), explicitly registered as **NOT the permanent credential**, to be revoked by owner and removed from the environment after the fine-grained credential is proven. This is the only state that satisfies both `NO PUSH = NO COMPLETED ACTION` and the A3 ordering (remove old only after new is proven).
