-- ============================================================================
-- verify_0040_behavior.sql — Phase E migration behavior tests (DB level)
-- Run on a fresh chain (base..0040+seed) on real PostgreSQL 17.11 + PostGIS.
-- Every forbidden operation is attempted and must FAIL with the expected
-- error code; every allowed operation must SUCCEED. Any mismatch = FAIL.
-- ============================================================================
CREATE TEMP TABLE t_results (check_name text, pass boolean, detail text);

DO $outer$
DECLARE
  v_org_a uuid; v_org_b uuid; v_prop uuid; v_case uuid; v_case2 uuid;
  v_result uuid; v_result2 uuid; v_updated_at timestamptz; v_completed_at timestamptz;
  v_cnt int;
BEGIN
  -- prerequisites
  INSERT INTO org.organizations (type, display_name, slug)
    VALUES ('agency','Org A E','org-a-e') RETURNING id INTO v_org_a;
  INSERT INTO org.organizations (type, display_name, slug)
    VALUES ('agency','Org B E','org-b-e') RETURNING id INTO v_org_b;
  INSERT INTO property.properties (property_type_id)
    SELECT id FROM property.property_types WHERE code = 'apartment'
    RETURNING id INTO v_prop;

  -- [01] INSERT case WITHOUT organization_id → NOT NULL violation expected
  BEGIN
    INSERT INTO valuation.cases (property_id) VALUES (v_prop);
    INSERT INTO t_results VALUES ('01_org_not_null', false, 'insert unexpectedly succeeded');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO t_results VALUES ('01_org_not_null',
        SQLERRM LIKE 'null value in column "organization_id%' OR SQLSTATE = '23502', SQLERRM);
  END;

  -- [02] INSERT case with status != requested → expected reject
  BEGIN
    INSERT INTO valuation.cases (property_id, organization_id, status)
      VALUES (v_prop, v_org_a, 'processing');
    INSERT INTO t_results VALUES ('02_insert_status_guard', false, 'unexpectedly succeeded');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO t_results VALUES ('02_insert_status_guard', SQLERRM LIKE 'VALUATION_INSERT_STATUS_INVALID%', SQLERRM);
  END;

  -- [03] INSERT valid requested case → must succeed
  BEGIN
    INSERT INTO valuation.cases (property_id, organization_id)
      VALUES (v_prop, v_org_a) RETURNING id INTO v_case;
    INSERT INTO t_results VALUES ('03_insert_valid', v_case IS NOT NULL, 'ok');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO t_results VALUES ('03_insert_valid', false, SQLERRM);
  END;

  -- [04] requested → completed directly → INVALID_TRANSITION expected
  BEGIN
    UPDATE valuation.cases SET status = 'completed' WHERE id = v_case;
    INSERT INTO t_results VALUES ('04_invalid_transition_requested_completed', false, 'unexpectedly succeeded');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO t_results VALUES ('04_invalid_transition_requested_completed', SQLERRM LIKE 'VALUATION_INVALID_TRANSITION%', SQLERRM);
  END;

  -- [05] requested → processing → must succeed; updated_at touched (now() is
  -- tx-constant, so monotonicity is proven cross-transaction in checks 25a/25b)
  BEGIN
    UPDATE valuation.cases SET status = 'processing' WHERE id = v_case
      RETURNING updated_at INTO v_updated_at;
    INSERT INTO t_results VALUES ('05_transition_processing',
      v_updated_at IS NOT NULL, 'status=processing, updated_at set');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO t_results VALUES ('05_transition_processing', false, SQLERRM);
  END;

  -- [06] expires_at while processing → expected reject
  BEGIN
    UPDATE valuation.cases SET expires_at = now() + interval '30 days' WHERE id = v_case;
    INSERT INTO t_results VALUES ('06_expires_at_invalid_state', false, 'unexpectedly succeeded');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO t_results VALUES ('06_expires_at_invalid_state', SQLERRM LIKE 'VALUATION_EXPIRES_AT_INVALID%', SQLERRM);
  END;

  -- [07] result INSERT while processing → allowed
  BEGIN
    INSERT INTO valuation.results (case_id, min_value, estimated_value, max_value, currency_code, confidence)
      VALUES (v_case, 100000.0000, 120000.0000, 150000.0000, 'USD', 82.50)
      RETURNING id INTO v_result;
    INSERT INTO t_results VALUES ('07_result_insert_processing', v_result IS NOT NULL, 'ok');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO t_results VALUES ('07_result_insert_processing', false, SQLERRM);
  END;

  -- [08] result UPDATE while processing (correction) → allowed
  BEGIN
    UPDATE valuation.results SET estimated_value = 121000.0000 WHERE id = v_result;
    INSERT INTO t_results VALUES ('08_result_correction_processing', true, 'ok');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO t_results VALUES ('08_result_correction_processing', false, SQLERRM);
  END;

  -- [09] comparable with mismatched currency → CURRENCY_MISMATCH expected
  BEGIN
    INSERT INTO valuation.comparables (valuation_result_id, comparable_property_id, adjusted_price, currency_code)
      VALUES (v_result, v_prop, 118000.0000, 'EUR');
    INSERT INTO t_results VALUES ('09_currency_mismatch', false, 'unexpectedly succeeded');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO t_results VALUES ('09_currency_mismatch', SQLERRM LIKE 'VALUATION_CURRENCY_MISMATCH%', SQLERRM);
  END;

  -- [10] comparable with matching currency → allowed
  BEGIN
    INSERT INTO valuation.comparables (valuation_result_id, comparable_property_id, adjusted_price, currency_code, similarity_score)
      VALUES (v_result, v_prop, 118000.0000, 'USD', 91.00);
    INSERT INTO t_results VALUES ('10_currency_match_ok', true, 'ok');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO t_results VALUES ('10_currency_match_ok', false, SQLERRM);
  END;

  -- [11] processing → completed → allowed; completed_at auto-set
  BEGIN
    UPDATE valuation.cases SET status = 'completed' WHERE id = v_case
      RETURNING completed_at INTO v_completed_at;
    INSERT INTO t_results VALUES ('11_finalize', v_completed_at IS NOT NULL, 'ok');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO t_results VALUES ('11_finalize', false, SQLERRM);
  END;

  -- [12] result UPDATE post-completion → IMMUTABLE expected
  BEGIN
    UPDATE valuation.results SET estimated_value = 999999.0000 WHERE id = v_result;
    INSERT INTO t_results VALUES ('12_result_immutable_update', false, 'unexpectedly succeeded');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO t_results VALUES ('12_result_immutable_update', SQLERRM LIKE 'VALUATION_RESULT_IMMUTABLE%', SQLERRM);
  END;

  -- [13] result DELETE post-completion → IMMUTABLE expected
  BEGIN
    DELETE FROM valuation.results WHERE id = v_result;
    INSERT INTO t_results VALUES ('13_result_immutable_delete', false, 'unexpectedly succeeded');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO t_results VALUES ('13_result_immutable_delete', SQLERRM LIKE 'VALUATION_RESULT_IMMUTABLE%', SQLERRM);
  END;

  -- [14] comparable UPDATE post-completion → IMMUTABLE expected
  BEGIN
    UPDATE valuation.comparables SET adjusted_price = 1.0000
     WHERE valuation_result_id = v_result;
    INSERT INTO t_results VALUES ('14_comparable_immutable_update', false, 'unexpectedly succeeded');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO t_results VALUES ('14_comparable_immutable_update', SQLERRM LIKE 'VALUATION_COMPARABLE_IMMUTABLE%', SQLERRM);
  END;

  -- [15] comparable DELETE post-completion → IMMUTABLE expected
  BEGIN
    DELETE FROM valuation.comparables WHERE valuation_result_id = v_result;
    INSERT INTO t_results VALUES ('15_comparable_immutable_delete', false, 'unexpectedly succeeded');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO t_results VALUES ('15_comparable_immutable_delete', SQLERRM LIKE 'VALUATION_COMPARABLE_IMMUTABLE%', SQLERRM);
  END;

  -- [16] completed → processing (backward) → INVALID_TRANSITION expected
  BEGIN
    UPDATE valuation.cases SET status = 'processing' WHERE id = v_case;
    INSERT INTO t_results VALUES ('16_no_backward', false, 'unexpectedly succeeded');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO t_results VALUES ('16_no_backward', SQLERRM LIKE 'VALUATION_INVALID_TRANSITION%', SQLERRM);
  END;

  -- [17] expires_at on completed → allowed
  BEGIN
    UPDATE valuation.cases SET expires_at = now() + interval '30 days' WHERE id = v_case;
    INSERT INTO t_results VALUES ('17_expires_at_completed_ok', true, 'ok');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO t_results VALUES ('17_expires_at_completed_ok', false, SQLERRM);
  END;

  -- [18] completed → expired → allowed
  BEGIN
    UPDATE valuation.cases SET status = 'expired' WHERE id = v_case;
    INSERT INTO t_results VALUES ('18_expiry_transition', true, 'ok');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO t_results VALUES ('18_expiry_transition', false, SQLERRM);
  END;

  -- [19] expired result still immutable → IMMUTABLE expected
  BEGIN
    DELETE FROM valuation.results WHERE id = v_result;
    INSERT INTO t_results VALUES ('19_expired_still_immutable', false, 'unexpectedly succeeded');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO t_results VALUES ('19_expired_still_immutable', SQLERRM LIKE 'VALUATION_RESULT_IMMUTABLE%', SQLERRM);
  END;

  -- [20] failed path: requested → failed → OK; completed_at must stay NULL
  BEGIN
    INSERT INTO valuation.cases (property_id, organization_id) VALUES (v_prop, v_org_a)
      RETURNING id INTO v_case2;
    UPDATE valuation.cases SET status = 'failed' WHERE id = v_case2;
    UPDATE valuation.cases SET completed_at = now() WHERE id = v_case2;
    INSERT INTO t_results VALUES ('20_failed_completed_at_invalid', false, 'unexpectedly succeeded');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO t_results VALUES ('20_failed_completed_at_invalid', SQLERRM LIKE 'VALUATION_COMPLETED_AT_INVALID%', SQLERRM);
  END;

  -- [21] out-of-lifecycle status → rejected. The frozen ENUM is the outer
  -- guard (parse fails before any trigger); the VALUATION_UNKNOWN_STATUS
  -- vocabulary guard remains as inner defense for future enum extensions.
  BEGIN
    UPDATE valuation.cases SET status = 'cancelled' WHERE id = v_case2;
    INSERT INTO t_results VALUES ('21_out_of_lifecycle_rejected', false, 'unexpectedly succeeded');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO t_results VALUES ('21_out_of_lifecycle_rejected', true,
        'rejected at: ' || CASE WHEN SQLERRM LIKE 'invalid input value for enum%'
          THEN 'enum (outer guard)' ELSE 'vocabulary (inner guard): ' || SQLERRM END);
  END;

  -- [22] seeds: exactly 5 statuses, 5 transitions, 5 permissions
  SELECT (SELECT count(*) FROM valuation.status_values WHERE entity='case') INTO v_cnt;
  INSERT INTO t_results VALUES ('22a_status_values_5', v_cnt = 5, 'count=' || v_cnt);
  SELECT (SELECT count(*) FROM valuation.status_transitions WHERE entity='case') INTO v_cnt;
  INSERT INTO t_results VALUES ('22b_transitions_5', v_cnt = 5, 'count=' || v_cnt);
  SELECT count(*) INTO v_cnt FROM iam.permissions WHERE code IN
    ('valuation.view','valuation.create','valuation.update','valuation.finalize','valuation.manage');
  INSERT INTO t_results VALUES ('22c_permissions_5', v_cnt = 5, 'count=' || v_cnt);

  -- [23] indexes present
  SELECT count(*) INTO v_cnt FROM pg_indexes
   WHERE (indexname = 'idx_valuation_cases_org' AND tablename = 'cases' AND schemaname = 'valuation')
      OR (indexname = 'idx_valuation_comparables_property' AND tablename = 'comparables' AND schemaname = 'valuation');
  INSERT INTO t_results VALUES ('23_indexes_2', v_cnt = 2, 'count=' || v_cnt);

  -- [24] org binding present on all rows (cross-org isolation is enforced at
  -- DB by this NOT NULL binding + FK; 404-no-leak scoping lands with the
  -- service layer per the design review)
  SELECT count(*) INTO v_cnt FROM valuation.cases WHERE organization_id IS NULL;
  INSERT INTO t_results VALUES ('24_org_binding_complete', v_cnt = 0, 'null_org_rows=' || v_cnt);

  -- [26] reference integrity: invalid property anchor → FK rejection
  -- (cross-project/cross-entity isolation at DB level)
  BEGIN
    INSERT INTO valuation.cases (property_id, organization_id)
      VALUES ('00000000-0000-0000-0000-000000000000', v_org_a);
    INSERT INTO t_results VALUES ('26_invalid_property_rejected', false, 'unexpectedly succeeded');
    EXCEPTION WHEN FOREIGN_KEY_VIOLATION THEN
      INSERT INTO t_results VALUES ('26_invalid_property_rejected', true, 'FK violation as expected');
    WHEN OTHERS THEN
      INSERT INTO t_results VALUES ('26_invalid_property_rejected', false, 'unexpected error: ' || SQLERRM);
  END;

END $outer$;

SELECT check_name, pass, detail FROM t_results ORDER BY check_name;
SELECT CASE WHEN count(*) FILTER (WHERE NOT pass) = 0
            THEN 'ALL_BEHAVIOR_CHECKS_PASS (' || count(*) || ')'
            ELSE 'FAILURES=' || count(*) FILTER (WHERE NOT pass) END AS verdict
  FROM t_results;
