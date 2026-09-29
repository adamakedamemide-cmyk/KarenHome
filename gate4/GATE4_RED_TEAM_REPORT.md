# GATE4_RED_TEAM_REPORT (§23)

All scenarios executed against the real app/database. Every blocked bypass has a named regression test; nothing is marked closed without one (§23).

| # | Attack | Outcome | Regression |
|---|---|---|---|
| 1 | **IDOR** — stranger transitions another user's listing | **BLOCKED** 403 RESOURCE_NOT_OWNED | E2E E4 |
| 2 | **Privilege escalation** — commission calculate without permission | **BLOCKED** 403 FORBIDDEN (permission engine); after explicit 0030 grant → allowed (positive control) | E2E E5 |
| 3 | **Cross-organization access** — org-scoped listing managed by non-member | **BLOCKED** 403 (canManageListing org membership check) | E4 + guard unit path |
| 4 | **Owner impersonation** — property owner assignment by non-manager | **BLOCKED** 403 RESOURCE_NOT_OWNED (AssignOwnerHandler) | Gate-2 handler + J-suite |
| 5 | **Commission manipulation** — mutate immutable calculation/line/rule_version | **BLOCKED** DB `IMMUTABLE_RECORD` trigger | J6 |
| 6 | **Payout manipulation** — dual beneficiary / zero-amount payout | **BLOCKED** CHECK + app `PAYOUT_BENEFICIARY_REQUIRED` | J6 |
| 7 | **Ad budget manipulation** — overspend beyond limit | **BLOCKED** DB `BUDGET_EXCEEDED` under race | C3 (5/5 rejected at limit) |
| 8 | **Subscription bypass** — entitlements without subscription | **BLOCKED** — `active:false`; plan-version binding required | E8 + J7 |
| 9 | **Search injection** — `'); DROP TABLE …;--` in q | **BLOCKED** parameterized websearch_to_tsquery; table intact | E6 |
| 10 | **Upload malware** — EICAR/embedded-script content | **BLOCKED** signature scan → quarantine (`scan_status='infected'`, status `quarantined`) | scanBuffer unit + quarantine path; **job-level E2E partial** (registered) |
| 11 | **Oversized upload** | **BLOCKED** MEDIA_TOO_LARGE (intake + hard cap in stream) | E7 |
| 12 | **Webhook replay** | **N/A** — no webhook ingestion endpoints exist in Gate 4; replay-safe pattern (dedup keys/idempotency) is the standard for future webhooks | registered |
| 13 | **Token replay** — reuse of rotated refresh token | **BLOCKED** 401 + ALL user sessions revoked + audit row | E2E E2 |
| 14 | **Refresh race** — two parallel rotations with the same token | **BLOCKED** exactly one winner, one reuse-detected (FOR UPDATE) | C4 race 5/5 |
| 15 | **Job duplication** — parallel workers double-claim | **BLOCKED** SKIP LOCKED → zero duplicates | C2 race |

## Additional checks observed during the gate

- Optimistic-concurrency race on listing transitions: 10 parallel, 1 winner (C1).
- Rate limiting blocks credential-stuffing-shaped traffic after policy threshold (E0).
- Login error anti-enumeration (uniform invalid credentials) — E2.
- Disposable email rejection on registration — unit + service path.
- Session revocation cascade on password reset/change — J4.

## Honest notes

- Attacker-side automation was harness-level (races + crafted payloads), not a full commercial scanner run — registered as depth limitation, not a bypass.
- Social/OAuth flows could not be exercised against live vendors (no credentials); provider code paths are unit/integration-level only.
