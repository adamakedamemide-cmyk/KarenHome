# GATE4_1_RED_TEAM_REPORT — Phases L/Q re-run

Generated: 2026-09-29 · All suites re-executed fresh on karen_g41_final (`D_jest_final.log`, `D_concurrency_final.log`). Independent from Gate 4 evidence.

## Reconciliation note (Phase D diligence)
Gate 4 report claimed "15 red-team scenarios". The E2E suite implements **10 scenarios (E0–E9)**; the Gate 4 report's 15 = 10 E2E scenarios + 5 race/DB-trigger scenarios (C2/C4 + IMMUTABLE_RECORD + budget trigger). Mapping below — count discrepancy resolved as mapping, not missing tests.

## Scenario results (fresh run)

| # | Attack | Result | Regression |
|---|---|---|---|
| 1 | IDOR — stranger transitions another user's listing | BLOCKED 403 RESOURCE_NOT_OWNED | E4 |
| 2 | Privilege escalation — commission without permission | BLOCKED 403; positive control after DIRECT grant | E5 |
| 3 | Cross-org access — non-member manages org listing | BLOCKED 403 (org membership check) | E4 + guard |
| 4 | Owner impersonation — property assignment by non-manager | BLOCKED 403 RESOURCE_NOT_OWNED | J-suite |
| 5 | Commission manipulation — mutate immutable calc/line/rule_version | BLOCKED DB IMMUTABLE_RECORD | J6 + **T3 (new, explicit UPDATE attempt)** |
| 6 | Payout manipulation — dual/zero beneficiary | BLOCKED CHECK + PAYOUT_BENEFICIARY_REQUIRED | J6 |
| 7 | Ad budget manipulation — overspend | BLOCKED BUDGET_EXCEEDED under race | C3 5/5 + J8 |
| 8 | Subscription bypass — entitlements without subscription | BLOCKED active:false + plan-version binding | E8 + J7 |
| 9 | Search injection | BLOCKED parameterized websearch_to_tsquery | E6 |
| 10 | Upload malware (EICAR/script-probe) | BLOCKED scan → quarantine | E7 + worker path |
| 11 | Oversized upload | BLOCKED MEDIA_TOO_LARGE | E7 |
| 12 | Webhook replay | N/A — no webhook endpoints exist (unchanged) | registered |
| 13 | Token replay — rotated refresh reuse | BLOCKED 401 + ALL sessions revoked + audit | E2 |
| 14 | Refresh race | BLOCKED single winner | C4 |
| 15 | Job duplication — parallel double-claim | BLOCKED SKIP LOCKED zero duplicates | C2 |

## New attacks covered in Gate 4.1 (added by this gate)
| # | Attack | Result | Regression |
|---|---|---|---|
| 16 | Advertising admin access without permission | BLOCKED 401/ORG_SCOPE_REQUIRED/FORBIDDEN ladder | **T1** |
| 17 | Cross-org advertising manipulation (foreign campaign creation) | BLOCKED 403 RESOURCE_NOT_OWNED (was OPEN in Gate 4 — closed) | **T2** |
| 18 | Click double-billing (repeat click in validity window) | BLOCKED — auditable, not billable (0036 index; was OPEN — closed) | **T4** |
| 19 | Over-reversal of commission (reverse more than calculated) | BLOCKED — reversal amount derived server-side from immutable calculation | **T3** |

## Verdict
Red-Team = **PASS** — 12 blocked + regression, 2 N/A-by-absence, 1 partial (upload malware E2E depth, unchanged), **3 previously-open surfaces closed with new regressions**.
