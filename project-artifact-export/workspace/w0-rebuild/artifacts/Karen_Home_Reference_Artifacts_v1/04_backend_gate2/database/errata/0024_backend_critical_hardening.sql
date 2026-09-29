BEGIN;

ALTER TABLE iam.credentials
  DROP CONSTRAINT IF EXISTS credentials_check;

ALTER TABLE iam.credentials
  ADD CONSTRAINT credentials_one_authenticator
  CHECK (((password_hash IS NOT NULL)::int + (passkey_credential_id IS NOT NULL)::int) = 1);

ALTER TABLE iam.credentials
  ADD CONSTRAINT credentials_passkey_pair
  CHECK ((passkey_credential_id IS NULL) = (passkey_public_key IS NULL));

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_password_credential
  ON iam.credentials(user_id) WHERE password_hash IS NOT NULL;

ALTER TABLE iam.user_emails
  ADD CONSTRAINT user_email_verified_at_consistency
  CHECK (NOT is_verified OR verified_at IS NOT NULL);

ALTER TABLE iam.user_phones
  ADD CONSTRAINT user_phone_verified_at_consistency
  CHECK (NOT is_verified OR verified_at IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS uq_property_owner_user
  ON property.owners(property_id, user_id) WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_property_owner_organization
  ON property.owners(property_id, organization_id) WHERE organization_id IS NOT NULL;

ALTER TABLE marketplace.listings
  ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 1;

ALTER TABLE marketplace.listings
  ADD CONSTRAINT listings_version_positive CHECK (version > 0);

CREATE OR REPLACE FUNCTION marketplace.bump_listing_version()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listing_version ON marketplace.listings;
CREATE TRIGGER trg_listing_version
BEFORE UPDATE ON marketplace.listings
FOR EACH ROW EXECUTE FUNCTION marketplace.bump_listing_version();

CREATE OR REPLACE FUNCTION marketplace.assert_published_listing_integrity(p_listing_id uuid)
RETURNS void
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

CREATE OR REPLACE FUNCTION marketplace.validate_listing_publication_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN NEW.published_at := now(); END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_published_listing_requirements ON marketplace.listings;
CREATE TRIGGER trg_published_listing_requirements
AFTER INSERT OR UPDATE OF status, price, currency_code, price_period, published_at ON marketplace.listings
FOR EACH ROW EXECUTE FUNCTION marketplace.assert_published_listing_integrity(NEW.id);

CREATE OR REPLACE FUNCTION marketplace.validate_published_listing_children()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE v_listing_id uuid;
BEGIN
  v_listing_id := COALESCE(NEW.listing_id, OLD.listing_id);
  PERFORM marketplace.assert_published_listing_integrity(v_listing_id);
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_listing_price_publication_integrity ON marketplace.listing_prices;
CREATE CONSTRAINT TRIGGER trg_listing_price_publication_integrity
AFTER INSERT OR UPDATE OR DELETE ON marketplace.listing_prices
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION marketplace.validate_published_listing_children();

DROP TRIGGER IF EXISTS trg_listing_media_publication_integrity ON marketplace.listing_media;
CREATE CONSTRAINT TRIGGER trg_listing_media_publication_integrity
AFTER INSERT OR UPDATE OR DELETE ON marketplace.listing_media
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION marketplace.validate_published_listing_children();

CREATE OR REPLACE FUNCTION marketplace.record_listing_status_history()
RETURNS trigger
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

COMMIT;
