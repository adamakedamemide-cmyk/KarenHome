# GATE4_1_OPEN_ISSUES

Generated: 2026-09-29 · Every issue carries an owner gate. No issue is silently dropped.

| # | Issue | Severity | Category | Evidence | Target Gate |
|---|---|---|---|---|---|
| 1 | Dependency audit: 18 prod vulns (1 low/11 moderate/6 high), all transitive | Medium | Supply chain | `evidence/Q_pnpm_audit.log` | Gate 5 (remediation PR + lockfile refresh, breaking-change review) |
| 2 | OpenSearch client lacks auth headers (basic/API-key) | Medium | External integration | search report | Gate 5 (with live cluster) |
| 3 | Sandbox lacks sustained-load generator: worker latency/queue-lag under load unmeasured | Low | Performance realism | performance report | Gate 5 (k6/artillery profile) |
| 4 | Full SAST (CodeQL/semgrep) not yet wired | Medium | Security depth | security report | Gate 5 (CI extension) |
| 5 | SSRF surface limited but no centralized egress policy | Low | Security depth | security report | Gate 5 |
| 6 | ClamAV daemon integration (hook point exists, signature scan only) | High-for-prod | Media boundary | media report | Gate 5 (deployment prerequisite) |
| 7 | `pg_stat_statements` disabled in sandbox (p95 proxy via EXPLAIN only) | Low | Observability | performance report | Gate 5 (infra config) |
| 8 | OpenAPI per-endpoint decorator enrichment (schemas/examples/error models) | Low | Contract depth | API report | Gate 5 |
| 9 | Worker Prometheus registry (design ready) | Low | Observability | worker report | Gate 5 |
| 10 | Messaging/CRM/Contracts/Projects/Valuation absent (schema reserved) | — | Product scope | ADR-G41-01..05 | Gates 5-6 (user decisions) |
| 11 | CI runtime status on GitHub runners pending first cloud run | Info | CI | CI report | Next response cycle |
| 12 | Frozen-export mirror deviation: `project-artifact-export/workspace/.env` (credential-free) removed from live repo per no-real-.env rule; ZIP bundle intact | Info | Governance | consistency report | permanent note |

## Closed in Gate 4.1 (removed from open list)
- Advertising admin authorization + org isolation (was OPEN) → 0035 + T1/T2.
- Click double-billing (was OPEN) → 0036 + T4.
- Hard-coded MFA dev key (was OPEN) → fail-fast + ephemeral dev key.
- Commission reversal without API (was OPEN) → endpoint + T3.
- OpenAPI drift unprotected (was OPEN) → committed spec + CI diff.
- No CI at all (was OPEN) → workflow delivered.
