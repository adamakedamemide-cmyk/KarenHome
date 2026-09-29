-- ============================================================================
-- 0036_gate41_click_dedup.sql — Karen Home Gate 4.1
-- Phase E/H fix: duplicate-click billing protection.
-- Gate 4 registered gap: click dedup was validity-window based only —
-- repeated clicks on the same impression inside the 10-minute window each
-- accrued CPC spend. This index enforces ONE billed (is_valid) click per
-- impression at the database level; later clicks remain auditable as
-- is_valid=false rows with reject_reason='duplicate_click' (service layer).
-- ============================================================================

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_clicks_billed_per_impression
    ON advertising.clicks (impression_id)
    WHERE is_valid;

COMMIT;
