# GATE4_COMMISSION_REPORT (§7)

## Implemented components (migration 0027 tables + Gate 4 code)

- **CommissionRule / RuleVersion:** `createRule`, `createRuleVersion` (immutable), `setRuleStatus` (ACTIVE/RETIRED lifecycle). Versioning with `effective_from/effective_to`; **UNDECIDED defaults — zero invented business values (OD-03/OD-04)**.
- **CommissionEngineService.calculate:** party role + dimensions (transaction type, property type, geography, organization, campaign, referral, currency, price band) → rule selection among ACTIVE versions effective at `occurred_at`, most-specific-first (dimension count DESC — SQL-ordered), wildcard keys tolerated.
- **Modes:** `percentage`, `fixed`; **min/max caps** applied to the computed amount; **splits** array validated to sum to 100 (±ε) and emitted as `split:<role>` lines.
- **Snapshot guarantee:** every calculation stores `rule_snapshot` (rule + version + paramConfig + effective window) and `input_snapshot` (dimensions + base + occurredAt + actor). DB triggers (`commission.forbid_mutation`) reject UPDATE/DELETE on calculations/lines/rule_versions → verified in J6 (`IMMUTABLE_RECORD`).
- **No retroactive drift:** future versions never affect historical calculations — selection is bound to occurred_at and verified (J6: v2 dated tomorrow; applicable list still yields v1).
- **Settlements / Adjustments / Payouts:** create → approve → settle; payout beneficiaries user XOR organization (CHECK-enforced; app guard `PAYOUT_BENEFICIARY_REQUIRED`).

## Verification

| Check | Result |
|---|---|
| Percentage math + snapshot content (unit) | PASS |
| Fixed fee + min floor + max cap (unit) | PASS |
| Splits sum-to-100; invalid split rejected (unit) | PASS |
| Specificity selection mirrors SQL order (unit) | PASS |
| No applicable rule → 404 COMMISSION_RULE_NOT_FOUND (unit + E2E E5) | PASS |
| Unsupported mode / negative base → 422 VALIDATION_ERROR (unit) | PASS |
| DB immutability UPDATE rejected (J6, real PG) | PASS |
| Future version cannot leak into present (J6, real PG) | PASS |
| Settlement→approve→payout lifecycle (J6, real PG) | PASS |
| Permission enforcement: no perm 403 → direct grant (0030) allowed (E2E E5) | PASS |
| E2E E5 full API flow: rule create→activate→calculate 7.5% of 1000 = 75.0000 with snapshot | PASS |

## Honest notes

- Split payouts to multiple beneficiaries in one call are modeled as `split:` lines; multi-payout orchestration is a business-workflow decision deferred with OD-04.
- Rule version param JSON is validated for mode/shape; deep schema enforcement of arbitrary commercial fields remains CONFIGURABLE by design.
