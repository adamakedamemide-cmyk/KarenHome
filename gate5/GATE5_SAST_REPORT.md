# GATE 5 — Phase I: SAST / Secret Scan / Filesystem Scan Report

Run IDs: **G5R-SAST-002** (corrected) · Raw output: `gate5/evidence/G5R-SAST-002.txt`

## 1. Tooling — honest capability statement

| Domain | Tool used | Status |
|---|---|---|
| Dependency scan | `pnpm audit` (GitHub Advisories DB) + upgrade remediation | ✅ executed (Phase H) |
| SBOM | CycloneDX 1.5 generator over resolved pnpm lockfile (790 components) | ✅ executed (Phase H) |
| Secret scanning | `scripts-ci/secret_scan.sh` (regex group scan, runs pre-push) + Gate 5 pattern suite | ✅ executed |
| SAST | 17 deterministic pattern scans over source (eval/exec/SQL-concat/crypto/secrets/CORS/debug/IaC) | ✅ executed |
| Semgrep / CodeQL / Syft / Grype / Trivy | **NOT AVAILABLE** in this environment — registered as tooling gap, not as a substitute claim | ⚠️ UNAVAILABLE |
| Dockerfile/IaC scan | Pattern-based (no dedicated images in repo — none found to scan beyond compose) | ✅ executed |

## 2. Findings

| Finding ID | File:Line | Severity | Exploitability | Fix | Regression Test | Classification |
|---|---|---|---|---|---|---|
| G5-S-01 | `apps/api/src/common/auth/totp.ts:33` (also test harness mirror) | LOW | None for HMAC-SHA1 used per RFC 4226/6238 — TOTP mandates HMAC-SHA1; HMAC construction remains unbroken | None required (algorithm-mandated); allowlisted with rationale | `g4-mfa-antibot.spec` covers TOTP verification incl. replay window | **FALSE_POSITIVE** (documented) |
| G5-S-02 | `.github/workflows/ci.yml:20` `POSTGRES_PASSWORD: ci-placeholder-password` | LOW | None — ephemeral CI service container, never deployed, no shared infra | Rotate per-run random in a future CI hardening pass (optional) | Not applicable (fixture) | **ACCEPTED_RISK** — ADR-G5-03 |
| G5-S-00 | (process finding) v1 scan script produced false "(no hits)" due to a shell grouping bug | — | — | Scan script rewritten (v2), re-executed; cross-checked manually against known `sha1` usage | The v2 output itself + manual grep verification | **RESOLVED** |

## 3. Clean scan groups (16/17 with zero hits)

eval/new Function · child_process/execSync · SQL string interpolation · hardcoded secrets · innerHTML/document.write · private keys · GitHub tokens (`gh[pousr]_…`) · AWS keys (AKIA…) · raw JWTs in source · credential env defaults · debug:true · CORS wildcard origins · Dockerfile anti-patterns (no Dockerfiles exist) · privileged containers · cleartext external http endpoints.

**Zero secret violations, zero BLOCKER/HIGH/MEDIUM SAST findings.** Per Gate 5 status rules, Phase I does not block PASS.

## 4. Registry of scan scope

Scope: `backend/apps/**`, `backend/packages/**`, `.github/**`, `scripts-ci/**` (source, no `dist/`, no `node_modules/`). Total files scanned in-scope: 161 tracked TS/SQL/YAML source files + workflows. The `gate4_1/`, `w0/`, `project-artifact-export/` historical directories contain copies of previously-audited material and are covered by the same secret groups during the repo-wide pre-push secret scan (`0 violations` per push).
