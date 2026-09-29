# GATE4_1_NEXT_GATE — Recommended Next Gate

Generated: 2026-09-29 · Final stop condition honored: **no gate is started without a user mandate.**

## Recommended: GATE 5 — External Integrations & Production Hardening

**Rationale**: Gate 4.1 closed the core-backend correctness/security gaps (authorization, immutability, dedup, contract drift, CI). The remaining blockers to a production-ready core are deployment-class integrations and operational depth — exactly what Gate 5 should own.

### Proposed scope (priority order)
1. **Storage & media production path**: S3/R2 adapter (swap point ready) + ClamAV daemon integration + CDN fronting + retention policy port (CORE-BLOCKING closure).
2. **Live vendor verification wave**: SMTP, Twilio, OAuth (redirect domains), OpenSearch (add client auth) — each exits `UNVERIFIED_EXTERNAL` only with live evidence.
3. **Dependency remediation**: clear the 18 audit findings, then flip CI audit to blocking.
4. **Observability**: worker Prometheus registry (design in worker report) + `pg_stat_statements` + load-profile benchmarks (k6) with sustained-traffic p95s.
5. **SAST**: CodeQL/semgrep in CI.
6. **OpenAPI depth**: per-endpoint decorator enrichment.

### Then (user decisions required — ADR-G41-01..05)
- Product wave A: Messaging + CRM (+ moderation workflow).
- Product wave B: Projects + Contracts lifecycle; Valuation later.

## Not started
Nothing beyond this document was started for Gate 5. Frontend/production UI remains forbidden (Phase S honored — zero UI code in repo, verified).
