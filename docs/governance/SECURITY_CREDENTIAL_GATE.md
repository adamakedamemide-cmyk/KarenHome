# Security Credential Gate — Rotation Status

Status: **GATE = GREEN** (2026-09-30) — write credential ACTIVE, chain verified, legacy material ABSENT.
Directive chain: prior credential transited chat once ⇒ `COMPROMISED / DO NOT RETAIN` ⇒ full rotation ordered ⇒ sandbox rebuilt between sessions (old fallback lost with it) ⇒ new credential provisioned and gate chain re-executed.

Per governance directive, this document records **no credential values, no fingerprints, and no reconstruction-enabling metadata**. Presence-only and result-only evidence.

## 1) Gate verification evidence (results only)

| Check (directive §1) | Result |
|---|---|
| `test -n "$GITHUB_TOKEN"` | `GITHUB_TOKEN=AVAILABLE` |
| `git fetch origin` | exit 0 |
| `git rev-parse HEAD` | `c60937be86f99109e9c46f2760ce31b72978f1e2` |
| `git rev-parse origin/main` | `c60937be86f99109e9c46f2760ce31b72978f1e2` |
| LOCAL HEAD == origin/main | **PROVEN** |
| `git push --dry-run origin main` | **SUCCESS** — `Everything up-to-date`, exit 0 |
| API identity (read-only) | login `adamakedamemide-cmyk` (repository owner), type `User` |

## 2) Provisioning mechanism (durable, secret-blind)

- Credential stored in ONE location: protected file **inside the repository `.git/` directory** (`mode 600`, directory `700`). Git can never track, commit, or push `.git/` internals; the platform workspace auto-repo tracks `karenhome` as a gitlink, so the file is invisible to it as well. Chosen after `/home/z/.secrets` (previous location, outside project) was destroyed by the sandbox rebuild while the repo `.git` survived intact.
- Repo-local `credential.helper` = secure helper script (also inside `.git/`, mode 700): **env `GITHUB_TOKEN` preferred**, protected-file fallback. Config stores the helper **path only** — no plaintext token in `.git/config` (per prohibition list).
- Recommendation (governance target state): bind `GITHUB_TOKEN` in the **Z.ai persistent Secret Store** to this project's runtime. The helper already prefers env, so binding is a drop-in upgrade; the protected file then serves purely as rebuild-recovery bootstrap.

## 3) Minimum-permission finding — governance deviation REGISTERED

The provisioned credential is a **classic PAT with scopes far beyond the required minimum** (observed via read-only API scope header — scope names only, recorded as non-sensitive audit finding):

```text
admin:enterprise, admin:gpg_key, admin:org_hook, admin:public_key,
admin:ssh_signing_key, audit_log, codespace, copilot, delete:packages,
delete_repo, gist, project, repo, workflow, write:network_configurations,
write:packages
```

Required minimum (directive): **fine-grained PAT — repository `adamakedamemide-cmyk/KarenHome` only, Permissions = Contents: Read+Write** (Metadata auto-granted), nothing more.

Additionally, the credential **transited chat once** at provisioning (owner-pasted).

⇒ **ROTATION RE-FLAGGED (priority)**: replace with a fine-grained minimum-scope token at the next opportunity. The env-preferred helper makes replacement a zero-downtime drop-in (store new token, re-bind, delete old file, re-verify chain). Until replacement, the current token must be treated as a high-value asset: it is never printed, never written to any repo file, report, or ledger (verified by scan, §4).

Old credential status: **absent from this environment entirely** (file destroyed by rebuild; no copy existed anywhere else per audit). Owner-side revocation on GitHub cannot be verified from here (no value retained to test against) — owner should confirm revocation in GitHub → Settings → Developer settings.

## 4) Legacy credential audit + secret scan (directive §2)

| Check | Result |
|---|---|
| Old filesystem fallback `/home/z/.secrets/github_token` | **ABSENT** (directory empty) |
| `OLD TOKEN = NOT AVAILABLE` | ✓ — no copy exists anywhere in the runtime |
| Embedded token in remote URL | **ABSENT** — `https://github.com/adamakedamemide-cmyk/KarenHome.git` (clean) |
| `.git-credentials` | **ABSENT** |
| `.netrc` | **ABSENT** |
| `credential.helper` config | path-only reference to in-`.git` helper (no token material) |
| Token-pattern scan (ghp_/github_pat_/gho_/ghs_/ghr_) over working tree | **0 hits** |
| Live-value scan of entire worktree (excluding `.git/`) | **0 hits** |
| `.env` files in backend runtime | none in repo root of backend (only historical `.env.example` templates in reference archives) |

## 5) Authorization to proceed

- **SECURITY GATE = GREEN** per directive criteria (§1 all green).
- Phase E / **Audit 1** (Schema Discovery) may start: repository inspection only — **NO migration, NO application code, NO frontend** until the audit document is committed, pushed, and proven (`LOCAL HEAD == origin/main`).
- Design verdict + canonical-entity mapping to be produced in `docs/governance/gate5_1/PHASE_E_VALUATION_SCHEMA_AUDIT.md`.
