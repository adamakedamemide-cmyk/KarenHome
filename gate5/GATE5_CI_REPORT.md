# GATE 5 — Phase S: CI/CD Verification Report

Workflow: `.github/workflows/ci.yml` (committed at Gate 4.1). Verification method: **GitHub Actions API on the real repository** — runs actually executed, logs actually downloaded and inspected (not assumed).

## 1. What the workflow executes

Install (`--frozen-lockfile`) → Secret scan (pre-verify gate) → Lint → Typecheck → Build → Schema validation (full migration chain on fresh PostGIS 16 service container) → SQL verification suites (invariants + G3 + G4) → Tests (unit + integration + red-team + governance) → OpenAPI drift check → Dependency audit. PostgreSQL service: `postgis/postgis:16-3.4`.

## 2. Run history during Gate 5 (real runs)

| HEAD | Result | Root cause (from downloaded logs) | Fix |
|---|---|---|---|
| d4629d8 … 54f0072 (5 runs) | ❌ failure | `actions/setup-node@v4` with `cache: pnpm` failed before any step: *"Dependencies lock file is not found … Supported file patterns: pnpm-lock.yaml"* — lockfile lives in `backend/`, not repo root | **GATE5-S fix 1**: `cache-dependency-path: backend/pnpm-lock.yaml` (commit `222ea2c`) |
| 222ea2c | ❌ failure | Reached Typecheck; `@platform/db`/`@platform/contracts` unresolved — typecheck ran **before** Build, and workspace types resolve via built `dist` declarations | **GATE5-S fix 2**: step order Build → Lint → Typecheck (commit `ae18e16`) |
| ae18e16 | see live status below | — | — |

Registered honesty: Gate 4.1 shipped the workflow **without a single real Actions execution** (its report labelled runner execution UNVERIFIED). Gate 5 is the first gate that made CI actually run — and its first two real executions failed. Both failures were infrastructure-order defects, both fixed with root-cause commits; each fix is attributable in git history.

## 3. Status at report time

Final status recorded in `GATE5_EXECUTION_REPORT.md` (`CI = PASS|FAIL|UNVERIFIED`) based on the latest run for the Gate 5 final HEAD, checked via the Actions API immediately before the final response. If the run is still green-pending at finalization time, CI is reported as `UNVERIFIED` with the run link — never assumed green.
