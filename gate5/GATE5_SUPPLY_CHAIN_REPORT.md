# GATE 5 — Phase H: Supply Chain Report

Run: **G5R-SC-001** (pnpm audit ×3 across the gate) · SBOM: `gate5/evidence/SBOM.cdx.json` (CycloneDX 1.5, 790 components, generated from the resolved `pnpm-lock.yaml` graph).

## 1. Baseline findings (start of Gate 5)

`pnpm audit` (full dependency graph): **18 vulnerabilities — 6 high / 11 moderate / 1 low** across 3 packages:

| Package | Installed | Findings | Notable advisories |
|---|---|---|---|
| nodemailer | 7.0.10 | 12 (5 high, 6 moderate, 1 low) | GHSA-rcmh-qjqh-p98v, GHSA-p6gq-j5cr-w38f, GHSA-2x7j-588g-ccc2, GHSA-6vj9-mwq6-2f5v (cross-tenant SMTP credential disclosure via TLS servername reuse), GHSA-c7w3-x93f-qmm8 (SMTP command injection) |
| sharp | 0.34.4 | 2 (high) | GHSA-f88m-g3jw-g9cj, GHSA-rgj7-g3m4-5g8c |
| @fastify/static | 8.3.0 | 4 (1 high, 3 moderate) | GHSA-83w8-p2f5-377r, GHSA-pr96-94w5-mx2h, GHSA-8pvw-jcv7-9cmj |

## 2. Remediation — actual upgrades, not labels

| Package | From → To | Breaking-change assessment |
|---|---|---|
| nodemailer | 7.0.10 → **10.0.2** | Major (7→10): API surface used by `SmtpEmailTransport` is `createTransport(url).sendMail({from,to,subject,text})` — stable across majors; typecheck + build clean |
| sharp | 0.34.4 → **0.35.4** (api + worker) | Minor: media pipeline (rotate/webp/resize/raw/metadata) unchanged; **media pipeline probe re-measured after upgrade: 42.6 ms p50, asset `ready`** |
| @fastify/static | 8.3.0 → **10.1.2** | Major (8→10): plugin used with default options for variant serving; boot + routes verified |

**Post-upgrade full re-verification:** `pnpm audit` → **"No known vulnerabilities found" (0)** · build 0 errors · typecheck 0 errors · lint 0 errors · **tests 83/83 PASS**.

## 3. Finding ledger (mandated fields)

All 18 findings resolved by upgrade → final state per finding: **FIXED (fix version shipped)**. No finding remains labeled `non-blocking`; classifications used during the process: none ACCEPTED_RISK, none FALSE_POSITIVE, none BLOCKER. Runtime exploitability before the fix (honest): nodemailer findings required a configured live SMTP path (currently UNVERIFIED_EXTERNAL — no credentials) → not reachable in this deployment state; sharp/@fastify/static reachable in-process — remediated.

## 4. Supply-chain hardening state

- `pnpm install --frozen-lockfile` in CI (lockfile is the trust anchor).
- SBOM committed and versioned; regenerate on dependency change (script: `scripts/g5_sbom.py` at repo-external tooling path, output committed).
- Registry scope: npm public only; no private feeds; no postinstall risk flagged (audit + review of lockfile scripts not yet automated — registered as forward item in NEXT_GATE).
