# GATE 5 → Recommended Next Gate

## GATE 6 — Frontend Architecture + Design System + Public Website + Authentication UX (owner-designated)

Per the owner's standing plan, after Gate 5 the next gate is Gate 6 (frontend). The frontend lock (no production frontend/mobile UI) holds through Gate 5 and lifts only on a PASS decision recorded by the owner.

## Gate 6 entry criteria check (from Gate 5 evidence)

| Criterion | State |
|---|---|
| Backend core stable (build/typecheck/lint/tests/schema) | ✅ 0/0/0 · 83/83 · REMOVED 0 |
| Security posture | ✅ 0 critical findings; OAuth CSRF fixed; red-team suites green |
| Supply chain | ✅ 0 audit findings; SBOM committed |
| Recovery | ✅ real backup/restore drill 10/10 |
| CI | Real runs now executing; final status in EXECUTION_REPORT (2 infra-order failures found & fixed — this is exactly why the runner had to run) |
| External vendors | ✅ OpenSearch LOCAL_VERIFIED; SMTP/Twilio/OAuth live = UNVERIFIED_EXTERNAL with adapters+contracts+failure modes; S3/FCM adapters = registered prerequisites inside Gate 6 scope where the frontend needs them |

## Mandatory Gate 6 additions registered by Gate 5 (acceptance criteria)

1. **S3 adapter** (ADR-G5-01): SigV4, presigned upload/download, bounded timeouts, failure-mode tests against an owner-provided S3-compatible endpoint — media upload UX depends on it.
2. **FCM HTTP v1 adapter** (ADR-G5-02) before push notifications surface in any UI.
3. **Production config fail-fast**: refuse boot when a channel is configured-on but its provider is absent (Phase T item 7).
4. **Scheduled backups + PITR** (ADR & DR gaps) — deployment prerequisite for any public site.
5. **CI protection**: required status checks on main; keep the now-real CI green.
6. **Messaging/CRM server APIs** must precede any UI for them (no frontend for schema-only domains) — or scope Gate 6 frontend to the COMPLETE domains (listings/search/media/auth/billing/commission/ads).
7. **Revoke the exposed GitHub PAT** (user action) before granting any new deploy keys/CI secrets.

## Suggested sequencing (server-first remains the spine)

1. Gate 6a: public website architecture + design system + auth UX (against verified backend only).
2. Gate 6b (parallelizable): S3 + FCM adapters; messaging/CRM server APIs.
3. Each frontend milestone re-runs: lint/typecheck/build/tests + new E2E for auth UX; artifact bundle per governance rule.
