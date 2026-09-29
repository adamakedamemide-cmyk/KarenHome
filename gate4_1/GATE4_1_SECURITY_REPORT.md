# GATE4_1_SECURITY_REPORT — Phases L + Q

Generated: 2026-09-29 · Evidence: `gate4_1/evidence/` (fresh runs on karen_g41_final), red-team mapping below, `Q_pnpm_audit.log`.

## Phase L — IAM security (all re-executed against fresh DB)

| Flow | Result | Evidence |
|---|---|---|
| Register → email verify → login | PASS (hardened: verification required, anti-enumeration) | E2 in `D_jest_final.log`; bench user flow in `D_benchmark.log` |
| Refresh rotation | PASS (pre-generated next token, single-winner) | E2 + g4-concurrency C4 |
| **Refresh reuse** | PASS — replay of revoked token → 401 + ALL sessions revoked + audit row | E2 regression + C4 `reuse_detected=1` |
| Refresh race | PASS — exactly one winner under parallel rotation | C4 5/5 |
| Password reset / change | PASS (consume-once, revokes all sessions, anti-enumeration) | hardening suite paths (J-series) |
| MFA (TOTP + AES-256-GCM) | PASS + **hardened in 4.1**: hard-coded dev key removed; production fails fast without `MFA_ENCRYPTION_KEY`; non-production = ephemeral per-process key | code diff commit d5d292d; g4-mfa-antibot 60-suite green |
| OAuth abstraction | PASS — real exchange code, typed 503 when unconfigured | J2/J3 regressions |
| Logout / logout-all | PASS (audit `iam.logout_all`) | hardening controller + repo revokeAllSessions |
| Org scope / personal scope | PASS — ORG_SCOPE_REQUIRED enforcement + effective_permissions (org roles + personal grants + DIRECT) | 0030 engine, guard paths, **T1 (new)** |
| Owner/Agent/Marketer/Admin authorization | PASS — RESOURCE_NOT_OWNED / FORBIDDEN / permission-engine paths | E4/E5 + **T1/T2 (new)** |
| **IDOR** | PASS — stranger cannot publish/manage another user's listing; foreign-org advertising now also blocked (4.1) | E4 + **T2 RESOURCE_NOT_OWNED (new)** |

## Phase Q — Security controls

| Control | Result | Evidence/Notes |
|---|---|---|
| Secret scanning | PASS — 0 violations on every push of Gate 4.1 | `scripts-ci/secret_scan.sh` (12 pattern classes + real-.env ban); scan log lines in commit messages; `real .env` removed from repo mirror (documented deviation vs frozen ZIP) |
| Dependency audit | **FINDINGS REGISTERED** — `pnpm audit --prod`: 18 vulns (1 low / 11 moderate / 6 high), all transitive | `Q_pnpm_audit.log`; CI reports non-blocking until remediation (see OPEN_ISSUES #1); lockfile pinned; fastify override pinned 5.12.5 |
| SAST | PARTIAL — typed linting (typescript-eslint strict, 0 problems) + no-eval/no-require rules; full SAST (CodeQL/semgrep) deferred to CI maturation | lint evidence `D_lint.log`; OPEN_ISSUES #4 |
| SQL injection | PASS — parameterized queries only; search injection neutralized | E6 regression |
| XSS / upload abuse | PASS — MIME magic-byte allow-list, size caps, EICAR/script-probe scan → quarantine; EXIF stripped; WebP re-encode | E7 + media pipeline (media report) |
| SSRF | PARTIAL — outbound calls limited to configured providers (OAuth/SMTP/OpenSearch); no generic URL fetcher exists | code inventory; note registered |
| Rate limiting | PASS — auth bucket 10/min verified live | E0 |
| Webhook security | N/A — no webhook ingestion endpoints exist (unchanged from Gate 4) | RED_TEAM mapping #12 |
| Token replay | PASS — refresh reuse ⇒ global revocation | E2 |
| Privilege escalation | PASS — permission engine + platform.admin guard; personal-scope grants auditable | E5 + T1 |
| **New hardening shipped in 4.1** | advertising admin permission gate + org isolation (0035 + guards + service checks); click billing dedup index (0036); MFA key fail-fast; commission reversal amount derived server-side | migrations 0035/0036, commit d5d292d, tests T1-T4 |

## Verdict
Security = **PASS with registered findings** (dependency audit remediation + SAST/SSRF depth scheduled in OPEN_ISSUES). No critical security or data-integrity defect remains in the implemented surface.
