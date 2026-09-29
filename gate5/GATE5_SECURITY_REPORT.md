# GATE 5 — Security Report (Phases I, T, V + cross-cutting)

## 1. SAST / Secret Scan / Filesystem Scan (G5R-SAST-002)

17 pattern-based scan groups over all source (see `GATE5_SAST_REPORT.md` + raw `gate5/evidence/G5R-SAST-002.txt`):

- **0 secret violations** (private keys, GitHub tokens, AWS keys, raw JWTs, DB passwords, provider credentials).
- **0 BLOCKER/HIGH/MEDIUM** code findings.
- 2 assessable findings, both classified with rationale: TOTP HMAC-SHA1 = RFC 4226-mandated (**FALSE_POSITIVE**); CI postgres placeholder = ephemeral service container (**ACCEPTED_RISK**, ADR-G5-03).
- Tooling honesty: semgrep/CodeQL/Syft/Trivy unavailable in this environment; scans are deterministic pattern suites — the gap is registered, not hidden.

## 2. New security fixes delivered by Gate 5

| ID | Fix | Severity (pre-fix) |
|---|---|---|
| G5-F-03 | **OAuth state was generated but never verified** → login CSRF. Now: HMAC-signed, 10-min expiry, mandatory at callback, timing-safe compare, rejected before any provider call; 5 regression tests | HIGH |
| G5-F-01/02/04 | OpenSearch: strict index mapping + idempotent bootstrap; push failures now retryable (previously swallowed = silent index drift); delete propagates (previously stale docs stayed searchable) | HIGH ×2 / MEDIUM |
| G5-F-06 | Unbounded provider fetches (Twilio, Google/Facebook token+profile) → 10s bounded | LOW |
| G5-E | ClamAV INSTREAM adapter with **fail-closed** policy on daemon error (job retries; never guesses a verdict) | defense-in-depth |

## 3. Production configuration (Phase T — GATE5_SECURITY_CONFIG_PHASE_T.md)

Verified by code inspection **and a real production-mode boot**: fail-fast on missing `MFA_ENCRYPTION_KEY` (≥43 chars) observed live; no dev MFA fallback; CORS `origin:false`; Swagger off in production by default; typed bounds-checked config; no wildcard origins/debug flags (scan-verified). Registered forward items: provider-fallback fail-fast in production; staging/prod deploy manifests.

## 4. Red-team view (Phase evidence, suites re-run on fresh DB — `g4-e2e-redteam` E0–E8 all PASS)

Rate-limit bucketing (auth bucket opens after 10 hits) · full auth flow with refresh rotation + replay detection · **IDOR**: stranger cannot publish/pivot another owner's listing · commission permission ladder + direct-grant path · search injection neutralized (parameterized FTS) · oversized/unsupported upload rejection at intake · subscription gate (no subscription → no entitlements) · org isolation + click anti-double-billing (g41 T2/T4) · retroactive commission immutability (g41 T3). New attack surface covered this gate: OAuth callback CSRF (fixed + tested), search-index poisoning via failed pushes (made retryable + DLQ), stale search results after delete (fixed), malicious uploads vs real AV wire protocol (contract-tested, fail-closed).

## 5. Phase V — Token Security Audit (honest registration)

| Item | Finding |
|---|---|
| Real GitHub token exposed in chat plaintext | **YES** — user-provided PAT (`ghp_…V1CW…`) used for repository delivery since the Artifact-Push task |
| Token status at Gate 5 verification time | **ACTIVE** (checked via authenticated GitHub API `GET /user` → `adamakedamemide-cmyk`) |
| Token in repository/files | **NO** — repo-wide pattern scan + pre-push secret scan: 0 violations; pushes used the token in transient URLs only, never committed |
| Required user action (HUMAN-DEPENDENT, urgent) | **Revoke/rotate the PAT now** (GitHub → Settings → Developer settings → Tokens). After Gate 5 finalization the token is no longer needed by the agent. This is a **live exposed credential** — `NO_REAL_SECRET_FOUND` does **not** apply |
| Compensating state | Repo is public; token scope = repo access only; no secrets exist in the repo to pivot to (secret scan clean); bench JWT/MFA keys are session-local, never committed |
