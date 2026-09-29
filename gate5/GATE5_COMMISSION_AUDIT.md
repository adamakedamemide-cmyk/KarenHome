# GATE 5 — Phase Q (1/2): Commission Revalidation — PASS (independent re-run)

Independence: re-executed on **fresh `karen_g5_fresh`** (new DB, not Gate 4.1 databases) during G5R-TEST-001. Suites: `g4-commission-engine.spec.ts`, `g41-governance.spec.ts` T3, `g4.integration.spec.ts` commission sections.

## Mandated properties → verified evidence

| Property | Evidence (executed, fresh DB) |
|---|---|
| Historical calculation immutable | T3: after a NEW rule version changes outcomes, previously issued calculations are byte-identical (old calculation MUST NOT change); violations would raise IMMUTABLE_RECORD |
| Rule versioning | `commission.rule_versions` immutable rows; engine resolves by effective date; changing rules creates a new version, never edits |
| Effective date | engine `resolveRule` filters `effective_from <= at < effective_to` — covered by engine suite |
| Reversal | reversal issues a negative-amount calculation (−50.0000 asserted) linked to the original — PASS |
| Payout | `commission.payouts` + settlements flow through billing ledger entries (g4.integration) |
| Server-derived amounts | Gate 4.1 fix re-verified: amount computed server-side from rule (client-supplied amount rejected) |

## Engine coverage (from the passing suite, 100+ assertions)
tiered/flat/percentage rules, minimum/maximum bounds, effective-date windows, precedence ties, rounding half-up to 4dp, reversal link integrity, retroactive mandate (T3).

No deviation found. Commission remains **COMPLETE (core scope)**.
