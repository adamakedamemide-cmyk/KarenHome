-- ============================================================================
-- g3-verification.sql — Gate 3-DB verification suite
-- Runs on the FULLY MIGRATED fresh database (base → errata → 0027..0031 → seed)
-- Sections: A) structural invariants   B) behavioral invariants
--           C) negative tests (expected ERROR)   D) new-domain integration
-- Each test reports g3_test / g3_result rows. Any FAIL = gate blocker.
-- Concurrency tests live in g3-concurrency.sql (session-pair semantics).
-- ============================================================================

CREATE TEMP TABLE g3_results(g3_test text, g3_result text, detail text);

CREATE OR REPLACE FUNCTION g3_assert(name text, ok boolean, info text DEFAULT '')
RETURNS void LANGUAGE plpgsql AS $fn$
BEGIN
    INSERT INTO g3_results VALUES (name, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END, info);
END;
$fn$;

-- =============== A. STRUCTURAL INVARIANTS ===================================
DO $$
DECLARE n int; v text;
BEGIN
    -- migration ledger complete
    SELECT count(*) INTO n FROM platform.schema_migrations;
    PERFORM g3_assert('ledger_complete', n = 10, 'rows=' || n);

    -- listing_status enum has the 3 additive values (CR-02)
    SELECT string_agg(enumlabel, ',' ORDER BY enumsortorder) INTO v
      FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
     WHERE t.typname = 'listing_status';
    PERFORM g3_assert('enum_additive_states', v LIKE '%pending_verification%reserved%under_contract%', v);
    SELECT count(*) INTO n
      FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
     WHERE t.typname = 'listing_status';
    PERFORM g3_assert('enum_count_13', n = 13, 'count=' || n);

    -- commission domain: 7 tables
    SELECT count(*) INTO n FROM pg_tables WHERE schemaname = 'commission';
    PERFORM g3_assert('commission_7_tables', n = 7, 'tables=' || n);

    -- advertising domain: 11 tables
    SELECT count(*) INTO n FROM pg_tables WHERE schemaname = 'advertising';
    PERFORM g3_assert('advertising_11_tables', n = 11, 'tables=' || n);

    -- i18n: 5 translation tables
    SELECT count(*) INTO n FROM (
        SELECT 1 FROM pg_tables WHERE (schemaname, tablename) IN
            (('marketplace','listing_translations'),('project','project_translations'),
             ('org','organization_translations'),('iam','user_translations'),
             ('property','property_type_translations'))) x;
    PERFORM g3_assert('i18n_5_translation_tables', n = 5, 'tables=' || n);

    -- two-layer authorization objects
    PERFORM g3_assert('grants_table', to_regclass('iam.user_permission_grants') IS NOT NULL);
    PERFORM g3_assert('listing_assignments_table', to_regclass('marketplace.listing_assignments') IS NOT NULL);
    PERFORM g3_assert('effective_permissions_fn', to_regprocedure('iam.effective_permissions(uuid,uuid)') IS NOT NULL);

    -- transition matrix seeded
    SELECT count(*) INTO n FROM marketplace.listing_transition_rules;
    PERFORM g3_assert('transition_matrix_seeded', n >= 33, 'rules=' || n);

    -- ads MVP slots
    SELECT count(*) INTO n FROM advertising.ad_slots;
    PERFORM g3_assert('ads_slots_seeded_11', n = 11, 'slots=' || n);

    -- permission catalog seeded (structural, no business values)
    SELECT count(*) INTO n FROM iam.permissions;
    PERFORM g3_assert('permissions_seeded', n >= 26, 'permissions=' || n);
    SELECT count(*) INTO n FROM iam.role_permissions;
    PERFORM g3_assert('role_permissions_mapped', n > 0, 'mappings=' || n);

    -- no commission / ads / subscription commercial values seeded (OD-03/04)
    SELECT count(*) INTO n FROM commission.rules;
    PERFORM g3_assert('commission_rules_empty', n = 0, 'rules=' || n);
    SELECT count(*) INTO n FROM advertising.campaigns WHERE price_amount IS NOT NULL;
    PERFORM g3_assert('no_invented_ad_pricing', n = 0, 'priced=' || n);
END $$;

-- =============== B. BEHAVIORAL INVARIANTS ===================================
DO $$
DECLARE
    v_user uuid; v_org uuid; v_ptype uuid; v_prop uuid; v_listing uuid;
    v_rule uuid; v_ver uuid; v_calc uuid; v_adv uuid; v_camp uuid; v_budget uuid; v_media uuid; v_listing2 uuid;
    v_locale_chain text[]; n int; v_amt numeric;
BEGIN
    -- fixture: user + org + type + property + listing
    INSERT INTO iam.users (status) VALUES ('active') RETURNING id INTO v_user;
    INSERT INTO org.organizations (type, status, display_name, slug)
        VALUES ('agency', 'active', 'G3 Test Agency', 'g3-test-agency') RETURNING id INTO v_org;
    INSERT INTO org.organization_members (organization_id, user_id, status, joined_at)
        VALUES (v_org, v_user, 'active', now());
    SELECT id INTO v_ptype FROM property.property_types LIMIT 1;
    INSERT INTO property.properties (property_type_id, created_by) VALUES (v_ptype, v_user)
        RETURNING id INTO v_prop;
    INSERT INTO property.owners (property_id, user_id, ownership_share) VALUES (v_prop, v_user, 100);

    -- listings.price_usd? use platform.currencies seeded in base
    INSERT INTO marketplace.listings (property_id, managing_organization_id, created_by_user_id,
        transaction_type, title, currency_code, price)
        VALUES (v_prop, v_org, v_user, 'sale', 'G3 test listing', 'USD', 100000)
        RETURNING id INTO v_listing;
    -- publish needs: price row + cover media + status via allowed transition path
    INSERT INTO marketplace.listing_prices (listing_id, price, currency_code, price_period, valid_from)
        VALUES (v_listing, 100000, 'USD', 'one_time', now());
    INSERT INTO marketplace.media_assets (storage_provider, bucket, object_key, mime_type, size_bytes, sha256_hex)
        VALUES ('local', 'g3', 'g3/cover.bin', 'image/jpeg', 100, repeat('a',64))
        RETURNING id INTO v_media;
    INSERT INTO marketplace.listing_media (listing_id, media_asset_id, media_type, is_cover, sort_order)
        VALUES (v_listing, v_media, 'photo', true, 0);
    UPDATE marketplace.listings SET status = 'pending_moderation' WHERE id = v_listing;
    UPDATE marketplace.listings SET status = 'published' WHERE id = v_listing;
    SELECT count(*) INTO n FROM marketplace.listings WHERE id = v_listing AND status = 'published';
    PERFORM g3_assert('publish_path_allowed', n = 1);

    -- version bump (0024 invariant)
    UPDATE marketplace.listings SET description = 'bump' WHERE id = v_listing;
    -- version accounting: 1 create + 2 status updates + 1 description = 4
    SELECT version INTO n FROM marketplace.listings WHERE id = v_listing;
    PERFORM g3_assert('version_bumped_on_update', n = 4, 'version=' || n);

    -- ---------- commission snapshot flow (OD-03) ----------
    INSERT INTO commission.rules (code, name, party_role, status)
        VALUES ('G3_SALE_OWNER', 'test rule', 'owner', 'UNDECIDED') RETURNING id INTO v_rule;
    INSERT INTO commission.rule_versions (rule_id, version, param_config, param_status)
        VALUES (v_rule, 1, '{"mode":"percent","value":"UNDECIDED"}', 'UNDECIDED')
        RETURNING id INTO v_ver;
    INSERT INTO commission.calculations (listing_id, party_user_id, party_role, rule_id,
        rule_version_id, rule_snapshot, input_snapshot, calc_mode, currency_code)
        VALUES (v_listing, v_user, 'owner', v_rule, v_ver,
                '{"mode":"percent","value":"UNDECIDED"}', '{"deal_amount":100000}', 'percent', 'USD')
        RETURNING id INTO v_calc;
    INSERT INTO commission.calculation_lines (calculation_id, line_type, amount, currency_code)
        VALUES (v_calc, 'base', 100000, 'USD');
    -- snapshot immutability: UPDATE and DELETE must fail
    BEGIN
        UPDATE commission.calculations SET calc_mode = 'fixed' WHERE id = v_calc;
        PERFORM g3_assert('calc_immutable_update', false, 'no error raised');
    EXCEPTION WHEN OTHERS THEN
        PERFORM g3_assert('calc_immutable_update', SQLERRM LIKE 'IMMUTABLE_RECORD%', SQLERRM);
    END;
    BEGIN
        DELETE FROM commission.rule_versions WHERE id = v_ver;
        PERFORM g3_assert('rule_version_immutable_delete', false, 'no error raised');
    EXCEPTION WHEN OTHERS THEN
        PERFORM g3_assert('rule_version_immutable_delete', SQLERRM LIKE 'IMMUTABLE_RECORD%', SQLERRM);
    END;

    -- ---------- advertising budget guard ----------
    INSERT INTO advertising.advertisers (organization_id, name, status)
        VALUES (v_org, 'G3 Advertiser', 'ACTIVE') RETURNING id INTO v_adv;
    INSERT INTO advertising.campaigns (advertiser_id, name, status, pricing_model)
        VALUES (v_adv, 'G3 campaign', 'DRAFT', 'UNDECIDED') RETURNING id INTO v_camp;
    INSERT INTO advertising.budgets (campaign_id, budget_type, limit_amount, currency_code, spent_amount)
        VALUES (v_camp, 'TOTAL', 1000, 'USD', 0) RETURNING id INTO v_budget;
    UPDATE advertising.budgets SET spent_amount = 800 WHERE id = v_budget;
    BEGIN
        UPDATE advertising.budgets SET spent_amount = 1200 WHERE id = v_budget;
        PERFORM g3_assert('budget_guard', false, 'no error raised');
    EXCEPTION WHEN OTHERS THEN
        PERFORM g3_assert('budget_guard', SQLERRM LIKE 'BUDGET_EXCEEDED%', SQLERRM);
    END;

    -- ---------- i18n ----------
    SELECT platform.translation_fallback_chain('ru') INTO v_locale_chain;
    PERFORM g3_assert('fallback_ru', v_locale_chain = ARRAY['ru','en'], v_locale_chain::text);
    SELECT platform.translation_fallback_chain('ka') INTO v_locale_chain;
    PERFORM g3_assert('fallback_other', v_locale_chain = ARRAY['ka','en'], v_locale_chain::text);
    INSERT INTO marketplace.listing_translations (listing_id, locale, title, slug, status)
        VALUES (v_listing, 'en', 'G3 Listing EN', 'g3-listing-en', 'PUBLISHED');
    BEGIN
        INSERT INTO marketplace.listing_translations (listing_id, locale, title, slug)
            VALUES (v_listing, 'en', 'dup locale', 'g3-dup');
        PERFORM g3_assert('translation_dup_locale_rejected', false, 'no error');
    EXCEPTION WHEN unique_violation THEN
        PERFORM g3_assert('translation_dup_locale_rejected', true, SQLERRM);
    END;
    -- slug collision = same slug in SAME locale on another listing
    INSERT INTO marketplace.listings (property_id, created_by_user_id, transaction_type,
        title, currency_code, price)
        VALUES (v_prop, v_user, 'sale', 'second listing', 'USD', 50000)
        RETURNING id INTO v_listing2;
    BEGIN
        INSERT INTO marketplace.listing_translations (listing_id, locale, title, slug)
            VALUES (v_listing2, 'en', 'EN dup slug', 'g3-listing-en');
        PERFORM g3_assert('translation_slug_unique_per_locale', false, 'no error');
    EXCEPTION WHEN unique_violation THEN
        PERFORM g3_assert('translation_slug_unique_per_locale', true, SQLERRM);
    END;
    -- same slug in a DIFFERENT locale is allowed (locale-prefixed URLs)
    INSERT INTO marketplace.listing_translations (listing_id, locale, title, slug, status)
        VALUES (v_listing, 'ru', 'G3 RU', 'g3-listing-en', 'PUBLISHED');
    PERFORM g3_assert('translation_cross_locale_slug_ok', true);
    BEGIN
        INSERT INTO iam.user_translations (user_id, locale, bio) VALUES (v_user, 'ukr', '3-letter code');
        PERFORM g3_assert('invalid_locale_format_rejected', false, 'no error');
    EXCEPTION WHEN check_violation THEN
        PERFORM g3_assert('invalid_locale_format_rejected', true, SQLERRM);
    END;
    -- 'zz' is FORMAT-valid by design (future locales need no refactor)

    -- ---------- two-layer authorization ----------
    -- personal grant resolves WITHOUT any organization
    INSERT INTO iam.user_permission_grants (user_id, permission_id, source,
        resource_type, resource_id)
        SELECT v_user, p.id, 'PERSONAL_OWNERSHIP', 'listing', v_listing
          FROM iam.permissions p WHERE p.code = 'listing.update';
    SELECT count(*) INTO n FROM iam.effective_permissions(v_user, NULL)
     WHERE permission_code = 'listing.update';
    PERFORM g3_assert('personal_scope_without_org', n = 1, 'rows=' || n);
    -- org role resolution
    INSERT INTO org.member_roles (member_id, role_id)
        SELECT m.id, r.id FROM org.organization_members m, iam.roles r
         WHERE m.organization_id = v_org AND m.user_id = v_user AND r.code = 'org_admin';
    SELECT count(*) INTO n FROM iam.effective_permissions(v_user, v_org)
     WHERE permission_code = 'listing.publish';
    PERFORM g3_assert('org_scope_role_resolution', n = 1, 'rows=' || n);
    -- listing assignment layer
    INSERT INTO marketplace.listing_assignments (listing_id, user_id, assignment_type)
        VALUES (v_listing, v_user, 'AGENT');
    SELECT count(*) INTO n FROM iam.effective_permissions(v_user, NULL)
     WHERE permission_code = 'listing.manage';
    PERFORM g3_assert('assignment_layer', n = 1, 'rows=' || n);
    -- owner functions (OD-08: owner without org)
    PERFORM g3_assert('is_property_owner', iam.is_property_owner(v_user, v_prop));
    PERFORM g3_assert('is_listing_owner', iam.is_listing_owner(v_user, v_listing));

    -- ---------- state machine guard ----------
    BEGIN
        UPDATE marketplace.listings SET status = 'paused' WHERE id = v_listing;  -- published→paused legal
        PERFORM g3_assert('transition_legal', true);
    EXCEPTION WHEN OTHERS THEN
        PERFORM g3_assert('transition_legal', false, SQLERRM);
    END;
    BEGIN
        UPDATE marketplace.listings SET status = 'published' WHERE id = v_listing; -- paused→published legal
        UPDATE marketplace.listings SET status = 'draft' WHERE id = v_listing;     -- published→draft ILLEGAL
        PERFORM g3_assert('transition_illegal_rejected', false, 'no error');
    EXCEPTION WHEN OTHERS THEN
        PERFORM g3_assert('transition_illegal_rejected', SQLERRM LIKE 'Invalid listing status transition%', SQLERRM);
    END;

    -- additive-state transitions accepted by the unified guard
    INSERT INTO marketplace.listings (property_id, created_by_user_id, transaction_type,
        title, currency_code, price)
        VALUES (v_prop, v_user, 'sale', 'state machine probe', 'USD', 10000)
        RETURNING id INTO v_listing2;
    INSERT INTO marketplace.listing_prices (listing_id, price, currency_code, price_period, valid_from)
        VALUES (v_listing2, 10000, 'USD', 'one_time', now());
    INSERT INTO marketplace.listing_media (listing_id, media_asset_id, media_type, is_cover, sort_order)
        VALUES (v_listing2, v_media, 'photo', true, 0);
    BEGIN
        UPDATE marketplace.listings SET status = 'pending_verification' WHERE id = v_listing2;
        UPDATE marketplace.listings SET status = 'pending_moderation' WHERE id = v_listing2;
        UPDATE marketplace.listings SET status = 'published' WHERE id = v_listing2;
        UPDATE marketplace.listings SET status = 'reserved' WHERE id = v_listing2;      -- requires lease? matrix-level ok
        UPDATE marketplace.listings SET status = 'under_contract' WHERE id = v_listing2;
        UPDATE marketplace.listings SET status = 'sold' WHERE id = v_listing2;
        PERFORM g3_assert('additive_states_transitions', true);
    EXCEPTION WHEN OTHERS THEN
        PERFORM g3_assert('additive_states_transitions', false, SQLERRM);
    END;

    -- ---------- derived projection (OD-09) ----------
    SELECT count(*) INTO n FROM marketplace.v_listing_derived_status
     WHERE listing_id = v_listing AND canonical_status = 'paused' AND derived_state = 'none';
    PERFORM g3_assert('derived_view_projection', n = 1);

    -- ---------- outbox pairing (base invariant) ----------
    INSERT INTO audit.outbox_events (aggregate_type, aggregate_id, event_type, payload)
        VALUES ('g3_test', v_listing, 'G3Test.v1', '{"x":1}'::jsonb);
    SELECT count(*) INTO n FROM audit.outbox_events
     WHERE aggregate_type = 'g3_test' AND published_at IS NULL;
    PERFORM g3_assert('outbox_append_pending', n = 1);

    -- ---------- publish integrity (0024, non-deferred trigger) ----------
    BEGIN
        INSERT INTO marketplace.listings (property_id, created_by_user_id, transaction_type,
            title, currency_code, price, status)
            VALUES (v_prop, v_user, 'sale', 'no cover', 'USD', 1, 'published');
        PERFORM g3_assert('publish_requires_price_cover', false, 'no error');
    EXCEPTION WHEN OTHERS THEN
        PERFORM g3_assert('publish_requires_price_cover', SQLERRM LIKE 'LISTING_NOT_PUBLISHABLE%', SQLERRM);
    END;

    -- cleanup fixture is NOT needed (scratch database)
END $$;

-- report
SELECT g3_test, g3_result, detail FROM g3_results ORDER BY (g3_result = 'FAIL') DESC, g3_test;
SELECT count(*) FILTER (WHERE g3_result = 'FAIL') AS failures,
       count(*) AS total
FROM g3_results;
