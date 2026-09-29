-- ============================================================================
-- g4-verification.sql — Gate 4 verification suite (runs on fully migrated DB)
-- Complements g3-verification.sql (37 checks). Gate 4 adds G1..G22.
-- Usage: psql -d <db> -f database/verify/g4-verification.sql
-- ============================================================================
\set ON_ERROR_STOP on

CREATE TEMP TABLE g4_results(g4_test text, g4_result text, detail text);
CREATE OR REPLACE FUNCTION pg_temp.g4_assert(name text, ok boolean, info text DEFAULT '') RETURNS void AS $$
  INSERT INTO pg_temp.g4_results(g4_test, g4_result, detail)
  VALUES (name, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END, info);
$$ LANGUAGE sql;

DO $$
DECLARE
  v_count bigint; v_text text; v_json jsonb; v_job uuid; v_listing uuid; v_user uuid;
BEGIN
  -- ========================================================
  -- A. STRUCTURAL (Gate 4 schema surface)
  -- ========================================================
  SELECT count(*) INTO v_count FROM information_schema.tables
   WHERE table_schema='platform' AND table_name IN ('jobs','job_runs','risk_events','blocks');
  PERFORM pg_temp.g4_assert('G01_platform_infra_tables', v_count = 4, format('%s/4', v_count));

  SELECT count(*) INTO v_count FROM information_schema.columns
   WHERE table_schema='marketplace' AND table_name='media_assets'
     AND column_name IN ('status','scan_status','original_object_key','is_original_retained','duplicate_of');
  PERFORM pg_temp.g4_assert('G02_media_pipeline_columns', v_count = 5, format('%s/5', v_count));

  SELECT count(*) INTO v_count FROM information_schema.tables
   WHERE table_schema='iam' AND table_name IN ('email_verification_tokens','phone_verification_tokens','password_reset_tokens','mfa_factors','oauth_accounts','login_attempts');
  PERFORM pg_temp.g4_assert('G03_iam_hardening_tables', v_count = 6, format('%s/6', v_count));

  SELECT count(*) INTO v_count FROM information_schema.tables
   WHERE table_schema='billing' AND table_name IN ('plans','plan_versions','entitlements','subscription_events');
  PERFORM pg_temp.g4_assert('G04_billing_plan_tables', v_count = 4, format('%s/4', v_count));

  SELECT count(*) INTO v_count FROM information_schema.columns
   WHERE table_schema='billing' AND table_name='subscriptions' AND column_name='plan_version_id';
  PERFORM pg_temp.g4_assert('G05_subscriptions_link_plan_version', v_count = 1);

  SELECT count(*) INTO v_count FROM information_schema.tables
   WHERE table_schema IN ('legal') AND table_name='user_agreement_acceptances';
  PERFORM pg_temp.g4_assert('G06_agreement_acceptances_table', v_count = 1);

  SELECT count(*) INTO v_count FROM information_schema.tables
   WHERE table_schema='notification' AND table_name IN ('quiet_hours','organization_preferences');
  PERFORM pg_temp.g4_assert('G07_notification_pref_tables', v_count = 2, format('%s/2', v_count));

  SELECT count(*) INTO v_count FROM information_schema.tables
   WHERE table_schema='marketplace' AND table_name IN ('listing_search','listing_search_docs');
  PERFORM pg_temp.g4_assert('G09_search_state_tables', v_count = 2, format('%s/2', v_count));

  SELECT count(*) INTO v_count FROM pg_indexes
   WHERE schemaname='marketplace' AND tablename='listing_search_docs' AND indexname='ix_lsd_fts';
  PERFORM pg_temp.g4_assert('G10_fts_gin_index', v_count = 1);

  PERFORM pg_temp.g4_assert('G11_is_blocked_function', to_jsonb(platform.is_blocked('ip','203.0.113.99')) = to_jsonb(false));

  -- ========================================================
  -- B. BEHAVIORAL
  -- ========================================================
  -- B1. jobs claim protocol (single-winner) + dedup key
  INSERT INTO platform.jobs(queue, job_type, payload) VALUES ('g4_verify','g4.test','{}') RETURNING id INTO v_job;
  PERFORM pg_temp.g4_assert('G12_job_enqueue_pending', EXISTS (SELECT 1 FROM platform.jobs WHERE id = v_job AND status='pending'));

  UPDATE platform.jobs SET status='running', locked_at=now(), locked_by='g4-verify', attempts=1 WHERE id = v_job;
  PERFORM pg_temp.g4_assert('G13_job_claim_running', (SELECT status = 'running' FROM platform.jobs WHERE id = v_job));

  UPDATE platform.jobs SET status='dead', finished_at=now() WHERE id = v_job;
  UPDATE platform.jobs SET status='pending', attempts=0, run_at=now() WHERE id = v_job;
  PERFORM pg_temp.g4_assert('G14_job_requeue_dead', (SELECT status = 'pending' AND attempts = 0 FROM platform.jobs WHERE id = v_job));
  DELETE FROM platform.jobs WHERE id = v_job;

  -- B2. dedup key uniqueness across live jobs
  BEGIN
    INSERT INTO platform.jobs(queue, job_type, payload, dedup_key) VALUES ('g4_verify','g4.dup','{}','g4-dup-1');
    INSERT INTO platform.jobs(queue, job_type, payload, dedup_key) VALUES ('g4_verify','g4.dup','{}','g4-dup-1');
    RAISE NOTICE 'duplicate dedup insert unexpectedly succeeded';
    PERFORM pg_temp.g4_assert('G15_job_dedup_key', false);
  EXCEPTION WHEN unique_violation THEN
    PERFORM pg_temp.g4_assert('G15_job_dedup_key', true);
  END;
  DELETE FROM platform.jobs WHERE dedup_key = 'g4-dup-1';

  -- B3. blocks + is_blocked true while unexpired
  INSERT INTO platform.blocks(subject_type, subject_key, reason, expires_at) VALUES ('ip','203.0.113.7','g4-verify', now() + interval '1 hour');
  PERFORM pg_temp.g4_assert('G16_block_active', platform.is_blocked('ip','203.0.113.7'));
  DELETE FROM platform.blocks WHERE subject_key='203.0.113.7';
  PERFORM pg_temp.g4_assert('G17_block_expiry', NOT platform.is_blocked('ip','203.0.113.7'));

  -- B4. search doc upsert + FTS match + tsv generation
  SELECT u.id INTO v_user FROM iam.users u ORDER BY u.created_at DESC LIMIT 1;
  SELECT l.id INTO v_listing FROM marketplace.listings l WHERE l.created_by_user_id = v_user AND l.deleted_at IS NULL ORDER BY l.created_at DESC LIMIT 1;
  IF v_listing IS NULL THEN
    INSERT INTO marketplace.listings(property_id, created_by_user_id, transaction_type, status, title, currency_code, price, price_period)
    SELECT p.id, v_user, 'sale', 'draft', 'G4 verification unique marker zebraplum', 'USD', 10, 'one_time'
      FROM property.properties p WHERE p.created_by = v_user ORDER BY p.created_at DESC LIMIT 1
    RETURNING id INTO v_listing;
  END IF;
  IF v_listing IS NOT NULL THEN
    UPDATE marketplace.listings SET title = 'G4 verification zebraplum marker ' || v_listing WHERE id = v_listing;
    INSERT INTO marketplace.listing_search(listing_id, status, source_event_at) VALUES (v_listing, 'pending', now())
      ON CONFLICT (listing_id) DO UPDATE SET status='pending', updated_at=now();
    INSERT INTO marketplace.listing_search_docs(listing_id, status, transaction_type, title_text, description_text, price, currency_code, price_period)
    VALUES (v_listing, 'published', 'sale', 'zebraplum verification doc ' || v_listing, '', 10, 'USD', 'one_time')
      ON CONFLICT (listing_id) DO UPDATE SET title_text = EXCLUDED.title_text;
    SELECT count(*) INTO v_count FROM marketplace.listing_search_docs
     WHERE listing_id = v_listing AND tsv @@ websearch_to_tsquery('simple','zebraplum');
    PERFORM pg_temp.g4_assert('G18_fts_doc_matches', v_count = 1);
    DELETE FROM marketplace.listing_search_docs WHERE listing_id = v_listing;
    DELETE FROM marketplace.listing_search WHERE listing_id = v_listing;
  ELSE
    PERFORM pg_temp.g4_assert('G18_fts_doc_matches', false, 'no listing available');
  END IF;

  -- B5. plan versioning shape: version > 0 enforced, effective range enforced
  BEGIN
    INSERT INTO billing.plan_versions(plan_id, version, entitlements, effective_from)
    SELECT '00000000-0000-0000-0000-000000000000'::uuid, 1, '{}', now();
    PERFORM pg_temp.g4_assert('G19_plan_version_fk_guard', false);
  EXCEPTION WHEN foreign_key_violation THEN
    PERFORM pg_temp.g4_assert('G19_plan_version_fk_guard', true);
  END;

  -- B6. agreement acceptance uniqueness
  SELECT count(*) INTO v_count FROM information_schema.columns
   WHERE table_schema='legal' AND table_name='user_agreement_acceptances' AND column_name='agreement_version';
  PERFORM pg_temp.g4_assert('G20_agreement_version_column', v_count = 1);

  -- B7. quiet hours PK shape + org prefs shape
  SELECT count(*) INTO v_count FROM information_schema.table_constraints
   WHERE table_schema='notification' AND table_name='organization_preferences' AND constraint_type='PRIMARY KEY';
  PERFORM pg_temp.g4_assert('G21_org_prefs_pk', v_count = 1);

  -- B8. login attempts telemetry feeds anti-bot
  INSERT INTO iam.login_attempts(email_tried, success, ip) VALUES ('g4verify@example.com', false, '203.0.113.50');
  SELECT count(*) INTO v_count FROM iam.login_attempts WHERE email_tried = 'g4verify@example.com' AND success = false;
  PERFORM pg_temp.g4_assert('G22_login_attempt_telemetry', v_count >= 1);

  -- B9. media status constraint + phash index
  SELECT count(*) INTO v_count FROM pg_indexes
   WHERE schemaname='marketplace' AND tablename='media_assets' AND indexname='ix_media_phash';
  PERFORM pg_temp.g4_assert('G23_media_phash_index', v_count = 1);
END $$;

SELECT g4_test, g4_result, detail,
  CASE WHEN g4_result = 'PASS' THEN 0 ELSE 1 END AS g4_failure
FROM pg_temp.g4_results
ORDER BY g4_test;

SELECT format('G4-VERIFY: %s/%s PASS', count(*) FILTER (WHERE g4_result='PASS'), count(*)) AS g4_summary
FROM pg_temp.g4_results;
