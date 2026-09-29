# GATE4_ADVERTISING_REPORT (§8)

## Scope

MVP placements only (11 seeded slots from 0028: home_hero, home_sidebar, search_top, search_inline, listing_detail_top, agency_profile, agent_profile, project_page, geo_page_top, category_top, dashboard_side). **No auction/RTB/Ad Exchange** — per mandate.

## Implemented

- **Advertiser/CampaignGroup/Campaign/Creative/Targets/Budgets** admin surface (`/api/v1/admin/ads/*`): create advertiser (org-bound), campaigns with window + pricing model (CPM/CPC/FIXED/UNDECIDED — pricing requires amount+currency by DB CHECK), approved creatives, dimension targets (PAGE_TYPE etc. with operator + weight), TOTAL/DAILY/MONTHLY budgets.
- **Serving (`POST /ads/serve`):** slot lookup → deterministic candidate query (status ACTIVE, time window, ≥1 APPROVED creative, budget headroom, PAGE_TYPE match, weight-ordered) → fraud scoring of the session (burst velocity in last 60s → 0/0.3/0.6/0.9) → impression insert with **minute-level dedup** (partial unique index; duplicates stored as `is_counted=false` for auditability).
- **Clicks (`POST /ads/impressions/:id/click`):** validity window (10 min), fraud threshold (<0.8), reject reasons (`stale_impression`, `high_fraud_score`); valid CPC clicks accrue spend row-locked; DB trigger raises **BUDGET_EXCEEDED** on overflow (surfaced honestly, not swallowed).
- **Reporting:** daily aggregates (impressions counted, clicks, valid clicks) + CPM/CPC spend rollups (`advertising.reports` upsert) via AnalyticsWorker or admin endpoint.

## Anti-fraud integrity (by construction)

1. Session burst scoring at serve time (velocity signal, §16 seam).
2. Minute-level dedup: same session+creative+minute → exactly one counted (C5 race: **counted=1/10**).
3. Click validity gate + reject reasons persisted.
4. Budget guard is DB-side (C3 race: 10 parallel spends, **accepted=5 rejected=5, spent=5.0000/5.0000**).
5. FraudWorker sweeps: burst sessions → impressions invalidated (`is_counted=false`, fraud_score=1) + risk events + audit trail.

## Verification

J8 integration (real PG): slot seeded, campaign lifecycle, impression counted=true, duplicate counted=false, spend accrual 2.00, overspend rejected BUDGET_EXCEEDED. C3 + C5 concurrency races PASS. E2E OpenAPI includes /ads paths (E9).

## Honest notes

- CPM accrual is batch (rollup), CPC is per-click — matches MVP without a billing-event stream.
- Real ad-server hardening (UA fingerprints, viewability, conversion attribution) is out of Gate 4 scope; the integrity columns from 0028 are populated from day one.
