--
-- PostgreSQL database dump
--

\restrict vXbRzE9l3zik02Mm2PXqL2TNDGuiOG2hq6DrFlBXzyFqcw3fR6DVZh2LXMcvd1Z

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: advertising; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA advertising;


ALTER SCHEMA advertising OWNER TO postgres;

--
-- Name: audit; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA audit;


ALTER SCHEMA audit OWNER TO postgres;

--
-- Name: billing; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA billing;


ALTER SCHEMA billing OWNER TO postgres;

--
-- Name: commission; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA commission;


ALTER SCHEMA commission OWNER TO postgres;

--
-- Name: content; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA content;


ALTER SCHEMA content OWNER TO postgres;

--
-- Name: crm; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA crm;


ALTER SCHEMA crm OWNER TO postgres;

--
-- Name: geo; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA geo;


ALTER SCHEMA geo OWNER TO postgres;

--
-- Name: iam; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA iam;


ALTER SCHEMA iam OWNER TO postgres;

--
-- Name: legal; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA legal;


ALTER SCHEMA legal OWNER TO postgres;

--
-- Name: marketplace; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA marketplace;


ALTER SCHEMA marketplace OWNER TO postgres;

--
-- Name: messaging; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA messaging;


ALTER SCHEMA messaging OWNER TO postgres;

--
-- Name: moderation; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA moderation;


ALTER SCHEMA moderation OWNER TO postgres;

--
-- Name: notification; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA notification;


ALTER SCHEMA notification OWNER TO postgres;

--
-- Name: org; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA org;


ALTER SCHEMA org OWNER TO postgres;

--
-- Name: platform; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA platform;


ALTER SCHEMA platform OWNER TO postgres;

--
-- Name: project; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA project;


ALTER SCHEMA project OWNER TO postgres;

--
-- Name: property; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA property;


ALTER SCHEMA property OWNER TO postgres;

--
-- Name: rental; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA rental;


ALTER SCHEMA rental OWNER TO postgres;

--
-- Name: review; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA review;


ALTER SCHEMA review OWNER TO postgres;

--
-- Name: valuation; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA valuation;


ALTER SCHEMA valuation OWNER TO postgres;

--
-- Name: verification; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA verification;


ALTER SCHEMA verification OWNER TO postgres;

--
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- Name: EXTENSION btree_gist; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION btree_gist IS 'support for indexing common datatypes in GiST';


--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: ledger_account_type; Type: TYPE; Schema: billing; Owner: postgres
--

CREATE TYPE billing.ledger_account_type AS ENUM (
    'asset',
    'liability',
    'revenue',
    'expense',
    'equity',
    'clearing'
);


ALTER TYPE billing.ledger_account_type OWNER TO postgres;

--
-- Name: ledger_entry_side; Type: TYPE; Schema: billing; Owner: postgres
--

CREATE TYPE billing.ledger_entry_side AS ENUM (
    'debit',
    'credit'
);


ALTER TYPE billing.ledger_entry_side OWNER TO postgres;

--
-- Name: order_status; Type: TYPE; Schema: billing; Owner: postgres
--

CREATE TYPE billing.order_status AS ENUM (
    'pending',
    'paid',
    'partially_refunded',
    'refunded',
    'cancelled',
    'failed'
);


ALTER TYPE billing.order_status OWNER TO postgres;

--
-- Name: payment_status; Type: TYPE; Schema: billing; Owner: postgres
--

CREATE TYPE billing.payment_status AS ENUM (
    'created',
    'pending',
    'processing',
    'succeeded',
    'failed',
    'cancelled'
);


ALTER TYPE billing.payment_status OWNER TO postgres;

--
-- Name: refund_status; Type: TYPE; Schema: billing; Owner: postgres
--

CREATE TYPE billing.refund_status AS ENUM (
    'requested',
    'processing',
    'completed',
    'failed',
    'cancelled'
);


ALTER TYPE billing.refund_status OWNER TO postgres;

--
-- Name: subscription_status; Type: TYPE; Schema: billing; Owner: postgres
--

CREATE TYPE billing.subscription_status AS ENUM (
    'trialing',
    'active',
    'past_due',
    'paused',
    'cancelled',
    'expired'
);


ALTER TYPE billing.subscription_status OWNER TO postgres;

--
-- Name: publish_status; Type: TYPE; Schema: content; Owner: postgres
--

CREATE TYPE content.publish_status AS ENUM (
    'draft',
    'review',
    'published',
    'unpublished',
    'archived'
);


ALTER TYPE content.publish_status OWNER TO postgres;

--
-- Name: activity_type; Type: TYPE; Schema: crm; Owner: postgres
--

CREATE TYPE crm.activity_type AS ENUM (
    'note',
    'call',
    'email',
    'sms',
    'whatsapp',
    'meeting',
    'status_change',
    'task',
    'viewing',
    'other'
);


ALTER TYPE crm.activity_type OWNER TO postgres;

--
-- Name: lead_status; Type: TYPE; Schema: crm; Owner: postgres
--

CREATE TYPE crm.lead_status AS ENUM (
    'new',
    'contacted',
    'qualified',
    'viewing_scheduled',
    'negotiation',
    'won',
    'lost',
    'archived'
);


ALTER TYPE crm.lead_status OWNER TO postgres;

--
-- Name: viewing_status; Type: TYPE; Schema: crm; Owner: postgres
--

CREATE TYPE crm.viewing_status AS ENUM (
    'requested',
    'confirmed',
    'completed',
    'cancelled',
    'no_show'
);


ALTER TYPE crm.viewing_status OWNER TO postgres;

--
-- Name: contract_status; Type: TYPE; Schema: legal; Owner: postgres
--

CREATE TYPE legal.contract_status AS ENUM (
    'draft',
    'review',
    'ready_for_signature',
    'partially_signed',
    'active',
    'expired',
    'terminated',
    'cancelled'
);


ALTER TYPE legal.contract_status OWNER TO postgres;

--
-- Name: signature_status; Type: TYPE; Schema: legal; Owner: postgres
--

CREATE TYPE legal.signature_status AS ENUM (
    'pending',
    'signed',
    'declined',
    'expired',
    'cancelled'
);


ALTER TYPE legal.signature_status OWNER TO postgres;

--
-- Name: listing_status; Type: TYPE; Schema: marketplace; Owner: postgres
--

CREATE TYPE marketplace.listing_status AS ENUM (
    'draft',
    'pending_moderation',
    'published',
    'paused',
    'rejected',
    'expired',
    'sold',
    'rented',
    'archived',
    'deleted',
    'pending_verification',
    'reserved',
    'under_contract'
);


ALTER TYPE marketplace.listing_status OWNER TO postgres;

--
-- Name: media_type; Type: TYPE; Schema: marketplace; Owner: postgres
--

CREATE TYPE marketplace.media_type AS ENUM (
    'photo',
    'video',
    'floor_plan',
    'virtual_tour',
    'document',
    'other'
);


ALTER TYPE marketplace.media_type OWNER TO postgres;

--
-- Name: price_period; Type: TYPE; Schema: marketplace; Owner: postgres
--

CREATE TYPE marketplace.price_period AS ENUM (
    'one_time',
    'monthly',
    'weekly',
    'daily'
);


ALTER TYPE marketplace.price_period OWNER TO postgres;

--
-- Name: promotion_type; Type: TYPE; Schema: marketplace; Owner: postgres
--

CREATE TYPE marketplace.promotion_type AS ENUM (
    'vip',
    'super_vip',
    'homepage',
    'category_boost',
    'map_boost',
    'refresh',
    'featured'
);


ALTER TYPE marketplace.promotion_type OWNER TO postgres;

--
-- Name: transaction_type; Type: TYPE; Schema: marketplace; Owner: postgres
--

CREATE TYPE marketplace.transaction_type AS ENUM (
    'sale',
    'rent',
    'daily_rent',
    'lease',
    'pledge'
);


ALTER TYPE marketplace.transaction_type OWNER TO postgres;

--
-- Name: conversation_type; Type: TYPE; Schema: messaging; Owner: postgres
--

CREATE TYPE messaging.conversation_type AS ENUM (
    'listing_inquiry',
    'lead',
    'support',
    'system'
);


ALTER TYPE messaging.conversation_type OWNER TO postgres;

--
-- Name: message_type; Type: TYPE; Schema: messaging; Owner: postgres
--

CREATE TYPE messaging.message_type AS ENUM (
    'text',
    'image',
    'file',
    'system'
);


ALTER TYPE messaging.message_type OWNER TO postgres;

--
-- Name: case_status; Type: TYPE; Schema: moderation; Owner: postgres
--

CREATE TYPE moderation.case_status AS ENUM (
    'open',
    'in_review',
    'resolved',
    'rejected',
    'dismissed'
);


ALTER TYPE moderation.case_status OWNER TO postgres;

--
-- Name: report_status; Type: TYPE; Schema: moderation; Owner: postgres
--

CREATE TYPE moderation.report_status AS ENUM (
    'open',
    'triaged',
    'resolved',
    'rejected',
    'dismissed'
);


ALTER TYPE moderation.report_status OWNER TO postgres;

--
-- Name: membership_status; Type: TYPE; Schema: platform; Owner: postgres
--

CREATE TYPE platform.membership_status AS ENUM (
    'invited',
    'active',
    'suspended',
    'left'
);


ALTER TYPE platform.membership_status OWNER TO postgres;

--
-- Name: organization_status; Type: TYPE; Schema: platform; Owner: postgres
--

CREATE TYPE platform.organization_status AS ENUM (
    'pending',
    'active',
    'suspended',
    'blocked',
    'closed'
);


ALTER TYPE platform.organization_status OWNER TO postgres;

--
-- Name: organization_type; Type: TYPE; Schema: platform; Owner: postgres
--

CREATE TYPE platform.organization_type AS ENUM (
    'agency',
    'developer',
    'service_provider',
    'corporate_owner',
    'bank',
    'partner',
    'other'
);


ALTER TYPE platform.organization_type OWNER TO postgres;

--
-- Name: user_status; Type: TYPE; Schema: platform; Owner: postgres
--

CREATE TYPE platform.user_status AS ENUM (
    'pending',
    'active',
    'suspended',
    'blocked',
    'deleted'
);


ALTER TYPE platform.user_status OWNER TO postgres;

--
-- Name: ownership_type; Type: TYPE; Schema: property; Owner: postgres
--

CREATE TYPE property.ownership_type AS ENUM (
    'individual',
    'organization',
    'joint',
    'unknown'
);


ALTER TYPE property.ownership_type OWNER TO postgres;

--
-- Name: property_status; Type: TYPE; Schema: property; Owner: postgres
--

CREATE TYPE property.property_status AS ENUM (
    'draft',
    'active',
    'inactive',
    'sold',
    'rented',
    'archived',
    'deleted'
);


ALTER TYPE property.property_status OWNER TO postgres;

--
-- Name: visibility_level; Type: TYPE; Schema: property; Owner: postgres
--

CREATE TYPE property.visibility_level AS ENUM (
    'exact',
    'approximate',
    'district_only',
    'hidden'
);


ALTER TYPE property.visibility_level OWNER TO postgres;

--
-- Name: lease_status; Type: TYPE; Schema: rental; Owner: postgres
--

CREATE TYPE rental.lease_status AS ENUM (
    'draft',
    'pending_signature',
    'active',
    'expired',
    'terminated',
    'cancelled'
);


ALTER TYPE rental.lease_status OWNER TO postgres;

--
-- Name: maintenance_status; Type: TYPE; Schema: rental; Owner: postgres
--

CREATE TYPE rental.maintenance_status AS ENUM (
    'open',
    'assigned',
    'in_progress',
    'completed',
    'cancelled'
);


ALTER TYPE rental.maintenance_status OWNER TO postgres;

--
-- Name: rent_payment_status; Type: TYPE; Schema: rental; Owner: postgres
--

CREATE TYPE rental.rent_payment_status AS ENUM (
    'scheduled',
    'pending',
    'paid',
    'late',
    'partially_paid',
    'waived',
    'cancelled'
);


ALTER TYPE rental.rent_payment_status OWNER TO postgres;

--
-- Name: review_status; Type: TYPE; Schema: review; Owner: postgres
--

CREATE TYPE review.review_status AS ENUM (
    'pending',
    'published',
    'rejected',
    'hidden'
);


ALTER TYPE review.review_status OWNER TO postgres;

--
-- Name: valuation_status; Type: TYPE; Schema: valuation; Owner: postgres
--

CREATE TYPE valuation.valuation_status AS ENUM (
    'requested',
    'processing',
    'completed',
    'failed',
    'expired'
);


ALTER TYPE valuation.valuation_status OWNER TO postgres;

--
-- Name: case_type; Type: TYPE; Schema: verification; Owner: postgres
--

CREATE TYPE verification.case_type AS ENUM (
    'phone',
    'email',
    'identity',
    'agent',
    'organization',
    'developer',
    'property',
    'ownership',
    'document'
);


ALTER TYPE verification.case_type OWNER TO postgres;

--
-- Name: verification_status; Type: TYPE; Schema: verification; Owner: postgres
--

CREATE TYPE verification.verification_status AS ENUM (
    'pending',
    'in_progress',
    'verified',
    'rejected',
    'expired',
    'cancelled'
);


ALTER TYPE verification.verification_status OWNER TO postgres;

--
-- Name: guard_budget_limit(); Type: FUNCTION; Schema: advertising; Owner: postgres
--

CREATE FUNCTION advertising.guard_budget_limit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.spent_amount > NEW.limit_amount THEN
        RAISE EXCEPTION 'BUDGET_EXCEEDED: campaign % budget % exceeded', NEW.campaign_id, NEW.budget_type;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION advertising.guard_budget_limit() OWNER TO postgres;

--
-- Name: validate_ledger_entry_currency(); Type: FUNCTION; Schema: billing; Owner: postgres
--

CREATE FUNCTION billing.validate_ledger_entry_currency() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_account_currency char(3);
    v_tx_currency char(3);
BEGIN
    SELECT currency_code INTO v_account_currency FROM billing.ledger_accounts WHERE id = NEW.account_id;
    SELECT currency_code INTO v_tx_currency FROM billing.ledger_transactions WHERE id = NEW.transaction_id;
    IF v_account_currency IS DISTINCT FROM v_tx_currency THEN
        RAISE EXCEPTION 'Ledger account currency % does not match transaction currency %', v_account_currency, v_tx_currency;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION billing.validate_ledger_entry_currency() OWNER TO postgres;

--
-- Name: validate_ledger_transaction(); Type: FUNCTION; Schema: billing; Owner: postgres
--

CREATE FUNCTION billing.validate_ledger_transaction() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_debit numeric(30,4);
    v_credit numeric(30,4);
    v_count integer;
BEGIN
    SELECT COUNT(*),
           COALESCE(SUM(CASE WHEN side = 'debit' THEN amount ELSE 0 END),0),
           COALESCE(SUM(CASE WHEN side = 'credit' THEN amount ELSE 0 END),0)
      INTO v_count, v_debit, v_credit
      FROM billing.ledger_entries
     WHERE transaction_id = COALESCE(NEW.transaction_id, OLD.transaction_id);

    IF v_count < 2 THEN
        RAISE EXCEPTION 'Ledger transaction % must have at least two entries', COALESCE(NEW.transaction_id, OLD.transaction_id);
    END IF;

    IF v_debit <= 0 OR v_credit <= 0 OR v_debit <> v_credit THEN
        RAISE EXCEPTION 'Ledger transaction % is unbalanced: debit=% credit=%', COALESCE(NEW.transaction_id, OLD.transaction_id), v_debit, v_credit;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION billing.validate_ledger_transaction() OWNER TO postgres;

--
-- Name: validate_payment_currency(); Type: FUNCTION; Schema: billing; Owner: postgres
--

CREATE FUNCTION billing.validate_payment_currency() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_currency char(3);
BEGIN
    SELECT currency_code INTO v_currency FROM billing.orders WHERE id = NEW.order_id;
    IF v_currency IS DISTINCT FROM NEW.currency_code THEN
        RAISE EXCEPTION 'Payment currency % does not match order currency %', NEW.currency_code, v_currency;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION billing.validate_payment_currency() OWNER TO postgres;

--
-- Name: forbid_mutation(); Type: FUNCTION; Schema: commission; Owner: postgres
--

CREATE FUNCTION commission.forbid_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'IMMUTABLE_RECORD: % rows are snapshot-based and cannot be modified (OD-03/W0-E)', TG_TABLE_NAME;
END;
$$;


ALTER FUNCTION commission.forbid_mutation() OWNER TO postgres;

--
-- Name: guard_rule_delete(); Type: FUNCTION; Schema: commission; Owner: postgres
--

CREATE FUNCTION commission.guard_rule_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM commission.calculations c WHERE c.rule_id = OLD.id) THEN
        RAISE EXCEPTION 'RULE_IN_USE: rule has snapshot-backed calculations; use status=RETIRED instead';
    END IF;
    RETURN OLD;
END;
$$;


ALTER FUNCTION commission.guard_rule_delete() OWNER TO postgres;

--
-- Name: effective_permissions(uuid, uuid); Type: FUNCTION; Schema: iam; Owner: postgres
--

CREATE FUNCTION iam.effective_permissions(p_user_id uuid, p_organization_id uuid DEFAULT NULL::uuid) RETURNS TABLE(permission_code text, source text)
    LANGUAGE sql STABLE
    AS $$
    SELECT rp2.code, 'ORG_ROLE'::text
      FROM org.organization_members m
      JOIN org.member_roles mr ON mr.member_id = m.id
      JOIN iam.role_permissions rp ON rp.role_id = mr.role_id
      JOIN iam.permissions rp2 ON rp2.id = rp.permission_id
     WHERE m.user_id = p_user_id
       AND m.status = 'active'
       AND (p_organization_id IS NULL OR m.organization_id = p_organization_id)
    UNION
    SELECT p.code,
           CASE g.source
               WHEN 'PERSONAL_OWNERSHIP' THEN 'PERSONAL_OWNERSHIP'
               WHEN 'DELEGATION' THEN 'DELEGATION'
               ELSE 'DIRECT'
           END
      FROM iam.user_permission_grants g
      JOIN iam.permissions p ON p.id = g.permission_id
     WHERE g.user_id = p_user_id
       AND (g.expires_at IS NULL OR g.expires_at > now())
    UNION
    SELECT 'listing.manage'::text, 'LISTING_ASSIGNMENT'::text
      FROM marketplace.listing_assignments la
     WHERE la.user_id = p_user_id
       AND la.status = 'ACTIVE'
       AND (la.expires_at IS NULL OR la.expires_at > now())
       AND p_organization_id IS NULL;
$$;


ALTER FUNCTION iam.effective_permissions(p_user_id uuid, p_organization_id uuid) OWNER TO postgres;

--
-- Name: is_listing_owner(uuid, uuid); Type: FUNCTION; Schema: iam; Owner: postgres
--

CREATE FUNCTION iam.is_listing_owner(p_user_id uuid, p_listing_id uuid) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM marketplace.listings l
         WHERE l.id = p_listing_id
           AND l.created_by_user_id = p_user_id
    );
$$;


ALTER FUNCTION iam.is_listing_owner(p_user_id uuid, p_listing_id uuid) OWNER TO postgres;

--
-- Name: is_property_owner(uuid, uuid); Type: FUNCTION; Schema: iam; Owner: postgres
--

CREATE FUNCTION iam.is_property_owner(p_user_id uuid, p_property_id uuid) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM property.owners o
         WHERE o.property_id = p_property_id
           AND o.user_id = p_user_id
    );
$$;


ALTER FUNCTION iam.is_property_owner(p_user_id uuid, p_property_id uuid) OWNER TO postgres;

--
-- Name: assert_published_listing_integrity(uuid); Type: FUNCTION; Schema: marketplace; Owner: postgres
--

CREATE FUNCTION marketplace.assert_published_listing_integrity(p_listing_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_status marketplace.listing_status;
  v_published_at timestamptz;
  v_price numeric;
  v_currency char(3);
  v_period marketplace.price_period;
  v_has_price boolean;
  v_has_cover boolean;
BEGIN
  SELECT status, published_at, price, currency_code, price_period
    INTO v_status, v_published_at, v_price, v_currency, v_period
    FROM marketplace.listings WHERE id = p_listing_id;

  IF v_status <> 'published' THEN RETURN; END IF;

  SELECT EXISTS (
    SELECT 1 FROM marketplace.listing_prices lp
    WHERE lp.listing_id = p_listing_id
      AND lp.valid_from <= COALESCE(v_published_at, now())
      AND (lp.valid_to IS NULL OR lp.valid_to > COALESCE(v_published_at, now()))
      AND lp.price = v_price AND lp.currency_code = v_currency AND lp.price_period = v_period
  ) INTO v_has_price;

  SELECT EXISTS (
    SELECT 1 FROM marketplace.listing_media lm
    WHERE lm.listing_id = p_listing_id AND lm.is_cover
  ) INTO v_has_cover;

  IF NOT v_has_price THEN RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'LISTING_NOT_PUBLISHABLE: missing valid current price'; END IF;
  IF NOT v_has_cover THEN RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'LISTING_NOT_PUBLISHABLE: missing cover media'; END IF;
END;
$$;


ALTER FUNCTION marketplace.assert_published_listing_integrity(p_listing_id uuid) OWNER TO postgres;

--
-- Name: bump_listing_version(); Type: FUNCTION; Schema: marketplace; Owner: postgres
--

CREATE FUNCTION marketplace.bump_listing_version() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;


ALTER FUNCTION marketplace.bump_listing_version() OWNER TO postgres;

--
-- Name: record_listing_status_history(); Type: FUNCTION; Schema: marketplace; Owner: postgres
--

CREATE FUNCTION marketplace.record_listing_status_history() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE v_actor uuid; v_reason text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    BEGIN v_actor := NULLIF(current_setting('app.actor_user_id', true), '')::uuid; EXCEPTION WHEN invalid_text_representation THEN v_actor := NULL; END;
    v_reason := NULLIF(current_setting('app.status_change_reason', true), '');
    INSERT INTO marketplace.listing_status_history(listing_id, from_status, to_status, reason, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, v_reason, COALESCE(v_actor, NEW.created_by_user_id));
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION marketplace.record_listing_status_history() OWNER TO postgres;

--
-- Name: trg_assert_published_listing_integrity(); Type: FUNCTION; Schema: marketplace; Owner: postgres
--

CREATE FUNCTION marketplace.trg_assert_published_listing_integrity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM marketplace.assert_published_listing_integrity(NEW.id);
  RETURN NULL;
END;
$$;


ALTER FUNCTION marketplace.trg_assert_published_listing_integrity() OWNER TO postgres;

--
-- Name: validate_listing_property_state(); Type: FUNCTION; Schema: marketplace; Owner: postgres
--

CREATE FUNCTION marketplace.validate_listing_property_state() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE v_status property.property_status;
BEGIN
    SELECT status INTO v_status FROM property.properties WHERE id = NEW.property_id;
    IF NEW.status = 'published' AND v_status IN ('deleted','archived') THEN
        RAISE EXCEPTION 'Published listing % cannot reference property % in status %', NEW.id, NEW.property_id, v_status;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION marketplace.validate_listing_property_state() OWNER TO postgres;

--
-- Name: validate_listing_publication_fields(); Type: FUNCTION; Schema: marketplace; Owner: postgres
--

CREATE FUNCTION marketplace.validate_listing_publication_fields() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN NEW.published_at := now(); END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION marketplace.validate_listing_publication_fields() OWNER TO postgres;

--
-- Name: validate_listing_transition(); Type: FUNCTION; Schema: marketplace; Owner: postgres
--

CREATE FUNCTION marketplace.validate_listing_transition() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.status = OLD.status THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'deleted' THEN
        RAISE EXCEPTION 'Deleted listing % cannot transition to %', NEW.id, NEW.status;
    END IF;

    -- cleanup path: any non-deleted state may go to deleted (frozen contract)
    IF NEW.status <> 'deleted' AND NOT EXISTS (
        SELECT 1 FROM marketplace.listing_transition_rules r
         WHERE r.from_status = OLD.status
           AND r.to_status = NEW.status
    ) THEN
        RAISE EXCEPTION 'Invalid listing status transition: % -> % (canonical 12-state machine, OD-09)',
            OLD.status, NEW.status USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION marketplace.validate_listing_transition() OWNER TO postgres;

--
-- Name: validate_published_listing_children(); Type: FUNCTION; Schema: marketplace; Owner: postgres
--

CREATE FUNCTION marketplace.validate_published_listing_children() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE v_listing_id uuid;
BEGIN
  v_listing_id := COALESCE(NEW.listing_id, OLD.listing_id);
  PERFORM marketplace.assert_published_listing_integrity(v_listing_id);
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;


ALTER FUNCTION marketplace.validate_published_listing_children() OWNER TO postgres;

--
-- Name: validate_published_listing_requirements(); Type: FUNCTION; Schema: marketplace; Owner: postgres
--

CREATE FUNCTION marketplace.validate_published_listing_requirements() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_has_price boolean;
    v_has_cover boolean;
BEGIN
    IF NEW.status = 'published' THEN
        SELECT EXISTS (
            SELECT 1
            FROM marketplace.listing_prices lp
            WHERE lp.listing_id = NEW.id
              AND lp.valid_from <= COALESCE(NEW.published_at, now())
              AND (lp.valid_to IS NULL OR lp.valid_to > COALESCE(NEW.published_at, now()))
              AND lp.price = NEW.price
              AND lp.currency_code = NEW.currency_code
              AND lp.price_period = NEW.price_period
        ) INTO v_has_price;

        SELECT EXISTS (
            SELECT 1 FROM marketplace.listing_media lm
            WHERE lm.listing_id = NEW.id AND lm.is_cover = true
        ) INTO v_has_cover;

        IF NOT v_has_price THEN
            RAISE EXCEPTION 'Published listing % must have a current listing_prices row matching its amount/currency/period', NEW.id;
        END IF;
        IF NOT v_has_cover THEN
            RAISE EXCEPTION 'Published listing % must have a cover media item', NEW.id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION marketplace.validate_published_listing_requirements() OWNER TO postgres;

--
-- Name: validate_profile_type(); Type: FUNCTION; Schema: org; Owner: postgres
--

CREATE FUNCTION org.validate_profile_type() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_type platform.organization_type;
BEGIN
    SELECT type INTO v_type FROM org.organizations WHERE id = NEW.organization_id;
    IF TG_TABLE_NAME = 'agency_profiles' AND v_type <> 'agency' THEN
        RAISE EXCEPTION 'Organization % is not an agency', NEW.organization_id;
    END IF;
    IF TG_TABLE_NAME = 'developer_profiles' AND v_type <> 'developer' THEN
        RAISE EXCEPTION 'Organization % is not a developer', NEW.organization_id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION org.validate_profile_type() OWNER TO postgres;

--
-- Name: is_blocked(text, text); Type: FUNCTION; Schema: platform; Owner: postgres
--

CREATE FUNCTION platform.is_blocked(p_subject_type text, p_subject_key text) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM platform.blocks
        WHERE subject_type = p_subject_type
          AND subject_key  = p_subject_key
          AND expires_at > now()
    )
$$;


ALTER FUNCTION platform.is_blocked(p_subject_type text, p_subject_key text) OWNER TO postgres;

--
-- Name: is_valid_locale(text); Type: FUNCTION; Schema: platform; Owner: postgres
--

CREATE FUNCTION platform.is_valid_locale(p_locale text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $_$
BEGIN
    RETURN p_locale ~ '^[a-z]{2}(-[A-Z]{2})?$';
END;
$_$;


ALTER FUNCTION platform.is_valid_locale(p_locale text) OWNER TO postgres;

--
-- Name: touch_updated_at(); Type: FUNCTION; Schema: platform; Owner: postgres
--

CREATE FUNCTION platform.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION platform.touch_updated_at() OWNER TO postgres;

--
-- Name: translation_fallback_chain(text); Type: FUNCTION; Schema: platform; Owner: postgres
--

CREATE FUNCTION platform.translation_fallback_chain(p_locale text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    base text;
BEGIN
    base := split_part(p_locale, '-', 1);
    IF base = 'ru' THEN
        RETURN ARRAY['ru', 'en'];
    ELSIF base = 'en' THEN
        RETURN ARRAY['en'];
    ELSE
        RETURN array_prepend(p_locale, ARRAY['en']);
    END IF;
END;
$$;


ALTER FUNCTION platform.translation_fallback_chain(p_locale text) OWNER TO postgres;

--
-- Name: validate_developer_org_type(); Type: FUNCTION; Schema: project; Owner: postgres
--

CREATE FUNCTION project.validate_developer_org_type() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_type platform.organization_type;
BEGIN
    SELECT type INTO v_type FROM org.organizations WHERE id = NEW.developer_organization_id;
    IF v_type <> 'developer' THEN
        RAISE EXCEPTION 'Organization % is not a developer', NEW.developer_organization_id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION project.validate_developer_org_type() OWNER TO postgres;

--
-- Name: prevent_owner_share_overflow(); Type: FUNCTION; Schema: property; Owner: postgres
--

CREATE FUNCTION property.prevent_owner_share_overflow() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM property.validate_owner_share_total(OLD.property_id);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM property.validate_owner_share_total(OLD.property_id);
        PERFORM property.validate_owner_share_total(NEW.property_id);
        RETURN NEW;
    ELSE
        PERFORM property.validate_owner_share_total(NEW.property_id);
        RETURN NEW;
    END IF;
END;
$$;


ALTER FUNCTION property.prevent_owner_share_overflow() OWNER TO postgres;

--
-- Name: validate_active_property_ownership(); Type: FUNCTION; Schema: property; Owner: postgres
--

CREATE FUNCTION property.validate_active_property_ownership() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
        PERFORM property.validate_owner_share_total(NEW.id);
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION property.validate_active_property_ownership() OWNER TO postgres;

--
-- Name: validate_owner_share_total(uuid); Type: FUNCTION; Schema: property; Owner: postgres
--

CREATE FUNCTION property.validate_owner_share_total(p_property_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_total numeric(9,4);
    v_status property.property_status;
BEGIN
    SELECT COALESCE(SUM(ownership_share),0) INTO v_total
      FROM property.owners WHERE property_id = p_property_id;

    SELECT status INTO v_status
      FROM property.properties WHERE id = p_property_id;

    IF v_total > 100.0000 THEN
        RAISE EXCEPTION 'Ownership shares for property % exceed 100%%', p_property_id;
    END IF;

    IF v_status IN ('active','sold','rented') AND v_total <> 100.0000 THEN
        RAISE EXCEPTION 'Ownership shares for active property % must equal 100%%; current total=%', p_property_id, v_total;
    END IF;
END;
$$;


ALTER FUNCTION property.validate_owner_share_total(p_property_id uuid) OWNER TO postgres;

--
-- Name: validate_property_subtype(); Type: FUNCTION; Schema: property; Owner: postgres
--

CREATE FUNCTION property.validate_property_subtype() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_code text;
BEGIN
    SELECT code INTO v_code FROM property.property_types WHERE id = NEW.property_type_id;
    IF TG_TABLE_NAME = 'apartment_details' AND v_code NOT IN ('apartment','villa','country_house') THEN
        RAISE EXCEPTION 'Property % type % cannot have apartment_details', NEW.property_id, v_code;
    ELSIF TG_TABLE_NAME = 'house_details' AND v_code NOT IN ('house','villa','country_house') THEN
        RAISE EXCEPTION 'Property % type % cannot have house_details', NEW.property_id, v_code;
    ELSIF TG_TABLE_NAME = 'land_details' AND v_code <> 'land' THEN
        RAISE EXCEPTION 'Property % type % cannot have land_details', NEW.property_id, v_code;
    ELSIF TG_TABLE_NAME = 'commercial_details' AND v_code NOT IN ('commercial','office','retail','warehouse','parking','storage') THEN
        RAISE EXCEPTION 'Property % type % cannot have commercial_details', NEW.property_id, v_code;
    ELSIF TG_TABLE_NAME = 'hospitality_details' AND v_code <> 'hotel' THEN
        RAISE EXCEPTION 'Property % type % cannot have hospitality_details', NEW.property_id, v_code;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION property.validate_property_subtype() OWNER TO postgres;

--
-- Name: g3_assert(text, boolean, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.g3_assert(name text, ok boolean, info text DEFAULT ''::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO g3_results VALUES (name, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END, info);
END;
$$;


ALTER FUNCTION public.g3_assert(name text, ok boolean, info text) OWNER TO postgres;

--
-- Name: validate_rent_payment_currency(); Type: FUNCTION; Schema: rental; Owner: postgres
--

CREATE FUNCTION rental.validate_rent_payment_currency() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_currency char(3);
BEGIN
    SELECT currency_code INTO v_currency FROM rental.rent_schedules WHERE id = NEW.schedule_id;
    IF v_currency IS DISTINCT FROM NEW.currency_code THEN
        RAISE EXCEPTION 'Rent payment currency % does not match schedule currency %', NEW.currency_code, v_currency;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION rental.validate_rent_payment_currency() OWNER TO postgres;

--
-- Name: validate_rent_schedule_currency(); Type: FUNCTION; Schema: rental; Owner: postgres
--

CREATE FUNCTION rental.validate_rent_schedule_currency() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_currency char(3);
BEGIN
    SELECT currency_code INTO v_currency FROM rental.leases WHERE id = NEW.lease_id;
    IF v_currency IS DISTINCT FROM NEW.currency_code THEN
        RAISE EXCEPTION 'Rent schedule currency % does not match lease currency %', NEW.currency_code, v_currency;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION rental.validate_rent_schedule_currency() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ad_slots; Type: TABLE; Schema: advertising; Owner: postgres
--

CREATE TABLE advertising.ad_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    placement text NOT NULL,
    device text DEFAULT 'ALL'::text NOT NULL,
    format text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ad_slots_device_check CHECK ((device = ANY (ARRAY['ALL'::text, 'DESKTOP'::text, 'MOBILE'::text]))),
    CONSTRAINT ad_slots_placement_check CHECK ((placement = ANY (ARRAY['HOMEPAGE'::text, 'SEARCH_RESULTS'::text, 'LISTING_DETAIL'::text, 'AGENCY_PAGE'::text, 'AGENT_PAGE'::text, 'PROJECT_PAGE'::text, 'GEO_PAGE'::text, 'CATEGORY_PAGE'::text, 'DASHBOARD'::text])))
);


ALTER TABLE advertising.ad_slots OWNER TO postgres;

--
-- Name: advertisers; Type: TABLE; Schema: advertising; Owner: postgres
--

CREATE TABLE advertising.advertisers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    name text NOT NULL,
    contact jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT advertisers_contact_check CHECK ((jsonb_typeof(contact) = 'object'::text)),
    CONSTRAINT advertisers_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'ACTIVE'::text, 'SUSPENDED'::text, 'BLOCKED'::text])))
);


ALTER TABLE advertising.advertisers OWNER TO postgres;

--
-- Name: billing; Type: TABLE; Schema: advertising; Owner: postgres
--

CREATE TABLE advertising.billing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    advertiser_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    status text DEFAULT 'OPEN'::text NOT NULL,
    amount numeric(20,4),
    currency_code character(3),
    invoice_reference text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT billing_amount_check CHECK (((amount IS NULL) OR (amount >= (0)::numeric))),
    CONSTRAINT billing_check CHECK ((period_end > period_start)),
    CONSTRAINT billing_status_check CHECK ((status = ANY (ARRAY['OPEN'::text, 'ISSUED'::text, 'PAID'::text, 'VOID'::text, 'UNDECIDED'::text])))
);


ALTER TABLE advertising.billing OWNER TO postgres;

--
-- Name: budgets; Type: TABLE; Schema: advertising; Owner: postgres
--

CREATE TABLE advertising.budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    budget_type text NOT NULL,
    limit_amount numeric(20,4) NOT NULL,
    currency_code character(3) NOT NULL,
    spent_amount numeric(20,4) DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT budgets_budget_type_check CHECK ((budget_type = ANY (ARRAY['TOTAL'::text, 'DAILY'::text, 'MONTHLY'::text]))),
    CONSTRAINT budgets_check CHECK ((spent_amount <= limit_amount)),
    CONSTRAINT budgets_limit_amount_check CHECK ((limit_amount > (0)::numeric)),
    CONSTRAINT budgets_spent_amount_check CHECK ((spent_amount >= (0)::numeric))
);


ALTER TABLE advertising.budgets OWNER TO postgres;

--
-- Name: campaign_groups; Type: TABLE; Schema: advertising; Owner: postgres
--

CREATE TABLE advertising.campaign_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    advertiser_id uuid NOT NULL,
    name text NOT NULL,
    objective text,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT campaign_groups_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'ACTIVE'::text, 'PAUSED'::text, 'ENDED'::text])))
);


ALTER TABLE advertising.campaign_groups OWNER TO postgres;

--
-- Name: campaigns; Type: TABLE; Schema: advertising; Owner: postgres
--

CREATE TABLE advertising.campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    advertiser_id uuid NOT NULL,
    campaign_group_id uuid,
    name text NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    start_at timestamp with time zone,
    end_at timestamp with time zone,
    pricing_model text DEFAULT 'UNDECIDED'::text NOT NULL,
    price_amount numeric(20,4),
    currency_code character(3),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT campaigns_check CHECK (((end_at IS NULL) OR (start_at IS NULL) OR (end_at > start_at))),
    CONSTRAINT campaigns_check1 CHECK (((pricing_model = ANY (ARRAY['CPM'::text, 'CPC'::text, 'FIXED'::text])) = ((price_amount IS NOT NULL) AND (currency_code IS NOT NULL)))),
    CONSTRAINT campaigns_price_amount_check CHECK (((price_amount IS NULL) OR (price_amount >= (0)::numeric))),
    CONSTRAINT campaigns_pricing_model_check CHECK ((pricing_model = ANY (ARRAY['CPM'::text, 'CPC'::text, 'FIXED'::text, 'UNDECIDED'::text, 'TBD'::text, 'CONFIGURABLE'::text]))),
    CONSTRAINT campaigns_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'SCHEDULED'::text, 'ACTIVE'::text, 'PAUSED'::text, 'ENDED'::text, 'REJECTED'::text])))
);


ALTER TABLE advertising.campaigns OWNER TO postgres;

--
-- Name: clicks; Type: TABLE; Schema: advertising; Owner: postgres
--

CREATE TABLE advertising.clicks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    impression_id uuid NOT NULL,
    clicked_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_hash text,
    user_agent_hash text,
    referer text,
    is_valid boolean DEFAULT true NOT NULL,
    fraud_score numeric(5,4),
    reject_reason text,
    CONSTRAINT clicks_fraud_score_check CHECK (((fraud_score IS NULL) OR ((fraud_score >= (0)::numeric) AND (fraud_score <= (1)::numeric))))
);


ALTER TABLE advertising.clicks OWNER TO postgres;

--
-- Name: creatives; Type: TABLE; Schema: advertising; Owner: postgres
--

CREATE TABLE advertising.creatives (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    name text NOT NULL,
    media_asset_id uuid,
    target_url text NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    checksum text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT creatives_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'REVIEW'::text, 'APPROVED'::text, 'REJECTED'::text, 'ARCHIVED'::text])))
);


ALTER TABLE advertising.creatives OWNER TO postgres;

--
-- Name: impressions; Type: TABLE; Schema: advertising; Owner: postgres
--

CREATE TABLE advertising.impressions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    creative_id uuid NOT NULL,
    slot_id uuid NOT NULL,
    session_hash text NOT NULL,
    ip_hash text,
    user_agent_hash text,
    locale text,
    page_type text,
    geo_node_id uuid,
    served_at timestamp with time zone DEFAULT now() NOT NULL,
    is_counted boolean DEFAULT true NOT NULL,
    fraud_score numeric(5,4),
    CONSTRAINT impressions_fraud_score_check CHECK (((fraud_score IS NULL) OR ((fraud_score >= (0)::numeric) AND (fraud_score <= (1)::numeric))))
);


ALTER TABLE advertising.impressions OWNER TO postgres;

--
-- Name: reports; Type: TABLE; Schema: advertising; Owner: postgres
--

CREATE TABLE advertising.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    report_date date NOT NULL,
    impressions bigint DEFAULT 0 NOT NULL,
    clicks bigint DEFAULT 0 NOT NULL,
    valid_clicks bigint DEFAULT 0 NOT NULL,
    spend numeric(20,4),
    currency_code character(3),
    CONSTRAINT reports_clicks_check CHECK ((clicks >= 0)),
    CONSTRAINT reports_impressions_check CHECK ((impressions >= 0)),
    CONSTRAINT reports_spend_check CHECK (((spend IS NULL) OR (spend >= (0)::numeric))),
    CONSTRAINT reports_valid_clicks_check CHECK ((valid_clicks >= 0))
);


ALTER TABLE advertising.reports OWNER TO postgres;

--
-- Name: targets; Type: TABLE; Schema: advertising; Owner: postgres
--

CREATE TABLE advertising.targets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    dimension text NOT NULL,
    operator text DEFAULT 'IN'::text NOT NULL,
    value jsonb NOT NULL,
    weight integer DEFAULT 100 NOT NULL,
    CONSTRAINT targets_dimension_check CHECK ((dimension = ANY (ARRAY['COUNTRY'::text, 'CITY'::text, 'DISTRICT'::text, 'PAGE_TYPE'::text, 'PROPERTY_TYPE'::text, 'AUDIENCE_SEGMENT'::text, 'DEVICE'::text, 'LANGUAGE'::text, 'TIME_WINDOW'::text]))),
    CONSTRAINT targets_operator_check CHECK ((operator = ANY (ARRAY['IN'::text, 'NOT_IN'::text, 'EQUALS'::text]))),
    CONSTRAINT targets_weight_check CHECK (((weight >= 0) AND (weight <= 100)))
);


ALTER TABLE advertising.targets OWNER TO postgres;

--
-- Name: logs; Type: TABLE; Schema: audit; Owner: postgres
--

CREATE TABLE audit.logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_user_id uuid,
    organization_id uuid,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    before_data jsonb,
    after_data jsonb,
    ip inet,
    user_agent text,
    request_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE audit.logs OWNER TO postgres;

--
-- Name: outbox_events; Type: TABLE; Schema: audit; Owner: postgres
--

CREATE TABLE audit.outbox_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aggregate_type text NOT NULL,
    aggregate_id uuid NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    published_at timestamp with time zone,
    retry_count integer DEFAULT 0 NOT NULL,
    last_error text,
    locked_at timestamp with time zone,
    locked_by text,
    CONSTRAINT outbox_events_retry_count_check CHECK ((retry_count >= 0))
);


ALTER TABLE audit.outbox_events OWNER TO postgres;

--
-- Name: entitlements; Type: TABLE; Schema: billing; Owner: postgres
--

CREATE TABLE billing.entitlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_version_id uuid NOT NULL,
    code text NOT NULL,
    limit_value numeric(20,4),
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT entitlements_limit_value_check CHECK (((limit_value IS NULL) OR (limit_value >= (0)::numeric)))
);


ALTER TABLE billing.entitlements OWNER TO postgres;

--
-- Name: invoices; Type: TABLE; Schema: billing; Owner: postgres
--

CREATE TABLE billing.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    invoice_number text NOT NULL,
    status text DEFAULT 'issued'::text NOT NULL,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    due_at timestamp with time zone,
    paid_at timestamp with time zone
);


ALTER TABLE billing.invoices OWNER TO postgres;

--
-- Name: ledger_accounts; Type: TABLE; Schema: billing; Owner: postgres
--

CREATE TABLE billing.ledger_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_type text NOT NULL,
    owner_id uuid NOT NULL,
    currency_code character(3) NOT NULL,
    account_type billing.ledger_account_type NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE billing.ledger_accounts OWNER TO postgres;

--
-- Name: ledger_entries; Type: TABLE; Schema: billing; Owner: postgres
--

CREATE TABLE billing.ledger_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id uuid NOT NULL,
    account_id uuid NOT NULL,
    side billing.ledger_entry_side NOT NULL,
    amount numeric(20,4) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ledger_entries_amount_check CHECK ((amount > (0)::numeric))
);


ALTER TABLE billing.ledger_entries OWNER TO postgres;

--
-- Name: ledger_transactions; Type: TABLE; Schema: billing; Owner: postgres
--

CREATE TABLE billing.ledger_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reference_type text NOT NULL,
    reference_id uuid NOT NULL,
    currency_code character(3) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE billing.ledger_transactions OWNER TO postgres;

--
-- Name: order_items; Type: TABLE; Schema: billing; Owner: postgres
--

CREATE TABLE billing.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_price_id uuid,
    description text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_amount numeric(20,4) NOT NULL,
    line_total numeric(20,4) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT order_items_check CHECK ((line_total = ((quantity)::numeric * unit_amount))),
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT order_items_unit_amount_check CHECK ((unit_amount >= (0)::numeric))
);


ALTER TABLE billing.order_items OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: billing; Owner: postgres
--

CREATE TABLE billing.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    organization_id uuid,
    currency_code character(3) NOT NULL,
    subtotal numeric(20,4) NOT NULL,
    tax numeric(20,4) DEFAULT 0 NOT NULL,
    discount numeric(20,4) DEFAULT 0 NOT NULL,
    total numeric(20,4) NOT NULL,
    status billing.order_status DEFAULT 'pending'::billing.order_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT orders_check CHECK ((total = ((subtotal + tax) - discount))),
    CONSTRAINT orders_discount_check CHECK ((discount >= (0)::numeric)),
    CONSTRAINT orders_subtotal_check CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT orders_tax_check CHECK ((tax >= (0)::numeric)),
    CONSTRAINT orders_total_check CHECK ((total >= (0)::numeric))
);


ALTER TABLE billing.orders OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: billing; Owner: postgres
--

CREATE TABLE billing.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    provider text NOT NULL,
    provider_reference text,
    amount numeric(20,4) NOT NULL,
    currency_code character(3) NOT NULL,
    status billing.payment_status DEFAULT 'created'::billing.payment_status NOT NULL,
    idempotency_key uuid,
    raw_response jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    paid_at timestamp with time zone,
    CONSTRAINT payments_amount_check CHECK ((amount >= (0)::numeric))
);


ALTER TABLE billing.payments OWNER TO postgres;

--
-- Name: plan_versions; Type: TABLE; Schema: billing; Owner: postgres
--

CREATE TABLE billing.plan_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    version integer NOT NULL,
    entitlements jsonb DEFAULT '{}'::jsonb NOT NULL,
    effective_from timestamp with time zone NOT NULL,
    effective_to timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT plan_versions_check CHECK (((effective_to IS NULL) OR (effective_to > effective_from))),
    CONSTRAINT plan_versions_entitlements_check CHECK ((jsonb_typeof(entitlements) = 'object'::text)),
    CONSTRAINT plan_versions_version_check CHECK ((version > 0))
);


ALTER TABLE billing.plan_versions OWNER TO postgres;

--
-- Name: plans; Type: TABLE; Schema: billing; Owner: postgres
--

CREATE TABLE billing.plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE billing.plans OWNER TO postgres;

--
-- Name: product_prices; Type: TABLE; Schema: billing; Owner: postgres
--

CREATE TABLE billing.product_prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    amount numeric(20,4) NOT NULL,
    currency_code character(3) NOT NULL,
    billing_interval text,
    interval_count integer,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_prices_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT product_prices_interval_count_check CHECK (((interval_count IS NULL) OR (interval_count > 0)))
);


ALTER TABLE billing.product_prices OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: billing; Owner: postgres
--

CREATE TABLE billing.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    product_type text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE billing.products OWNER TO postgres;

--
-- Name: refunds; Type: TABLE; Schema: billing; Owner: postgres
--

CREATE TABLE billing.refunds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_id uuid NOT NULL,
    provider_reference text,
    amount numeric(20,4) NOT NULL,
    reason text,
    status billing.refund_status DEFAULT 'requested'::billing.refund_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT refunds_amount_check CHECK ((amount > (0)::numeric))
);


ALTER TABLE billing.refunds OWNER TO postgres;

--
-- Name: subscription_events; Type: TABLE; Schema: billing; Owner: postgres
--

CREATE TABLE billing.subscription_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscription_id uuid NOT NULL,
    event_type text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE billing.subscription_events OWNER TO postgres;

--
-- Name: subscriptions; Type: TABLE; Schema: billing; Owner: postgres
--

CREATE TABLE billing.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    user_id uuid,
    product_price_id uuid NOT NULL,
    status billing.subscription_status DEFAULT 'active'::billing.subscription_status NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    current_period_start timestamp with time zone NOT NULL,
    current_period_end timestamp with time zone NOT NULL,
    auto_renew boolean DEFAULT true NOT NULL,
    cancelled_at timestamp with time zone,
    plan_version_id uuid,
    CONSTRAINT subscriptions_check CHECK (((((organization_id IS NOT NULL))::integer + ((user_id IS NOT NULL))::integer) = 1)),
    CONSTRAINT subscriptions_check1 CHECK ((current_period_end > current_period_start))
);


ALTER TABLE billing.subscriptions OWNER TO postgres;

--
-- Name: adjustments; Type: TABLE; Schema: commission; Owner: postgres
--

CREATE TABLE commission.adjustments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    calculation_id uuid NOT NULL,
    adjustment_type text NOT NULL,
    amount numeric(20,4) NOT NULL,
    currency_code character(3) NOT NULL,
    reason text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT adjustments_adjustment_type_check CHECK ((adjustment_type = ANY (ARRAY['REVERSAL'::text, 'CORRECTION'::text]))),
    CONSTRAINT adjustments_amount_check CHECK ((amount <> (0)::numeric))
);


ALTER TABLE commission.adjustments OWNER TO postgres;

--
-- Name: calculation_lines; Type: TABLE; Schema: commission; Owner: postgres
--

CREATE TABLE commission.calculation_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    calculation_id uuid NOT NULL,
    line_type text NOT NULL,
    amount numeric(20,4) NOT NULL,
    currency_code character(3) NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT calculation_lines_amount_check CHECK ((amount >= (0)::numeric))
);


ALTER TABLE commission.calculation_lines OWNER TO postgres;

--
-- Name: calculations; Type: TABLE; Schema: commission; Owner: postgres
--

CREATE TABLE commission.calculations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid,
    contract_id uuid,
    party_user_id uuid,
    party_organization_id uuid,
    party_role text NOT NULL,
    rule_id uuid,
    rule_version_id uuid NOT NULL,
    rule_snapshot jsonb NOT NULL,
    input_snapshot jsonb NOT NULL,
    calc_mode text NOT NULL,
    calc_amount numeric(20,4),
    currency_code character(3) NOT NULL,
    calculated_by uuid,
    calculated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT calculations_calc_amount_check CHECK (((calc_amount IS NULL) OR (calc_amount >= (0)::numeric)))
);


ALTER TABLE commission.calculations OWNER TO postgres;

--
-- Name: payouts; Type: TABLE; Schema: commission; Owner: postgres
--

CREATE TABLE commission.payouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    beneficiary_user_id uuid,
    beneficiary_organization_id uuid,
    amount numeric(20,4) NOT NULL,
    currency_code character(3) NOT NULL,
    status text DEFAULT 'REQUESTED'::text NOT NULL,
    paid_at timestamp with time zone,
    reference text,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payouts_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT payouts_check CHECK (((beneficiary_user_id IS NULL) <> (beneficiary_organization_id IS NULL))),
    CONSTRAINT payouts_status_check CHECK ((status = ANY (ARRAY['REQUESTED'::text, 'APPROVED'::text, 'PAID'::text, 'FAILED'::text, 'CANCELLED'::text, 'UNDECIDED'::text])))
);


ALTER TABLE commission.payouts OWNER TO postgres;

--
-- Name: rule_versions; Type: TABLE; Schema: commission; Owner: postgres
--

CREATE TABLE commission.rule_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_id uuid NOT NULL,
    version integer NOT NULL,
    param_config jsonb NOT NULL,
    param_status text DEFAULT 'UNDECIDED'::text NOT NULL,
    effective_from timestamp with time zone,
    effective_to timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rule_versions_check CHECK (((effective_to IS NULL) OR (effective_from IS NULL) OR (effective_to > effective_from))),
    CONSTRAINT rule_versions_param_status_check CHECK ((param_status = ANY (ARRAY['TBD'::text, 'CONFIGURABLE'::text, 'UNDECIDED'::text, 'ACTIVE'::text]))),
    CONSTRAINT rule_versions_version_check CHECK ((version > 0))
);


ALTER TABLE commission.rule_versions OWNER TO postgres;

--
-- Name: rules; Type: TABLE; Schema: commission; Owner: postgres
--

CREATE TABLE commission.rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    party_role text NOT NULL,
    matches jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'UNDECIDED'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rules_matches_check CHECK ((jsonb_typeof(matches) = 'object'::text)),
    CONSTRAINT rules_status_check CHECK ((status = ANY (ARRAY['TBD'::text, 'CONFIGURABLE'::text, 'UNDECIDED'::text, 'ACTIVE'::text, 'RETIRED'::text])))
);


ALTER TABLE commission.rules OWNER TO postgres;

--
-- Name: settlements; Type: TABLE; Schema: commission; Owner: postgres
--

CREATE TABLE commission.settlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    calculation_id uuid NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    amount numeric(20,4) NOT NULL,
    currency_code character(3) NOT NULL,
    settled_at timestamp with time zone,
    settled_by uuid,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT settlements_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT settlements_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'SETTLED'::text, 'CANCELLED'::text, 'UNDECIDED'::text])))
);


ALTER TABLE commission.settlements OWNER TO postgres;

--
-- Name: cms_blocks; Type: TABLE; Schema: content; Owner: postgres
--

CREATE TABLE content.cms_blocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page_id uuid NOT NULL,
    block_type text NOT NULL,
    sort_order integer NOT NULL,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE content.cms_blocks OWNER TO postgres;

--
-- Name: cms_pages; Type: TABLE; Schema: content; Owner: postgres
--

CREATE TABLE content.cms_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    locale text DEFAULT 'en'::text NOT NULL,
    status content.publish_status DEFAULT 'draft'::content.publish_status NOT NULL,
    title text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    published_at timestamp with time zone
);


ALTER TABLE content.cms_pages OWNER TO postgres;

--
-- Name: seo_pages; Type: TABLE; Schema: content; Owner: postgres
--

CREATE TABLE content.seo_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    path text NOT NULL,
    page_type text NOT NULL,
    entity_type text,
    entity_id uuid,
    locale text DEFAULT 'en'::text NOT NULL,
    title text NOT NULL,
    meta_description text,
    canonical_url text,
    indexable boolean DEFAULT true NOT NULL,
    structured_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    last_generated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE content.seo_pages OWNER TO postgres;

--
-- Name: seo_redirects; Type: TABLE; Schema: content; Owner: postgres
--

CREATE TABLE content.seo_redirects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_path text NOT NULL,
    to_path text NOT NULL,
    status_code smallint DEFAULT 301 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT seo_redirects_status_code_check CHECK ((status_code = ANY (ARRAY[301, 302, 307, 308])))
);


ALTER TABLE content.seo_redirects OWNER TO postgres;

--
-- Name: lead_activities; Type: TABLE; Schema: crm; Owner: postgres
--

CREATE TABLE crm.lead_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    activity_type crm.activity_type NOT NULL,
    performed_by uuid,
    subject text,
    body text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE crm.lead_activities OWNER TO postgres;

--
-- Name: leads; Type: TABLE; Schema: crm; Owner: postgres
--

CREATE TABLE crm.leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    organization_id uuid,
    listing_id uuid,
    assigned_agent_id uuid,
    source text NOT NULL,
    status crm.lead_status DEFAULT 'new'::crm.lead_status NOT NULL,
    score numeric(6,2),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT leads_score_check CHECK (((score IS NULL) OR ((score >= (0)::numeric) AND (score <= (100)::numeric))))
);


ALTER TABLE crm.leads OWNER TO postgres;

--
-- Name: tasks; Type: TABLE; Schema: crm; Owner: postgres
--

CREATE TABLE crm.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    assignee_user_id uuid,
    lead_id uuid,
    title text NOT NULL,
    description text,
    status text DEFAULT 'open'::text NOT NULL,
    priority smallint DEFAULT 3 NOT NULL,
    due_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tasks_priority_check CHECK (((priority >= 1) AND (priority <= 5)))
);


ALTER TABLE crm.tasks OWNER TO postgres;

--
-- Name: viewings; Type: TABLE; Schema: crm; Owner: postgres
--

CREATE TABLE crm.viewings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid NOT NULL,
    lead_id uuid,
    agent_user_id uuid,
    scheduled_start timestamp with time zone NOT NULL,
    scheduled_end timestamp with time zone NOT NULL,
    status crm.viewing_status DEFAULT 'requested'::crm.viewing_status NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT viewings_check CHECK ((scheduled_end > scheduled_start))
);


ALTER TABLE crm.viewings OWNER TO postgres;

--
-- Name: node_translations; Type: TABLE; Schema: geo; Owner: postgres
--

CREATE TABLE geo.node_translations (
    node_id uuid NOT NULL,
    locale text NOT NULL,
    name text NOT NULL
);


ALTER TABLE geo.node_translations OWNER TO postgres;

--
-- Name: nodes; Type: TABLE; Schema: geo; Owner: postgres
--

CREATE TABLE geo.nodes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_id uuid,
    node_type text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    path_text text,
    level smallint NOT NULL,
    centroid public.geography(Point,4326),
    boundary public.geometry(MultiPolygon,4326),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT nodes_level_check CHECK ((level >= 0))
);


ALTER TABLE geo.nodes OWNER TO postgres;

--
-- Name: credentials; Type: TABLE; Schema: iam; Owner: postgres
--

CREATE TABLE iam.credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    password_hash text,
    passkey_credential_id text,
    passkey_public_key text,
    last_password_change_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT credentials_one_authenticator CHECK (((((password_hash IS NOT NULL))::integer + ((passkey_credential_id IS NOT NULL))::integer) = 1)),
    CONSTRAINT credentials_passkey_pair CHECK (((passkey_credential_id IS NULL) = (passkey_public_key IS NULL)))
);


ALTER TABLE iam.credentials OWNER TO postgres;

--
-- Name: email_verification_tokens; Type: TABLE; Schema: iam; Owner: postgres
--

CREATE TABLE iam.email_verification_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_ip inet
);


ALTER TABLE iam.email_verification_tokens OWNER TO postgres;

--
-- Name: login_attempts; Type: TABLE; Schema: iam; Owner: postgres
--

CREATE TABLE iam.login_attempts (
    id bigint NOT NULL,
    email_tried public.citext,
    user_id uuid,
    success boolean NOT NULL,
    ip inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE iam.login_attempts OWNER TO postgres;

--
-- Name: login_attempts_id_seq; Type: SEQUENCE; Schema: iam; Owner: postgres
--

ALTER TABLE iam.login_attempts ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME iam.login_attempts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: mfa_factors; Type: TABLE; Schema: iam; Owner: postgres
--

CREATE TABLE iam.mfa_factors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    factor_type text NOT NULL,
    secret_cipher text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    verified_at timestamp with time zone,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mfa_factors_factor_type_check CHECK ((factor_type = 'totp'::text)),
    CONSTRAINT mfa_factors_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'disabled'::text])))
);


ALTER TABLE iam.mfa_factors OWNER TO postgres;

--
-- Name: oauth_accounts; Type: TABLE; Schema: iam; Owner: postgres
--

CREATE TABLE iam.oauth_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    provider text NOT NULL,
    provider_user_id text NOT NULL,
    provider_email public.citext,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT oauth_accounts_provider_check CHECK ((provider = ANY (ARRAY['google'::text, 'facebook'::text])))
);


ALTER TABLE iam.oauth_accounts OWNER TO postgres;

--
-- Name: password_reset_tokens; Type: TABLE; Schema: iam; Owner: postgres
--

CREATE TABLE iam.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_ip inet
);


ALTER TABLE iam.password_reset_tokens OWNER TO postgres;

--
-- Name: permissions; Type: TABLE; Schema: iam; Owner: postgres
--

CREATE TABLE iam.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE iam.permissions OWNER TO postgres;

--
-- Name: phone_verification_tokens; Type: TABLE; Schema: iam; Owner: postgres
--

CREATE TABLE iam.phone_verification_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    phone_e164 text NOT NULL,
    code_hash text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 5 NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT phone_verification_tokens_attempts_check CHECK ((attempts >= 0)),
    CONSTRAINT phone_verification_tokens_max_attempts_check CHECK ((max_attempts > 0))
);


ALTER TABLE iam.phone_verification_tokens OWNER TO postgres;

--
-- Name: role_permissions; Type: TABLE; Schema: iam; Owner: postgres
--

CREATE TABLE iam.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL
);


ALTER TABLE iam.role_permissions OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: iam; Owner: postgres
--

CREATE TABLE iam.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE iam.roles OWNER TO postgres;

--
-- Name: user_emails; Type: TABLE; Schema: iam; Owner: postgres
--

CREATE TABLE iam.user_emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email public.citext NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_email_verified_at_consistency CHECK (((NOT is_verified) OR (verified_at IS NOT NULL)))
);


ALTER TABLE iam.user_emails OWNER TO postgres;

--
-- Name: user_permission_grants; Type: TABLE; Schema: iam; Owner: postgres
--

CREATE TABLE iam.user_permission_grants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    source text DEFAULT 'DIRECT'::text NOT NULL,
    resource_type text,
    resource_id uuid,
    granted_by uuid,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_permission_grants_resource_type_check CHECK ((resource_type = ANY (ARRAY['property'::text, 'listing'::text, 'lead'::text, 'contract'::text, 'payment'::text, 'commission'::text, 'verification'::text, 'document'::text]))),
    CONSTRAINT user_permission_grants_source_check CHECK ((source = ANY (ARRAY['DIRECT'::text, 'PERSONAL_OWNERSHIP'::text, 'DELEGATION'::text])))
);


ALTER TABLE iam.user_permission_grants OWNER TO postgres;

--
-- Name: user_phones; Type: TABLE; Schema: iam; Owner: postgres
--

CREATE TABLE iam.user_phones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    phone_e164 text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_phone_verified_at_consistency CHECK (((NOT is_verified) OR (verified_at IS NOT NULL))),
    CONSTRAINT user_phones_e164_format CHECK ((phone_e164 ~ '^\+[1-9][0-9]{7,14}$'::text))
);


ALTER TABLE iam.user_phones OWNER TO postgres;

--
-- Name: user_sessions; Type: TABLE; Schema: iam; Owner: postgres
--

CREATE TABLE iam.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    refresh_token_hash text NOT NULL,
    device_id text,
    ip inet,
    user_agent text,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE iam.user_sessions OWNER TO postgres;

--
-- Name: user_translations; Type: TABLE; Schema: iam; Owner: postgres
--

CREATE TABLE iam.user_translations (
    user_id uuid NOT NULL,
    locale text NOT NULL,
    display_name text,
    bio text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_translations_locale_check CHECK (platform.is_valid_locale(locale))
);


ALTER TABLE iam.user_translations OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: iam; Owner: postgres
--

CREATE TABLE iam.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    status platform.user_status DEFAULT 'pending'::platform.user_status NOT NULL,
    first_name text,
    last_name text,
    display_name text,
    avatar_media_id uuid,
    locale text DEFAULT 'en'::text NOT NULL,
    timezone text DEFAULT 'UTC'::text NOT NULL,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT users_check CHECK (((deleted_at IS NULL) OR (status = 'deleted'::platform.user_status)))
);


ALTER TABLE iam.users OWNER TO postgres;

--
-- Name: contract_parties; Type: TABLE; Schema: legal; Owner: postgres
--

CREATE TABLE legal.contract_parties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    role text NOT NULL,
    user_id uuid,
    organization_id uuid,
    display_name_snapshot text NOT NULL,
    contact_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT contract_parties_check CHECK (((((user_id IS NOT NULL))::integer + ((organization_id IS NOT NULL))::integer) = 1))
);


ALTER TABLE legal.contract_parties OWNER TO postgres;

--
-- Name: contract_properties; Type: TABLE; Schema: legal; Owner: postgres
--

CREATE TABLE legal.contract_properties (
    contract_id uuid NOT NULL,
    property_id uuid NOT NULL
);


ALTER TABLE legal.contract_properties OWNER TO postgres;

--
-- Name: contract_signatures; Type: TABLE; Schema: legal; Owner: postgres
--

CREATE TABLE legal.contract_signatures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_version_id uuid NOT NULL,
    contract_party_id uuid NOT NULL,
    contract_id uuid NOT NULL,
    status legal.signature_status DEFAULT 'pending'::legal.signature_status NOT NULL,
    signature_type text NOT NULL,
    provider text,
    provider_reference text,
    signed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE legal.contract_signatures OWNER TO postgres;

--
-- Name: contract_templates; Type: TABLE; Schema: legal; Owner: postgres
--

CREATE TABLE legal.contract_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    locale text DEFAULT 'en'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    content_template text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT contract_templates_version_check CHECK ((version > 0))
);


ALTER TABLE legal.contract_templates OWNER TO postgres;

--
-- Name: contract_versions; Type: TABLE; Schema: legal; Owner: postgres
--

CREATE TABLE legal.contract_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    version integer NOT NULL,
    document_media_id uuid,
    rendered_content text,
    content_hash character(64),
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT contract_versions_version_check CHECK ((version > 0))
);


ALTER TABLE legal.contract_versions OWNER TO postgres;

--
-- Name: contracts; Type: TABLE; Schema: legal; Owner: postgres
--

CREATE TABLE legal.contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid,
    status legal.contract_status DEFAULT 'draft'::legal.contract_status NOT NULL,
    title text NOT NULL,
    locale text DEFAULT 'en'::text NOT NULL,
    current_version integer DEFAULT 1 NOT NULL,
    effective_at timestamp with time zone,
    expires_at timestamp with time zone,
    terminated_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT contracts_check CHECK (((expires_at IS NULL) OR (effective_at IS NULL) OR (expires_at > effective_at))),
    CONSTRAINT contracts_current_version_check CHECK ((current_version > 0))
);


ALTER TABLE legal.contracts OWNER TO postgres;

--
-- Name: user_agreement_acceptances; Type: TABLE; Schema: legal; Owner: postgres
--

CREATE TABLE legal.user_agreement_acceptances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    agreement_code text NOT NULL,
    agreement_version integer NOT NULL,
    accepted_at timestamp with time zone DEFAULT now() NOT NULL,
    ip inet,
    request_id uuid,
    CONSTRAINT user_agreement_acceptances_agreement_version_check CHECK ((agreement_version > 0))
);


ALTER TABLE legal.user_agreement_acceptances OWNER TO postgres;

--
-- Name: favorites; Type: TABLE; Schema: marketplace; Owner: postgres
--

CREATE TABLE marketplace.favorites (
    user_id uuid NOT NULL,
    listing_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE marketplace.favorites OWNER TO postgres;

--
-- Name: listing_assignments; Type: TABLE; Schema: marketplace; Owner: postgres
--

CREATE TABLE marketplace.listing_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid NOT NULL,
    user_id uuid NOT NULL,
    assignment_type text NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    granted_by uuid,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    expires_at timestamp with time zone,
    CONSTRAINT listing_assignments_assignment_type_check CHECK ((assignment_type = ANY (ARRAY['AGENT'::text, 'MARKETER'::text, 'SUPPORT'::text, 'VIEWER'::text]))),
    CONSTRAINT listing_assignments_check CHECK (((revoked_at IS NULL) OR (status = 'REVOKED'::text))),
    CONSTRAINT listing_assignments_status_check CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'REVOKED'::text])))
);


ALTER TABLE marketplace.listing_assignments OWNER TO postgres;

--
-- Name: listing_contact_settings; Type: TABLE; Schema: marketplace; Owner: postgres
--

CREATE TABLE marketplace.listing_contact_settings (
    listing_id uuid NOT NULL,
    show_phone boolean DEFAULT true NOT NULL,
    show_email boolean DEFAULT false NOT NULL,
    allow_chat boolean DEFAULT true NOT NULL,
    allow_viewing_request boolean DEFAULT true NOT NULL
);


ALTER TABLE marketplace.listing_contact_settings OWNER TO postgres;

--
-- Name: listing_media; Type: TABLE; Schema: marketplace; Owner: postgres
--

CREATE TABLE marketplace.listing_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid NOT NULL,
    media_asset_id uuid NOT NULL,
    media_type marketplace.media_type NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_cover boolean DEFAULT false NOT NULL,
    caption text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE marketplace.listing_media OWNER TO postgres;

--
-- Name: listing_prices; Type: TABLE; Schema: marketplace; Owner: postgres
--

CREATE TABLE marketplace.listing_prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid NOT NULL,
    price numeric(20,4) NOT NULL,
    currency_code character(3) NOT NULL,
    price_period marketplace.price_period NOT NULL,
    valid_from timestamp with time zone NOT NULL,
    valid_to timestamp with time zone,
    change_reason text,
    validity tstzrange GENERATED ALWAYS AS (tstzrange(valid_from, valid_to, '[)'::text)) STORED,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT listing_prices_check CHECK (((valid_to IS NULL) OR (valid_to > valid_from))),
    CONSTRAINT listing_prices_price_check CHECK ((price >= (0)::numeric))
);


ALTER TABLE marketplace.listing_prices OWNER TO postgres;

--
-- Name: listing_promotions; Type: TABLE; Schema: marketplace; Owner: postgres
--

CREATE TABLE marketplace.listing_promotions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid NOT NULL,
    promotion_type marketplace.promotion_type NOT NULL,
    priority_score integer DEFAULT 0 NOT NULL,
    started_at timestamp with time zone NOT NULL,
    ended_at timestamp with time zone NOT NULL,
    order_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT listing_promotions_check CHECK ((ended_at > started_at))
);


ALTER TABLE marketplace.listing_promotions OWNER TO postgres;

--
-- Name: listing_search; Type: TABLE; Schema: marketplace; Owner: postgres
--

CREATE TABLE marketplace.listing_search (
    listing_id uuid NOT NULL,
    doc jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_error text,
    indexed_at timestamp with time zone,
    source_event_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT listing_search_attempts_check CHECK ((attempts >= 0)),
    CONSTRAINT listing_search_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'indexed'::text, 'failed'::text])))
);


ALTER TABLE marketplace.listing_search OWNER TO postgres;

--
-- Name: listing_search_docs; Type: TABLE; Schema: marketplace; Owner: postgres
--

CREATE TABLE marketplace.listing_search_docs (
    listing_id uuid NOT NULL,
    status marketplace.listing_status NOT NULL,
    transaction_type marketplace.transaction_type NOT NULL,
    title_text text DEFAULT ''::text NOT NULL,
    description_text text DEFAULT ''::text NOT NULL,
    price numeric(20,4) NOT NULL,
    currency_code character(3) NOT NULL,
    price_period marketplace.price_period NOT NULL,
    property_type_code text,
    geo_node_id uuid,
    location_point public.geography(Point,4326),
    published_at timestamp with time zone,
    tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple'::regconfig, ((COALESCE(title_text, ''::text) || ' '::text) || COALESCE(description_text, ''::text)))) STORED,
    CONSTRAINT listing_search_docs_price_check CHECK ((price >= (0)::numeric))
);


ALTER TABLE marketplace.listing_search_docs OWNER TO postgres;

--
-- Name: listing_status_history; Type: TABLE; Schema: marketplace; Owner: postgres
--

CREATE TABLE marketplace.listing_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid NOT NULL,
    from_status marketplace.listing_status,
    to_status marketplace.listing_status NOT NULL,
    reason text,
    changed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE marketplace.listing_status_history OWNER TO postgres;

--
-- Name: listing_transition_rules; Type: TABLE; Schema: marketplace; Owner: postgres
--

CREATE TABLE marketplace.listing_transition_rules (
    from_status marketplace.listing_status NOT NULL,
    to_status marketplace.listing_status NOT NULL,
    requires_verification boolean DEFAULT false NOT NULL,
    requires_payment_or_contract boolean DEFAULT false NOT NULL,
    allowed_roles jsonb DEFAULT '["any"]'::jsonb NOT NULL,
    CONSTRAINT listing_transition_rules_allowed_roles_check CHECK ((jsonb_typeof(allowed_roles) = 'array'::text))
);


ALTER TABLE marketplace.listing_transition_rules OWNER TO postgres;

--
-- Name: listing_translations; Type: TABLE; Schema: marketplace; Owner: postgres
--

CREATE TABLE marketplace.listing_translations (
    listing_id uuid NOT NULL,
    locale text NOT NULL,
    title text NOT NULL,
    description text,
    slug text NOT NULL,
    seo_title text,
    seo_description text,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT listing_translations_locale_check CHECK (platform.is_valid_locale(locale)),
    CONSTRAINT listing_translations_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'PUBLISHED'::text])))
);


ALTER TABLE marketplace.listing_translations OWNER TO postgres;

--
-- Name: listings; Type: TABLE; Schema: marketplace; Owner: postgres
--

CREATE TABLE marketplace.listings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    public_code bigint NOT NULL,
    property_id uuid NOT NULL,
    managing_organization_id uuid,
    created_by_user_id uuid,
    transaction_type marketplace.transaction_type NOT NULL,
    status marketplace.listing_status DEFAULT 'draft'::marketplace.listing_status NOT NULL,
    title text NOT NULL,
    description text,
    attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
    currency_code character(3) NOT NULL,
    price numeric(20,4) NOT NULL,
    price_period marketplace.price_period DEFAULT 'one_time'::marketplace.price_period NOT NULL,
    service_fee numeric(20,4),
    published_at timestamp with time zone,
    expires_at timestamp with time zone,
    last_refreshed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    version bigint DEFAULT 1 NOT NULL,
    CONSTRAINT listings_check CHECK (((expires_at IS NULL) OR (published_at IS NULL) OR (expires_at > published_at))),
    CONSTRAINT listings_check1 CHECK (((deleted_at IS NULL) OR (status = 'deleted'::marketplace.listing_status))),
    CONSTRAINT listings_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT listings_service_fee_check CHECK (((service_fee IS NULL) OR (service_fee >= (0)::numeric))),
    CONSTRAINT listings_version_positive CHECK ((version > 0))
);


ALTER TABLE marketplace.listings OWNER TO postgres;

--
-- Name: listings_public_code_seq; Type: SEQUENCE; Schema: marketplace; Owner: postgres
--

ALTER TABLE marketplace.listings ALTER COLUMN public_code ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME marketplace.listings_public_code_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: media_assets; Type: TABLE; Schema: marketplace; Owner: postgres
--

CREATE TABLE marketplace.media_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    storage_provider text NOT NULL,
    bucket text NOT NULL,
    object_key text NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL,
    width integer,
    height integer,
    sha256_hex character(64),
    perceptual_hash text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    scan_status text DEFAULT 'pending'::text NOT NULL,
    scan_provider text,
    original_object_key text,
    is_original_retained boolean DEFAULT false NOT NULL,
    processing_error text,
    duplicate_of uuid,
    CONSTRAINT media_assets_height_check CHECK (((height IS NULL) OR (height > 0))),
    CONSTRAINT media_assets_scan_status_check CHECK ((scan_status = ANY (ARRAY['pending'::text, 'clean'::text, 'infected'::text, 'skipped'::text]))),
    CONSTRAINT media_assets_size_bytes_check CHECK ((size_bytes > 0)),
    CONSTRAINT media_assets_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'ready'::text, 'failed'::text, 'quarantined'::text]))),
    CONSTRAINT media_assets_width_check CHECK (((width IS NULL) OR (width > 0)))
);


ALTER TABLE marketplace.media_assets OWNER TO postgres;

--
-- Name: media_variants; Type: TABLE; Schema: marketplace; Owner: postgres
--

CREATE TABLE marketplace.media_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    media_asset_id uuid NOT NULL,
    object_key text NOT NULL,
    width integer NOT NULL,
    height integer NOT NULL,
    format text NOT NULL,
    size_bytes bigint NOT NULL,
    CONSTRAINT media_variants_height_check CHECK ((height > 0)),
    CONSTRAINT media_variants_size_bytes_check CHECK ((size_bytes > 0)),
    CONSTRAINT media_variants_width_check CHECK ((width > 0))
);


ALTER TABLE marketplace.media_variants OWNER TO postgres;

--
-- Name: saved_search_matches; Type: TABLE; Schema: marketplace; Owner: postgres
--

CREATE TABLE marketplace.saved_search_matches (
    saved_search_id uuid NOT NULL,
    listing_id uuid NOT NULL,
    matched_at timestamp with time zone DEFAULT now() NOT NULL,
    notified_at timestamp with time zone
);


ALTER TABLE marketplace.saved_search_matches OWNER TO postgres;

--
-- Name: saved_searches; Type: TABLE; Schema: marketplace; Owner: postgres
--

CREATE TABLE marketplace.saved_searches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    query_json jsonb NOT NULL,
    query_schema_version smallint DEFAULT 1 NOT NULL,
    query_hash character(64) NOT NULL,
    frequency_minutes integer DEFAULT 1440 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    last_evaluated_at timestamp with time zone,
    last_notified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT saved_searches_frequency_minutes_check CHECK ((frequency_minutes >= 5)),
    CONSTRAINT saved_searches_query_schema_version_check CHECK ((query_schema_version > 0))
);


ALTER TABLE marketplace.saved_searches OWNER TO postgres;

--
-- Name: leases; Type: TABLE; Schema: rental; Owner: postgres
--

CREATE TABLE rental.leases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    source_listing_id uuid,
    contract_id uuid,
    landlord_user_id uuid,
    landlord_organization_id uuid,
    tenant_user_id uuid,
    tenant_organization_id uuid,
    status rental.lease_status DEFAULT 'draft'::rental.lease_status NOT NULL,
    currency_code character(3) NOT NULL,
    monthly_rent numeric(20,4) NOT NULL,
    deposit_amount numeric(20,4),
    start_date date NOT NULL,
    end_date date NOT NULL,
    auto_renew boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT leases_check CHECK ((end_date > start_date)),
    CONSTRAINT leases_check1 CHECK (((((landlord_user_id IS NOT NULL))::integer + ((landlord_organization_id IS NOT NULL))::integer) = 1)),
    CONSTRAINT leases_check2 CHECK (((((tenant_user_id IS NOT NULL))::integer + ((tenant_organization_id IS NOT NULL))::integer) = 1)),
    CONSTRAINT leases_deposit_amount_check CHECK (((deposit_amount IS NULL) OR (deposit_amount >= (0)::numeric))),
    CONSTRAINT leases_monthly_rent_check CHECK ((monthly_rent >= (0)::numeric))
);


ALTER TABLE rental.leases OWNER TO postgres;

--
-- Name: v_listing_derived_status; Type: VIEW; Schema: marketplace; Owner: postgres
--

CREATE VIEW marketplace.v_listing_derived_status AS
 SELECT id AS listing_id,
    status AS canonical_status,
        CASE
            WHEN ((status = 'published'::marketplace.listing_status) AND (EXISTS ( SELECT 1
               FROM rental.leases le
              WHERE ((le.source_listing_id = l.id) AND (le.status = 'active'::rental.lease_status))))) THEN 'reserved'::text
            WHEN ((status = 'published'::marketplace.listing_status) AND (EXISTS ( SELECT 1
               FROM rental.leases le
              WHERE ((le.source_listing_id = l.id) AND (le.status = 'active'::rental.lease_status) AND (le.contract_id IS NOT NULL) AND (EXISTS ( SELECT 1
                       FROM legal.contracts c
                      WHERE ((c.id = le.contract_id) AND (c.status = 'active'::legal.contract_status)))))))) THEN 'under_contract'::text
            ELSE 'none'::text
        END AS derived_state
   FROM marketplace.listings l;


ALTER VIEW marketplace.v_listing_derived_status OWNER TO postgres;

--
-- Name: v_listing_translations_effective; Type: VIEW; Schema: marketplace; Owner: postgres
--

CREATE VIEW marketplace.v_listing_translations_effective AS
 SELECT l.id AS listing_id,
    chain.locale AS requested_locale,
    COALESCE(t_req.title, t_en.title, l.title) AS title,
    COALESCE(t_req.description, t_en.description, l.description) AS description,
    COALESCE(t_req.slug, t_en.slug) AS slug,
    COALESCE(t_req.seo_title, t_en.seo_title) AS seo_title,
    COALESCE(t_req.seo_description, t_en.seo_description) AS seo_description,
        CASE
            WHEN (t_req.listing_id IS NOT NULL) THEN t_req.status
            ELSE 'BASE'::text
        END AS source
   FROM (((marketplace.listings l
     CROSS JOIN LATERAL unnest(platform.translation_fallback_chain('en'::text)) chain(locale))
     LEFT JOIN marketplace.listing_translations t_req ON (((t_req.listing_id = l.id) AND (t_req.locale = chain.locale) AND (t_req.status = 'PUBLISHED'::text))))
     LEFT JOIN marketplace.listing_translations t_en ON (((t_en.listing_id = l.id) AND (t_en.locale = 'en'::text) AND (t_en.status = 'PUBLISHED'::text))));


ALTER VIEW marketplace.v_listing_translations_effective OWNER TO postgres;

--
-- Name: conversation_members; Type: TABLE; Schema: messaging; Owner: postgres
--

CREATE TABLE messaging.conversation_members (
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    last_read_at timestamp with time zone
);


ALTER TABLE messaging.conversation_members OWNER TO postgres;

--
-- Name: conversations; Type: TABLE; Schema: messaging; Owner: postgres
--

CREATE TABLE messaging.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type messaging.conversation_type NOT NULL,
    listing_id uuid,
    organization_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE messaging.conversations OWNER TO postgres;

--
-- Name: message_media; Type: TABLE; Schema: messaging; Owner: postgres
--

CREATE TABLE messaging.message_media (
    message_id uuid NOT NULL,
    media_asset_id uuid NOT NULL
);


ALTER TABLE messaging.message_media OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: messaging; Owner: postgres
--

CREATE TABLE messaging.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_user_id uuid NOT NULL,
    message_type messaging.message_type DEFAULT 'text'::messaging.message_type NOT NULL,
    body text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    edited_at timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT messages_check CHECK (((body IS NOT NULL) OR (message_type = ANY (ARRAY['image'::messaging.message_type, 'file'::messaging.message_type, 'system'::messaging.message_type]))))
);


ALTER TABLE messaging.messages OWNER TO postgres;

--
-- Name: actions; Type: TABLE; Schema: moderation; Owner: postgres
--

CREATE TABLE moderation.actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    action_code text NOT NULL,
    actor_user_id uuid,
    reason text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE moderation.actions OWNER TO postgres;

--
-- Name: cases; Type: TABLE; Schema: moderation; Owner: postgres
--

CREATE TABLE moderation.cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    reason_code text NOT NULL,
    risk_score numeric(6,2),
    risk_signals jsonb DEFAULT '{}'::jsonb NOT NULL,
    status moderation.case_status DEFAULT 'open'::moderation.case_status NOT NULL,
    priority smallint DEFAULT 3 NOT NULL,
    assigned_to uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    resolution text,
    CONSTRAINT cases_priority_check CHECK (((priority >= 1) AND (priority <= 5))),
    CONSTRAINT cases_risk_score_check CHECK (((risk_score IS NULL) OR ((risk_score >= (0)::numeric) AND (risk_score <= (100)::numeric))))
);


ALTER TABLE moderation.cases OWNER TO postgres;

--
-- Name: reports; Type: TABLE; Schema: moderation; Owner: postgres
--

CREATE TABLE moderation.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reporter_user_id uuid,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    reason_code text NOT NULL,
    description text,
    status moderation.report_status DEFAULT 'open'::moderation.report_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    resolved_by uuid
);


ALTER TABLE moderation.reports OWNER TO postgres;

--
-- Name: deliveries; Type: TABLE; Schema: notification; Owner: postgres
--

CREATE TABLE notification.deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    notification_id uuid NOT NULL,
    channel text NOT NULL,
    provider text,
    provider_reference text,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_error text,
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT deliveries_attempts_check CHECK ((attempts >= 0))
);


ALTER TABLE notification.deliveries OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: notification; Owner: postgres
--

CREATE TABLE notification.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    template_code text,
    notification_type text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE notification.notifications OWNER TO postgres;

--
-- Name: organization_preferences; Type: TABLE; Schema: notification; Owner: postgres
--

CREATE TABLE notification.organization_preferences (
    organization_id uuid NOT NULL,
    notification_type text NOT NULL,
    channel text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    CONSTRAINT organization_preferences_channel_check CHECK ((channel = ANY (ARRAY['in_app'::text, 'email'::text, 'sms'::text, 'push'::text])))
);


ALTER TABLE notification.organization_preferences OWNER TO postgres;

--
-- Name: quiet_hours; Type: TABLE; Schema: notification; Owner: postgres
--

CREATE TABLE notification.quiet_hours (
    user_id uuid NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    timezone text DEFAULT 'UTC'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE notification.quiet_hours OWNER TO postgres;

--
-- Name: templates; Type: TABLE; Schema: notification; Owner: postgres
--

CREATE TABLE notification.templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    locale text DEFAULT 'en'::text NOT NULL,
    channel text NOT NULL,
    subject_template text,
    body_template text NOT NULL,
    active boolean DEFAULT true NOT NULL
);


ALTER TABLE notification.templates OWNER TO postgres;

--
-- Name: user_preferences; Type: TABLE; Schema: notification; Owner: postgres
--

CREATE TABLE notification.user_preferences (
    user_id uuid NOT NULL,
    notification_type text NOT NULL,
    channel text NOT NULL,
    enabled boolean DEFAULT true NOT NULL
);


ALTER TABLE notification.user_preferences OWNER TO postgres;

--
-- Name: agency_profiles; Type: TABLE; Schema: org; Owner: postgres
--

CREATE TABLE org.agency_profiles (
    organization_id uuid NOT NULL,
    license_number text,
    established_year smallint,
    website_url text,
    specialties jsonb DEFAULT '[]'::jsonb NOT NULL,
    verification_status verification.verification_status DEFAULT 'pending'::verification.verification_status,
    CONSTRAINT agency_profiles_established_year_check CHECK (((established_year >= 1800) AND (established_year <= 2200)))
);


ALTER TABLE org.agency_profiles OWNER TO postgres;

--
-- Name: developer_profiles; Type: TABLE; Schema: org; Owner: postgres
--

CREATE TABLE org.developer_profiles (
    organization_id uuid NOT NULL,
    developer_license_number text,
    established_year smallint,
    verification_status verification.verification_status DEFAULT 'pending'::verification.verification_status,
    CONSTRAINT developer_profiles_established_year_check CHECK (((established_year >= 1800) AND (established_year <= 2200)))
);


ALTER TABLE org.developer_profiles OWNER TO postgres;

--
-- Name: member_roles; Type: TABLE; Schema: org; Owner: postgres
--

CREATE TABLE org.member_roles (
    member_id uuid NOT NULL,
    role_id uuid NOT NULL
);


ALTER TABLE org.member_roles OWNER TO postgres;

--
-- Name: organization_members; Type: TABLE; Schema: org; Owner: postgres
--

CREATE TABLE org.organization_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status platform.membership_status DEFAULT 'invited'::platform.membership_status NOT NULL,
    joined_at timestamp with time zone,
    left_at timestamp with time zone,
    invited_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT organization_members_check CHECK (((left_at IS NULL) OR (joined_at IS NOT NULL)))
);


ALTER TABLE org.organization_members OWNER TO postgres;

--
-- Name: organization_translations; Type: TABLE; Schema: org; Owner: postgres
--

CREATE TABLE org.organization_translations (
    organization_id uuid NOT NULL,
    locale text NOT NULL,
    display_name text NOT NULL,
    description text,
    slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT organization_translations_locale_check CHECK (platform.is_valid_locale(locale))
);


ALTER TABLE org.organization_translations OWNER TO postgres;

--
-- Name: organizations; Type: TABLE; Schema: org; Owner: postgres
--

CREATE TABLE org.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type platform.organization_type NOT NULL,
    status platform.organization_status DEFAULT 'pending'::platform.organization_status NOT NULL,
    legal_name text,
    display_name text NOT NULL,
    slug text NOT NULL,
    tax_id text,
    email public.citext,
    phone_e164 text,
    website_url text,
    description text,
    logo_media_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE org.organizations OWNER TO postgres;

--
-- Name: blocks; Type: TABLE; Schema: platform; Owner: postgres
--

CREATE TABLE platform.blocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject_type text NOT NULL,
    subject_key text NOT NULL,
    reason text NOT NULL,
    blocked_by text DEFAULT 'anti_bot'::text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT blocks_subject_type_check CHECK ((subject_type = ANY (ARRAY['ip'::text, 'user'::text, 'email'::text, 'phone'::text])))
);


ALTER TABLE platform.blocks OWNER TO postgres;

--
-- Name: currencies; Type: TABLE; Schema: platform; Owner: postgres
--

CREATE TABLE platform.currencies (
    code character(3) NOT NULL,
    name text NOT NULL,
    symbol text NOT NULL,
    minor_unit smallint DEFAULT 2 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT currencies_minor_unit_check CHECK (((minor_unit >= 0) AND (minor_unit <= 6)))
);


ALTER TABLE platform.currencies OWNER TO postgres;

--
-- Name: exchange_rates; Type: TABLE; Schema: platform; Owner: postgres
--

CREATE TABLE platform.exchange_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    base_currency character(3) NOT NULL,
    quote_currency character(3) NOT NULL,
    rate numeric(20,10) NOT NULL,
    observed_at timestamp with time zone NOT NULL,
    source text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT exchange_rates_rate_check CHECK ((rate > (0)::numeric))
);


ALTER TABLE platform.exchange_rates OWNER TO postgres;

--
-- Name: feature_flags; Type: TABLE; Schema: platform; Owner: postgres
--

CREATE TABLE platform.feature_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    description text,
    enabled boolean DEFAULT false NOT NULL,
    rollout_percent smallint DEFAULT 0 NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT feature_flags_rollout_percent_check CHECK (((rollout_percent >= 0) AND (rollout_percent <= 100)))
);


ALTER TABLE platform.feature_flags OWNER TO postgres;

--
-- Name: idempotency_keys; Type: TABLE; Schema: platform; Owner: postgres
--

CREATE TABLE platform.idempotency_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scope text NOT NULL,
    key text NOT NULL,
    request_hash text NOT NULL,
    response_status integer,
    response_body jsonb,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE platform.idempotency_keys OWNER TO postgres;

--
-- Name: job_runs; Type: TABLE; Schema: platform; Owner: postgres
--

CREATE TABLE platform.job_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    worker_id text NOT NULL,
    attempt integer NOT NULL,
    status text NOT NULL,
    error text,
    duration_ms integer,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    CONSTRAINT job_runs_duration_ms_check CHECK (((duration_ms IS NULL) OR (duration_ms >= 0))),
    CONSTRAINT job_runs_status_check CHECK ((status = ANY (ARRAY['started'::text, 'succeeded'::text, 'failed'::text])))
);


ALTER TABLE platform.job_runs OWNER TO postgres;

--
-- Name: jobs; Type: TABLE; Schema: platform; Owner: postgres
--

CREATE TABLE platform.jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    queue text NOT NULL,
    job_type text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 5 NOT NULL,
    run_at timestamp with time zone DEFAULT now() NOT NULL,
    locked_at timestamp with time zone,
    locked_by text,
    last_error text,
    dedup_key text,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    CONSTRAINT jobs_attempts_check CHECK ((attempts >= 0)),
    CONSTRAINT jobs_max_attempts_check CHECK ((max_attempts > 0)),
    CONSTRAINT jobs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'succeeded'::text, 'failed'::text, 'dead'::text, 'cancelled'::text])))
);


ALTER TABLE platform.jobs OWNER TO postgres;

--
-- Name: risk_events; Type: TABLE; Schema: platform; Owner: postgres
--

CREATE TABLE platform.risk_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject_type text NOT NULL,
    subject_key text NOT NULL,
    signal text NOT NULL,
    score numeric(5,4) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT risk_events_score_check CHECK (((score >= (0)::numeric) AND (score <= (1)::numeric))),
    CONSTRAINT risk_events_subject_type_check CHECK ((subject_type = ANY (ARRAY['ip'::text, 'user'::text, 'email'::text, 'phone'::text, 'session'::text])))
);


ALTER TABLE platform.risk_events OWNER TO postgres;

--
-- Name: schema_migrations; Type: TABLE; Schema: platform; Owner: postgres
--

CREATE TABLE platform.schema_migrations (
    step text NOT NULL,
    filename text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE platform.schema_migrations OWNER TO postgres;

--
-- Name: settings; Type: TABLE; Schema: platform; Owner: postgres
--

CREATE TABLE platform.settings (
    key text NOT NULL,
    value jsonb NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE platform.settings OWNER TO postgres;

--
-- Name: payment_plans; Type: TABLE; Schema: project; Owner: postgres
--

CREATE TABLE project.payment_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    name text NOT NULL,
    currency_code character(3),
    down_payment_percent numeric(7,4),
    duration_months integer,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payment_plans_down_payment_percent_check CHECK (((down_payment_percent IS NULL) OR ((down_payment_percent >= (0)::numeric) AND (down_payment_percent <= (100)::numeric)))),
    CONSTRAINT payment_plans_duration_months_check CHECK (((duration_months IS NULL) OR (duration_months > 0)))
);


ALTER TABLE project.payment_plans OWNER TO postgres;

--
-- Name: project_buildings; Type: TABLE; Schema: project; Owner: postgres
--

CREATE TABLE project.project_buildings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    code text NOT NULL,
    name text,
    floors_count smallint,
    CONSTRAINT project_buildings_floors_count_check CHECK (((floors_count IS NULL) OR (floors_count > 0)))
);


ALTER TABLE project.project_buildings OWNER TO postgres;

--
-- Name: project_floors; Type: TABLE; Schema: project; Owner: postgres
--

CREATE TABLE project.project_floors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    building_id uuid NOT NULL,
    floor_number smallint NOT NULL
);


ALTER TABLE project.project_floors OWNER TO postgres;

--
-- Name: project_translations; Type: TABLE; Schema: project; Owner: postgres
--

CREATE TABLE project.project_translations (
    project_id uuid NOT NULL,
    locale text NOT NULL,
    name text NOT NULL,
    description text,
    slug text NOT NULL,
    seo_title text,
    seo_description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT project_translations_locale_check CHECK (platform.is_valid_locale(locale))
);


ALTER TABLE project.project_translations OWNER TO postgres;

--
-- Name: projects; Type: TABLE; Schema: project; Owner: postgres
--

CREATE TABLE project.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    public_code bigint NOT NULL,
    developer_organization_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    status text NOT NULL,
    start_date date,
    completion_date date,
    geo_node_id uuid,
    address_text text,
    location_point public.geography(Point,4326),
    total_units integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT projects_check CHECK (((completion_date IS NULL) OR (start_date IS NULL) OR (completion_date >= start_date))),
    CONSTRAINT projects_total_units_check CHECK (((total_units IS NULL) OR (total_units >= 0)))
);


ALTER TABLE project.projects OWNER TO postgres;

--
-- Name: projects_public_code_seq; Type: SEQUENCE; Schema: project; Owner: postgres
--

ALTER TABLE project.projects ALTER COLUMN public_code ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME project.projects_public_code_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: unit_prices; Type: TABLE; Schema: project; Owner: postgres
--

CREATE TABLE project.unit_prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    unit_id uuid NOT NULL,
    price numeric(20,4) NOT NULL,
    currency_code character(3) NOT NULL,
    valid_from timestamp with time zone NOT NULL,
    valid_to timestamp with time zone,
    validity tstzrange GENERATED ALWAYS AS (tstzrange(valid_from, valid_to, '[)'::text)) STORED,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT unit_prices_check CHECK (((valid_to IS NULL) OR (valid_to > valid_from))),
    CONSTRAINT unit_prices_price_check CHECK ((price >= (0)::numeric))
);


ALTER TABLE project.unit_prices OWNER TO postgres;

--
-- Name: units; Type: TABLE; Schema: project; Owner: postgres
--

CREATE TABLE project.units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    building_id uuid NOT NULL,
    floor_id uuid,
    property_id uuid,
    unit_number text NOT NULL,
    area_total_m2 numeric(14,2),
    bedrooms smallint,
    bathrooms smallint,
    orientation text,
    view_description text,
    status text DEFAULT 'available'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT units_area_total_m2_check CHECK ((area_total_m2 > (0)::numeric)),
    CONSTRAINT units_bathrooms_check CHECK (((bathrooms IS NULL) OR (bathrooms >= 0))),
    CONSTRAINT units_bedrooms_check CHECK (((bedrooms IS NULL) OR (bedrooms >= 0)))
);


ALTER TABLE project.units OWNER TO postgres;

--
-- Name: amenities; Type: TABLE; Schema: property; Owner: postgres
--

CREATE TABLE property.amenities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    category text NOT NULL,
    name text NOT NULL,
    data_type text DEFAULT 'boolean'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    CONSTRAINT amenities_data_type_check CHECK ((data_type = ANY (ARRAY['boolean'::text, 'text'::text, 'number'::text])))
);


ALTER TABLE property.amenities OWNER TO postgres;

--
-- Name: apartment_details; Type: TABLE; Schema: property; Owner: postgres
--

CREATE TABLE property.apartment_details (
    property_id uuid NOT NULL,
    condition_code text,
    heating_type text,
    furnishing_status text,
    ceiling_height_m numeric(6,2),
    balcony_area_m2 numeric(10,2),
    kitchen_type text,
    parking_spaces smallint,
    CONSTRAINT apartment_details_balcony_area_m2_check CHECK (((balcony_area_m2 IS NULL) OR (balcony_area_m2 >= (0)::numeric))),
    CONSTRAINT apartment_details_ceiling_height_m_check CHECK (((ceiling_height_m IS NULL) OR (ceiling_height_m > (0)::numeric))),
    CONSTRAINT apartment_details_parking_spaces_check CHECK (((parking_spaces IS NULL) OR (parking_spaces >= 0)))
);


ALTER TABLE property.apartment_details OWNER TO postgres;

--
-- Name: commercial_details; Type: TABLE; Schema: property; Owner: postgres
--

CREATE TABLE property.commercial_details (
    property_id uuid NOT NULL,
    commercial_category text NOT NULL,
    ceiling_height_m numeric(6,2),
    frontage_m numeric(12,2),
    parking_spaces smallint,
    capacity integer,
    CONSTRAINT commercial_details_capacity_check CHECK (((capacity IS NULL) OR (capacity >= 0))),
    CONSTRAINT commercial_details_ceiling_height_m_check CHECK (((ceiling_height_m IS NULL) OR (ceiling_height_m > (0)::numeric))),
    CONSTRAINT commercial_details_frontage_m_check CHECK (((frontage_m IS NULL) OR (frontage_m >= (0)::numeric))),
    CONSTRAINT commercial_details_parking_spaces_check CHECK (((parking_spaces IS NULL) OR (parking_spaces >= 0)))
);


ALTER TABLE property.commercial_details OWNER TO postgres;

--
-- Name: documents; Type: TABLE; Schema: property; Owner: postgres
--

CREATE TABLE property.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    media_asset_id uuid NOT NULL,
    document_type text NOT NULL,
    document_number text,
    issued_at date,
    expires_at date,
    is_public boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE property.documents OWNER TO postgres;

--
-- Name: hospitality_details; Type: TABLE; Schema: property; Owner: postgres
--

CREATE TABLE property.hospitality_details (
    property_id uuid NOT NULL,
    hospitality_type text NOT NULL,
    rooms_count integer,
    beds_count integer,
    star_rating numeric(2,1),
    CONSTRAINT hospitality_details_beds_count_check CHECK (((beds_count IS NULL) OR (beds_count >= 0))),
    CONSTRAINT hospitality_details_rooms_count_check CHECK (((rooms_count IS NULL) OR (rooms_count >= 0))),
    CONSTRAINT hospitality_details_star_rating_check CHECK (((star_rating IS NULL) OR ((star_rating >= (0)::numeric) AND (star_rating <= (5)::numeric))))
);


ALTER TABLE property.hospitality_details OWNER TO postgres;

--
-- Name: house_details; Type: TABLE; Schema: property; Owner: postgres
--

CREATE TABLE property.house_details (
    property_id uuid NOT NULL,
    land_area_m2 numeric(14,2),
    condition_code text,
    heating_type text,
    furnishing_status text,
    parking_spaces smallint,
    pool boolean DEFAULT false NOT NULL,
    CONSTRAINT house_details_land_area_m2_check CHECK (((land_area_m2 IS NULL) OR (land_area_m2 > (0)::numeric))),
    CONSTRAINT house_details_parking_spaces_check CHECK (((parking_spaces IS NULL) OR (parking_spaces >= 0)))
);


ALTER TABLE property.house_details OWNER TO postgres;

--
-- Name: land_details; Type: TABLE; Schema: property; Owner: postgres
--

CREATE TABLE property.land_details (
    property_id uuid NOT NULL,
    land_category text NOT NULL,
    zoning_code text,
    development_rights text,
    road_access boolean,
    road_frontage_m numeric(12,2),
    parcel_area_m2 numeric(14,2),
    parcel_geom public.geometry(MultiPolygon,4326),
    CONSTRAINT land_details_parcel_area_m2_check CHECK (((parcel_area_m2 IS NULL) OR (parcel_area_m2 > (0)::numeric))),
    CONSTRAINT land_details_road_frontage_m_check CHECK (((road_frontage_m IS NULL) OR (road_frontage_m >= (0)::numeric)))
);


ALTER TABLE property.land_details OWNER TO postgres;

--
-- Name: owners; Type: TABLE; Schema: property; Owner: postgres
--

CREATE TABLE property.owners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    user_id uuid,
    organization_id uuid,
    ownership_share numeric(7,4) DEFAULT 100.0000 NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT owners_check CHECK (((((user_id IS NOT NULL))::integer + ((organization_id IS NOT NULL))::integer) = 1)),
    CONSTRAINT owners_ownership_share_check CHECK (((ownership_share > (0)::numeric) AND (ownership_share <= (100)::numeric)))
);


ALTER TABLE property.owners OWNER TO postgres;

--
-- Name: properties; Type: TABLE; Schema: property; Owner: postgres
--

CREATE TABLE property.properties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    public_code bigint NOT NULL,
    property_type_id uuid NOT NULL,
    status property.property_status DEFAULT 'draft'::property.property_status NOT NULL,
    ownership_type property.ownership_type DEFAULT 'unknown'::property.ownership_type NOT NULL,
    area_total_m2 numeric(14,2),
    area_usable_m2 numeric(14,2),
    rooms numeric(4,1),
    bedrooms smallint,
    bathrooms smallint,
    floor smallint,
    total_floors smallint,
    year_built smallint,
    attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT properties_area_total_m2_check CHECK (((area_total_m2 IS NULL) OR (area_total_m2 > (0)::numeric))),
    CONSTRAINT properties_area_usable_m2_check CHECK (((area_usable_m2 IS NULL) OR (area_usable_m2 > (0)::numeric))),
    CONSTRAINT properties_bathrooms_check CHECK (((bathrooms IS NULL) OR (bathrooms >= 0))),
    CONSTRAINT properties_bedrooms_check CHECK (((bedrooms IS NULL) OR (bedrooms >= 0))),
    CONSTRAINT properties_check CHECK (((floor IS NULL) OR (total_floors IS NULL) OR (floor <= total_floors))),
    CONSTRAINT properties_check1 CHECK (((area_usable_m2 IS NULL) OR (area_total_m2 IS NULL) OR (area_usable_m2 <= area_total_m2))),
    CONSTRAINT properties_check2 CHECK (((deleted_at IS NULL) OR (status = 'deleted'::property.property_status))),
    CONSTRAINT properties_floor_check CHECK (((floor IS NULL) OR (floor >= '-5'::integer))),
    CONSTRAINT properties_rooms_check CHECK (((rooms IS NULL) OR (rooms >= (0)::numeric))),
    CONSTRAINT properties_total_floors_check CHECK (((total_floors IS NULL) OR (total_floors > 0))),
    CONSTRAINT properties_year_built_check CHECK (((year_built IS NULL) OR ((year_built >= 1000) AND (year_built <= 2200))))
);


ALTER TABLE property.properties OWNER TO postgres;

--
-- Name: properties_public_code_seq; Type: SEQUENCE; Schema: property; Owner: postgres
--

ALTER TABLE property.properties ALTER COLUMN public_code ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME property.properties_public_code_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: property_amenities; Type: TABLE; Schema: property; Owner: postgres
--

CREATE TABLE property.property_amenities (
    property_id uuid NOT NULL,
    amenity_id uuid NOT NULL,
    value_text text,
    value_number numeric(14,4),
    value_boolean boolean,
    CONSTRAINT property_amenities_check CHECK ((((((value_text IS NOT NULL))::integer + ((value_number IS NOT NULL))::integer) + ((value_boolean IS NOT NULL))::integer) <= 1))
);


ALTER TABLE property.property_amenities OWNER TO postgres;

--
-- Name: property_locations; Type: TABLE; Schema: property; Owner: postgres
--

CREATE TABLE property.property_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    geo_node_id uuid,
    address_line_1 text,
    address_line_2 text,
    postal_code text,
    location_point public.geography(Point,4326),
    location_visibility property.visibility_level DEFAULT 'approximate'::property.visibility_level NOT NULL,
    cadastral_number text,
    is_primary boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE property.property_locations OWNER TO postgres;

--
-- Name: property_media; Type: TABLE; Schema: property; Owner: postgres
--

CREATE TABLE property.property_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    media_asset_id uuid NOT NULL,
    media_type marketplace.media_type NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_cover boolean DEFAULT false NOT NULL,
    caption text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE property.property_media OWNER TO postgres;

--
-- Name: property_type_translations; Type: TABLE; Schema: property; Owner: postgres
--

CREATE TABLE property.property_type_translations (
    property_type_id uuid NOT NULL,
    locale text NOT NULL,
    label text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT property_type_translations_locale_check CHECK (platform.is_valid_locale(locale))
);


ALTER TABLE property.property_type_translations OWNER TO postgres;

--
-- Name: property_types; Type: TABLE; Schema: property; Owner: postgres
--

CREATE TABLE property.property_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_id uuid,
    code text NOT NULL,
    name text NOT NULL,
    is_residential boolean DEFAULT false NOT NULL,
    is_commercial boolean DEFAULT false NOT NULL,
    is_land boolean DEFAULT false NOT NULL,
    is_hospitality boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE property.property_types OWNER TO postgres;

--
-- Name: lease_parties; Type: TABLE; Schema: rental; Owner: postgres
--

CREATE TABLE rental.lease_parties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lease_id uuid NOT NULL,
    role text NOT NULL,
    user_id uuid,
    organization_id uuid,
    name_snapshot text NOT NULL,
    contact_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT lease_parties_check CHECK (((((user_id IS NOT NULL))::integer + ((organization_id IS NOT NULL))::integer) = 1))
);


ALTER TABLE rental.lease_parties OWNER TO postgres;

--
-- Name: maintenance_tickets; Type: TABLE; Schema: rental; Owner: postgres
--

CREATE TABLE rental.maintenance_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    lease_id uuid,
    created_by uuid,
    assigned_to uuid,
    title text NOT NULL,
    description text,
    priority smallint DEFAULT 3 NOT NULL,
    status rental.maintenance_status DEFAULT 'open'::rental.maintenance_status NOT NULL,
    estimated_cost numeric(20,4),
    actual_cost numeric(20,4),
    currency_code character(3),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT maintenance_tickets_actual_cost_check CHECK (((actual_cost IS NULL) OR (actual_cost >= (0)::numeric))),
    CONSTRAINT maintenance_tickets_estimated_cost_check CHECK (((estimated_cost IS NULL) OR (estimated_cost >= (0)::numeric))),
    CONSTRAINT maintenance_tickets_priority_check CHECK (((priority >= 1) AND (priority <= 5)))
);


ALTER TABLE rental.maintenance_tickets OWNER TO postgres;

--
-- Name: rent_payments; Type: TABLE; Schema: rental; Owner: postgres
--

CREATE TABLE rental.rent_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    schedule_id uuid NOT NULL,
    amount numeric(20,4) NOT NULL,
    currency_code character(3) NOT NULL,
    external_payment_id uuid,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rent_payments_amount_check CHECK ((amount > (0)::numeric))
);


ALTER TABLE rental.rent_payments OWNER TO postgres;

--
-- Name: rent_schedules; Type: TABLE; Schema: rental; Owner: postgres
--

CREATE TABLE rental.rent_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lease_id uuid NOT NULL,
    due_date date NOT NULL,
    amount numeric(20,4) NOT NULL,
    currency_code character(3) NOT NULL,
    status rental.rent_payment_status DEFAULT 'scheduled'::rental.rent_payment_status NOT NULL,
    paid_at timestamp with time zone,
    CONSTRAINT rent_schedules_amount_check CHECK ((amount >= (0)::numeric))
);


ALTER TABLE rental.rent_schedules OWNER TO postgres;

--
-- Name: reviews; Type: TABLE; Schema: review; Owner: postgres
--

CREATE TABLE review.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reviewer_user_id uuid NOT NULL,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    listing_id uuid,
    rating smallint NOT NULL,
    title text,
    body text,
    status review.review_status DEFAULT 'pending'::review.review_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE review.reviews OWNER TO postgres;

--
-- Name: cases; Type: TABLE; Schema: valuation; Owner: postgres
--

CREATE TABLE valuation.cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    property_id uuid NOT NULL,
    requested_by_user_id uuid,
    status valuation.valuation_status DEFAULT 'requested'::valuation.valuation_status NOT NULL,
    method text DEFAULT 'comparables'::text NOT NULL,
    model_version text,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    expires_at timestamp with time zone
);


ALTER TABLE valuation.cases OWNER TO postgres;

--
-- Name: comparables; Type: TABLE; Schema: valuation; Owner: postgres
--

CREATE TABLE valuation.comparables (
    valuation_result_id uuid NOT NULL,
    comparable_property_id uuid NOT NULL,
    comparable_listing_id uuid,
    similarity_score numeric(6,2),
    distance_m numeric(12,2),
    adjusted_price numeric(20,4),
    CONSTRAINT comparables_distance_m_check CHECK (((distance_m IS NULL) OR (distance_m >= (0)::numeric))),
    CONSTRAINT comparables_similarity_score_check CHECK (((similarity_score IS NULL) OR ((similarity_score >= (0)::numeric) AND (similarity_score <= (100)::numeric))))
);


ALTER TABLE valuation.comparables OWNER TO postgres;

--
-- Name: results; Type: TABLE; Schema: valuation; Owner: postgres
--

CREATE TABLE valuation.results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    min_value numeric(20,4) NOT NULL,
    estimated_value numeric(20,4) NOT NULL,
    max_value numeric(20,4) NOT NULL,
    currency_code character(3) NOT NULL,
    confidence numeric(6,2),
    price_per_m2 numeric(20,4),
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT results_check CHECK (((min_value <= estimated_value) AND (estimated_value <= max_value))),
    CONSTRAINT results_confidence_check CHECK (((confidence IS NULL) OR ((confidence >= (0)::numeric) AND (confidence <= (100)::numeric)))),
    CONSTRAINT results_estimated_value_check CHECK ((estimated_value >= (0)::numeric)),
    CONSTRAINT results_max_value_check CHECK ((max_value >= (0)::numeric)),
    CONSTRAINT results_min_value_check CHECK ((min_value >= (0)::numeric)),
    CONSTRAINT results_price_per_m2_check CHECK (((price_per_m2 IS NULL) OR (price_per_m2 >= (0)::numeric)))
);


ALTER TABLE valuation.results OWNER TO postgres;

--
-- Name: cases; Type: TABLE; Schema: verification; Owner: postgres
--

CREATE TABLE verification.cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_type verification.case_type NOT NULL,
    subject_user_id uuid,
    subject_organization_id uuid,
    subject_property_id uuid,
    status verification.verification_status DEFAULT 'pending'::verification.verification_status NOT NULL,
    provider text,
    provider_reference text,
    result jsonb DEFAULT '{}'::jsonb NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cases_check CHECK ((((((subject_user_id IS NOT NULL))::integer + ((subject_organization_id IS NOT NULL))::integer) + ((subject_property_id IS NOT NULL))::integer) = 1))
);


ALTER TABLE verification.cases OWNER TO postgres;

--
-- Name: documents; Type: TABLE; Schema: verification; Owner: postgres
--

CREATE TABLE verification.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    media_asset_id uuid NOT NULL,
    document_type text NOT NULL,
    document_number text,
    status verification.verification_status DEFAULT 'pending'::verification.verification_status NOT NULL,
    issued_at date,
    expires_at date,
    extracted_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE verification.documents OWNER TO postgres;

--
-- Name: ad_slots ad_slots_code_key; Type: CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.ad_slots
    ADD CONSTRAINT ad_slots_code_key UNIQUE (code);


--
-- Name: ad_slots ad_slots_pkey; Type: CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.ad_slots
    ADD CONSTRAINT ad_slots_pkey PRIMARY KEY (id);


--
-- Name: advertisers advertisers_pkey; Type: CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.advertisers
    ADD CONSTRAINT advertisers_pkey PRIMARY KEY (id);


--
-- Name: billing billing_pkey; Type: CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.billing
    ADD CONSTRAINT billing_pkey PRIMARY KEY (id);


--
-- Name: budgets budgets_campaign_id_budget_type_key; Type: CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.budgets
    ADD CONSTRAINT budgets_campaign_id_budget_type_key UNIQUE (campaign_id, budget_type);


--
-- Name: budgets budgets_pkey; Type: CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.budgets
    ADD CONSTRAINT budgets_pkey PRIMARY KEY (id);


--
-- Name: campaign_groups campaign_groups_pkey; Type: CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.campaign_groups
    ADD CONSTRAINT campaign_groups_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: clicks clicks_pkey; Type: CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.clicks
    ADD CONSTRAINT clicks_pkey PRIMARY KEY (id);


--
-- Name: creatives creatives_pkey; Type: CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.creatives
    ADD CONSTRAINT creatives_pkey PRIMARY KEY (id);


--
-- Name: impressions impressions_pkey; Type: CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.impressions
    ADD CONSTRAINT impressions_pkey PRIMARY KEY (id);


--
-- Name: reports reports_campaign_id_report_date_key; Type: CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.reports
    ADD CONSTRAINT reports_campaign_id_report_date_key UNIQUE (campaign_id, report_date);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: targets targets_campaign_id_dimension_key; Type: CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.targets
    ADD CONSTRAINT targets_campaign_id_dimension_key UNIQUE (campaign_id, dimension);


--
-- Name: targets targets_pkey; Type: CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.targets
    ADD CONSTRAINT targets_pkey PRIMARY KEY (id);


--
-- Name: logs logs_pkey; Type: CONSTRAINT; Schema: audit; Owner: postgres
--

ALTER TABLE ONLY audit.logs
    ADD CONSTRAINT logs_pkey PRIMARY KEY (id);


--
-- Name: outbox_events outbox_events_pkey; Type: CONSTRAINT; Schema: audit; Owner: postgres
--

ALTER TABLE ONLY audit.outbox_events
    ADD CONSTRAINT outbox_events_pkey PRIMARY KEY (id);


--
-- Name: entitlements entitlements_pkey; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.entitlements
    ADD CONSTRAINT entitlements_pkey PRIMARY KEY (id);


--
-- Name: entitlements entitlements_plan_version_id_code_key; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.entitlements
    ADD CONSTRAINT entitlements_plan_version_id_code_key UNIQUE (plan_version_id, code);


--
-- Name: invoices invoices_invoice_number_key; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: invoices invoices_order_id_key; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.invoices
    ADD CONSTRAINT invoices_order_id_key UNIQUE (order_id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: ledger_accounts ledger_accounts_pkey; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.ledger_accounts
    ADD CONSTRAINT ledger_accounts_pkey PRIMARY KEY (id);


--
-- Name: ledger_entries ledger_entries_pkey; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.ledger_entries
    ADD CONSTRAINT ledger_entries_pkey PRIMARY KEY (id);


--
-- Name: ledger_transactions ledger_transactions_pkey; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.ledger_transactions
    ADD CONSTRAINT ledger_transactions_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: payments payments_provider_provider_reference_key; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.payments
    ADD CONSTRAINT payments_provider_provider_reference_key UNIQUE (provider, provider_reference);


--
-- Name: plan_versions plan_versions_pkey; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.plan_versions
    ADD CONSTRAINT plan_versions_pkey PRIMARY KEY (id);


--
-- Name: plan_versions plan_versions_plan_id_version_key; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.plan_versions
    ADD CONSTRAINT plan_versions_plan_id_version_key UNIQUE (plan_id, version);


--
-- Name: plans plans_code_key; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.plans
    ADD CONSTRAINT plans_code_key UNIQUE (code);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: product_prices product_prices_pkey; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.product_prices
    ADD CONSTRAINT product_prices_pkey PRIMARY KEY (id);


--
-- Name: products products_code_key; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.products
    ADD CONSTRAINT products_code_key UNIQUE (code);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: refunds refunds_payment_id_provider_reference_key; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.refunds
    ADD CONSTRAINT refunds_payment_id_provider_reference_key UNIQUE (payment_id, provider_reference);


--
-- Name: refunds refunds_pkey; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.refunds
    ADD CONSTRAINT refunds_pkey PRIMARY KEY (id);


--
-- Name: subscription_events subscription_events_pkey; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.subscription_events
    ADD CONSTRAINT subscription_events_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: adjustments adjustments_pkey; Type: CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.adjustments
    ADD CONSTRAINT adjustments_pkey PRIMARY KEY (id);


--
-- Name: calculation_lines calculation_lines_pkey; Type: CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.calculation_lines
    ADD CONSTRAINT calculation_lines_pkey PRIMARY KEY (id);


--
-- Name: calculations calculations_pkey; Type: CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.calculations
    ADD CONSTRAINT calculations_pkey PRIMARY KEY (id);


--
-- Name: payouts payouts_pkey; Type: CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.payouts
    ADD CONSTRAINT payouts_pkey PRIMARY KEY (id);


--
-- Name: rule_versions rule_versions_pkey; Type: CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.rule_versions
    ADD CONSTRAINT rule_versions_pkey PRIMARY KEY (id);


--
-- Name: rule_versions rule_versions_rule_id_version_key; Type: CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.rule_versions
    ADD CONSTRAINT rule_versions_rule_id_version_key UNIQUE (rule_id, version);


--
-- Name: rules rules_code_key; Type: CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.rules
    ADD CONSTRAINT rules_code_key UNIQUE (code);


--
-- Name: rules rules_pkey; Type: CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.rules
    ADD CONSTRAINT rules_pkey PRIMARY KEY (id);


--
-- Name: settlements settlements_pkey; Type: CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.settlements
    ADD CONSTRAINT settlements_pkey PRIMARY KEY (id);


--
-- Name: cms_blocks cms_blocks_page_id_sort_order_key; Type: CONSTRAINT; Schema: content; Owner: postgres
--

ALTER TABLE ONLY content.cms_blocks
    ADD CONSTRAINT cms_blocks_page_id_sort_order_key UNIQUE (page_id, sort_order);


--
-- Name: cms_blocks cms_blocks_pkey; Type: CONSTRAINT; Schema: content; Owner: postgres
--

ALTER TABLE ONLY content.cms_blocks
    ADD CONSTRAINT cms_blocks_pkey PRIMARY KEY (id);


--
-- Name: cms_pages cms_pages_pkey; Type: CONSTRAINT; Schema: content; Owner: postgres
--

ALTER TABLE ONLY content.cms_pages
    ADD CONSTRAINT cms_pages_pkey PRIMARY KEY (id);


--
-- Name: cms_pages cms_pages_slug_locale_key; Type: CONSTRAINT; Schema: content; Owner: postgres
--

ALTER TABLE ONLY content.cms_pages
    ADD CONSTRAINT cms_pages_slug_locale_key UNIQUE (slug, locale);


--
-- Name: seo_pages seo_pages_path_locale_key; Type: CONSTRAINT; Schema: content; Owner: postgres
--

ALTER TABLE ONLY content.seo_pages
    ADD CONSTRAINT seo_pages_path_locale_key UNIQUE (path, locale);


--
-- Name: seo_pages seo_pages_pkey; Type: CONSTRAINT; Schema: content; Owner: postgres
--

ALTER TABLE ONLY content.seo_pages
    ADD CONSTRAINT seo_pages_pkey PRIMARY KEY (id);


--
-- Name: seo_redirects seo_redirects_from_path_key; Type: CONSTRAINT; Schema: content; Owner: postgres
--

ALTER TABLE ONLY content.seo_redirects
    ADD CONSTRAINT seo_redirects_from_path_key UNIQUE (from_path);


--
-- Name: seo_redirects seo_redirects_pkey; Type: CONSTRAINT; Schema: content; Owner: postgres
--

ALTER TABLE ONLY content.seo_redirects
    ADD CONSTRAINT seo_redirects_pkey PRIMARY KEY (id);


--
-- Name: lead_activities lead_activities_pkey; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_activities
    ADD CONSTRAINT lead_activities_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: viewings viewings_no_agent_overlap; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.viewings
    ADD CONSTRAINT viewings_no_agent_overlap EXCLUDE USING gist (agent_user_id WITH =, tstzrange(scheduled_start, scheduled_end, '[)'::text) WITH &&) WHERE (((agent_user_id IS NOT NULL) AND (status = ANY (ARRAY['requested'::crm.viewing_status, 'confirmed'::crm.viewing_status]))));


--
-- Name: viewings viewings_pkey; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.viewings
    ADD CONSTRAINT viewings_pkey PRIMARY KEY (id);


--
-- Name: node_translations node_translations_pkey; Type: CONSTRAINT; Schema: geo; Owner: postgres
--

ALTER TABLE ONLY geo.node_translations
    ADD CONSTRAINT node_translations_pkey PRIMARY KEY (node_id, locale);


--
-- Name: nodes nodes_parent_id_slug_key; Type: CONSTRAINT; Schema: geo; Owner: postgres
--

ALTER TABLE ONLY geo.nodes
    ADD CONSTRAINT nodes_parent_id_slug_key UNIQUE (parent_id, slug);


--
-- Name: nodes nodes_pkey; Type: CONSTRAINT; Schema: geo; Owner: postgres
--

ALTER TABLE ONLY geo.nodes
    ADD CONSTRAINT nodes_pkey PRIMARY KEY (id);


--
-- Name: credentials credentials_pkey; Type: CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.credentials
    ADD CONSTRAINT credentials_pkey PRIMARY KEY (id);


--
-- Name: email_verification_tokens email_verification_tokens_pkey; Type: CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (id);


--
-- Name: email_verification_tokens email_verification_tokens_token_hash_key; Type: CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: login_attempts login_attempts_pkey; Type: CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_accounts oauth_accounts_pkey; Type: CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.oauth_accounts
    ADD CONSTRAINT oauth_accounts_pkey PRIMARY KEY (id);


--
-- Name: oauth_accounts oauth_accounts_provider_provider_user_id_key; Type: CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.oauth_accounts
    ADD CONSTRAINT oauth_accounts_provider_provider_user_id_key UNIQUE (provider, provider_user_id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_hash_key; Type: CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: permissions permissions_code_key; Type: CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.permissions
    ADD CONSTRAINT permissions_code_key UNIQUE (code);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: phone_verification_tokens phone_verification_tokens_pkey; Type: CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.phone_verification_tokens
    ADD CONSTRAINT phone_verification_tokens_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_code_key; Type: CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.roles
    ADD CONSTRAINT roles_code_key UNIQUE (code);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: user_emails user_emails_email_key; Type: CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.user_emails
    ADD CONSTRAINT user_emails_email_key UNIQUE (email);


--
-- Name: user_emails user_emails_pkey; Type: CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.user_emails
    ADD CONSTRAINT user_emails_pkey PRIMARY KEY (id);


--
-- Name: user_permission_grants user_permission_grants_pkey; Type: CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.user_permission_grants
    ADD CONSTRAINT user_permission_grants_pkey PRIMARY KEY (id);


--
-- Name: user_permission_grants user_permission_grants_user_id_permission_id_source_resourc_key; Type: CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.user_permission_grants
    ADD CONSTRAINT user_permission_grants_user_id_permission_id_source_resourc_key UNIQUE (user_id, permission_id, source, resource_type, resource_id);


--
-- Name: user_phones user_phones_phone_e164_key; Type: CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.user_phones
    ADD CONSTRAINT user_phones_phone_e164_key UNIQUE (phone_e164);


--
-- Name: user_phones user_phones_pkey; Type: CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.user_phones
    ADD CONSTRAINT user_phones_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_refresh_token_hash_key; Type: CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.user_sessions
    ADD CONSTRAINT user_sessions_refresh_token_hash_key UNIQUE (refresh_token_hash);


--
-- Name: user_translations user_translations_pkey; Type: CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.user_translations
    ADD CONSTRAINT user_translations_pkey PRIMARY KEY (user_id, locale);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: contract_parties contract_parties_id_contract_id_key; Type: CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.contract_parties
    ADD CONSTRAINT contract_parties_id_contract_id_key UNIQUE (id, contract_id);


--
-- Name: contract_parties contract_parties_pkey; Type: CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.contract_parties
    ADD CONSTRAINT contract_parties_pkey PRIMARY KEY (id);


--
-- Name: contract_properties contract_properties_pkey; Type: CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.contract_properties
    ADD CONSTRAINT contract_properties_pkey PRIMARY KEY (contract_id, property_id);


--
-- Name: contract_signatures contract_signatures_contract_version_id_contract_party_id_key; Type: CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.contract_signatures
    ADD CONSTRAINT contract_signatures_contract_version_id_contract_party_id_key UNIQUE (contract_version_id, contract_party_id);


--
-- Name: contract_signatures contract_signatures_pkey; Type: CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.contract_signatures
    ADD CONSTRAINT contract_signatures_pkey PRIMARY KEY (id);


--
-- Name: contract_templates contract_templates_code_key; Type: CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.contract_templates
    ADD CONSTRAINT contract_templates_code_key UNIQUE (code);


--
-- Name: contract_templates contract_templates_pkey; Type: CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.contract_templates
    ADD CONSTRAINT contract_templates_pkey PRIMARY KEY (id);


--
-- Name: contract_versions contract_versions_contract_id_version_key; Type: CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.contract_versions
    ADD CONSTRAINT contract_versions_contract_id_version_key UNIQUE (contract_id, version);


--
-- Name: contract_versions contract_versions_id_contract_id_key; Type: CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.contract_versions
    ADD CONSTRAINT contract_versions_id_contract_id_key UNIQUE (id, contract_id);


--
-- Name: contract_versions contract_versions_pkey; Type: CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.contract_versions
    ADD CONSTRAINT contract_versions_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: user_agreement_acceptances user_agreement_acceptances_pkey; Type: CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.user_agreement_acceptances
    ADD CONSTRAINT user_agreement_acceptances_pkey PRIMARY KEY (id);


--
-- Name: user_agreement_acceptances user_agreement_acceptances_user_id_agreement_code_agreement_key; Type: CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.user_agreement_acceptances
    ADD CONSTRAINT user_agreement_acceptances_user_id_agreement_code_agreement_key UNIQUE (user_id, agreement_code, agreement_version);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (user_id, listing_id);


--
-- Name: listing_assignments listing_assignments_listing_id_user_id_assignment_type_key; Type: CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_assignments
    ADD CONSTRAINT listing_assignments_listing_id_user_id_assignment_type_key UNIQUE (listing_id, user_id, assignment_type);


--
-- Name: listing_assignments listing_assignments_pkey; Type: CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_assignments
    ADD CONSTRAINT listing_assignments_pkey PRIMARY KEY (id);


--
-- Name: listing_contact_settings listing_contact_settings_pkey; Type: CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_contact_settings
    ADD CONSTRAINT listing_contact_settings_pkey PRIMARY KEY (listing_id);


--
-- Name: listing_media listing_media_listing_id_media_asset_id_key; Type: CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_media
    ADD CONSTRAINT listing_media_listing_id_media_asset_id_key UNIQUE (listing_id, media_asset_id);


--
-- Name: listing_media listing_media_pkey; Type: CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_media
    ADD CONSTRAINT listing_media_pkey PRIMARY KEY (id);


--
-- Name: listing_prices listing_prices_no_overlap; Type: CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_prices
    ADD CONSTRAINT listing_prices_no_overlap EXCLUDE USING gist (listing_id WITH =, validity WITH &&);


--
-- Name: listing_prices listing_prices_pkey; Type: CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_prices
    ADD CONSTRAINT listing_prices_pkey PRIMARY KEY (id);


--
-- Name: listing_promotions listing_promotions_pkey; Type: CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_promotions
    ADD CONSTRAINT listing_promotions_pkey PRIMARY KEY (id);


--
-- Name: listing_search_docs listing_search_docs_pkey; Type: CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_search_docs
    ADD CONSTRAINT listing_search_docs_pkey PRIMARY KEY (listing_id);


--
-- Name: listing_search listing_search_pkey; Type: CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_search
    ADD CONSTRAINT listing_search_pkey PRIMARY KEY (listing_id);


--
-- Name: listing_status_history listing_status_history_pkey; Type: CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_status_history
    ADD CONSTRAINT listing_status_history_pkey PRIMARY KEY (id);


--
-- Name: listing_transition_rules listing_transition_rules_pkey; Type: CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_transition_rules
    ADD CONSTRAINT listing_transition_rules_pkey PRIMARY KEY (from_status, to_status);


--
-- Name: listing_translations listing_translations_pkey; Type: CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_translations
    ADD CONSTRAINT listing_translations_pkey PRIMARY KEY (listing_id, locale);


--
-- Name: listings listings_pkey; Type: CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listings
    ADD CONSTRAINT listings_pkey PRIMARY KEY (id);


--
-- Name: listings listings_public_code_key; Type: CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listings
    ADD CONSTRAINT listings_public_code_key UNIQUE (public_code);


--
-- Name: media_assets media_assets_pkey; Type: CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.media_assets
    ADD CONSTRAINT media_assets_pkey PRIMARY KEY (id);


--
-- Name: media_assets media_assets_sha256_hex_key; Type: CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.media_assets
    ADD CONSTRAINT media_assets_sha256_hex_key UNIQUE (sha256_hex);


--
-- Name: media_assets media_assets_storage_provider_bucket_object_key_key; Type: CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.media_assets
    ADD CONSTRAINT media_assets_storage_provider_bucket_object_key_key UNIQUE (storage_provider, bucket, object_key);


--
-- Name: media_variants media_variants_media_asset_id_width_height_format_key; Type: CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.media_variants
    ADD CONSTRAINT media_variants_media_asset_id_width_height_format_key UNIQUE (media_asset_id, width, height, format);


--
-- Name: media_variants media_variants_pkey; Type: CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.media_variants
    ADD CONSTRAINT media_variants_pkey PRIMARY KEY (id);


--
-- Name: saved_search_matches saved_search_matches_pkey; Type: CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.saved_search_matches
    ADD CONSTRAINT saved_search_matches_pkey PRIMARY KEY (saved_search_id, listing_id);


--
-- Name: saved_searches saved_searches_pkey; Type: CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.saved_searches
    ADD CONSTRAINT saved_searches_pkey PRIMARY KEY (id);


--
-- Name: saved_searches saved_searches_user_id_query_hash_key; Type: CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.saved_searches
    ADD CONSTRAINT saved_searches_user_id_query_hash_key UNIQUE (user_id, query_hash);


--
-- Name: conversation_members conversation_members_pkey; Type: CONSTRAINT; Schema: messaging; Owner: postgres
--

ALTER TABLE ONLY messaging.conversation_members
    ADD CONSTRAINT conversation_members_pkey PRIMARY KEY (conversation_id, user_id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: messaging; Owner: postgres
--

ALTER TABLE ONLY messaging.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: message_media message_media_pkey; Type: CONSTRAINT; Schema: messaging; Owner: postgres
--

ALTER TABLE ONLY messaging.message_media
    ADD CONSTRAINT message_media_pkey PRIMARY KEY (message_id, media_asset_id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: messaging; Owner: postgres
--

ALTER TABLE ONLY messaging.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: actions actions_pkey; Type: CONSTRAINT; Schema: moderation; Owner: postgres
--

ALTER TABLE ONLY moderation.actions
    ADD CONSTRAINT actions_pkey PRIMARY KEY (id);


--
-- Name: cases cases_pkey; Type: CONSTRAINT; Schema: moderation; Owner: postgres
--

ALTER TABLE ONLY moderation.cases
    ADD CONSTRAINT cases_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: moderation; Owner: postgres
--

ALTER TABLE ONLY moderation.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: deliveries deliveries_pkey; Type: CONSTRAINT; Schema: notification; Owner: postgres
--

ALTER TABLE ONLY notification.deliveries
    ADD CONSTRAINT deliveries_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: notification; Owner: postgres
--

ALTER TABLE ONLY notification.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: organization_preferences organization_preferences_pkey; Type: CONSTRAINT; Schema: notification; Owner: postgres
--

ALTER TABLE ONLY notification.organization_preferences
    ADD CONSTRAINT organization_preferences_pkey PRIMARY KEY (organization_id, notification_type, channel);


--
-- Name: quiet_hours quiet_hours_pkey; Type: CONSTRAINT; Schema: notification; Owner: postgres
--

ALTER TABLE ONLY notification.quiet_hours
    ADD CONSTRAINT quiet_hours_pkey PRIMARY KEY (user_id);


--
-- Name: templates templates_code_locale_channel_key; Type: CONSTRAINT; Schema: notification; Owner: postgres
--

ALTER TABLE ONLY notification.templates
    ADD CONSTRAINT templates_code_locale_channel_key UNIQUE (code, locale, channel);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: notification; Owner: postgres
--

ALTER TABLE ONLY notification.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: notification; Owner: postgres
--

ALTER TABLE ONLY notification.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (user_id, notification_type, channel);


--
-- Name: agency_profiles agency_profiles_pkey; Type: CONSTRAINT; Schema: org; Owner: postgres
--

ALTER TABLE ONLY org.agency_profiles
    ADD CONSTRAINT agency_profiles_pkey PRIMARY KEY (organization_id);


--
-- Name: developer_profiles developer_profiles_pkey; Type: CONSTRAINT; Schema: org; Owner: postgres
--

ALTER TABLE ONLY org.developer_profiles
    ADD CONSTRAINT developer_profiles_pkey PRIMARY KEY (organization_id);


--
-- Name: member_roles member_roles_pkey; Type: CONSTRAINT; Schema: org; Owner: postgres
--

ALTER TABLE ONLY org.member_roles
    ADD CONSTRAINT member_roles_pkey PRIMARY KEY (member_id, role_id);


--
-- Name: organization_members organization_members_organization_id_user_id_key; Type: CONSTRAINT; Schema: org; Owner: postgres
--

ALTER TABLE ONLY org.organization_members
    ADD CONSTRAINT organization_members_organization_id_user_id_key UNIQUE (organization_id, user_id);


--
-- Name: organization_members organization_members_pkey; Type: CONSTRAINT; Schema: org; Owner: postgres
--

ALTER TABLE ONLY org.organization_members
    ADD CONSTRAINT organization_members_pkey PRIMARY KEY (id);


--
-- Name: organization_translations organization_translations_pkey; Type: CONSTRAINT; Schema: org; Owner: postgres
--

ALTER TABLE ONLY org.organization_translations
    ADD CONSTRAINT organization_translations_pkey PRIMARY KEY (organization_id, locale);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: org; Owner: postgres
--

ALTER TABLE ONLY org.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: org; Owner: postgres
--

ALTER TABLE ONLY org.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: blocks blocks_pkey; Type: CONSTRAINT; Schema: platform; Owner: postgres
--

ALTER TABLE ONLY platform.blocks
    ADD CONSTRAINT blocks_pkey PRIMARY KEY (id);


--
-- Name: currencies currencies_pkey; Type: CONSTRAINT; Schema: platform; Owner: postgres
--

ALTER TABLE ONLY platform.currencies
    ADD CONSTRAINT currencies_pkey PRIMARY KEY (code);


--
-- Name: exchange_rates exchange_rates_base_currency_quote_currency_observed_at_key; Type: CONSTRAINT; Schema: platform; Owner: postgres
--

ALTER TABLE ONLY platform.exchange_rates
    ADD CONSTRAINT exchange_rates_base_currency_quote_currency_observed_at_key UNIQUE (base_currency, quote_currency, observed_at);


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: platform; Owner: postgres
--

ALTER TABLE ONLY platform.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);


--
-- Name: feature_flags feature_flags_key_key; Type: CONSTRAINT; Schema: platform; Owner: postgres
--

ALTER TABLE ONLY platform.feature_flags
    ADD CONSTRAINT feature_flags_key_key UNIQUE (key);


--
-- Name: feature_flags feature_flags_pkey; Type: CONSTRAINT; Schema: platform; Owner: postgres
--

ALTER TABLE ONLY platform.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (id);


--
-- Name: idempotency_keys idempotency_keys_pkey; Type: CONSTRAINT; Schema: platform; Owner: postgres
--

ALTER TABLE ONLY platform.idempotency_keys
    ADD CONSTRAINT idempotency_keys_pkey PRIMARY KEY (id);


--
-- Name: idempotency_keys idempotency_keys_scope_key_key; Type: CONSTRAINT; Schema: platform; Owner: postgres
--

ALTER TABLE ONLY platform.idempotency_keys
    ADD CONSTRAINT idempotency_keys_scope_key_key UNIQUE (scope, key);


--
-- Name: job_runs job_runs_pkey; Type: CONSTRAINT; Schema: platform; Owner: postgres
--

ALTER TABLE ONLY platform.job_runs
    ADD CONSTRAINT job_runs_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: platform; Owner: postgres
--

ALTER TABLE ONLY platform.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: risk_events risk_events_pkey; Type: CONSTRAINT; Schema: platform; Owner: postgres
--

ALTER TABLE ONLY platform.risk_events
    ADD CONSTRAINT risk_events_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: platform; Owner: postgres
--

ALTER TABLE ONLY platform.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (step);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: platform; Owner: postgres
--

ALTER TABLE ONLY platform.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: payment_plans payment_plans_pkey; Type: CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.payment_plans
    ADD CONSTRAINT payment_plans_pkey PRIMARY KEY (id);


--
-- Name: project_buildings project_buildings_id_project_id_key; Type: CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.project_buildings
    ADD CONSTRAINT project_buildings_id_project_id_key UNIQUE (id, project_id);


--
-- Name: project_buildings project_buildings_pkey; Type: CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.project_buildings
    ADD CONSTRAINT project_buildings_pkey PRIMARY KEY (id);


--
-- Name: project_buildings project_buildings_project_id_code_key; Type: CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.project_buildings
    ADD CONSTRAINT project_buildings_project_id_code_key UNIQUE (project_id, code);


--
-- Name: project_floors project_floors_building_id_floor_number_key; Type: CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.project_floors
    ADD CONSTRAINT project_floors_building_id_floor_number_key UNIQUE (building_id, floor_number);


--
-- Name: project_floors project_floors_id_building_id_key; Type: CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.project_floors
    ADD CONSTRAINT project_floors_id_building_id_key UNIQUE (id, building_id);


--
-- Name: project_floors project_floors_pkey; Type: CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.project_floors
    ADD CONSTRAINT project_floors_pkey PRIMARY KEY (id);


--
-- Name: project_translations project_translations_pkey; Type: CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.project_translations
    ADD CONSTRAINT project_translations_pkey PRIMARY KEY (project_id, locale);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: projects projects_public_code_key; Type: CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.projects
    ADD CONSTRAINT projects_public_code_key UNIQUE (public_code);


--
-- Name: projects projects_slug_key; Type: CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.projects
    ADD CONSTRAINT projects_slug_key UNIQUE (slug);


--
-- Name: unit_prices unit_prices_no_overlap; Type: CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.unit_prices
    ADD CONSTRAINT unit_prices_no_overlap EXCLUDE USING gist (unit_id WITH =, validity WITH &&);


--
-- Name: unit_prices unit_prices_pkey; Type: CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.unit_prices
    ADD CONSTRAINT unit_prices_pkey PRIMARY KEY (id);


--
-- Name: units units_building_id_unit_number_key; Type: CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.units
    ADD CONSTRAINT units_building_id_unit_number_key UNIQUE (building_id, unit_number);


--
-- Name: units units_pkey; Type: CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- Name: amenities amenities_code_key; Type: CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.amenities
    ADD CONSTRAINT amenities_code_key UNIQUE (code);


--
-- Name: amenities amenities_pkey; Type: CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.amenities
    ADD CONSTRAINT amenities_pkey PRIMARY KEY (id);


--
-- Name: apartment_details apartment_details_pkey; Type: CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.apartment_details
    ADD CONSTRAINT apartment_details_pkey PRIMARY KEY (property_id);


--
-- Name: commercial_details commercial_details_pkey; Type: CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.commercial_details
    ADD CONSTRAINT commercial_details_pkey PRIMARY KEY (property_id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: documents documents_property_id_media_asset_id_key; Type: CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.documents
    ADD CONSTRAINT documents_property_id_media_asset_id_key UNIQUE (property_id, media_asset_id);


--
-- Name: hospitality_details hospitality_details_pkey; Type: CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.hospitality_details
    ADD CONSTRAINT hospitality_details_pkey PRIMARY KEY (property_id);


--
-- Name: house_details house_details_pkey; Type: CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.house_details
    ADD CONSTRAINT house_details_pkey PRIMARY KEY (property_id);


--
-- Name: land_details land_details_pkey; Type: CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.land_details
    ADD CONSTRAINT land_details_pkey PRIMARY KEY (property_id);


--
-- Name: owners owners_pkey; Type: CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.owners
    ADD CONSTRAINT owners_pkey PRIMARY KEY (id);


--
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- Name: properties properties_public_code_key; Type: CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.properties
    ADD CONSTRAINT properties_public_code_key UNIQUE (public_code);


--
-- Name: property_amenities property_amenities_pkey; Type: CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.property_amenities
    ADD CONSTRAINT property_amenities_pkey PRIMARY KEY (property_id, amenity_id);


--
-- Name: property_locations property_locations_pkey; Type: CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.property_locations
    ADD CONSTRAINT property_locations_pkey PRIMARY KEY (id);


--
-- Name: property_media property_media_pkey; Type: CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.property_media
    ADD CONSTRAINT property_media_pkey PRIMARY KEY (id);


--
-- Name: property_media property_media_property_id_media_asset_id_key; Type: CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.property_media
    ADD CONSTRAINT property_media_property_id_media_asset_id_key UNIQUE (property_id, media_asset_id);


--
-- Name: property_type_translations property_type_translations_pkey; Type: CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.property_type_translations
    ADD CONSTRAINT property_type_translations_pkey PRIMARY KEY (property_type_id, locale);


--
-- Name: property_types property_types_code_key; Type: CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.property_types
    ADD CONSTRAINT property_types_code_key UNIQUE (code);


--
-- Name: property_types property_types_pkey; Type: CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.property_types
    ADD CONSTRAINT property_types_pkey PRIMARY KEY (id);


--
-- Name: lease_parties lease_parties_pkey; Type: CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.lease_parties
    ADD CONSTRAINT lease_parties_pkey PRIMARY KEY (id);


--
-- Name: leases leases_no_overlap; Type: CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.leases
    ADD CONSTRAINT leases_no_overlap EXCLUDE USING gist (property_id WITH =, daterange(start_date, end_date, '[)'::text) WITH &&) WHERE ((status = ANY (ARRAY['pending_signature'::rental.lease_status, 'active'::rental.lease_status])));


--
-- Name: leases leases_pkey; Type: CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.leases
    ADD CONSTRAINT leases_pkey PRIMARY KEY (id);


--
-- Name: maintenance_tickets maintenance_tickets_pkey; Type: CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.maintenance_tickets
    ADD CONSTRAINT maintenance_tickets_pkey PRIMARY KEY (id);


--
-- Name: rent_payments rent_payments_pkey; Type: CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.rent_payments
    ADD CONSTRAINT rent_payments_pkey PRIMARY KEY (id);


--
-- Name: rent_schedules rent_schedules_lease_id_due_date_key; Type: CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.rent_schedules
    ADD CONSTRAINT rent_schedules_lease_id_due_date_key UNIQUE (lease_id, due_date);


--
-- Name: rent_schedules rent_schedules_pkey; Type: CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.rent_schedules
    ADD CONSTRAINT rent_schedules_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: review; Owner: postgres
--

ALTER TABLE ONLY review.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: cases cases_pkey; Type: CONSTRAINT; Schema: valuation; Owner: postgres
--

ALTER TABLE ONLY valuation.cases
    ADD CONSTRAINT cases_pkey PRIMARY KEY (id);


--
-- Name: comparables comparables_pkey; Type: CONSTRAINT; Schema: valuation; Owner: postgres
--

ALTER TABLE ONLY valuation.comparables
    ADD CONSTRAINT comparables_pkey PRIMARY KEY (valuation_result_id, comparable_property_id);


--
-- Name: results results_case_id_key; Type: CONSTRAINT; Schema: valuation; Owner: postgres
--

ALTER TABLE ONLY valuation.results
    ADD CONSTRAINT results_case_id_key UNIQUE (case_id);


--
-- Name: results results_pkey; Type: CONSTRAINT; Schema: valuation; Owner: postgres
--

ALTER TABLE ONLY valuation.results
    ADD CONSTRAINT results_pkey PRIMARY KEY (id);


--
-- Name: cases cases_pkey; Type: CONSTRAINT; Schema: verification; Owner: postgres
--

ALTER TABLE ONLY verification.cases
    ADD CONSTRAINT cases_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: verification; Owner: postgres
--

ALTER TABLE ONLY verification.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: ix_campaigns_status_dates; Type: INDEX; Schema: advertising; Owner: postgres
--

CREATE INDEX ix_campaigns_status_dates ON advertising.campaigns USING btree (status, start_at, end_at);


--
-- Name: ix_clicks_impression; Type: INDEX; Schema: advertising; Owner: postgres
--

CREATE INDEX ix_clicks_impression ON advertising.clicks USING btree (impression_id);


--
-- Name: ix_clicks_validity; Type: INDEX; Schema: advertising; Owner: postgres
--

CREATE INDEX ix_clicks_validity ON advertising.clicks USING btree (is_valid, clicked_at DESC);


--
-- Name: ix_impressions_campaign_served; Type: INDEX; Schema: advertising; Owner: postgres
--

CREATE INDEX ix_impressions_campaign_served ON advertising.impressions USING btree (campaign_id, served_at DESC);


--
-- Name: ix_targets_campaign; Type: INDEX; Schema: advertising; Owner: postgres
--

CREATE INDEX ix_targets_campaign ON advertising.targets USING btree (campaign_id);


--
-- Name: uq_impression_dedup; Type: INDEX; Schema: advertising; Owner: postgres
--

CREATE UNIQUE INDEX uq_impression_dedup ON advertising.impressions USING btree (session_hash, creative_id, date_trunc('minute'::text, (served_at AT TIME ZONE 'UTC'::text))) WHERE is_counted;


--
-- Name: ix_audit_actor; Type: INDEX; Schema: audit; Owner: postgres
--

CREATE INDEX ix_audit_actor ON audit.logs USING btree (actor_user_id, created_at DESC);


--
-- Name: ix_audit_actor_created; Type: INDEX; Schema: audit; Owner: postgres
--

CREATE INDEX ix_audit_actor_created ON audit.logs USING btree (actor_user_id, created_at DESC);


--
-- Name: ix_audit_entity; Type: INDEX; Schema: audit; Owner: postgres
--

CREATE INDEX ix_audit_entity ON audit.logs USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: ix_outbox_aggregate; Type: INDEX; Schema: audit; Owner: postgres
--

CREATE INDEX ix_outbox_aggregate ON audit.outbox_events USING btree (aggregate_type, aggregate_id, occurred_at DESC);


--
-- Name: ix_outbox_claimable; Type: INDEX; Schema: audit; Owner: postgres
--

CREATE INDEX ix_outbox_claimable ON audit.outbox_events USING btree (published_at, locked_at, occurred_at);


--
-- Name: ix_outbox_pending; Type: INDEX; Schema: audit; Owner: postgres
--

CREATE INDEX ix_outbox_pending ON audit.outbox_events USING btree (occurred_at) WHERE (published_at IS NULL);


--
-- Name: ix_outbox_unpublished; Type: INDEX; Schema: audit; Owner: postgres
--

CREATE INDEX ix_outbox_unpublished ON audit.outbox_events USING btree (published_at, occurred_at);


--
-- Name: ix_ledger_entries_account; Type: INDEX; Schema: billing; Owner: postgres
--

CREATE INDEX ix_ledger_entries_account ON billing.ledger_entries USING btree (account_id, created_at DESC);


--
-- Name: ix_ledger_transactions_reference; Type: INDEX; Schema: billing; Owner: postgres
--

CREATE INDEX ix_ledger_transactions_reference ON billing.ledger_transactions USING btree (reference_type, reference_id);


--
-- Name: ix_order_items_order; Type: INDEX; Schema: billing; Owner: postgres
--

CREATE INDEX ix_order_items_order ON billing.order_items USING btree (order_id);


--
-- Name: ix_orders_org; Type: INDEX; Schema: billing; Owner: postgres
--

CREATE INDEX ix_orders_org ON billing.orders USING btree (organization_id, created_at DESC);


--
-- Name: ix_orders_user; Type: INDEX; Schema: billing; Owner: postgres
--

CREATE INDEX ix_orders_user ON billing.orders USING btree (user_id, created_at DESC);


--
-- Name: ix_payments_order; Type: INDEX; Schema: billing; Owner: postgres
--

CREATE INDEX ix_payments_order ON billing.payments USING btree (order_id, created_at DESC);


--
-- Name: ix_payments_status; Type: INDEX; Schema: billing; Owner: postgres
--

CREATE INDEX ix_payments_status ON billing.payments USING btree (status, created_at DESC);


--
-- Name: ix_plan_versions_plan; Type: INDEX; Schema: billing; Owner: postgres
--

CREATE INDEX ix_plan_versions_plan ON billing.plan_versions USING btree (plan_id, version DESC);


--
-- Name: ix_refunds_payment; Type: INDEX; Schema: billing; Owner: postgres
--

CREATE INDEX ix_refunds_payment ON billing.refunds USING btree (payment_id, created_at DESC);


--
-- Name: ix_subscription_events_sub; Type: INDEX; Schema: billing; Owner: postgres
--

CREATE INDEX ix_subscription_events_sub ON billing.subscription_events USING btree (subscription_id, created_at DESC);


--
-- Name: ix_subscriptions_active; Type: INDEX; Schema: billing; Owner: postgres
--

CREATE INDEX ix_subscriptions_active ON billing.subscriptions USING btree (status, current_period_end);


--
-- Name: ix_subscriptions_org; Type: INDEX; Schema: billing; Owner: postgres
--

CREATE INDEX ix_subscriptions_org ON billing.subscriptions USING btree (organization_id, status);


--
-- Name: ix_subscriptions_user; Type: INDEX; Schema: billing; Owner: postgres
--

CREATE INDEX ix_subscriptions_user ON billing.subscriptions USING btree (user_id, status);


--
-- Name: ix_calculations_listing; Type: INDEX; Schema: commission; Owner: postgres
--

CREATE INDEX ix_calculations_listing ON commission.calculations USING btree (listing_id);


--
-- Name: ix_calculations_party; Type: INDEX; Schema: commission; Owner: postgres
--

CREATE INDEX ix_calculations_party ON commission.calculations USING btree (party_user_id, party_organization_id);


--
-- Name: ix_payouts_beneficiary; Type: INDEX; Schema: commission; Owner: postgres
--

CREATE INDEX ix_payouts_beneficiary ON commission.payouts USING btree (beneficiary_user_id, beneficiary_organization_id);


--
-- Name: ix_rule_versions_rule; Type: INDEX; Schema: commission; Owner: postgres
--

CREATE INDEX ix_rule_versions_rule ON commission.rule_versions USING btree (rule_id, version DESC);


--
-- Name: ix_settlements_status; Type: INDEX; Schema: commission; Owner: postgres
--

CREATE INDEX ix_settlements_status ON commission.settlements USING btree (status, created_at);


--
-- Name: ix_cms_pages_status; Type: INDEX; Schema: content; Owner: postgres
--

CREATE INDEX ix_cms_pages_status ON content.cms_pages USING btree (status, published_at DESC);


--
-- Name: ix_seo_pages_entity; Type: INDEX; Schema: content; Owner: postgres
--

CREATE INDEX ix_seo_pages_entity ON content.seo_pages USING btree (entity_type, entity_id, locale) WHERE (entity_id IS NOT NULL);


--
-- Name: ix_lead_activities_lead; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX ix_lead_activities_lead ON crm.lead_activities USING btree (lead_id, occurred_at DESC);


--
-- Name: ix_leads_assignee; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX ix_leads_assignee ON crm.leads USING btree (assigned_agent_id, status, created_at DESC);


--
-- Name: ix_leads_org_status; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX ix_leads_org_status ON crm.leads USING btree (organization_id, status, created_at DESC);


--
-- Name: ix_tasks_assignee_due; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX ix_tasks_assignee_due ON crm.tasks USING btree (assignee_user_id, due_at) WHERE (status <> 'completed'::text);


--
-- Name: ix_viewings_agent_time; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX ix_viewings_agent_time ON crm.viewings USING btree (agent_user_id, scheduled_start);


--
-- Name: ix_viewings_listing_time; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX ix_viewings_listing_time ON crm.viewings USING btree (listing_id, scheduled_start);


--
-- Name: ix_geo_nodes_boundary; Type: INDEX; Schema: geo; Owner: postgres
--

CREATE INDEX ix_geo_nodes_boundary ON geo.nodes USING gist (boundary);


--
-- Name: ix_geo_nodes_centroid; Type: INDEX; Schema: geo; Owner: postgres
--

CREATE INDEX ix_geo_nodes_centroid ON geo.nodes USING gist (centroid);


--
-- Name: ix_geo_nodes_parent; Type: INDEX; Schema: geo; Owner: postgres
--

CREATE INDEX ix_geo_nodes_parent ON geo.nodes USING btree (parent_id, node_type, is_active);


--
-- Name: ix_evt_user; Type: INDEX; Schema: iam; Owner: postgres
--

CREATE INDEX ix_evt_user ON iam.email_verification_tokens USING btree (user_id, created_at DESC);


--
-- Name: ix_login_attempts_email; Type: INDEX; Schema: iam; Owner: postgres
--

CREATE INDEX ix_login_attempts_email ON iam.login_attempts USING btree (email_tried, created_at DESC);


--
-- Name: ix_login_attempts_ip; Type: INDEX; Schema: iam; Owner: postgres
--

CREATE INDEX ix_login_attempts_ip ON iam.login_attempts USING btree (ip, created_at DESC);


--
-- Name: ix_oauth_user; Type: INDEX; Schema: iam; Owner: postgres
--

CREATE INDEX ix_oauth_user ON iam.oauth_accounts USING btree (user_id);


--
-- Name: ix_prt_user; Type: INDEX; Schema: iam; Owner: postgres
--

CREATE INDEX ix_prt_user ON iam.password_reset_tokens USING btree (user_id, created_at DESC);


--
-- Name: ix_pvt_user_phone; Type: INDEX; Schema: iam; Owner: postgres
--

CREATE INDEX ix_pvt_user_phone ON iam.phone_verification_tokens USING btree (user_id, phone_e164, created_at DESC);


--
-- Name: ix_user_permission_grants_resource; Type: INDEX; Schema: iam; Owner: postgres
--

CREATE INDEX ix_user_permission_grants_resource ON iam.user_permission_grants USING btree (resource_type, resource_id);


--
-- Name: ix_user_permission_grants_user; Type: INDEX; Schema: iam; Owner: postgres
--

CREATE INDEX ix_user_permission_grants_user ON iam.user_permission_grants USING btree (user_id, permission_id);


--
-- Name: ix_user_sessions_user_active; Type: INDEX; Schema: iam; Owner: postgres
--

CREATE INDEX ix_user_sessions_user_active ON iam.user_sessions USING btree (user_id, expires_at) WHERE (revoked_at IS NULL);


--
-- Name: uq_credentials_passkey; Type: INDEX; Schema: iam; Owner: postgres
--

CREATE UNIQUE INDEX uq_credentials_passkey ON iam.credentials USING btree (passkey_credential_id) WHERE (passkey_credential_id IS NOT NULL);


--
-- Name: uq_mfa_active_totp; Type: INDEX; Schema: iam; Owner: postgres
--

CREATE UNIQUE INDEX uq_mfa_active_totp ON iam.mfa_factors USING btree (user_id) WHERE ((factor_type = 'totp'::text) AND (status = 'active'::text));


--
-- Name: uq_user_password_credential; Type: INDEX; Schema: iam; Owner: postgres
--

CREATE UNIQUE INDEX uq_user_password_credential ON iam.credentials USING btree (user_id) WHERE (password_hash IS NOT NULL);


--
-- Name: uq_users_primary_email; Type: INDEX; Schema: iam; Owner: postgres
--

CREATE UNIQUE INDEX uq_users_primary_email ON iam.user_emails USING btree (user_id) WHERE is_primary;


--
-- Name: uq_users_primary_phone; Type: INDEX; Schema: iam; Owner: postgres
--

CREATE UNIQUE INDEX uq_users_primary_phone ON iam.user_phones USING btree (user_id) WHERE is_primary;


--
-- Name: ix_agreement_acceptances_user; Type: INDEX; Schema: legal; Owner: postgres
--

CREATE INDEX ix_agreement_acceptances_user ON legal.user_agreement_acceptances USING btree (user_id, agreement_code);


--
-- Name: ix_contract_parties_contract; Type: INDEX; Schema: legal; Owner: postgres
--

CREATE INDEX ix_contract_parties_contract ON legal.contract_parties USING btree (contract_id);


--
-- Name: ix_contract_properties_property; Type: INDEX; Schema: legal; Owner: postgres
--

CREATE INDEX ix_contract_properties_property ON legal.contract_properties USING btree (property_id);


--
-- Name: ix_contract_signatures_party; Type: INDEX; Schema: legal; Owner: postgres
--

CREATE INDEX ix_contract_signatures_party ON legal.contract_signatures USING btree (contract_party_id, status);


--
-- Name: ix_contract_versions_contract; Type: INDEX; Schema: legal; Owner: postgres
--

CREATE INDEX ix_contract_versions_contract ON legal.contract_versions USING btree (contract_id, version DESC);


--
-- Name: ix_contracts_status; Type: INDEX; Schema: legal; Owner: postgres
--

CREATE INDEX ix_contracts_status ON legal.contracts USING btree (status, created_at DESC);


--
-- Name: ix_favorites_listing; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_favorites_listing ON marketplace.favorites USING btree (listing_id);


--
-- Name: ix_favorites_user; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_favorites_user ON marketplace.favorites USING btree (user_id, created_at DESC);


--
-- Name: ix_listing_assignments_user; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_listing_assignments_user ON marketplace.listing_assignments USING btree (user_id, status);


--
-- Name: ix_listing_media_listing_order; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_listing_media_listing_order ON marketplace.listing_media USING btree (listing_id, sort_order);


--
-- Name: ix_listing_prices_listing; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_listing_prices_listing ON marketplace.listing_prices USING btree (listing_id, valid_from DESC);


--
-- Name: ix_listing_search_status; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_listing_search_status ON marketplace.listing_search USING btree (status, updated_at);


--
-- Name: ix_listing_status_history_listing; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_listing_status_history_listing ON marketplace.listing_status_history USING btree (listing_id, created_at DESC);


--
-- Name: ix_listing_translations_locale_status; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_listing_translations_locale_status ON marketplace.listing_translations USING btree (locale, status);


--
-- Name: ix_listings_attributes; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_listings_attributes ON marketplace.listings USING gin (attributes jsonb_path_ops);


--
-- Name: ix_listings_creator; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_listings_creator ON marketplace.listings USING btree (created_by_user_id, status, created_at DESC);


--
-- Name: ix_listings_expiry; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_listings_expiry ON marketplace.listings USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: ix_listings_org; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_listings_org ON marketplace.listings USING btree (managing_organization_id, status, created_at DESC);


--
-- Name: ix_listings_org_status; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_listings_org_status ON marketplace.listings USING btree (managing_organization_id, status);


--
-- Name: ix_listings_price; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_listings_price ON marketplace.listings USING btree (currency_code, price);


--
-- Name: ix_listings_property_status; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_listings_property_status ON marketplace.listings USING btree (property_id, status);


--
-- Name: ix_listings_published; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_listings_published ON marketplace.listings USING btree (published_at DESC) WHERE (status = 'published'::marketplace.listing_status);


--
-- Name: ix_listings_search_primary; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_listings_search_primary ON marketplace.listings USING btree (status, transaction_type, property_id, published_at DESC);


--
-- Name: ix_lsd_filters; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_lsd_filters ON marketplace.listing_search_docs USING btree (status, transaction_type, price);


--
-- Name: ix_lsd_fts; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_lsd_fts ON marketplace.listing_search_docs USING gin (tsv);


--
-- Name: ix_lsd_geo; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_lsd_geo ON marketplace.listing_search_docs USING gist (location_point);


--
-- Name: ix_lsd_published; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_lsd_published ON marketplace.listing_search_docs USING btree (published_at DESC);


--
-- Name: ix_media_perceptual_hash; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_media_perceptual_hash ON marketplace.media_assets USING btree (perceptual_hash) WHERE (perceptual_hash IS NOT NULL);


--
-- Name: ix_media_phash; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_media_phash ON marketplace.media_assets USING btree (perceptual_hash) WHERE (perceptual_hash IS NOT NULL);


--
-- Name: ix_media_sha256; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_media_sha256 ON marketplace.media_assets USING btree (sha256_hex) WHERE (sha256_hex IS NOT NULL);


--
-- Name: ix_media_status_pending; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_media_status_pending ON marketplace.media_assets USING btree (status) WHERE (status <> 'ready'::text);


--
-- Name: ix_promotions_active; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_promotions_active ON marketplace.listing_promotions USING btree (started_at, ended_at, priority_score DESC);


--
-- Name: ix_promotions_listing; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_promotions_listing ON marketplace.listing_promotions USING btree (listing_id, started_at DESC);


--
-- Name: ix_saved_search_matches_search; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_saved_search_matches_search ON marketplace.saved_search_matches USING btree (saved_search_id, matched_at DESC);


--
-- Name: ix_saved_searches_active; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE INDEX ix_saved_searches_active ON marketplace.saved_searches USING btree (enabled, last_evaluated_at);


--
-- Name: uq_listing_cover_media; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE UNIQUE INDEX uq_listing_cover_media ON marketplace.listing_media USING btree (listing_id) WHERE is_cover;


--
-- Name: uq_listing_translations_slug; Type: INDEX; Schema: marketplace; Owner: postgres
--

CREATE UNIQUE INDEX uq_listing_translations_slug ON marketplace.listing_translations USING btree (locale, slug);


--
-- Name: ix_conversation_members_user; Type: INDEX; Schema: messaging; Owner: postgres
--

CREATE INDEX ix_conversation_members_user ON messaging.conversation_members USING btree (user_id, joined_at DESC);


--
-- Name: ix_messages_conversation_time; Type: INDEX; Schema: messaging; Owner: postgres
--

CREATE INDEX ix_messages_conversation_time ON messaging.messages USING btree (conversation_id, created_at DESC);


--
-- Name: ix_moderation_cases_status; Type: INDEX; Schema: moderation; Owner: postgres
--

CREATE INDEX ix_moderation_cases_status ON moderation.cases USING btree (status, priority DESC, created_at);


--
-- Name: ix_moderation_cases_target; Type: INDEX; Schema: moderation; Owner: postgres
--

CREATE INDEX ix_moderation_cases_target ON moderation.cases USING btree (target_type, target_id);


--
-- Name: ix_reports_status; Type: INDEX; Schema: moderation; Owner: postgres
--

CREATE INDEX ix_reports_status ON moderation.reports USING btree (status, created_at DESC);


--
-- Name: ix_reports_target; Type: INDEX; Schema: moderation; Owner: postgres
--

CREATE INDEX ix_reports_target ON moderation.reports USING btree (target_type, target_id);


--
-- Name: ix_notification_deliveries_pending; Type: INDEX; Schema: notification; Owner: postgres
--

CREATE INDEX ix_notification_deliveries_pending ON notification.deliveries USING btree (status, created_at) WHERE (status = ANY (ARRAY['pending'::text, 'retry'::text]));


--
-- Name: ix_notifications_user_unread; Type: INDEX; Schema: notification; Owner: postgres
--

CREATE INDEX ix_notifications_user_unread ON notification.notifications USING btree (user_id, created_at DESC) WHERE (read_at IS NULL);


--
-- Name: ix_org_members_user; Type: INDEX; Schema: org; Owner: postgres
--

CREATE INDEX ix_org_members_user ON org.organization_members USING btree (user_id, status);


--
-- Name: ix_org_translations_locale; Type: INDEX; Schema: org; Owner: postgres
--

CREATE INDEX ix_org_translations_locale ON org.organization_translations USING btree (locale);


--
-- Name: uq_org_translations_slug; Type: INDEX; Schema: org; Owner: postgres
--

CREATE UNIQUE INDEX uq_org_translations_slug ON org.organization_translations USING btree (locale, slug);


--
-- Name: ix_blocks_active; Type: INDEX; Schema: platform; Owner: postgres
--

CREATE INDEX ix_blocks_active ON platform.blocks USING btree (subject_type, subject_key, expires_at DESC);


--
-- Name: ix_job_runs_job; Type: INDEX; Schema: platform; Owner: postgres
--

CREATE INDEX ix_job_runs_job ON platform.job_runs USING btree (job_id, started_at DESC);


--
-- Name: ix_jobs_claimable; Type: INDEX; Schema: platform; Owner: postgres
--

CREATE INDEX ix_jobs_claimable ON platform.jobs USING btree (queue, run_at) WHERE (status = 'pending'::text);


--
-- Name: ix_jobs_dead; Type: INDEX; Schema: platform; Owner: postgres
--

CREATE INDEX ix_jobs_dead ON platform.jobs USING btree (queue, updated_at DESC) WHERE (status = 'dead'::text);


--
-- Name: ix_jobs_stale; Type: INDEX; Schema: platform; Owner: postgres
--

CREATE INDEX ix_jobs_stale ON platform.jobs USING btree (locked_at) WHERE (status = 'running'::text);


--
-- Name: ix_risk_events_subject; Type: INDEX; Schema: platform; Owner: postgres
--

CREATE INDEX ix_risk_events_subject ON platform.risk_events USING btree (subject_type, subject_key, created_at DESC);


--
-- Name: uq_jobs_dedup_live; Type: INDEX; Schema: platform; Owner: postgres
--

CREATE UNIQUE INDEX uq_jobs_dedup_live ON platform.jobs USING btree (dedup_key) WHERE ((dedup_key IS NOT NULL) AND (status = ANY (ARRAY['pending'::text, 'running'::text])));


--
-- Name: ix_project_buildings_project; Type: INDEX; Schema: project; Owner: postgres
--

CREATE INDEX ix_project_buildings_project ON project.project_buildings USING btree (project_id);


--
-- Name: ix_project_translations_locale; Type: INDEX; Schema: project; Owner: postgres
--

CREATE INDEX ix_project_translations_locale ON project.project_translations USING btree (locale);


--
-- Name: ix_project_units_project_status; Type: INDEX; Schema: project; Owner: postgres
--

CREATE INDEX ix_project_units_project_status ON project.units USING btree (project_id, status);


--
-- Name: ix_project_units_property; Type: INDEX; Schema: project; Owner: postgres
--

CREATE INDEX ix_project_units_property ON project.units USING btree (property_id) WHERE (property_id IS NOT NULL);


--
-- Name: ix_projects_developer; Type: INDEX; Schema: project; Owner: postgres
--

CREATE INDEX ix_projects_developer ON project.projects USING btree (developer_organization_id, created_at DESC);


--
-- Name: ix_projects_geo; Type: INDEX; Schema: project; Owner: postgres
--

CREATE INDEX ix_projects_geo ON project.projects USING gist (location_point);


--
-- Name: ix_unit_prices_unit; Type: INDEX; Schema: project; Owner: postgres
--

CREATE INDEX ix_unit_prices_unit ON project.unit_prices USING btree (unit_id, valid_from DESC);


--
-- Name: uq_project_translations_slug; Type: INDEX; Schema: project; Owner: postgres
--

CREATE UNIQUE INDEX uq_project_translations_slug ON project.project_translations USING btree (locale, slug);


--
-- Name: ix_land_geom; Type: INDEX; Schema: property; Owner: postgres
--

CREATE INDEX ix_land_geom ON property.land_details USING gist (parcel_geom);


--
-- Name: ix_property_area; Type: INDEX; Schema: property; Owner: postgres
--

CREATE INDEX ix_property_area ON property.properties USING btree (area_total_m2);


--
-- Name: ix_property_attributes; Type: INDEX; Schema: property; Owner: postgres
--

CREATE INDEX ix_property_attributes ON property.properties USING gin (attributes jsonb_path_ops);


--
-- Name: ix_property_documents_property; Type: INDEX; Schema: property; Owner: postgres
--

CREATE INDEX ix_property_documents_property ON property.documents USING btree (property_id, created_at DESC);


--
-- Name: ix_property_geo_node; Type: INDEX; Schema: property; Owner: postgres
--

CREATE INDEX ix_property_geo_node ON property.property_locations USING btree (geo_node_id);


--
-- Name: ix_property_location_point; Type: INDEX; Schema: property; Owner: postgres
--

CREATE INDEX ix_property_location_point ON property.property_locations USING gist (location_point);


--
-- Name: ix_property_media_property_order; Type: INDEX; Schema: property; Owner: postgres
--

CREATE INDEX ix_property_media_property_order ON property.property_media USING btree (property_id, sort_order);


--
-- Name: ix_property_owners_org; Type: INDEX; Schema: property; Owner: postgres
--

CREATE INDEX ix_property_owners_org ON property.owners USING btree (organization_id) WHERE (organization_id IS NOT NULL);


--
-- Name: ix_property_owners_property; Type: INDEX; Schema: property; Owner: postgres
--

CREATE INDEX ix_property_owners_property ON property.owners USING btree (property_id);


--
-- Name: ix_property_owners_user; Type: INDEX; Schema: property; Owner: postgres
--

CREATE INDEX ix_property_owners_user ON property.owners USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: ix_property_rooms; Type: INDEX; Schema: property; Owner: postgres
--

CREATE INDEX ix_property_rooms ON property.properties USING btree (rooms, bedrooms);


--
-- Name: ix_property_status_type; Type: INDEX; Schema: property; Owner: postgres
--

CREATE INDEX ix_property_status_type ON property.properties USING btree (status, property_type_id);


--
-- Name: uq_property_cadastral; Type: INDEX; Schema: property; Owner: postgres
--

CREATE UNIQUE INDEX uq_property_cadastral ON property.property_locations USING btree (cadastral_number) WHERE (cadastral_number IS NOT NULL);


--
-- Name: uq_property_cover_media; Type: INDEX; Schema: property; Owner: postgres
--

CREATE UNIQUE INDEX uq_property_cover_media ON property.property_media USING btree (property_id) WHERE is_cover;


--
-- Name: uq_property_owner_organization; Type: INDEX; Schema: property; Owner: postgres
--

CREATE UNIQUE INDEX uq_property_owner_organization ON property.owners USING btree (property_id, organization_id) WHERE (organization_id IS NOT NULL);


--
-- Name: uq_property_owner_user; Type: INDEX; Schema: property; Owner: postgres
--

CREATE UNIQUE INDEX uq_property_owner_user ON property.owners USING btree (property_id, user_id) WHERE (user_id IS NOT NULL);


--
-- Name: uq_property_primary_location; Type: INDEX; Schema: property; Owner: postgres
--

CREATE UNIQUE INDEX uq_property_primary_location ON property.property_locations USING btree (property_id) WHERE is_primary;


--
-- Name: ix_leases_property; Type: INDEX; Schema: rental; Owner: postgres
--

CREATE INDEX ix_leases_property ON rental.leases USING btree (property_id, start_date DESC);


--
-- Name: ix_leases_tenant; Type: INDEX; Schema: rental; Owner: postgres
--

CREATE INDEX ix_leases_tenant ON rental.leases USING btree (tenant_user_id, status, start_date DESC);


--
-- Name: ix_maintenance_assignee; Type: INDEX; Schema: rental; Owner: postgres
--

CREATE INDEX ix_maintenance_assignee ON rental.maintenance_tickets USING btree (assigned_to, status) WHERE (assigned_to IS NOT NULL);


--
-- Name: ix_maintenance_property; Type: INDEX; Schema: rental; Owner: postgres
--

CREATE INDEX ix_maintenance_property ON rental.maintenance_tickets USING btree (property_id, status, created_at DESC);


--
-- Name: ix_rent_payments_schedule; Type: INDEX; Schema: rental; Owner: postgres
--

CREATE INDEX ix_rent_payments_schedule ON rental.rent_payments USING btree (schedule_id, paid_at DESC);


--
-- Name: ix_rent_schedules_due; Type: INDEX; Schema: rental; Owner: postgres
--

CREATE INDEX ix_rent_schedules_due ON rental.rent_schedules USING btree (due_date, status);


--
-- Name: ix_review_reviewer; Type: INDEX; Schema: review; Owner: postgres
--

CREATE INDEX ix_review_reviewer ON review.reviews USING btree (reviewer_user_id, created_at DESC);


--
-- Name: ix_review_target; Type: INDEX; Schema: review; Owner: postgres
--

CREATE INDEX ix_review_target ON review.reviews USING btree (target_type, target_id, status, created_at DESC);


--
-- Name: ix_valuation_comparables_result; Type: INDEX; Schema: valuation; Owner: postgres
--

CREATE INDEX ix_valuation_comparables_result ON valuation.comparables USING btree (valuation_result_id);


--
-- Name: ix_valuation_property; Type: INDEX; Schema: valuation; Owner: postgres
--

CREATE INDEX ix_valuation_property ON valuation.cases USING btree (property_id, requested_at DESC);


--
-- Name: ix_valuation_status; Type: INDEX; Schema: valuation; Owner: postgres
--

CREATE INDEX ix_valuation_status ON valuation.cases USING btree (status, requested_at DESC);


--
-- Name: ix_verification_org; Type: INDEX; Schema: verification; Owner: postgres
--

CREATE INDEX ix_verification_org ON verification.cases USING btree (subject_organization_id, created_at DESC) WHERE (subject_organization_id IS NOT NULL);


--
-- Name: ix_verification_property; Type: INDEX; Schema: verification; Owner: postgres
--

CREATE INDEX ix_verification_property ON verification.cases USING btree (subject_property_id, created_at DESC) WHERE (subject_property_id IS NOT NULL);


--
-- Name: ix_verification_status; Type: INDEX; Schema: verification; Owner: postgres
--

CREATE INDEX ix_verification_status ON verification.cases USING btree (status, created_at DESC);


--
-- Name: ix_verification_user; Type: INDEX; Schema: verification; Owner: postgres
--

CREATE INDEX ix_verification_user ON verification.cases USING btree (subject_user_id, created_at DESC) WHERE (subject_user_id IS NOT NULL);


--
-- Name: advertisers trg_advertisers_updated_at; Type: TRIGGER; Schema: advertising; Owner: postgres
--

CREATE TRIGGER trg_advertisers_updated_at BEFORE UPDATE ON advertising.advertisers FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();


--
-- Name: budgets trg_budgets_limit; Type: TRIGGER; Schema: advertising; Owner: postgres
--

CREATE TRIGGER trg_budgets_limit BEFORE INSERT OR UPDATE ON advertising.budgets FOR EACH ROW EXECUTE FUNCTION advertising.guard_budget_limit();


--
-- Name: budgets trg_budgets_updated_at; Type: TRIGGER; Schema: advertising; Owner: postgres
--

CREATE TRIGGER trg_budgets_updated_at BEFORE UPDATE ON advertising.budgets FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();


--
-- Name: campaigns trg_campaigns_updated_at; Type: TRIGGER; Schema: advertising; Owner: postgres
--

CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON advertising.campaigns FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();


--
-- Name: ledger_entries trg_ledger_balanced; Type: TRIGGER; Schema: billing; Owner: postgres
--

CREATE CONSTRAINT TRIGGER trg_ledger_balanced AFTER INSERT OR DELETE OR UPDATE ON billing.ledger_entries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION billing.validate_ledger_transaction();


--
-- Name: ledger_entries trg_ledger_entry_currency; Type: TRIGGER; Schema: billing; Owner: postgres
--

CREATE TRIGGER trg_ledger_entry_currency BEFORE INSERT OR UPDATE ON billing.ledger_entries FOR EACH ROW EXECUTE FUNCTION billing.validate_ledger_entry_currency();


--
-- Name: orders trg_orders_updated_at; Type: TRIGGER; Schema: billing; Owner: postgres
--

CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON billing.orders FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();


--
-- Name: payments trg_payment_currency; Type: TRIGGER; Schema: billing; Owner: postgres
--

CREATE TRIGGER trg_payment_currency BEFORE INSERT OR UPDATE ON billing.payments FOR EACH ROW EXECUTE FUNCTION billing.validate_payment_currency();


--
-- Name: calculation_lines trg_calculation_lines_immutable; Type: TRIGGER; Schema: commission; Owner: postgres
--

CREATE TRIGGER trg_calculation_lines_immutable BEFORE DELETE OR UPDATE ON commission.calculation_lines FOR EACH ROW EXECUTE FUNCTION commission.forbid_mutation();


--
-- Name: calculations trg_calculations_immutable; Type: TRIGGER; Schema: commission; Owner: postgres
--

CREATE TRIGGER trg_calculations_immutable BEFORE DELETE OR UPDATE ON commission.calculations FOR EACH ROW EXECUTE FUNCTION commission.forbid_mutation();


--
-- Name: rule_versions trg_rule_versions_immutable; Type: TRIGGER; Schema: commission; Owner: postgres
--

CREATE TRIGGER trg_rule_versions_immutable BEFORE DELETE OR UPDATE ON commission.rule_versions FOR EACH ROW EXECUTE FUNCTION commission.forbid_mutation();


--
-- Name: rules trg_rules_guard_delete; Type: TRIGGER; Schema: commission; Owner: postgres
--

CREATE TRIGGER trg_rules_guard_delete BEFORE DELETE ON commission.rules FOR EACH ROW EXECUTE FUNCTION commission.guard_rule_delete();


--
-- Name: rules trg_rules_updated_at; Type: TRIGGER; Schema: commission; Owner: postgres
--

CREATE TRIGGER trg_rules_updated_at BEFORE UPDATE ON commission.rules FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();


--
-- Name: cms_pages trg_cms_pages_updated_at; Type: TRIGGER; Schema: content; Owner: postgres
--

CREATE TRIGGER trg_cms_pages_updated_at BEFORE UPDATE ON content.cms_pages FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();


--
-- Name: seo_pages trg_seo_pages_updated_at; Type: TRIGGER; Schema: content; Owner: postgres
--

CREATE TRIGGER trg_seo_pages_updated_at BEFORE UPDATE ON content.seo_pages FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();


--
-- Name: leads trg_leads_updated_at; Type: TRIGGER; Schema: crm; Owner: postgres
--

CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON crm.leads FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();


--
-- Name: nodes trg_geo_nodes_updated_at; Type: TRIGGER; Schema: geo; Owner: postgres
--

CREATE TRIGGER trg_geo_nodes_updated_at BEFORE UPDATE ON geo.nodes FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();


--
-- Name: user_translations trg_user_translations_updated_at; Type: TRIGGER; Schema: iam; Owner: postgres
--

CREATE TRIGGER trg_user_translations_updated_at BEFORE UPDATE ON iam.user_translations FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();


--
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: iam; Owner: postgres
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON iam.users FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();


--
-- Name: contracts trg_contracts_updated_at; Type: TRIGGER; Schema: legal; Owner: postgres
--

CREATE TRIGGER trg_contracts_updated_at BEFORE UPDATE ON legal.contracts FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();


--
-- Name: listing_media trg_listing_media_publication_integrity; Type: TRIGGER; Schema: marketplace; Owner: postgres
--

CREATE CONSTRAINT TRIGGER trg_listing_media_publication_integrity AFTER INSERT OR DELETE OR UPDATE ON marketplace.listing_media DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION marketplace.validate_published_listing_children();


--
-- Name: listing_prices trg_listing_price_publication_integrity; Type: TRIGGER; Schema: marketplace; Owner: postgres
--

CREATE CONSTRAINT TRIGGER trg_listing_price_publication_integrity AFTER INSERT OR DELETE OR UPDATE ON marketplace.listing_prices DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION marketplace.validate_published_listing_children();


--
-- Name: listings trg_listing_property_state; Type: TRIGGER; Schema: marketplace; Owner: postgres
--

CREATE TRIGGER trg_listing_property_state BEFORE INSERT OR UPDATE OF property_id, status ON marketplace.listings FOR EACH ROW EXECUTE FUNCTION marketplace.validate_listing_property_state();


--
-- Name: listings trg_listing_publication_fields; Type: TRIGGER; Schema: marketplace; Owner: postgres
--

CREATE TRIGGER trg_listing_publication_fields BEFORE INSERT OR UPDATE OF status, published_at ON marketplace.listings FOR EACH ROW EXECUTE FUNCTION marketplace.validate_listing_publication_fields();


--
-- Name: listings trg_listing_status_history; Type: TRIGGER; Schema: marketplace; Owner: postgres
--

CREATE TRIGGER trg_listing_status_history AFTER UPDATE OF status ON marketplace.listings FOR EACH ROW EXECUTE FUNCTION marketplace.record_listing_status_history();


--
-- Name: listings trg_listing_status_transition; Type: TRIGGER; Schema: marketplace; Owner: postgres
--

CREATE TRIGGER trg_listing_status_transition BEFORE UPDATE OF status ON marketplace.listings FOR EACH ROW EXECUTE FUNCTION marketplace.validate_listing_transition();


--
-- Name: listing_translations trg_listing_translations_updated_at; Type: TRIGGER; Schema: marketplace; Owner: postgres
--

CREATE TRIGGER trg_listing_translations_updated_at BEFORE UPDATE ON marketplace.listing_translations FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();


--
-- Name: listings trg_listing_version; Type: TRIGGER; Schema: marketplace; Owner: postgres
--

CREATE TRIGGER trg_listing_version BEFORE UPDATE ON marketplace.listings FOR EACH ROW EXECUTE FUNCTION marketplace.bump_listing_version();


--
-- Name: listings trg_listings_updated_at; Type: TRIGGER; Schema: marketplace; Owner: postgres
--

CREATE TRIGGER trg_listings_updated_at BEFORE UPDATE ON marketplace.listings FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();


--
-- Name: listings trg_published_listing_requirements; Type: TRIGGER; Schema: marketplace; Owner: postgres
--

CREATE TRIGGER trg_published_listing_requirements AFTER INSERT OR UPDATE OF status, price, currency_code, price_period, published_at ON marketplace.listings FOR EACH ROW EXECUTE FUNCTION marketplace.trg_assert_published_listing_integrity();


--
-- Name: saved_searches trg_saved_searches_updated_at; Type: TRIGGER; Schema: marketplace; Owner: postgres
--

CREATE TRIGGER trg_saved_searches_updated_at BEFORE UPDATE ON marketplace.saved_searches FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();


--
-- Name: agency_profiles trg_agency_profile_type; Type: TRIGGER; Schema: org; Owner: postgres
--

CREATE TRIGGER trg_agency_profile_type BEFORE INSERT OR UPDATE ON org.agency_profiles FOR EACH ROW EXECUTE FUNCTION org.validate_profile_type();


--
-- Name: developer_profiles trg_developer_profile_type; Type: TRIGGER; Schema: org; Owner: postgres
--

CREATE TRIGGER trg_developer_profile_type BEFORE INSERT OR UPDATE ON org.developer_profiles FOR EACH ROW EXECUTE FUNCTION org.validate_profile_type();


--
-- Name: organization_translations trg_org_translations_updated_at; Type: TRIGGER; Schema: org; Owner: postgres
--

CREATE TRIGGER trg_org_translations_updated_at BEFORE UPDATE ON org.organization_translations FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();


--
-- Name: organizations trg_org_updated_at; Type: TRIGGER; Schema: org; Owner: postgres
--

CREATE TRIGGER trg_org_updated_at BEFORE UPDATE ON org.organizations FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();


--
-- Name: feature_flags trg_feature_flags_updated_at; Type: TRIGGER; Schema: platform; Owner: postgres
--

CREATE TRIGGER trg_feature_flags_updated_at BEFORE UPDATE ON platform.feature_flags FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();


--
-- Name: projects trg_project_developer_org_type; Type: TRIGGER; Schema: project; Owner: postgres
--

CREATE TRIGGER trg_project_developer_org_type BEFORE INSERT OR UPDATE OF developer_organization_id ON project.projects FOR EACH ROW EXECUTE FUNCTION project.validate_developer_org_type();


--
-- Name: project_translations trg_project_translations_updated_at; Type: TRIGGER; Schema: project; Owner: postgres
--

CREATE TRIGGER trg_project_translations_updated_at BEFORE UPDATE ON project.project_translations FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();


--
-- Name: units trg_project_units_updated_at; Type: TRIGGER; Schema: project; Owner: postgres
--

CREATE TRIGGER trg_project_units_updated_at BEFORE UPDATE ON project.units FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();


--
-- Name: projects trg_projects_updated_at; Type: TRIGGER; Schema: project; Owner: postgres
--

CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON project.projects FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();


--
-- Name: apartment_details trg_apartment_details_type; Type: TRIGGER; Schema: property; Owner: postgres
--

CREATE TRIGGER trg_apartment_details_type BEFORE INSERT OR UPDATE ON property.apartment_details FOR EACH ROW EXECUTE FUNCTION property.validate_property_subtype();


--
-- Name: commercial_details trg_commercial_details_type; Type: TRIGGER; Schema: property; Owner: postgres
--

CREATE TRIGGER trg_commercial_details_type BEFORE INSERT OR UPDATE ON property.commercial_details FOR EACH ROW EXECUTE FUNCTION property.validate_property_subtype();


--
-- Name: hospitality_details trg_hospitality_details_type; Type: TRIGGER; Schema: property; Owner: postgres
--

CREATE TRIGGER trg_hospitality_details_type BEFORE INSERT OR UPDATE ON property.hospitality_details FOR EACH ROW EXECUTE FUNCTION property.validate_property_subtype();


--
-- Name: house_details trg_house_details_type; Type: TRIGGER; Schema: property; Owner: postgres
--

CREATE TRIGGER trg_house_details_type BEFORE INSERT OR UPDATE ON property.house_details FOR EACH ROW EXECUTE FUNCTION property.validate_property_subtype();


--
-- Name: land_details trg_land_details_type; Type: TRIGGER; Schema: property; Owner: postgres
--

CREATE TRIGGER trg_land_details_type BEFORE INSERT OR UPDATE ON property.land_details FOR EACH ROW EXECUTE FUNCTION property.validate_property_subtype();


--
-- Name: owners trg_owner_share_total; Type: TRIGGER; Schema: property; Owner: postgres
--

CREATE CONSTRAINT TRIGGER trg_owner_share_total AFTER INSERT OR DELETE OR UPDATE ON property.owners DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION property.prevent_owner_share_overflow();


--
-- Name: properties trg_properties_updated_at; Type: TRIGGER; Schema: property; Owner: postgres
--

CREATE TRIGGER trg_properties_updated_at BEFORE UPDATE ON property.properties FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();


--
-- Name: properties trg_property_status_requires_full_ownership; Type: TRIGGER; Schema: property; Owner: postgres
--

CREATE CONSTRAINT TRIGGER trg_property_status_requires_full_ownership AFTER INSERT OR UPDATE OF status ON property.properties DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION property.validate_active_property_ownership();


--
-- Name: leases trg_leases_updated_at; Type: TRIGGER; Schema: rental; Owner: postgres
--

CREATE TRIGGER trg_leases_updated_at BEFORE UPDATE ON rental.leases FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();


--
-- Name: rent_payments trg_rent_payment_currency; Type: TRIGGER; Schema: rental; Owner: postgres
--

CREATE TRIGGER trg_rent_payment_currency BEFORE INSERT OR UPDATE ON rental.rent_payments FOR EACH ROW EXECUTE FUNCTION rental.validate_rent_payment_currency();


--
-- Name: rent_schedules trg_rent_schedule_currency; Type: TRIGGER; Schema: rental; Owner: postgres
--

CREATE TRIGGER trg_rent_schedule_currency BEFORE INSERT OR UPDATE ON rental.rent_schedules FOR EACH ROW EXECUTE FUNCTION rental.validate_rent_schedule_currency();


--
-- Name: reviews trg_reviews_updated_at; Type: TRIGGER; Schema: review; Owner: postgres
--

CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON review.reviews FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();


--
-- Name: advertisers advertisers_organization_id_fkey; Type: FK CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.advertisers
    ADD CONSTRAINT advertisers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES org.organizations(id) ON DELETE RESTRICT;


--
-- Name: billing billing_advertiser_id_fkey; Type: FK CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.billing
    ADD CONSTRAINT billing_advertiser_id_fkey FOREIGN KEY (advertiser_id) REFERENCES advertising.advertisers(id) ON DELETE RESTRICT;


--
-- Name: billing billing_currency_code_fkey; Type: FK CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.billing
    ADD CONSTRAINT billing_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES platform.currencies(code);


--
-- Name: budgets budgets_campaign_id_fkey; Type: FK CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.budgets
    ADD CONSTRAINT budgets_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES advertising.campaigns(id) ON DELETE CASCADE;


--
-- Name: budgets budgets_currency_code_fkey; Type: FK CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.budgets
    ADD CONSTRAINT budgets_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES platform.currencies(code);


--
-- Name: campaign_groups campaign_groups_advertiser_id_fkey; Type: FK CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.campaign_groups
    ADD CONSTRAINT campaign_groups_advertiser_id_fkey FOREIGN KEY (advertiser_id) REFERENCES advertising.advertisers(id) ON DELETE CASCADE;


--
-- Name: campaigns campaigns_advertiser_id_fkey; Type: FK CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.campaigns
    ADD CONSTRAINT campaigns_advertiser_id_fkey FOREIGN KEY (advertiser_id) REFERENCES advertising.advertisers(id) ON DELETE RESTRICT;


--
-- Name: campaigns campaigns_campaign_group_id_fkey; Type: FK CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.campaigns
    ADD CONSTRAINT campaigns_campaign_group_id_fkey FOREIGN KEY (campaign_group_id) REFERENCES advertising.campaign_groups(id) ON DELETE SET NULL;


--
-- Name: campaigns campaigns_currency_code_fkey; Type: FK CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.campaigns
    ADD CONSTRAINT campaigns_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES platform.currencies(code);


--
-- Name: clicks clicks_impression_id_fkey; Type: FK CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.clicks
    ADD CONSTRAINT clicks_impression_id_fkey FOREIGN KEY (impression_id) REFERENCES advertising.impressions(id) ON DELETE CASCADE;


--
-- Name: creatives creatives_campaign_id_fkey; Type: FK CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.creatives
    ADD CONSTRAINT creatives_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES advertising.campaigns(id) ON DELETE CASCADE;


--
-- Name: creatives creatives_media_asset_id_fkey; Type: FK CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.creatives
    ADD CONSTRAINT creatives_media_asset_id_fkey FOREIGN KEY (media_asset_id) REFERENCES marketplace.media_assets(id) ON DELETE SET NULL;


--
-- Name: impressions impressions_campaign_id_fkey; Type: FK CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.impressions
    ADD CONSTRAINT impressions_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES advertising.campaigns(id) ON DELETE CASCADE;


--
-- Name: impressions impressions_creative_id_fkey; Type: FK CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.impressions
    ADD CONSTRAINT impressions_creative_id_fkey FOREIGN KEY (creative_id) REFERENCES advertising.creatives(id) ON DELETE CASCADE;


--
-- Name: impressions impressions_geo_node_id_fkey; Type: FK CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.impressions
    ADD CONSTRAINT impressions_geo_node_id_fkey FOREIGN KEY (geo_node_id) REFERENCES geo.nodes(id) ON DELETE SET NULL;


--
-- Name: impressions impressions_slot_id_fkey; Type: FK CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.impressions
    ADD CONSTRAINT impressions_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES advertising.ad_slots(id) ON DELETE RESTRICT;


--
-- Name: reports reports_campaign_id_fkey; Type: FK CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.reports
    ADD CONSTRAINT reports_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES advertising.campaigns(id) ON DELETE CASCADE;


--
-- Name: reports reports_currency_code_fkey; Type: FK CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.reports
    ADD CONSTRAINT reports_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES platform.currencies(code);


--
-- Name: targets targets_campaign_id_fkey; Type: FK CONSTRAINT; Schema: advertising; Owner: postgres
--

ALTER TABLE ONLY advertising.targets
    ADD CONSTRAINT targets_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES advertising.campaigns(id) ON DELETE CASCADE;


--
-- Name: logs logs_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: audit; Owner: postgres
--

ALTER TABLE ONLY audit.logs
    ADD CONSTRAINT logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: logs logs_organization_id_fkey; Type: FK CONSTRAINT; Schema: audit; Owner: postgres
--

ALTER TABLE ONLY audit.logs
    ADD CONSTRAINT logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES org.organizations(id) ON DELETE SET NULL;


--
-- Name: entitlements entitlements_plan_version_id_fkey; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.entitlements
    ADD CONSTRAINT entitlements_plan_version_id_fkey FOREIGN KEY (plan_version_id) REFERENCES billing.plan_versions(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_order_id_fkey; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.invoices
    ADD CONSTRAINT invoices_order_id_fkey FOREIGN KEY (order_id) REFERENCES billing.orders(id) ON DELETE RESTRICT;


--
-- Name: ledger_accounts ledger_accounts_currency_code_fkey; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.ledger_accounts
    ADD CONSTRAINT ledger_accounts_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES platform.currencies(code);


--
-- Name: ledger_entries ledger_entries_account_id_fkey; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.ledger_entries
    ADD CONSTRAINT ledger_entries_account_id_fkey FOREIGN KEY (account_id) REFERENCES billing.ledger_accounts(id) ON DELETE RESTRICT;


--
-- Name: ledger_entries ledger_entries_transaction_id_fkey; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.ledger_entries
    ADD CONSTRAINT ledger_entries_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES billing.ledger_transactions(id) ON DELETE RESTRICT;


--
-- Name: ledger_transactions ledger_transactions_currency_code_fkey; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.ledger_transactions
    ADD CONSTRAINT ledger_transactions_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES platform.currencies(code);


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES billing.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_price_id_fkey; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.order_items
    ADD CONSTRAINT order_items_product_price_id_fkey FOREIGN KEY (product_price_id) REFERENCES billing.product_prices(id) ON DELETE RESTRICT;


--
-- Name: orders orders_currency_code_fkey; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.orders
    ADD CONSTRAINT orders_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES platform.currencies(code);


--
-- Name: orders orders_organization_id_fkey; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.orders
    ADD CONSTRAINT orders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES org.organizations(id) ON DELETE SET NULL;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: payments payments_currency_code_fkey; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.payments
    ADD CONSTRAINT payments_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES platform.currencies(code);


--
-- Name: payments payments_idempotency_key_fkey; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.payments
    ADD CONSTRAINT payments_idempotency_key_fkey FOREIGN KEY (idempotency_key) REFERENCES platform.idempotency_keys(id);


--
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES billing.orders(id) ON DELETE RESTRICT;


--
-- Name: plan_versions plan_versions_plan_id_fkey; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.plan_versions
    ADD CONSTRAINT plan_versions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES billing.plans(id) ON DELETE CASCADE;


--
-- Name: product_prices product_prices_currency_code_fkey; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.product_prices
    ADD CONSTRAINT product_prices_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES platform.currencies(code);


--
-- Name: product_prices product_prices_product_id_fkey; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.product_prices
    ADD CONSTRAINT product_prices_product_id_fkey FOREIGN KEY (product_id) REFERENCES billing.products(id) ON DELETE CASCADE;


--
-- Name: refunds refunds_payment_id_fkey; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.refunds
    ADD CONSTRAINT refunds_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES billing.payments(id) ON DELETE RESTRICT;


--
-- Name: subscription_events subscription_events_subscription_id_fkey; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.subscription_events
    ADD CONSTRAINT subscription_events_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES billing.subscriptions(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_organization_id_fkey; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.subscriptions
    ADD CONSTRAINT subscriptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES org.organizations(id) ON DELETE RESTRICT;


--
-- Name: subscriptions subscriptions_plan_version_id_fkey; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.subscriptions
    ADD CONSTRAINT subscriptions_plan_version_id_fkey FOREIGN KEY (plan_version_id) REFERENCES billing.plan_versions(id);


--
-- Name: subscriptions subscriptions_product_price_id_fkey; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.subscriptions
    ADD CONSTRAINT subscriptions_product_price_id_fkey FOREIGN KEY (product_price_id) REFERENCES billing.product_prices(id) ON DELETE RESTRICT;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE RESTRICT;


--
-- Name: adjustments adjustments_calculation_id_fkey; Type: FK CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.adjustments
    ADD CONSTRAINT adjustments_calculation_id_fkey FOREIGN KEY (calculation_id) REFERENCES commission.calculations(id) ON DELETE RESTRICT;


--
-- Name: adjustments adjustments_created_by_fkey; Type: FK CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.adjustments
    ADD CONSTRAINT adjustments_created_by_fkey FOREIGN KEY (created_by) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: adjustments adjustments_currency_code_fkey; Type: FK CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.adjustments
    ADD CONSTRAINT adjustments_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES platform.currencies(code);


--
-- Name: calculation_lines calculation_lines_calculation_id_fkey; Type: FK CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.calculation_lines
    ADD CONSTRAINT calculation_lines_calculation_id_fkey FOREIGN KEY (calculation_id) REFERENCES commission.calculations(id) ON DELETE CASCADE;


--
-- Name: calculation_lines calculation_lines_currency_code_fkey; Type: FK CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.calculation_lines
    ADD CONSTRAINT calculation_lines_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES platform.currencies(code);


--
-- Name: calculations calculations_calculated_by_fkey; Type: FK CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.calculations
    ADD CONSTRAINT calculations_calculated_by_fkey FOREIGN KEY (calculated_by) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: calculations calculations_contract_id_fkey; Type: FK CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.calculations
    ADD CONSTRAINT calculations_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES legal.contracts(id) ON DELETE SET NULL;


--
-- Name: calculations calculations_currency_code_fkey; Type: FK CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.calculations
    ADD CONSTRAINT calculations_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES platform.currencies(code);


--
-- Name: calculations calculations_listing_id_fkey; Type: FK CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.calculations
    ADD CONSTRAINT calculations_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES marketplace.listings(id) ON DELETE SET NULL;


--
-- Name: calculations calculations_party_organization_id_fkey; Type: FK CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.calculations
    ADD CONSTRAINT calculations_party_organization_id_fkey FOREIGN KEY (party_organization_id) REFERENCES org.organizations(id) ON DELETE SET NULL;


--
-- Name: calculations calculations_party_user_id_fkey; Type: FK CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.calculations
    ADD CONSTRAINT calculations_party_user_id_fkey FOREIGN KEY (party_user_id) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: calculations calculations_rule_id_fkey; Type: FK CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.calculations
    ADD CONSTRAINT calculations_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES commission.rules(id) ON DELETE SET NULL;


--
-- Name: calculations calculations_rule_version_id_fkey; Type: FK CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.calculations
    ADD CONSTRAINT calculations_rule_version_id_fkey FOREIGN KEY (rule_version_id) REFERENCES commission.rule_versions(id) ON DELETE RESTRICT;


--
-- Name: payouts payouts_beneficiary_organization_id_fkey; Type: FK CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.payouts
    ADD CONSTRAINT payouts_beneficiary_organization_id_fkey FOREIGN KEY (beneficiary_organization_id) REFERENCES org.organizations(id) ON DELETE RESTRICT;


--
-- Name: payouts payouts_beneficiary_user_id_fkey; Type: FK CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.payouts
    ADD CONSTRAINT payouts_beneficiary_user_id_fkey FOREIGN KEY (beneficiary_user_id) REFERENCES iam.users(id) ON DELETE RESTRICT;


--
-- Name: payouts payouts_currency_code_fkey; Type: FK CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.payouts
    ADD CONSTRAINT payouts_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES platform.currencies(code);


--
-- Name: rule_versions rule_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.rule_versions
    ADD CONSTRAINT rule_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: rule_versions rule_versions_rule_id_fkey; Type: FK CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.rule_versions
    ADD CONSTRAINT rule_versions_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES commission.rules(id) ON DELETE CASCADE;


--
-- Name: rules rules_created_by_fkey; Type: FK CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.rules
    ADD CONSTRAINT rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: settlements settlements_calculation_id_fkey; Type: FK CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.settlements
    ADD CONSTRAINT settlements_calculation_id_fkey FOREIGN KEY (calculation_id) REFERENCES commission.calculations(id) ON DELETE RESTRICT;


--
-- Name: settlements settlements_currency_code_fkey; Type: FK CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.settlements
    ADD CONSTRAINT settlements_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES platform.currencies(code);


--
-- Name: settlements settlements_settled_by_fkey; Type: FK CONSTRAINT; Schema: commission; Owner: postgres
--

ALTER TABLE ONLY commission.settlements
    ADD CONSTRAINT settlements_settled_by_fkey FOREIGN KEY (settled_by) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: cms_blocks cms_blocks_page_id_fkey; Type: FK CONSTRAINT; Schema: content; Owner: postgres
--

ALTER TABLE ONLY content.cms_blocks
    ADD CONSTRAINT cms_blocks_page_id_fkey FOREIGN KEY (page_id) REFERENCES content.cms_pages(id) ON DELETE CASCADE;


--
-- Name: lead_activities lead_activities_lead_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_activities
    ADD CONSTRAINT lead_activities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES crm.leads(id) ON DELETE CASCADE;


--
-- Name: lead_activities lead_activities_performed_by_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_activities
    ADD CONSTRAINT lead_activities_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: leads leads_assigned_agent_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.leads
    ADD CONSTRAINT leads_assigned_agent_id_fkey FOREIGN KEY (assigned_agent_id) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: leads leads_listing_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.leads
    ADD CONSTRAINT leads_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES marketplace.listings(id) ON DELETE SET NULL;


--
-- Name: leads leads_organization_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.leads
    ADD CONSTRAINT leads_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES org.organizations(id) ON DELETE SET NULL;


--
-- Name: leads leads_user_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.leads
    ADD CONSTRAINT leads_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_assignee_user_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.tasks
    ADD CONSTRAINT tasks_assignee_user_id_fkey FOREIGN KEY (assignee_user_id) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_lead_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.tasks
    ADD CONSTRAINT tasks_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES crm.leads(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_organization_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.tasks
    ADD CONSTRAINT tasks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES org.organizations(id) ON DELETE CASCADE;


--
-- Name: viewings viewings_agent_user_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.viewings
    ADD CONSTRAINT viewings_agent_user_id_fkey FOREIGN KEY (agent_user_id) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: viewings viewings_lead_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.viewings
    ADD CONSTRAINT viewings_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES crm.leads(id) ON DELETE SET NULL;


--
-- Name: viewings viewings_listing_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.viewings
    ADD CONSTRAINT viewings_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES marketplace.listings(id) ON DELETE RESTRICT;


--
-- Name: node_translations node_translations_node_id_fkey; Type: FK CONSTRAINT; Schema: geo; Owner: postgres
--

ALTER TABLE ONLY geo.node_translations
    ADD CONSTRAINT node_translations_node_id_fkey FOREIGN KEY (node_id) REFERENCES geo.nodes(id) ON DELETE CASCADE;


--
-- Name: nodes nodes_parent_id_fkey; Type: FK CONSTRAINT; Schema: geo; Owner: postgres
--

ALTER TABLE ONLY geo.nodes
    ADD CONSTRAINT nodes_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES geo.nodes(id) ON DELETE RESTRICT;


--
-- Name: credentials credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.credentials
    ADD CONSTRAINT credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;


--
-- Name: email_verification_tokens email_verification_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;


--
-- Name: oauth_accounts oauth_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.oauth_accounts
    ADD CONSTRAINT oauth_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;


--
-- Name: phone_verification_tokens phone_verification_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.phone_verification_tokens
    ADD CONSTRAINT phone_verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES iam.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES iam.roles(id) ON DELETE CASCADE;


--
-- Name: user_emails user_emails_user_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.user_emails
    ADD CONSTRAINT user_emails_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;


--
-- Name: user_permission_grants user_permission_grants_granted_by_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.user_permission_grants
    ADD CONSTRAINT user_permission_grants_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: user_permission_grants user_permission_grants_permission_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.user_permission_grants
    ADD CONSTRAINT user_permission_grants_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES iam.permissions(id) ON DELETE CASCADE;


--
-- Name: user_permission_grants user_permission_grants_user_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.user_permission_grants
    ADD CONSTRAINT user_permission_grants_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;


--
-- Name: user_phones user_phones_user_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.user_phones
    ADD CONSTRAINT user_phones_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;


--
-- Name: user_translations user_translations_user_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: postgres
--

ALTER TABLE ONLY iam.user_translations
    ADD CONSTRAINT user_translations_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;


--
-- Name: contract_parties contract_parties_contract_id_fkey; Type: FK CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.contract_parties
    ADD CONSTRAINT contract_parties_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES legal.contracts(id) ON DELETE CASCADE;


--
-- Name: contract_parties contract_parties_organization_id_fkey; Type: FK CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.contract_parties
    ADD CONSTRAINT contract_parties_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES org.organizations(id) ON DELETE RESTRICT;


--
-- Name: contract_parties contract_parties_user_id_fkey; Type: FK CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.contract_parties
    ADD CONSTRAINT contract_parties_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE RESTRICT;


--
-- Name: contract_properties contract_properties_contract_id_fkey; Type: FK CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.contract_properties
    ADD CONSTRAINT contract_properties_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES legal.contracts(id) ON DELETE CASCADE;


--
-- Name: contract_properties contract_properties_property_id_fkey; Type: FK CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.contract_properties
    ADD CONSTRAINT contract_properties_property_id_fkey FOREIGN KEY (property_id) REFERENCES property.properties(id) ON DELETE RESTRICT;


--
-- Name: contract_signatures contract_signatures_contract_id_fkey; Type: FK CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.contract_signatures
    ADD CONSTRAINT contract_signatures_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES legal.contracts(id) ON DELETE CASCADE;


--
-- Name: contract_signatures contract_signatures_contract_party_id_contract_id_fkey; Type: FK CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.contract_signatures
    ADD CONSTRAINT contract_signatures_contract_party_id_contract_id_fkey FOREIGN KEY (contract_party_id, contract_id) REFERENCES legal.contract_parties(id, contract_id) ON DELETE CASCADE;


--
-- Name: contract_signatures contract_signatures_contract_party_id_fkey; Type: FK CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.contract_signatures
    ADD CONSTRAINT contract_signatures_contract_party_id_fkey FOREIGN KEY (contract_party_id) REFERENCES legal.contract_parties(id) ON DELETE CASCADE;


--
-- Name: contract_signatures contract_signatures_contract_version_id_contract_id_fkey; Type: FK CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.contract_signatures
    ADD CONSTRAINT contract_signatures_contract_version_id_contract_id_fkey FOREIGN KEY (contract_version_id, contract_id) REFERENCES legal.contract_versions(id, contract_id) ON DELETE CASCADE;


--
-- Name: contract_signatures contract_signatures_contract_version_id_fkey; Type: FK CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.contract_signatures
    ADD CONSTRAINT contract_signatures_contract_version_id_fkey FOREIGN KEY (contract_version_id) REFERENCES legal.contract_versions(id) ON DELETE CASCADE;


--
-- Name: contract_versions contract_versions_contract_id_fkey; Type: FK CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.contract_versions
    ADD CONSTRAINT contract_versions_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES legal.contracts(id) ON DELETE CASCADE;


--
-- Name: contract_versions contract_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.contract_versions
    ADD CONSTRAINT contract_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: contract_versions contract_versions_document_media_id_fkey; Type: FK CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.contract_versions
    ADD CONSTRAINT contract_versions_document_media_id_fkey FOREIGN KEY (document_media_id) REFERENCES marketplace.media_assets(id) ON DELETE RESTRICT;


--
-- Name: contracts contracts_created_by_fkey; Type: FK CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.contracts
    ADD CONSTRAINT contracts_created_by_fkey FOREIGN KEY (created_by) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: contracts contracts_template_id_fkey; Type: FK CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.contracts
    ADD CONSTRAINT contracts_template_id_fkey FOREIGN KEY (template_id) REFERENCES legal.contract_templates(id) ON DELETE RESTRICT;


--
-- Name: user_agreement_acceptances user_agreement_acceptances_user_id_fkey; Type: FK CONSTRAINT; Schema: legal; Owner: postgres
--

ALTER TABLE ONLY legal.user_agreement_acceptances
    ADD CONSTRAINT user_agreement_acceptances_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_listing_id_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.favorites
    ADD CONSTRAINT favorites_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES marketplace.listings(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;


--
-- Name: listing_assignments listing_assignments_granted_by_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_assignments
    ADD CONSTRAINT listing_assignments_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: listing_assignments listing_assignments_listing_id_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_assignments
    ADD CONSTRAINT listing_assignments_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES marketplace.listings(id) ON DELETE CASCADE;


--
-- Name: listing_assignments listing_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_assignments
    ADD CONSTRAINT listing_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE RESTRICT;


--
-- Name: listing_contact_settings listing_contact_settings_listing_id_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_contact_settings
    ADD CONSTRAINT listing_contact_settings_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES marketplace.listings(id) ON DELETE CASCADE;


--
-- Name: listing_media listing_media_listing_id_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_media
    ADD CONSTRAINT listing_media_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES marketplace.listings(id) ON DELETE CASCADE;


--
-- Name: listing_media listing_media_media_asset_id_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_media
    ADD CONSTRAINT listing_media_media_asset_id_fkey FOREIGN KEY (media_asset_id) REFERENCES marketplace.media_assets(id) ON DELETE RESTRICT;


--
-- Name: listing_prices listing_prices_currency_code_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_prices
    ADD CONSTRAINT listing_prices_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES platform.currencies(code);


--
-- Name: listing_prices listing_prices_listing_id_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_prices
    ADD CONSTRAINT listing_prices_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES marketplace.listings(id) ON DELETE CASCADE;


--
-- Name: listing_promotions listing_promotions_listing_id_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_promotions
    ADD CONSTRAINT listing_promotions_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES marketplace.listings(id) ON DELETE CASCADE;


--
-- Name: listing_promotions listing_promotions_order_fk; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_promotions
    ADD CONSTRAINT listing_promotions_order_fk FOREIGN KEY (order_id) REFERENCES billing.orders(id) ON DELETE SET NULL;


--
-- Name: listing_search_docs listing_search_docs_currency_code_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_search_docs
    ADD CONSTRAINT listing_search_docs_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES platform.currencies(code);


--
-- Name: listing_search_docs listing_search_docs_geo_node_id_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_search_docs
    ADD CONSTRAINT listing_search_docs_geo_node_id_fkey FOREIGN KEY (geo_node_id) REFERENCES geo.nodes(id);


--
-- Name: listing_search_docs listing_search_docs_listing_id_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_search_docs
    ADD CONSTRAINT listing_search_docs_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES marketplace.listings(id) ON DELETE CASCADE;


--
-- Name: listing_search listing_search_listing_id_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_search
    ADD CONSTRAINT listing_search_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES marketplace.listings(id) ON DELETE CASCADE;


--
-- Name: listing_status_history listing_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_status_history
    ADD CONSTRAINT listing_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: listing_status_history listing_status_history_listing_id_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_status_history
    ADD CONSTRAINT listing_status_history_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES marketplace.listings(id) ON DELETE CASCADE;


--
-- Name: listing_translations listing_translations_listing_id_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listing_translations
    ADD CONSTRAINT listing_translations_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES marketplace.listings(id) ON DELETE CASCADE;


--
-- Name: listings listings_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listings
    ADD CONSTRAINT listings_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: listings listings_currency_code_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listings
    ADD CONSTRAINT listings_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES platform.currencies(code);


--
-- Name: listings listings_managing_organization_id_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listings
    ADD CONSTRAINT listings_managing_organization_id_fkey FOREIGN KEY (managing_organization_id) REFERENCES org.organizations(id) ON DELETE RESTRICT;


--
-- Name: listings listings_property_id_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.listings
    ADD CONSTRAINT listings_property_id_fkey FOREIGN KEY (property_id) REFERENCES property.properties(id) ON DELETE RESTRICT;


--
-- Name: media_assets media_assets_created_by_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.media_assets
    ADD CONSTRAINT media_assets_created_by_fkey FOREIGN KEY (created_by) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: media_assets media_assets_duplicate_of_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.media_assets
    ADD CONSTRAINT media_assets_duplicate_of_fkey FOREIGN KEY (duplicate_of) REFERENCES marketplace.media_assets(id);


--
-- Name: media_variants media_variants_media_asset_id_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.media_variants
    ADD CONSTRAINT media_variants_media_asset_id_fkey FOREIGN KEY (media_asset_id) REFERENCES marketplace.media_assets(id) ON DELETE CASCADE;


--
-- Name: saved_search_matches saved_search_matches_listing_id_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.saved_search_matches
    ADD CONSTRAINT saved_search_matches_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES marketplace.listings(id) ON DELETE CASCADE;


--
-- Name: saved_search_matches saved_search_matches_saved_search_id_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.saved_search_matches
    ADD CONSTRAINT saved_search_matches_saved_search_id_fkey FOREIGN KEY (saved_search_id) REFERENCES marketplace.saved_searches(id) ON DELETE CASCADE;


--
-- Name: saved_searches saved_searches_user_id_fkey; Type: FK CONSTRAINT; Schema: marketplace; Owner: postgres
--

ALTER TABLE ONLY marketplace.saved_searches
    ADD CONSTRAINT saved_searches_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;


--
-- Name: conversation_members conversation_members_conversation_id_fkey; Type: FK CONSTRAINT; Schema: messaging; Owner: postgres
--

ALTER TABLE ONLY messaging.conversation_members
    ADD CONSTRAINT conversation_members_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES messaging.conversations(id) ON DELETE CASCADE;


--
-- Name: conversation_members conversation_members_user_id_fkey; Type: FK CONSTRAINT; Schema: messaging; Owner: postgres
--

ALTER TABLE ONLY messaging.conversation_members
    ADD CONSTRAINT conversation_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_listing_id_fkey; Type: FK CONSTRAINT; Schema: messaging; Owner: postgres
--

ALTER TABLE ONLY messaging.conversations
    ADD CONSTRAINT conversations_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES marketplace.listings(id) ON DELETE SET NULL;


--
-- Name: conversations conversations_organization_id_fkey; Type: FK CONSTRAINT; Schema: messaging; Owner: postgres
--

ALTER TABLE ONLY messaging.conversations
    ADD CONSTRAINT conversations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES org.organizations(id) ON DELETE SET NULL;


--
-- Name: message_media message_media_media_asset_id_fkey; Type: FK CONSTRAINT; Schema: messaging; Owner: postgres
--

ALTER TABLE ONLY messaging.message_media
    ADD CONSTRAINT message_media_media_asset_id_fkey FOREIGN KEY (media_asset_id) REFERENCES marketplace.media_assets(id) ON DELETE RESTRICT;


--
-- Name: message_media message_media_message_id_fkey; Type: FK CONSTRAINT; Schema: messaging; Owner: postgres
--

ALTER TABLE ONLY messaging.message_media
    ADD CONSTRAINT message_media_message_id_fkey FOREIGN KEY (message_id) REFERENCES messaging.messages(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: messaging; Owner: postgres
--

ALTER TABLE ONLY messaging.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES messaging.conversations(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_user_id_fkey; Type: FK CONSTRAINT; Schema: messaging; Owner: postgres
--

ALTER TABLE ONLY messaging.messages
    ADD CONSTRAINT messages_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES iam.users(id) ON DELETE RESTRICT;


--
-- Name: actions actions_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: moderation; Owner: postgres
--

ALTER TABLE ONLY moderation.actions
    ADD CONSTRAINT actions_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: actions actions_case_id_fkey; Type: FK CONSTRAINT; Schema: moderation; Owner: postgres
--

ALTER TABLE ONLY moderation.actions
    ADD CONSTRAINT actions_case_id_fkey FOREIGN KEY (case_id) REFERENCES moderation.cases(id) ON DELETE CASCADE;


--
-- Name: cases cases_assigned_to_fkey; Type: FK CONSTRAINT; Schema: moderation; Owner: postgres
--

ALTER TABLE ONLY moderation.cases
    ADD CONSTRAINT cases_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: reports reports_reporter_user_id_fkey; Type: FK CONSTRAINT; Schema: moderation; Owner: postgres
--

ALTER TABLE ONLY moderation.reports
    ADD CONSTRAINT reports_reporter_user_id_fkey FOREIGN KEY (reporter_user_id) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: reports reports_resolved_by_fkey; Type: FK CONSTRAINT; Schema: moderation; Owner: postgres
--

ALTER TABLE ONLY moderation.reports
    ADD CONSTRAINT reports_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: deliveries deliveries_notification_id_fkey; Type: FK CONSTRAINT; Schema: notification; Owner: postgres
--

ALTER TABLE ONLY notification.deliveries
    ADD CONSTRAINT deliveries_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES notification.notifications(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: notification; Owner: postgres
--

ALTER TABLE ONLY notification.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;


--
-- Name: organization_preferences organization_preferences_organization_id_fkey; Type: FK CONSTRAINT; Schema: notification; Owner: postgres
--

ALTER TABLE ONLY notification.organization_preferences
    ADD CONSTRAINT organization_preferences_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES org.organizations(id) ON DELETE CASCADE;


--
-- Name: quiet_hours quiet_hours_user_id_fkey; Type: FK CONSTRAINT; Schema: notification; Owner: postgres
--

ALTER TABLE ONLY notification.quiet_hours
    ADD CONSTRAINT quiet_hours_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;


--
-- Name: user_preferences user_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: notification; Owner: postgres
--

ALTER TABLE ONLY notification.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;


--
-- Name: agency_profiles agency_profiles_organization_id_fkey; Type: FK CONSTRAINT; Schema: org; Owner: postgres
--

ALTER TABLE ONLY org.agency_profiles
    ADD CONSTRAINT agency_profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES org.organizations(id) ON DELETE CASCADE;


--
-- Name: developer_profiles developer_profiles_organization_id_fkey; Type: FK CONSTRAINT; Schema: org; Owner: postgres
--

ALTER TABLE ONLY org.developer_profiles
    ADD CONSTRAINT developer_profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES org.organizations(id) ON DELETE CASCADE;


--
-- Name: member_roles member_roles_member_id_fkey; Type: FK CONSTRAINT; Schema: org; Owner: postgres
--

ALTER TABLE ONLY org.member_roles
    ADD CONSTRAINT member_roles_member_id_fkey FOREIGN KEY (member_id) REFERENCES org.organization_members(id) ON DELETE CASCADE;


--
-- Name: member_roles member_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: org; Owner: postgres
--

ALTER TABLE ONLY org.member_roles
    ADD CONSTRAINT member_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES iam.roles(id) ON DELETE RESTRICT;


--
-- Name: organization_members organization_members_invited_by_fkey; Type: FK CONSTRAINT; Schema: org; Owner: postgres
--

ALTER TABLE ONLY org.organization_members
    ADD CONSTRAINT organization_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: organization_members organization_members_organization_id_fkey; Type: FK CONSTRAINT; Schema: org; Owner: postgres
--

ALTER TABLE ONLY org.organization_members
    ADD CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES org.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_user_id_fkey; Type: FK CONSTRAINT; Schema: org; Owner: postgres
--

ALTER TABLE ONLY org.organization_members
    ADD CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE RESTRICT;


--
-- Name: organization_translations organization_translations_organization_id_fkey; Type: FK CONSTRAINT; Schema: org; Owner: postgres
--

ALTER TABLE ONLY org.organization_translations
    ADD CONSTRAINT organization_translations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES org.organizations(id) ON DELETE CASCADE;


--
-- Name: exchange_rates exchange_rates_base_currency_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: postgres
--

ALTER TABLE ONLY platform.exchange_rates
    ADD CONSTRAINT exchange_rates_base_currency_fkey FOREIGN KEY (base_currency) REFERENCES platform.currencies(code);


--
-- Name: exchange_rates exchange_rates_quote_currency_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: postgres
--

ALTER TABLE ONLY platform.exchange_rates
    ADD CONSTRAINT exchange_rates_quote_currency_fkey FOREIGN KEY (quote_currency) REFERENCES platform.currencies(code);


--
-- Name: job_runs job_runs_job_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: postgres
--

ALTER TABLE ONLY platform.job_runs
    ADD CONSTRAINT job_runs_job_id_fkey FOREIGN KEY (job_id) REFERENCES platform.jobs(id) ON DELETE CASCADE;


--
-- Name: payment_plans payment_plans_currency_code_fkey; Type: FK CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.payment_plans
    ADD CONSTRAINT payment_plans_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES platform.currencies(code);


--
-- Name: payment_plans payment_plans_project_id_fkey; Type: FK CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.payment_plans
    ADD CONSTRAINT payment_plans_project_id_fkey FOREIGN KEY (project_id) REFERENCES project.projects(id) ON DELETE CASCADE;


--
-- Name: project_buildings project_buildings_project_id_fkey; Type: FK CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.project_buildings
    ADD CONSTRAINT project_buildings_project_id_fkey FOREIGN KEY (project_id) REFERENCES project.projects(id) ON DELETE CASCADE;


--
-- Name: project_floors project_floors_building_id_fkey; Type: FK CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.project_floors
    ADD CONSTRAINT project_floors_building_id_fkey FOREIGN KEY (building_id) REFERENCES project.project_buildings(id) ON DELETE CASCADE;


--
-- Name: project_translations project_translations_project_id_fkey; Type: FK CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.project_translations
    ADD CONSTRAINT project_translations_project_id_fkey FOREIGN KEY (project_id) REFERENCES project.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_developer_organization_id_fkey; Type: FK CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.projects
    ADD CONSTRAINT projects_developer_organization_id_fkey FOREIGN KEY (developer_organization_id) REFERENCES org.organizations(id) ON DELETE RESTRICT;


--
-- Name: projects projects_geo_node_id_fkey; Type: FK CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.projects
    ADD CONSTRAINT projects_geo_node_id_fkey FOREIGN KEY (geo_node_id) REFERENCES geo.nodes(id) ON DELETE RESTRICT;


--
-- Name: unit_prices unit_prices_currency_code_fkey; Type: FK CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.unit_prices
    ADD CONSTRAINT unit_prices_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES platform.currencies(code);


--
-- Name: unit_prices unit_prices_unit_id_fkey; Type: FK CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.unit_prices
    ADD CONSTRAINT unit_prices_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES project.units(id) ON DELETE CASCADE;


--
-- Name: units units_building_id_fkey; Type: FK CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.units
    ADD CONSTRAINT units_building_id_fkey FOREIGN KEY (building_id) REFERENCES project.project_buildings(id) ON DELETE CASCADE;


--
-- Name: units units_building_id_project_id_fkey; Type: FK CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.units
    ADD CONSTRAINT units_building_id_project_id_fkey FOREIGN KEY (building_id, project_id) REFERENCES project.project_buildings(id, project_id) ON DELETE CASCADE;


--
-- Name: units units_floor_id_building_id_fkey; Type: FK CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.units
    ADD CONSTRAINT units_floor_id_building_id_fkey FOREIGN KEY (floor_id, building_id) REFERENCES project.project_floors(id, building_id) ON DELETE RESTRICT;


--
-- Name: units units_floor_id_fkey; Type: FK CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.units
    ADD CONSTRAINT units_floor_id_fkey FOREIGN KEY (floor_id) REFERENCES project.project_floors(id) ON DELETE RESTRICT;


--
-- Name: units units_project_id_fkey; Type: FK CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.units
    ADD CONSTRAINT units_project_id_fkey FOREIGN KEY (project_id) REFERENCES project.projects(id) ON DELETE CASCADE;


--
-- Name: units units_property_id_fkey; Type: FK CONSTRAINT; Schema: project; Owner: postgres
--

ALTER TABLE ONLY project.units
    ADD CONSTRAINT units_property_id_fkey FOREIGN KEY (property_id) REFERENCES property.properties(id) ON DELETE SET NULL;


--
-- Name: apartment_details apartment_details_property_id_fkey; Type: FK CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.apartment_details
    ADD CONSTRAINT apartment_details_property_id_fkey FOREIGN KEY (property_id) REFERENCES property.properties(id) ON DELETE CASCADE;


--
-- Name: commercial_details commercial_details_property_id_fkey; Type: FK CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.commercial_details
    ADD CONSTRAINT commercial_details_property_id_fkey FOREIGN KEY (property_id) REFERENCES property.properties(id) ON DELETE CASCADE;


--
-- Name: documents documents_media_asset_id_fkey; Type: FK CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.documents
    ADD CONSTRAINT documents_media_asset_id_fkey FOREIGN KEY (media_asset_id) REFERENCES marketplace.media_assets(id) ON DELETE RESTRICT;


--
-- Name: documents documents_property_id_fkey; Type: FK CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.documents
    ADD CONSTRAINT documents_property_id_fkey FOREIGN KEY (property_id) REFERENCES property.properties(id) ON DELETE CASCADE;


--
-- Name: hospitality_details hospitality_details_property_id_fkey; Type: FK CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.hospitality_details
    ADD CONSTRAINT hospitality_details_property_id_fkey FOREIGN KEY (property_id) REFERENCES property.properties(id) ON DELETE CASCADE;


--
-- Name: house_details house_details_property_id_fkey; Type: FK CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.house_details
    ADD CONSTRAINT house_details_property_id_fkey FOREIGN KEY (property_id) REFERENCES property.properties(id) ON DELETE CASCADE;


--
-- Name: land_details land_details_property_id_fkey; Type: FK CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.land_details
    ADD CONSTRAINT land_details_property_id_fkey FOREIGN KEY (property_id) REFERENCES property.properties(id) ON DELETE CASCADE;


--
-- Name: owners owners_organization_id_fkey; Type: FK CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.owners
    ADD CONSTRAINT owners_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES org.organizations(id) ON DELETE RESTRICT;


--
-- Name: owners owners_property_id_fkey; Type: FK CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.owners
    ADD CONSTRAINT owners_property_id_fkey FOREIGN KEY (property_id) REFERENCES property.properties(id) ON DELETE CASCADE;


--
-- Name: owners owners_user_id_fkey; Type: FK CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.owners
    ADD CONSTRAINT owners_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE RESTRICT;


--
-- Name: properties properties_created_by_fkey; Type: FK CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.properties
    ADD CONSTRAINT properties_created_by_fkey FOREIGN KEY (created_by) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: properties properties_property_type_id_fkey; Type: FK CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.properties
    ADD CONSTRAINT properties_property_type_id_fkey FOREIGN KEY (property_type_id) REFERENCES property.property_types(id) ON DELETE RESTRICT;


--
-- Name: property_amenities property_amenities_amenity_id_fkey; Type: FK CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.property_amenities
    ADD CONSTRAINT property_amenities_amenity_id_fkey FOREIGN KEY (amenity_id) REFERENCES property.amenities(id) ON DELETE RESTRICT;


--
-- Name: property_amenities property_amenities_property_id_fkey; Type: FK CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.property_amenities
    ADD CONSTRAINT property_amenities_property_id_fkey FOREIGN KEY (property_id) REFERENCES property.properties(id) ON DELETE CASCADE;


--
-- Name: property_locations property_locations_geo_node_id_fkey; Type: FK CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.property_locations
    ADD CONSTRAINT property_locations_geo_node_id_fkey FOREIGN KEY (geo_node_id) REFERENCES geo.nodes(id) ON DELETE RESTRICT;


--
-- Name: property_locations property_locations_property_id_fkey; Type: FK CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.property_locations
    ADD CONSTRAINT property_locations_property_id_fkey FOREIGN KEY (property_id) REFERENCES property.properties(id) ON DELETE CASCADE;


--
-- Name: property_media property_media_media_asset_id_fkey; Type: FK CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.property_media
    ADD CONSTRAINT property_media_media_asset_id_fkey FOREIGN KEY (media_asset_id) REFERENCES marketplace.media_assets(id) ON DELETE RESTRICT;


--
-- Name: property_media property_media_property_id_fkey; Type: FK CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.property_media
    ADD CONSTRAINT property_media_property_id_fkey FOREIGN KEY (property_id) REFERENCES property.properties(id) ON DELETE CASCADE;


--
-- Name: property_type_translations property_type_translations_property_type_id_fkey; Type: FK CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.property_type_translations
    ADD CONSTRAINT property_type_translations_property_type_id_fkey FOREIGN KEY (property_type_id) REFERENCES property.property_types(id) ON DELETE CASCADE;


--
-- Name: property_types property_types_parent_id_fkey; Type: FK CONSTRAINT; Schema: property; Owner: postgres
--

ALTER TABLE ONLY property.property_types
    ADD CONSTRAINT property_types_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES property.property_types(id) ON DELETE RESTRICT;


--
-- Name: lease_parties lease_parties_lease_id_fkey; Type: FK CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.lease_parties
    ADD CONSTRAINT lease_parties_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES rental.leases(id) ON DELETE CASCADE;


--
-- Name: lease_parties lease_parties_organization_id_fkey; Type: FK CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.lease_parties
    ADD CONSTRAINT lease_parties_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES org.organizations(id) ON DELETE RESTRICT;


--
-- Name: lease_parties lease_parties_user_id_fkey; Type: FK CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.lease_parties
    ADD CONSTRAINT lease_parties_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE RESTRICT;


--
-- Name: leases leases_contract_id_fkey; Type: FK CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.leases
    ADD CONSTRAINT leases_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES legal.contracts(id) ON DELETE SET NULL;


--
-- Name: leases leases_currency_code_fkey; Type: FK CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.leases
    ADD CONSTRAINT leases_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES platform.currencies(code);


--
-- Name: leases leases_landlord_organization_id_fkey; Type: FK CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.leases
    ADD CONSTRAINT leases_landlord_organization_id_fkey FOREIGN KEY (landlord_organization_id) REFERENCES org.organizations(id) ON DELETE RESTRICT;


--
-- Name: leases leases_landlord_user_id_fkey; Type: FK CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.leases
    ADD CONSTRAINT leases_landlord_user_id_fkey FOREIGN KEY (landlord_user_id) REFERENCES iam.users(id) ON DELETE RESTRICT;


--
-- Name: leases leases_property_id_fkey; Type: FK CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.leases
    ADD CONSTRAINT leases_property_id_fkey FOREIGN KEY (property_id) REFERENCES property.properties(id) ON DELETE RESTRICT;


--
-- Name: leases leases_source_listing_id_fkey; Type: FK CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.leases
    ADD CONSTRAINT leases_source_listing_id_fkey FOREIGN KEY (source_listing_id) REFERENCES marketplace.listings(id) ON DELETE SET NULL;


--
-- Name: leases leases_tenant_organization_id_fkey; Type: FK CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.leases
    ADD CONSTRAINT leases_tenant_organization_id_fkey FOREIGN KEY (tenant_organization_id) REFERENCES org.organizations(id) ON DELETE RESTRICT;


--
-- Name: leases leases_tenant_user_id_fkey; Type: FK CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.leases
    ADD CONSTRAINT leases_tenant_user_id_fkey FOREIGN KEY (tenant_user_id) REFERENCES iam.users(id) ON DELETE RESTRICT;


--
-- Name: maintenance_tickets maintenance_tickets_assigned_to_fkey; Type: FK CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.maintenance_tickets
    ADD CONSTRAINT maintenance_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: maintenance_tickets maintenance_tickets_created_by_fkey; Type: FK CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.maintenance_tickets
    ADD CONSTRAINT maintenance_tickets_created_by_fkey FOREIGN KEY (created_by) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: maintenance_tickets maintenance_tickets_currency_code_fkey; Type: FK CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.maintenance_tickets
    ADD CONSTRAINT maintenance_tickets_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES platform.currencies(code);


--
-- Name: maintenance_tickets maintenance_tickets_lease_id_fkey; Type: FK CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.maintenance_tickets
    ADD CONSTRAINT maintenance_tickets_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES rental.leases(id) ON DELETE SET NULL;


--
-- Name: maintenance_tickets maintenance_tickets_property_id_fkey; Type: FK CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.maintenance_tickets
    ADD CONSTRAINT maintenance_tickets_property_id_fkey FOREIGN KEY (property_id) REFERENCES property.properties(id) ON DELETE RESTRICT;


--
-- Name: rent_payments rent_payments_currency_code_fkey; Type: FK CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.rent_payments
    ADD CONSTRAINT rent_payments_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES platform.currencies(code);


--
-- Name: rent_payments rent_payments_external_payment_id_fkey; Type: FK CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.rent_payments
    ADD CONSTRAINT rent_payments_external_payment_id_fkey FOREIGN KEY (external_payment_id) REFERENCES billing.payments(id) ON DELETE SET NULL;


--
-- Name: rent_payments rent_payments_schedule_id_fkey; Type: FK CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.rent_payments
    ADD CONSTRAINT rent_payments_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES rental.rent_schedules(id) ON DELETE RESTRICT;


--
-- Name: rent_schedules rent_schedules_currency_code_fkey; Type: FK CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.rent_schedules
    ADD CONSTRAINT rent_schedules_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES platform.currencies(code);


--
-- Name: rent_schedules rent_schedules_lease_id_fkey; Type: FK CONSTRAINT; Schema: rental; Owner: postgres
--

ALTER TABLE ONLY rental.rent_schedules
    ADD CONSTRAINT rent_schedules_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES rental.leases(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_listing_id_fkey; Type: FK CONSTRAINT; Schema: review; Owner: postgres
--

ALTER TABLE ONLY review.reviews
    ADD CONSTRAINT reviews_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES marketplace.listings(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_reviewer_user_id_fkey; Type: FK CONSTRAINT; Schema: review; Owner: postgres
--

ALTER TABLE ONLY review.reviews
    ADD CONSTRAINT reviews_reviewer_user_id_fkey FOREIGN KEY (reviewer_user_id) REFERENCES iam.users(id) ON DELETE RESTRICT;


--
-- Name: cases cases_property_id_fkey; Type: FK CONSTRAINT; Schema: valuation; Owner: postgres
--

ALTER TABLE ONLY valuation.cases
    ADD CONSTRAINT cases_property_id_fkey FOREIGN KEY (property_id) REFERENCES property.properties(id) ON DELETE RESTRICT;


--
-- Name: cases cases_requested_by_user_id_fkey; Type: FK CONSTRAINT; Schema: valuation; Owner: postgres
--

ALTER TABLE ONLY valuation.cases
    ADD CONSTRAINT cases_requested_by_user_id_fkey FOREIGN KEY (requested_by_user_id) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: comparables comparables_comparable_listing_id_fkey; Type: FK CONSTRAINT; Schema: valuation; Owner: postgres
--

ALTER TABLE ONLY valuation.comparables
    ADD CONSTRAINT comparables_comparable_listing_id_fkey FOREIGN KEY (comparable_listing_id) REFERENCES marketplace.listings(id) ON DELETE SET NULL;


--
-- Name: comparables comparables_comparable_property_id_fkey; Type: FK CONSTRAINT; Schema: valuation; Owner: postgres
--

ALTER TABLE ONLY valuation.comparables
    ADD CONSTRAINT comparables_comparable_property_id_fkey FOREIGN KEY (comparable_property_id) REFERENCES property.properties(id) ON DELETE RESTRICT;


--
-- Name: comparables comparables_valuation_result_id_fkey; Type: FK CONSTRAINT; Schema: valuation; Owner: postgres
--

ALTER TABLE ONLY valuation.comparables
    ADD CONSTRAINT comparables_valuation_result_id_fkey FOREIGN KEY (valuation_result_id) REFERENCES valuation.results(id) ON DELETE CASCADE;


--
-- Name: results results_case_id_fkey; Type: FK CONSTRAINT; Schema: valuation; Owner: postgres
--

ALTER TABLE ONLY valuation.results
    ADD CONSTRAINT results_case_id_fkey FOREIGN KEY (case_id) REFERENCES valuation.cases(id) ON DELETE CASCADE;


--
-- Name: results results_currency_code_fkey; Type: FK CONSTRAINT; Schema: valuation; Owner: postgres
--

ALTER TABLE ONLY valuation.results
    ADD CONSTRAINT results_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES platform.currencies(code);


--
-- Name: cases cases_subject_organization_id_fkey; Type: FK CONSTRAINT; Schema: verification; Owner: postgres
--

ALTER TABLE ONLY verification.cases
    ADD CONSTRAINT cases_subject_organization_id_fkey FOREIGN KEY (subject_organization_id) REFERENCES org.organizations(id) ON DELETE SET NULL;


--
-- Name: cases cases_subject_property_id_fkey; Type: FK CONSTRAINT; Schema: verification; Owner: postgres
--

ALTER TABLE ONLY verification.cases
    ADD CONSTRAINT cases_subject_property_id_fkey FOREIGN KEY (subject_property_id) REFERENCES property.properties(id) ON DELETE SET NULL;


--
-- Name: cases cases_subject_user_id_fkey; Type: FK CONSTRAINT; Schema: verification; Owner: postgres
--

ALTER TABLE ONLY verification.cases
    ADD CONSTRAINT cases_subject_user_id_fkey FOREIGN KEY (subject_user_id) REFERENCES iam.users(id) ON DELETE SET NULL;


--
-- Name: documents documents_case_id_fkey; Type: FK CONSTRAINT; Schema: verification; Owner: postgres
--

ALTER TABLE ONLY verification.documents
    ADD CONSTRAINT documents_case_id_fkey FOREIGN KEY (case_id) REFERENCES verification.cases(id) ON DELETE CASCADE;


--
-- Name: documents documents_media_asset_id_fkey; Type: FK CONSTRAINT; Schema: verification; Owner: postgres
--

ALTER TABLE ONLY verification.documents
    ADD CONSTRAINT documents_media_asset_id_fkey FOREIGN KEY (media_asset_id) REFERENCES marketplace.media_assets(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict vXbRzE9l3zik02Mm2PXqL2TNDGuiOG2hq6DrFlBXzyFqcw3fR6DVZh2LXMcvd1Z

