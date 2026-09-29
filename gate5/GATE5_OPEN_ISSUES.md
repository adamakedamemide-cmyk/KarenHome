# GATE 5 — Open Issues Register

Statuses: OPEN / MITIGATED (with residual) / RESOLVED (evidence link). Severity as of Gate 5 close.

| # | Issue | Severity | Status | Owner / Next step |
|---|---|---|---|---|
| 1 | Exposed, still-ACTIVE GitHub PAT (chat plaintext) | **HIGH (user-side)** | OPEN — HUMAN-DEPENDENT | Owner must revoke/rotate (Settings → Developer settings → PAT). Agent no longer needs it after Gate 5. |
| 2 | S3/Object-storage adapter absent | MEDIUM (deployment prerequisite) | OPEN — ADR-G5-01 | Implement in Gate 6 (SigV4 + presign + failure tests) before any S3-backed deployment. |
| 3 | FCM push adapter absent (Gate 4 comment overstated) | MEDIUM | OPEN — ADR-G5-02 | Implement FCM HTTP v1 before mobile push goes live. |
| 4 | Messaging, CRM, Projects, Valuation, Rental application layers absent | MEDIUM (scope, not integrity) | OPEN — ADR-G5-04 | Server-first implementation in Gate 6+ with mandatory authz/IDOR suites from first commit. |
| 5 | CI executed for the first time in Gate 5; 2 infra-order failures fixed; final run status recorded in EXECUTION_REPORT | HIGH → MITIGATED | see `GATE5_CI_REPORT.md` | Keep main green; add required-checks protection. |
| 6 | 5 prior dependency vulnerabilities classes (nodemailer/sharp/@fastify/static) | HIGH → RESOLVED | RESOLVED — upgrades + `pnpm audit` = 0 (`GATE5_SUPPLY_CHAIN_REPORT.md`) | Lockfile frozen; re-audit on every dependency change. |
| 7 | Console transports activate when provider credentials absent (production sends → logs) | LOW (while channels unverified) | MITIGATED — registered (Phase T) | Add production fail-fast config validation before launch. |
| 8 | No automated/off-site backup schedule; no PITR | MEDIUM | OPEN — drill verified manual path only (`GATE5_DR_REPORT.md`) | Scheduled pg_dump + retention + restore alerting before production. |
| 9 | OpenSearch live cluster credentials/TLS (production-grade cluster) | LOW | OPEN — UNVERIFIED_EXTERNAL | Cloud-cluster hardening when vendor account exists. |
| 10 | ClamAV daemon unavailable in environment | LOW | MITIGATED — contract-verified adapter + fail-closed; signature-v1 active | Stand up clamd in staging; then LOCAL→live verification. |
| 11 | CAPTCHA/anti-bot vendor selection (carried from Gate 4) | LOW | OPEN | Non-blocking; decide at frontend gate. |
| 12 | Valuation: no algorithm/dataset/model | INFO (honest non-claim) | OPEN | Do not surface any valuation until validated dataset + model exist. |
