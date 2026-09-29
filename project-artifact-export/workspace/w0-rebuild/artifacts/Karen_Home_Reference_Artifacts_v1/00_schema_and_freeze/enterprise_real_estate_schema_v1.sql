-- Enterprise Real Estate Platform
-- PostgreSQL 16+ recommended, PostGIS 3.4+
-- Canonical migration-first schema. ORM mappings must follow this model.
-- Application should generate UUIDv7 identifiers; gen_random_uuid() is a DB-side safety default.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE SCHEMA IF NOT EXISTS platform;
CREATE SCHEMA IF NOT EXISTS iam;
CREATE SCHEMA IF NOT EXISTS org;
CREATE SCHEMA IF NOT EXISTS geo;
CREATE SCHEMA IF NOT EXISTS property;
CREATE SCHEMA IF NOT EXISTS marketplace;
CREATE SCHEMA IF NOT EXISTS project;
CREATE SCHEMA IF NOT EXISTS crm;
CREATE SCHEMA IF NOT EXISTS messaging;
CREATE SCHEMA IF NOT EXISTS billing;
CREATE SCHEMA IF NOT EXISTS verification;
CREATE SCHEMA IF NOT EXISTS moderation;
CREATE SCHEMA IF NOT EXISTS content;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS legal;
CREATE SCHEMA IF NOT EXISTS rental;
CREATE SCHEMA IF NOT EXISTS valuation;
CREATE SCHEMA IF NOT EXISTS notification;
CREATE SCHEMA IF NOT EXISTS review;

-- -----------------------------------------------------------------------------
-- ENUMS: lifecycle/status types are enums; extensible business taxonomies are
-- tables. Do not use enums for property/amenity types that may expand frequently.
-- -----------------------------------------------------------------------------

CREATE TYPE platform.user_status AS ENUM ('pending','active','suspended','blocked','deleted');
CREATE TYPE platform.organization_status AS ENUM ('pending','active','suspended','blocked','closed');
CREATE TYPE platform.organization_type AS ENUM ('agency','developer','service_provider','corporate_owner','bank','partner','other');
CREATE TYPE platform.membership_status AS ENUM ('invited','active','suspended','left');

CREATE TYPE property.property_status AS ENUM ('draft','active','inactive','sold','rented','archived','deleted');
CREATE TYPE property.visibility_level AS ENUM ('exact','approximate','district_only','hidden');
CREATE TYPE property.ownership_type AS ENUM ('individual','organization','joint','unknown');

CREATE TYPE marketplace.listing_status AS ENUM ('draft','pending_moderation','published','paused','rejected','expired','sold','rented','archived','deleted');
CREATE TYPE marketplace.transaction_type AS ENUM ('sale','rent','daily_rent','lease','pledge');
CREATE TYPE marketplace.price_period AS ENUM ('one_time','monthly','weekly','daily');
CREATE TYPE marketplace.media_type AS ENUM ('photo','video','floor_plan','virtual_tour','document','other');
CREATE TYPE marketplace.promotion_type AS ENUM ('vip','super_vip','homepage','category_boost','map_boost','refresh','featured');

CREATE TYPE crm.lead_status AS ENUM ('new','contacted','qualified','viewing_scheduled','negotiation','won','lost','archived');
CREATE TYPE crm.activity_type AS ENUM ('note','call','email','sms','whatsapp','meeting','status_change','task','viewing','other');
CREATE TYPE crm.viewing_status AS ENUM ('requested','confirmed','completed','cancelled','no_show');

CREATE TYPE messaging.conversation_type AS ENUM ('listing_inquiry','lead','support','system');
CREATE TYPE messaging.message_type AS ENUM ('text','image','file','system');

CREATE TYPE billing.order_status AS ENUM ('pending','paid','partially_refunded','refunded','cancelled','failed');
CREATE TYPE billing.payment_status AS ENUM ('created','pending','processing','succeeded','failed','cancelled');
CREATE TYPE billing.refund_status AS ENUM ('requested','processing','completed','failed','cancelled');
CREATE TYPE billing.subscription_status AS ENUM ('trialing','active','past_due','paused','cancelled','expired');
CREATE TYPE billing.ledger_account_type AS ENUM ('asset','liability','revenue','expense','equity','clearing');
CREATE TYPE billing.ledger_entry_side AS ENUM ('debit','credit');

CREATE TYPE verification.verification_status AS ENUM ('pending','in_progress','verified','rejected','expired','cancelled');
CREATE TYPE verification.case_type AS ENUM ('phone','email','identity','agent','organization','developer','property','ownership','document');

CREATE TYPE moderation.case_status AS ENUM ('open','in_review','resolved','rejected','dismissed');
CREATE TYPE moderation.report_status AS ENUM ('open','triaged','resolved','rejected','dismissed');

CREATE TYPE content.publish_status AS ENUM ('draft','review','published','unpublished','archived');
CREATE TYPE legal.contract_status AS ENUM ('draft','review','ready_for_signature','partially_signed','active','expired','terminated','cancelled');
CREATE TYPE legal.signature_status AS ENUM ('pending','signed','declined','expired','cancelled');
CREATE TYPE rental.lease_status AS ENUM ('draft','pending_signature','active','expired','terminated','cancelled');
CREATE TYPE rental.rent_payment_status AS ENUM ('scheduled','pending','paid','late','partially_paid','waived','cancelled');
CREATE TYPE rental.maintenance_status AS ENUM ('open','assigned','in_progress','completed','cancelled');
CREATE TYPE valuation.valuation_status AS ENUM ('requested','processing','completed','failed','expired');
CREATE TYPE review.review_status AS ENUM ('pending','published','rejected','hidden');

-- -----------------------------------------------------------------------------
-- PLATFORM
-- -----------------------------------------------------------------------------

CREATE TABLE platform.currencies (
    code char(3) PRIMARY KEY,
    name text NOT NULL,
    symbol text NOT NULL,
    minor_unit smallint NOT NULL DEFAULT 2 CHECK (minor_unit BETWEEN 0 AND 6),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE platform.exchange_rates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency char(3) NOT NULL REFERENCES platform.currencies(code),
    quote_currency char(3) NOT NULL REFERENCES platform.currencies(code),
    rate numeric(20,10) NOT NULL CHECK (rate > 0),
    observed_at timestamptz NOT NULL,
    source text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (base_currency, quote_currency, observed_at)
);

CREATE TABLE platform.feature_flags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL UNIQUE,
    description text,
    enabled boolean NOT NULL DEFAULT false,
    rollout_percent smallint NOT NULL DEFAULT 0 CHECK (rollout_percent BETWEEN 0 AND 100),
    config jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE platform.settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    description text,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE platform.idempotency_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scope text NOT NULL,
    key text NOT NULL,
    request_hash text NOT NULL,
    response_status integer,
    response_body jsonb,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (scope, key)
);

-- -----------------------------------------------------------------------------
-- IAM
-- -----------------------------------------------------------------------------

CREATE TABLE iam.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    status platform.user_status NOT NULL DEFAULT 'pending',
    first_name text,
    last_name text,
    display_name text,
    avatar_media_id uuid,
    locale text NOT NULL DEFAULT 'en',
    timezone text NOT NULL DEFAULT 'UTC',
    last_login_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    CHECK (deleted_at IS NULL OR status = 'deleted')
);

CREATE TABLE iam.user_emails (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    email citext NOT NULL,
    is_primary boolean NOT NULL DEFAULT false,
    is_verified boolean NOT NULL DEFAULT false,
    verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (email)
);

CREATE TABLE iam.user_phones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    phone_e164 text NOT NULL,
    is_primary boolean NOT NULL DEFAULT false,
    is_verified boolean NOT NULL DEFAULT false,
    verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (phone_e164)
);

CREATE TABLE iam.credentials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    password_hash text,
    passkey_credential_id text,
    passkey_public_key text,
    last_password_change_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (password_hash IS NOT NULL OR passkey_credential_id IS NOT NULL)
);

CREATE TABLE iam.user_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    refresh_token_hash text NOT NULL UNIQUE,
    device_id text,
    ip inet,
    user_agent text,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE iam.roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    description text,
    is_system boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE iam.permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    description text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE iam.role_permissions (
    role_id uuid NOT NULL REFERENCES iam.roles(id) ON DELETE CASCADE,
    permission_id uuid NOT NULL REFERENCES iam.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- -----------------------------------------------------------------------------
-- ORGANIZATIONS
-- -----------------------------------------------------------------------------

CREATE TABLE org.organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type platform.organization_type NOT NULL,
    status platform.organization_status NOT NULL DEFAULT 'pending',
    legal_name text,
    display_name text NOT NULL,
    slug text NOT NULL UNIQUE,
    tax_id text,
    email citext,
    phone_e164 text,
    website_url text,
    description text,
    logo_media_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

CREATE TABLE org.organization_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES org.organizations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE RESTRICT,
    status platform.membership_status NOT NULL DEFAULT 'invited',
    joined_at timestamptz,
    left_at timestamptz,
    invited_by uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, user_id),
    CHECK (left_at IS NULL OR joined_at IS NOT NULL)
);

CREATE TABLE org.member_roles (
    member_id uuid NOT NULL REFERENCES org.organization_members(id) ON DELETE CASCADE,
    role_id uuid NOT NULL REFERENCES iam.roles(id) ON DELETE RESTRICT,
    PRIMARY KEY (member_id, role_id)
);

CREATE TABLE org.agency_profiles (
    organization_id uuid PRIMARY KEY REFERENCES org.organizations(id) ON DELETE CASCADE,
    license_number text,
    established_year smallint CHECK (established_year BETWEEN 1800 AND 2200),
    website_url text,
    specialties jsonb NOT NULL DEFAULT '[]'::jsonb,
    verification_status verification.verification_status DEFAULT 'pending'
);

CREATE TABLE org.developer_profiles (
    organization_id uuid PRIMARY KEY REFERENCES org.organizations(id) ON DELETE CASCADE,
    developer_license_number text,
    established_year smallint CHECK (established_year BETWEEN 1800 AND 2200),
    verification_status verification.verification_status DEFAULT 'pending'
);

-- -----------------------------------------------------------------------------
-- GEOGRAPHY
-- -----------------------------------------------------------------------------

CREATE TABLE geo.nodes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id uuid REFERENCES geo.nodes(id) ON DELETE RESTRICT,
    node_type text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    path_text text,
    level smallint NOT NULL CHECK (level >= 0),
    centroid geography(Point,4326),
    boundary geometry(MultiPolygon,4326),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (parent_id, slug)
);

CREATE TABLE geo.node_translations (
    node_id uuid NOT NULL REFERENCES geo.nodes(id) ON DELETE CASCADE,
    locale text NOT NULL,
    name text NOT NULL,
    PRIMARY KEY (node_id, locale)
);

-- -----------------------------------------------------------------------------
-- PROPERTY TAXONOMY
-- -----------------------------------------------------------------------------

CREATE TABLE property.property_types (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id uuid REFERENCES property.property_types(id) ON DELETE RESTRICT,
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    is_residential boolean NOT NULL DEFAULT false,
    is_commercial boolean NOT NULL DEFAULT false,
    is_land boolean NOT NULL DEFAULT false,
    is_hospitality boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE property.amenities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    category text NOT NULL,
    name text NOT NULL,
    data_type text NOT NULL DEFAULT 'boolean' CHECK (data_type IN ('boolean','text','number')),
    is_active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE property.properties (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    public_code bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
    property_type_id uuid NOT NULL REFERENCES property.property_types(id) ON DELETE RESTRICT,
    status property.property_status NOT NULL DEFAULT 'draft',
    ownership_type property.ownership_type NOT NULL DEFAULT 'unknown',
    area_total_m2 numeric(14,2) CHECK (area_total_m2 IS NULL OR area_total_m2 > 0),
    area_usable_m2 numeric(14,2) CHECK (area_usable_m2 IS NULL OR area_usable_m2 > 0),
    rooms numeric(4,1) CHECK (rooms IS NULL OR rooms >= 0),
    bedrooms smallint CHECK (bedrooms IS NULL OR bedrooms >= 0),
    bathrooms smallint CHECK (bathrooms IS NULL OR bathrooms >= 0),
    floor smallint,
    total_floors smallint,
    year_built smallint CHECK (year_built IS NULL OR year_built BETWEEN 1000 AND 2200),
    attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    CHECK (floor IS NULL OR floor >= -5),
    CHECK (total_floors IS NULL OR total_floors > 0),
    CHECK (floor IS NULL OR total_floors IS NULL OR floor <= total_floors),
    CHECK (area_usable_m2 IS NULL OR area_total_m2 IS NULL OR area_usable_m2 <= area_total_m2),
    CHECK (deleted_at IS NULL OR status = 'deleted')
);

CREATE TABLE property.property_locations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id uuid NOT NULL REFERENCES property.properties(id) ON DELETE CASCADE,
    geo_node_id uuid REFERENCES geo.nodes(id) ON DELETE RESTRICT,
    address_line_1 text,
    address_line_2 text,
    postal_code text,
    location_point geography(Point,4326),
    location_visibility property.visibility_level NOT NULL DEFAULT 'approximate',
    cadastral_number text,
    is_primary boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE property.owners (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id uuid NOT NULL REFERENCES property.properties(id) ON DELETE CASCADE,
    user_id uuid REFERENCES iam.users(id) ON DELETE RESTRICT,
    organization_id uuid REFERENCES org.organizations(id) ON DELETE RESTRICT,
    ownership_share numeric(7,4) NOT NULL DEFAULT 100.0000 CHECK (ownership_share > 0 AND ownership_share <= 100),
    verified boolean NOT NULL DEFAULT false,
    verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (((user_id IS NOT NULL)::int + (organization_id IS NOT NULL)::int) = 1)
);

CREATE TABLE property.apartment_details (
    property_id uuid PRIMARY KEY REFERENCES property.properties(id) ON DELETE CASCADE,
    condition_code text,
    heating_type text,
    furnishing_status text,
    ceiling_height_m numeric(6,2) CHECK (ceiling_height_m IS NULL OR ceiling_height_m > 0),
    balcony_area_m2 numeric(10,2) CHECK (balcony_area_m2 IS NULL OR balcony_area_m2 >= 0),
    kitchen_type text,
    parking_spaces smallint CHECK (parking_spaces IS NULL OR parking_spaces >= 0)
);

CREATE TABLE property.house_details (
    property_id uuid PRIMARY KEY REFERENCES property.properties(id) ON DELETE CASCADE,
    land_area_m2 numeric(14,2) CHECK (land_area_m2 IS NULL OR land_area_m2 > 0),
    condition_code text,
    heating_type text,
    furnishing_status text,
    parking_spaces smallint CHECK (parking_spaces IS NULL OR parking_spaces >= 0),
    pool boolean NOT NULL DEFAULT false
);

CREATE TABLE property.land_details (
    property_id uuid PRIMARY KEY REFERENCES property.properties(id) ON DELETE CASCADE,
    land_category text NOT NULL,
    zoning_code text,
    development_rights text,
    road_access boolean,
    road_frontage_m numeric(12,2) CHECK (road_frontage_m IS NULL OR road_frontage_m >= 0),
    parcel_area_m2 numeric(14,2) CHECK (parcel_area_m2 IS NULL OR parcel_area_m2 > 0),
    parcel_geom geometry(MultiPolygon,4326)
);

CREATE TABLE property.commercial_details (
    property_id uuid PRIMARY KEY REFERENCES property.properties(id) ON DELETE CASCADE,
    commercial_category text NOT NULL,
    ceiling_height_m numeric(6,2) CHECK (ceiling_height_m IS NULL OR ceiling_height_m > 0),
    frontage_m numeric(12,2) CHECK (frontage_m IS NULL OR frontage_m >= 0),
    parking_spaces smallint CHECK (parking_spaces IS NULL OR parking_spaces >= 0),
    capacity integer CHECK (capacity IS NULL OR capacity >= 0)
);

CREATE TABLE property.hospitality_details (
    property_id uuid PRIMARY KEY REFERENCES property.properties(id) ON DELETE CASCADE,
    hospitality_type text NOT NULL,
    rooms_count integer CHECK (rooms_count IS NULL OR rooms_count >= 0),
    beds_count integer CHECK (beds_count IS NULL OR beds_count >= 0),
    star_rating numeric(2,1) CHECK (star_rating IS NULL OR (star_rating >= 0 AND star_rating <= 5))
);

CREATE TABLE property.property_amenities (
    property_id uuid NOT NULL REFERENCES property.properties(id) ON DELETE CASCADE,
    amenity_id uuid NOT NULL REFERENCES property.amenities(id) ON DELETE RESTRICT,
    value_text text,
    value_number numeric(14,4),
    value_boolean boolean,
    PRIMARY KEY (property_id, amenity_id),
    CHECK (((value_text IS NOT NULL)::int + (value_number IS NOT NULL)::int + (value_boolean IS NOT NULL)::int) <= 1)
);

-- -----------------------------------------------------------------------------
-- MEDIA
-- -----------------------------------------------------------------------------

CREATE TABLE marketplace.media_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_provider text NOT NULL,
    bucket text NOT NULL,
    object_key text NOT NULL,
    mime_type text NOT NULL,
    size_bytes bigint NOT NULL CHECK (size_bytes > 0),
    width integer CHECK (width IS NULL OR width > 0),
    height integer CHECK (height IS NULL OR height > 0),
    sha256_hex char(64),
    perceptual_hash text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (storage_provider, bucket, object_key),
    UNIQUE (sha256_hex)
);

CREATE TABLE marketplace.media_variants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    media_asset_id uuid NOT NULL REFERENCES marketplace.media_assets(id) ON DELETE CASCADE,
    object_key text NOT NULL,
    width integer NOT NULL CHECK (width > 0),
    height integer NOT NULL CHECK (height > 0),
    format text NOT NULL,
    size_bytes bigint NOT NULL CHECK (size_bytes > 0),
    UNIQUE (media_asset_id, width, height, format)
);

CREATE TABLE property.property_media (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id uuid NOT NULL REFERENCES property.properties(id) ON DELETE CASCADE,
    media_asset_id uuid NOT NULL REFERENCES marketplace.media_assets(id) ON DELETE RESTRICT,
    media_type marketplace.media_type NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    is_cover boolean NOT NULL DEFAULT false,
    caption text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (property_id, media_asset_id)
);


CREATE TABLE property.documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id uuid NOT NULL REFERENCES property.properties(id) ON DELETE CASCADE,
    media_asset_id uuid NOT NULL REFERENCES marketplace.media_assets(id) ON DELETE RESTRICT,
    document_type text NOT NULL,
    document_number text,
    issued_at date,
    expires_at date,
    is_public boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (property_id, media_asset_id)
);

-- -----------------------------------------------------------------------------
-- LISTINGS / MARKETPLACE
-- -----------------------------------------------------------------------------

CREATE TABLE marketplace.listings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    public_code bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
    property_id uuid NOT NULL REFERENCES property.properties(id) ON DELETE RESTRICT,
    managing_organization_id uuid REFERENCES org.organizations(id) ON DELETE RESTRICT,
    created_by_user_id uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    transaction_type marketplace.transaction_type NOT NULL,
    status marketplace.listing_status NOT NULL DEFAULT 'draft',
    title text NOT NULL,
    description text,
    attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
    currency_code char(3) NOT NULL REFERENCES platform.currencies(code),
    price numeric(20,4) NOT NULL CHECK (price >= 0),
    price_period marketplace.price_period NOT NULL DEFAULT 'one_time',
    service_fee numeric(20,4) CHECK (service_fee IS NULL OR service_fee >= 0),
    published_at timestamptz,
    expires_at timestamptz,
    last_refreshed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    CHECK (expires_at IS NULL OR published_at IS NULL OR expires_at > published_at),
    CHECK (deleted_at IS NULL OR status = 'deleted')
);


CREATE TABLE marketplace.listing_contact_settings (
    listing_id uuid PRIMARY KEY REFERENCES marketplace.listings(id) ON DELETE CASCADE,
    show_phone boolean NOT NULL DEFAULT true,
    show_email boolean NOT NULL DEFAULT false,
    allow_chat boolean NOT NULL DEFAULT true,
    allow_viewing_request boolean NOT NULL DEFAULT true
);

CREATE TABLE marketplace.listing_prices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES marketplace.listings(id) ON DELETE CASCADE,
    price numeric(20,4) NOT NULL CHECK (price >= 0),
    currency_code char(3) NOT NULL REFERENCES platform.currencies(code),
    price_period marketplace.price_period NOT NULL,
    valid_from timestamptz NOT NULL,
    valid_to timestamptz,
    change_reason text,
    validity tstzrange GENERATED ALWAYS AS (tstzrange(valid_from, valid_to, '[)')) STORED,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (valid_to IS NULL OR valid_to > valid_from)
);

ALTER TABLE marketplace.listing_prices
    ADD CONSTRAINT listing_prices_no_overlap
    EXCLUDE USING gist (listing_id WITH =, validity WITH &&);

CREATE TABLE marketplace.listing_media (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES marketplace.listings(id) ON DELETE CASCADE,
    media_asset_id uuid NOT NULL REFERENCES marketplace.media_assets(id) ON DELETE RESTRICT,
    media_type marketplace.media_type NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    is_cover boolean NOT NULL DEFAULT false,
    caption text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (listing_id, media_asset_id)
);

CREATE TABLE marketplace.listing_status_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES marketplace.listings(id) ON DELETE CASCADE,
    from_status marketplace.listing_status,
    to_status marketplace.listing_status NOT NULL,
    reason text,
    changed_by uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE marketplace.favorites (
    user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    listing_id uuid NOT NULL REFERENCES marketplace.listings(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, listing_id)
);

CREATE TABLE marketplace.saved_searches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    query_json jsonb NOT NULL,
    query_schema_version smallint NOT NULL DEFAULT 1 CHECK (query_schema_version > 0),
    query_hash char(64) NOT NULL,
    frequency_minutes integer NOT NULL DEFAULT 1440 CHECK (frequency_minutes >= 5),
    enabled boolean NOT NULL DEFAULT true,
    last_evaluated_at timestamptz,
    last_notified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, query_hash)
);

CREATE TABLE marketplace.saved_search_matches (
    saved_search_id uuid NOT NULL REFERENCES marketplace.saved_searches(id) ON DELETE CASCADE,
    listing_id uuid NOT NULL REFERENCES marketplace.listings(id) ON DELETE CASCADE,
    matched_at timestamptz NOT NULL DEFAULT now(),
    notified_at timestamptz,
    PRIMARY KEY (saved_search_id, listing_id)
);

CREATE TABLE marketplace.listing_promotions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES marketplace.listings(id) ON DELETE CASCADE,
    promotion_type marketplace.promotion_type NOT NULL,
    priority_score integer NOT NULL DEFAULT 0,
    started_at timestamptz NOT NULL,
    ended_at timestamptz NOT NULL,
    order_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (ended_at > started_at)
);

-- -----------------------------------------------------------------------------
-- PROJECTS / DEVELOPERS
-- -----------------------------------------------------------------------------

CREATE TABLE project.projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    public_code bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
    developer_organization_id uuid NOT NULL REFERENCES org.organizations(id) ON DELETE RESTRICT,
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text,
    status text NOT NULL,
    start_date date,
    completion_date date,
    geo_node_id uuid REFERENCES geo.nodes(id) ON DELETE RESTRICT,
    address_text text,
    location_point geography(Point,4326),
    total_units integer CHECK (total_units IS NULL OR total_units >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (completion_date IS NULL OR start_date IS NULL OR completion_date >= start_date)
);

CREATE TABLE project.project_buildings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    code text NOT NULL,
    name text,
    floors_count smallint CHECK (floors_count IS NULL OR floors_count > 0),
    UNIQUE (project_id, code),
    UNIQUE (id, project_id)
);

CREATE TABLE project.project_floors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id uuid NOT NULL REFERENCES project.project_buildings(id) ON DELETE CASCADE,
    floor_number smallint NOT NULL,
    UNIQUE (building_id, floor_number),
    UNIQUE (id, building_id)
);

CREATE TABLE project.units (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    building_id uuid NOT NULL REFERENCES project.project_buildings(id) ON DELETE CASCADE,
    floor_id uuid REFERENCES project.project_floors(id) ON DELETE RESTRICT,
    property_id uuid REFERENCES property.properties(id) ON DELETE SET NULL,
    unit_number text NOT NULL,
    area_total_m2 numeric(14,2) CHECK (area_total_m2 > 0),
    bedrooms smallint CHECK (bedrooms IS NULL OR bedrooms >= 0),
    bathrooms smallint CHECK (bathrooms IS NULL OR bathrooms >= 0),
    orientation text,
    view_description text,
    status text NOT NULL DEFAULT 'available',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (building_id, unit_number),
    FOREIGN KEY (building_id, project_id) REFERENCES project.project_buildings(id, project_id) ON DELETE CASCADE,
    FOREIGN KEY (floor_id, building_id) REFERENCES project.project_floors(id, building_id) ON DELETE RESTRICT
);

CREATE TABLE project.unit_prices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id uuid NOT NULL REFERENCES project.units(id) ON DELETE CASCADE,
    price numeric(20,4) NOT NULL CHECK (price >= 0),
    currency_code char(3) NOT NULL REFERENCES platform.currencies(code),
    valid_from timestamptz NOT NULL,
    valid_to timestamptz,
    validity tstzrange GENERATED ALWAYS AS (tstzrange(valid_from, valid_to, '[)')) STORED,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (valid_to IS NULL OR valid_to > valid_from)
);

ALTER TABLE project.unit_prices
    ADD CONSTRAINT unit_prices_no_overlap
    EXCLUDE USING gist (unit_id WITH =, validity WITH &&);

CREATE TABLE project.payment_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    currency_code char(3) REFERENCES platform.currencies(code),
    down_payment_percent numeric(7,4) CHECK (down_payment_percent IS NULL OR (down_payment_percent >= 0 AND down_payment_percent <= 100)),
    duration_months integer CHECK (duration_months IS NULL OR duration_months > 0),
    details jsonb NOT NULL DEFAULT '{}'::jsonb,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- CRM
-- -----------------------------------------------------------------------------

CREATE TABLE crm.leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    organization_id uuid REFERENCES org.organizations(id) ON DELETE SET NULL,
    listing_id uuid REFERENCES marketplace.listings(id) ON DELETE SET NULL,
    assigned_agent_id uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    source text NOT NULL,
    status crm.lead_status NOT NULL DEFAULT 'new',
    score numeric(6,2) CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE crm.lead_activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id uuid NOT NULL REFERENCES crm.leads(id) ON DELETE CASCADE,
    activity_type crm.activity_type NOT NULL,
    performed_by uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    subject text,
    body text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE crm.tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES org.organizations(id) ON DELETE CASCADE,
    assignee_user_id uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    lead_id uuid REFERENCES crm.leads(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    status text NOT NULL DEFAULT 'open',
    priority smallint NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    due_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE crm.viewings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id uuid NOT NULL REFERENCES marketplace.listings(id) ON DELETE RESTRICT,
    lead_id uuid REFERENCES crm.leads(id) ON DELETE SET NULL,
    agent_user_id uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    scheduled_start timestamptz NOT NULL,
    scheduled_end timestamptz NOT NULL,
    status crm.viewing_status NOT NULL DEFAULT 'requested',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (scheduled_end > scheduled_start)
);

ALTER TABLE crm.viewings
    ADD CONSTRAINT viewings_no_agent_overlap
    EXCLUDE USING gist (agent_user_id WITH =, tstzrange(scheduled_start, scheduled_end, '[)') WITH &&)
    WHERE (agent_user_id IS NOT NULL AND status IN ('requested','confirmed'));

-- -----------------------------------------------------------------------------
-- MESSAGING
-- -----------------------------------------------------------------------------

CREATE TABLE messaging.conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type messaging.conversation_type NOT NULL,
    listing_id uuid REFERENCES marketplace.listings(id) ON DELETE SET NULL,
    organization_id uuid REFERENCES org.organizations(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE messaging.conversation_members (
    conversation_id uuid NOT NULL REFERENCES messaging.conversations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    joined_at timestamptz NOT NULL DEFAULT now(),
    last_read_at timestamptz,
    PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messaging.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES messaging.conversations(id) ON DELETE CASCADE,
    sender_user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE RESTRICT,
    message_type messaging.message_type NOT NULL DEFAULT 'text',
    body text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    edited_at timestamptz,
    deleted_at timestamptz,
    CHECK (body IS NOT NULL OR message_type IN ('image','file','system'))
);

CREATE TABLE messaging.message_media (
    message_id uuid NOT NULL REFERENCES messaging.messages(id) ON DELETE CASCADE,
    media_asset_id uuid NOT NULL REFERENCES marketplace.media_assets(id) ON DELETE RESTRICT,
    PRIMARY KEY (message_id, media_asset_id)
);

-- -----------------------------------------------------------------------------
-- BILLING / PAYMENTS
-- -----------------------------------------------------------------------------

CREATE TABLE billing.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    product_type text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE billing.product_prices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES billing.products(id) ON DELETE CASCADE,
    amount numeric(20,4) NOT NULL CHECK (amount >= 0),
    currency_code char(3) NOT NULL REFERENCES platform.currencies(code),
    billing_interval text,
    interval_count integer CHECK (interval_count IS NULL OR interval_count > 0),
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE billing.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    organization_id uuid REFERENCES org.organizations(id) ON DELETE SET NULL,
    currency_code char(3) NOT NULL REFERENCES platform.currencies(code),
    subtotal numeric(20,4) NOT NULL CHECK (subtotal >= 0),
    tax numeric(20,4) NOT NULL DEFAULT 0 CHECK (tax >= 0),
    discount numeric(20,4) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    total numeric(20,4) NOT NULL CHECK (total >= 0),
    status billing.order_status NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (total = subtotal + tax - discount)
);

CREATE TABLE billing.order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES billing.orders(id) ON DELETE CASCADE,
    product_price_id uuid REFERENCES billing.product_prices(id) ON DELETE RESTRICT,
    description text NOT NULL,
    quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_amount numeric(20,4) NOT NULL CHECK (unit_amount >= 0),
    line_total numeric(20,4) NOT NULL CHECK (line_total = quantity * unit_amount),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE billing.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES billing.orders(id) ON DELETE RESTRICT,
    provider text NOT NULL,
    provider_reference text,
    amount numeric(20,4) NOT NULL CHECK (amount >= 0),
    currency_code char(3) NOT NULL REFERENCES platform.currencies(code),
    status billing.payment_status NOT NULL DEFAULT 'created',
    idempotency_key uuid REFERENCES platform.idempotency_keys(id),
    raw_response jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    paid_at timestamptz,
    UNIQUE (provider, provider_reference)
);

CREATE TABLE billing.refunds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id uuid NOT NULL REFERENCES billing.payments(id) ON DELETE RESTRICT,
    provider_reference text,
    amount numeric(20,4) NOT NULL CHECK (amount > 0),
    reason text,
    status billing.refund_status NOT NULL DEFAULT 'requested',
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    UNIQUE (payment_id, provider_reference)
);

CREATE TABLE billing.invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL UNIQUE REFERENCES billing.orders(id) ON DELETE RESTRICT,
    invoice_number text NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'issued',
    issued_at timestamptz NOT NULL DEFAULT now(),
    due_at timestamptz,
    paid_at timestamptz
);

CREATE TABLE billing.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES org.organizations(id) ON DELETE RESTRICT,
    user_id uuid REFERENCES iam.users(id) ON DELETE RESTRICT,
    product_price_id uuid NOT NULL REFERENCES billing.product_prices(id) ON DELETE RESTRICT,
    status billing.subscription_status NOT NULL DEFAULT 'active',
    started_at timestamptz NOT NULL DEFAULT now(),
    current_period_start timestamptz NOT NULL,
    current_period_end timestamptz NOT NULL,
    auto_renew boolean NOT NULL DEFAULT true,
    cancelled_at timestamptz,
    CHECK (((organization_id IS NOT NULL)::int + (user_id IS NOT NULL)::int) = 1),
    CHECK (current_period_end > current_period_start)
);

CREATE TABLE billing.ledger_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_type text NOT NULL,
    owner_id uuid NOT NULL,
    currency_code char(3) NOT NULL REFERENCES platform.currencies(code),
    account_type billing.ledger_account_type NOT NULL,
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE billing.ledger_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_type text NOT NULL,
    reference_id uuid NOT NULL,
    currency_code char(3) NOT NULL REFERENCES platform.currencies(code),
    description text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE billing.ledger_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id uuid NOT NULL REFERENCES billing.ledger_transactions(id) ON DELETE RESTRICT,
    account_id uuid NOT NULL REFERENCES billing.ledger_accounts(id) ON DELETE RESTRICT,
    side billing.ledger_entry_side NOT NULL,
    amount numeric(20,4) NOT NULL CHECK (amount > 0),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- PROMOTIONS: link order after billing table creation
-- -----------------------------------------------------------------------------

ALTER TABLE marketplace.listing_promotions
    ADD CONSTRAINT listing_promotions_order_fk
    FOREIGN KEY (order_id) REFERENCES billing.orders(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- VERIFICATION
-- -----------------------------------------------------------------------------

CREATE TABLE verification.cases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_type verification.case_type NOT NULL,
    subject_user_id uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    subject_organization_id uuid REFERENCES org.organizations(id) ON DELETE SET NULL,
    subject_property_id uuid REFERENCES property.properties(id) ON DELETE SET NULL,
    status verification.verification_status NOT NULL DEFAULT 'pending',
    provider text,
    provider_reference text,
    result jsonb NOT NULL DEFAULT '{}'::jsonb,
    started_at timestamptz,
    completed_at timestamptz,
    expires_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (((subject_user_id IS NOT NULL)::int + (subject_organization_id IS NOT NULL)::int + (subject_property_id IS NOT NULL)::int) = 1)
);

CREATE TABLE verification.documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id uuid NOT NULL REFERENCES verification.cases(id) ON DELETE CASCADE,
    media_asset_id uuid NOT NULL REFERENCES marketplace.media_assets(id) ON DELETE RESTRICT,
    document_type text NOT NULL,
    document_number text,
    status verification.verification_status NOT NULL DEFAULT 'pending',
    issued_at date,
    expires_at date,
    extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- MODERATION / TRUST & SAFETY
-- -----------------------------------------------------------------------------

CREATE TABLE moderation.reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_user_id uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    reason_code text NOT NULL,
    description text,
    status moderation.report_status NOT NULL DEFAULT 'open',
    created_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    resolved_by uuid REFERENCES iam.users(id) ON DELETE SET NULL
);

CREATE TABLE moderation.cases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    reason_code text NOT NULL,
    risk_score numeric(6,2) CHECK (risk_score IS NULL OR (risk_score >= 0 AND risk_score <= 100)),
    risk_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
    status moderation.case_status NOT NULL DEFAULT 'open',
    priority smallint NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    assigned_to uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    resolution text
);

CREATE TABLE moderation.actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id uuid NOT NULL REFERENCES moderation.cases(id) ON DELETE CASCADE,
    action_code text NOT NULL,
    actor_user_id uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    reason text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- CONTENT / SEO / CMS
-- -----------------------------------------------------------------------------

CREATE TABLE content.seo_pages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    path text NOT NULL,
    page_type text NOT NULL,
    entity_type text,
    entity_id uuid,
    locale text NOT NULL DEFAULT 'en',
    title text NOT NULL,
    meta_description text,
    canonical_url text,
    indexable boolean NOT NULL DEFAULT true,
    structured_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    last_generated_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (path, locale)
);

CREATE TABLE content.seo_redirects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    from_path text NOT NULL UNIQUE,
    to_path text NOT NULL,
    status_code smallint NOT NULL DEFAULT 301 CHECK (status_code IN (301,302,307,308)),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE content.cms_pages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL,
    locale text NOT NULL DEFAULT 'en',
    status content.publish_status NOT NULL DEFAULT 'draft',
    title text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz,
    UNIQUE (slug, locale)
);

CREATE TABLE content.cms_blocks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id uuid NOT NULL REFERENCES content.cms_pages(id) ON DELETE CASCADE,
    block_type text NOT NULL,
    sort_order integer NOT NULL,
    content jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (page_id, sort_order)
);


-- -----------------------------------------------------------------------------
-- LEGAL / CONTRACTS
-- -----------------------------------------------------------------------------

CREATE TABLE legal.contract_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    locale text NOT NULL DEFAULT 'en',
    version integer NOT NULL DEFAULT 1 CHECK (version > 0),
    content_template text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE legal.contracts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id uuid REFERENCES legal.contract_templates(id) ON DELETE RESTRICT,
    status legal.contract_status NOT NULL DEFAULT 'draft',
    title text NOT NULL,
    locale text NOT NULL DEFAULT 'en',
    current_version integer NOT NULL DEFAULT 1 CHECK (current_version > 0),
    effective_at timestamptz,
    expires_at timestamptz,
    terminated_at timestamptz,
    created_by uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (expires_at IS NULL OR effective_at IS NULL OR expires_at > effective_at)
);

CREATE TABLE legal.contract_parties (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id uuid NOT NULL REFERENCES legal.contracts(id) ON DELETE CASCADE,
    role text NOT NULL,
    user_id uuid REFERENCES iam.users(id) ON DELETE RESTRICT,
    organization_id uuid REFERENCES org.organizations(id) ON DELETE RESTRICT,
    display_name_snapshot text NOT NULL,
    contact_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
    CHECK (((user_id IS NOT NULL)::int + (organization_id IS NOT NULL)::int) = 1),
    UNIQUE (id, contract_id)
);

CREATE TABLE legal.contract_properties (
    contract_id uuid NOT NULL REFERENCES legal.contracts(id) ON DELETE CASCADE,
    property_id uuid NOT NULL REFERENCES property.properties(id) ON DELETE RESTRICT,
    PRIMARY KEY (contract_id, property_id)
);

CREATE TABLE legal.contract_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id uuid NOT NULL REFERENCES legal.contracts(id) ON DELETE CASCADE,
    version integer NOT NULL CHECK (version > 0),
    document_media_id uuid REFERENCES marketplace.media_assets(id) ON DELETE RESTRICT,
    rendered_content text,
    content_hash char(64),
    created_by uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (contract_id, version),
    UNIQUE (id, contract_id)
);

CREATE TABLE legal.contract_signatures (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_version_id uuid NOT NULL REFERENCES legal.contract_versions(id) ON DELETE CASCADE,
    contract_party_id uuid NOT NULL REFERENCES legal.contract_parties(id) ON DELETE CASCADE,
    contract_id uuid NOT NULL REFERENCES legal.contracts(id) ON DELETE CASCADE,
    status legal.signature_status NOT NULL DEFAULT 'pending',
    signature_type text NOT NULL,
    provider text,
    provider_reference text,
    signed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (contract_version_id, contract_party_id),
    FOREIGN KEY (contract_version_id, contract_id) REFERENCES legal.contract_versions(id, contract_id) ON DELETE CASCADE,
    FOREIGN KEY (contract_party_id, contract_id) REFERENCES legal.contract_parties(id, contract_id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- RENTAL / PROPERTY MANAGEMENT
-- -----------------------------------------------------------------------------

CREATE TABLE rental.leases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id uuid NOT NULL REFERENCES property.properties(id) ON DELETE RESTRICT,
    source_listing_id uuid REFERENCES marketplace.listings(id) ON DELETE SET NULL,
    contract_id uuid REFERENCES legal.contracts(id) ON DELETE SET NULL,
    landlord_user_id uuid REFERENCES iam.users(id) ON DELETE RESTRICT,
    landlord_organization_id uuid REFERENCES org.organizations(id) ON DELETE RESTRICT,
    tenant_user_id uuid REFERENCES iam.users(id) ON DELETE RESTRICT,
    tenant_organization_id uuid REFERENCES org.organizations(id) ON DELETE RESTRICT,
    status rental.lease_status NOT NULL DEFAULT 'draft',
    currency_code char(3) NOT NULL REFERENCES platform.currencies(code),
    monthly_rent numeric(20,4) NOT NULL CHECK (monthly_rent >= 0),
    deposit_amount numeric(20,4) CHECK (deposit_amount IS NULL OR deposit_amount >= 0),
    start_date date NOT NULL,
    end_date date NOT NULL,
    auto_renew boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (end_date > start_date),
    CHECK (((landlord_user_id IS NOT NULL)::int + (landlord_organization_id IS NOT NULL)::int) = 1),
    CHECK (((tenant_user_id IS NOT NULL)::int + (tenant_organization_id IS NOT NULL)::int) = 1)
);


ALTER TABLE rental.leases
    ADD CONSTRAINT leases_no_overlap
    EXCLUDE USING gist (property_id WITH =, daterange(start_date, end_date, '[)') WITH &&)
    WHERE (status IN ('pending_signature','active'));

CREATE TABLE rental.lease_parties (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id uuid NOT NULL REFERENCES rental.leases(id) ON DELETE CASCADE,
    role text NOT NULL,
    user_id uuid REFERENCES iam.users(id) ON DELETE RESTRICT,
    organization_id uuid REFERENCES org.organizations(id) ON DELETE RESTRICT,
    name_snapshot text NOT NULL,
    contact_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
    CHECK (((user_id IS NOT NULL)::int + (organization_id IS NOT NULL)::int) = 1)
);

CREATE TABLE rental.rent_schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id uuid NOT NULL REFERENCES rental.leases(id) ON DELETE CASCADE,
    due_date date NOT NULL,
    amount numeric(20,4) NOT NULL CHECK (amount >= 0),
    currency_code char(3) NOT NULL REFERENCES platform.currencies(code),
    status rental.rent_payment_status NOT NULL DEFAULT 'scheduled',
    paid_at timestamptz,
    UNIQUE (lease_id, due_date)
);

CREATE TABLE rental.rent_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id uuid NOT NULL REFERENCES rental.rent_schedules(id) ON DELETE RESTRICT,
    amount numeric(20,4) NOT NULL CHECK (amount > 0),
    currency_code char(3) NOT NULL REFERENCES platform.currencies(code),
    external_payment_id uuid REFERENCES billing.payments(id) ON DELETE SET NULL,
    paid_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rental.maintenance_tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id uuid NOT NULL REFERENCES property.properties(id) ON DELETE RESTRICT,
    lease_id uuid REFERENCES rental.leases(id) ON DELETE SET NULL,
    created_by uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    assigned_to uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    title text NOT NULL,
    description text,
    priority smallint NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    status rental.maintenance_status NOT NULL DEFAULT 'open',
    estimated_cost numeric(20,4) CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
    actual_cost numeric(20,4) CHECK (actual_cost IS NULL OR actual_cost >= 0),
    currency_code char(3) REFERENCES platform.currencies(code),
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz
);

-- -----------------------------------------------------------------------------
-- VALUATION
-- -----------------------------------------------------------------------------

CREATE TABLE valuation.cases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id uuid NOT NULL REFERENCES property.properties(id) ON DELETE RESTRICT,
    requested_by_user_id uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    status valuation.valuation_status NOT NULL DEFAULT 'requested',
    method text NOT NULL DEFAULT 'comparables',
    model_version text,
    requested_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    expires_at timestamptz
);

CREATE TABLE valuation.results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id uuid NOT NULL UNIQUE REFERENCES valuation.cases(id) ON DELETE CASCADE,
    min_value numeric(20,4) NOT NULL CHECK (min_value >= 0),
    estimated_value numeric(20,4) NOT NULL CHECK (estimated_value >= 0),
    max_value numeric(20,4) NOT NULL CHECK (max_value >= 0),
    currency_code char(3) NOT NULL REFERENCES platform.currencies(code),
    confidence numeric(6,2) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 100)),
    price_per_m2 numeric(20,4) CHECK (price_per_m2 IS NULL OR price_per_m2 >= 0),
    generated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (min_value <= estimated_value AND estimated_value <= max_value)
);

CREATE TABLE valuation.comparables (
    valuation_result_id uuid NOT NULL REFERENCES valuation.results(id) ON DELETE CASCADE,
    comparable_property_id uuid NOT NULL REFERENCES property.properties(id) ON DELETE RESTRICT,
    comparable_listing_id uuid REFERENCES marketplace.listings(id) ON DELETE SET NULL,
    similarity_score numeric(6,2) CHECK (similarity_score IS NULL OR (similarity_score >= 0 AND similarity_score <= 100)),
    distance_m numeric(12,2) CHECK (distance_m IS NULL OR distance_m >= 0),
    adjusted_price numeric(20,4),
    PRIMARY KEY (valuation_result_id, comparable_property_id)
);

-- -----------------------------------------------------------------------------
-- NOTIFICATIONS
-- -----------------------------------------------------------------------------

CREATE TABLE notification.templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL,
    locale text NOT NULL DEFAULT 'en',
    channel text NOT NULL,
    subject_template text,
    body_template text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    UNIQUE (code, locale, channel)
);

CREATE TABLE notification.user_preferences (
    user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    notification_type text NOT NULL,
    channel text NOT NULL,
    enabled boolean NOT NULL DEFAULT true,
    PRIMARY KEY (user_id, notification_type, channel)
);

CREATE TABLE notification.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    template_code text,
    notification_type text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    data jsonb NOT NULL DEFAULT '{}'::jsonb,
    read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notification.deliveries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id uuid NOT NULL REFERENCES notification.notifications(id) ON DELETE CASCADE,
    channel text NOT NULL,
    provider text,
    provider_reference text,
    status text NOT NULL DEFAULT 'pending',
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    last_error text,
    sent_at timestamptz,
    delivered_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- REVIEWS / REPUTATION
-- -----------------------------------------------------------------------------

CREATE TABLE review.reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE RESTRICT,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    listing_id uuid REFERENCES marketplace.listings(id) ON DELETE SET NULL,
    rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title text,
    body text,
    status review.review_status NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_review_target ON review.reviews(target_type, target_id, status, created_at DESC);
CREATE INDEX ix_review_reviewer ON review.reviews(reviewer_user_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- AUDIT / OUTBOX
-- -----------------------------------------------------------------------------

CREATE TABLE audit.logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id uuid REFERENCES iam.users(id) ON DELETE SET NULL,
    organization_id uuid REFERENCES org.organizations(id) ON DELETE SET NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    before_data jsonb,
    after_data jsonb,
    ip inet,
    user_agent text,
    request_id uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit.outbox_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type text NOT NULL,
    aggregate_id uuid NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz,
    retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    last_error text
);

-- -----------------------------------------------------------------------------
-- INDEXES
-- -----------------------------------------------------------------------------

CREATE UNIQUE INDEX uq_users_primary_email ON iam.user_emails(user_id) WHERE is_primary;
CREATE UNIQUE INDEX uq_users_primary_phone ON iam.user_phones(user_id) WHERE is_primary;
CREATE INDEX ix_user_sessions_user_active ON iam.user_sessions(user_id, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX ix_org_members_user ON org.organization_members(user_id, status);

CREATE INDEX ix_geo_nodes_parent ON geo.nodes(parent_id, node_type, is_active);
CREATE INDEX ix_geo_nodes_centroid ON geo.nodes USING gist(centroid);
CREATE INDEX ix_geo_nodes_boundary ON geo.nodes USING gist(boundary);

CREATE UNIQUE INDEX uq_property_cadastral ON property.property_locations(cadastral_number) WHERE cadastral_number IS NOT NULL;
CREATE UNIQUE INDEX uq_property_primary_location ON property.property_locations(property_id) WHERE is_primary;
CREATE INDEX ix_property_location_point ON property.property_locations USING gist(location_point);
CREATE INDEX ix_property_geo_node ON property.property_locations(geo_node_id);
CREATE INDEX ix_property_status_type ON property.properties(status, property_type_id);
CREATE INDEX ix_property_area ON property.properties(area_total_m2);
CREATE INDEX ix_property_rooms ON property.properties(rooms, bedrooms);
CREATE INDEX ix_property_attributes ON property.properties USING gin(attributes jsonb_path_ops);
CREATE INDEX ix_property_owners_property ON property.owners(property_id);
CREATE INDEX ix_property_owners_user ON property.owners(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX ix_property_owners_org ON property.owners(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX ix_land_geom ON property.land_details USING gist(parcel_geom);

CREATE INDEX ix_media_sha256 ON marketplace.media_assets(sha256_hex) WHERE sha256_hex IS NOT NULL;
CREATE INDEX ix_media_perceptual_hash ON marketplace.media_assets(perceptual_hash) WHERE perceptual_hash IS NOT NULL;
CREATE INDEX ix_property_media_property_order ON property.property_media(property_id, sort_order);
CREATE INDEX ix_property_documents_property ON property.documents(property_id, created_at DESC);
CREATE UNIQUE INDEX uq_property_cover_media ON property.property_media(property_id) WHERE is_cover;

CREATE INDEX ix_listings_search_primary ON marketplace.listings(status, transaction_type, property_id, published_at DESC);
CREATE INDEX ix_listings_org ON marketplace.listings(managing_organization_id, status, created_at DESC);
CREATE INDEX ix_listings_creator ON marketplace.listings(created_by_user_id, status, created_at DESC);
CREATE INDEX ix_listings_price ON marketplace.listings(currency_code, price);
CREATE INDEX ix_listings_attributes ON marketplace.listings USING gin(attributes jsonb_path_ops);
CREATE INDEX ix_listings_published ON marketplace.listings(published_at DESC) WHERE status = 'published';
CREATE INDEX ix_listings_expiry ON marketplace.listings(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX ix_listing_prices_listing ON marketplace.listing_prices(listing_id, valid_from DESC);
CREATE INDEX ix_listing_media_listing_order ON marketplace.listing_media(listing_id, sort_order);
CREATE UNIQUE INDEX uq_listing_cover_media ON marketplace.listing_media(listing_id) WHERE is_cover;
CREATE INDEX ix_listing_status_history_listing ON marketplace.listing_status_history(listing_id, created_at DESC);
CREATE INDEX ix_favorites_user ON marketplace.favorites(user_id, created_at DESC);
CREATE INDEX ix_favorites_listing ON marketplace.favorites(listing_id);
CREATE INDEX ix_saved_searches_active ON marketplace.saved_searches(enabled, last_evaluated_at);
CREATE INDEX ix_saved_search_matches_search ON marketplace.saved_search_matches(saved_search_id, matched_at DESC);
CREATE INDEX ix_promotions_active ON marketplace.listing_promotions(started_at, ended_at, priority_score DESC);
CREATE INDEX ix_promotions_listing ON marketplace.listing_promotions(listing_id, started_at DESC);

CREATE INDEX ix_projects_developer ON project.projects(developer_organization_id, created_at DESC);
CREATE INDEX ix_projects_geo ON project.projects USING gist(location_point);
CREATE INDEX ix_project_buildings_project ON project.project_buildings(project_id);
CREATE INDEX ix_project_units_project_status ON project.units(project_id, status);
CREATE INDEX ix_project_units_property ON project.units(property_id) WHERE property_id IS NOT NULL;
CREATE INDEX ix_unit_prices_unit ON project.unit_prices(unit_id, valid_from DESC);

CREATE INDEX ix_leads_org_status ON crm.leads(organization_id, status, created_at DESC);
CREATE INDEX ix_leads_assignee ON crm.leads(assigned_agent_id, status, created_at DESC);
CREATE INDEX ix_lead_activities_lead ON crm.lead_activities(lead_id, occurred_at DESC);
CREATE INDEX ix_tasks_assignee_due ON crm.tasks(assignee_user_id, due_at) WHERE status <> 'completed';
CREATE INDEX ix_viewings_agent_time ON crm.viewings(agent_user_id, scheduled_start);
CREATE INDEX ix_viewings_listing_time ON crm.viewings(listing_id, scheduled_start);

CREATE INDEX ix_conversation_members_user ON messaging.conversation_members(user_id, joined_at DESC);
CREATE INDEX ix_messages_conversation_time ON messaging.messages(conversation_id, created_at DESC);

CREATE INDEX ix_orders_user ON billing.orders(user_id, created_at DESC);
CREATE INDEX ix_orders_org ON billing.orders(organization_id, created_at DESC);
CREATE INDEX ix_order_items_order ON billing.order_items(order_id);
CREATE INDEX ix_payments_order ON billing.payments(order_id, created_at DESC);
CREATE INDEX ix_payments_status ON billing.payments(status, created_at DESC);
CREATE INDEX ix_refunds_payment ON billing.refunds(payment_id, created_at DESC);
CREATE INDEX ix_subscriptions_org ON billing.subscriptions(organization_id, status);
CREATE INDEX ix_subscriptions_user ON billing.subscriptions(user_id, status);
CREATE INDEX ix_ledger_entries_account ON billing.ledger_entries(account_id, created_at DESC);
CREATE INDEX ix_ledger_transactions_reference ON billing.ledger_transactions(reference_type, reference_id);

CREATE INDEX ix_verification_user ON verification.cases(subject_user_id, created_at DESC) WHERE subject_user_id IS NOT NULL;
CREATE INDEX ix_verification_org ON verification.cases(subject_organization_id, created_at DESC) WHERE subject_organization_id IS NOT NULL;
CREATE INDEX ix_verification_property ON verification.cases(subject_property_id, created_at DESC) WHERE subject_property_id IS NOT NULL;
CREATE INDEX ix_verification_status ON verification.cases(status, created_at DESC);

CREATE INDEX ix_reports_status ON moderation.reports(status, created_at DESC);
CREATE INDEX ix_reports_target ON moderation.reports(target_type, target_id);
CREATE INDEX ix_moderation_cases_status ON moderation.cases(status, priority DESC, created_at ASC);
CREATE INDEX ix_moderation_cases_target ON moderation.cases(target_type, target_id);

CREATE INDEX ix_seo_pages_entity ON content.seo_pages(entity_type, entity_id, locale) WHERE entity_id IS NOT NULL;
CREATE INDEX ix_cms_pages_status ON content.cms_pages(status, published_at DESC);

CREATE INDEX ix_audit_entity ON audit.logs(entity_type, entity_id, created_at DESC);
CREATE INDEX ix_audit_actor ON audit.logs(actor_user_id, created_at DESC);
CREATE INDEX ix_outbox_pending ON audit.outbox_events(occurred_at ASC) WHERE published_at IS NULL;
CREATE INDEX ix_outbox_aggregate ON audit.outbox_events(aggregate_type, aggregate_id, occurred_at DESC);


CREATE INDEX ix_contracts_status ON legal.contracts(status, created_at DESC);
CREATE INDEX ix_contract_parties_contract ON legal.contract_parties(contract_id);
CREATE INDEX ix_contract_properties_property ON legal.contract_properties(property_id);
CREATE INDEX ix_contract_versions_contract ON legal.contract_versions(contract_id, version DESC);
CREATE INDEX ix_contract_signatures_party ON legal.contract_signatures(contract_party_id, status);

CREATE INDEX ix_leases_property ON rental.leases(property_id, start_date DESC);
CREATE INDEX ix_leases_tenant ON rental.leases(tenant_user_id, status, start_date DESC);
CREATE INDEX ix_rent_schedules_due ON rental.rent_schedules(due_date, status);
CREATE INDEX ix_rent_payments_schedule ON rental.rent_payments(schedule_id, paid_at DESC);
CREATE INDEX ix_maintenance_property ON rental.maintenance_tickets(property_id, status, created_at DESC);
CREATE INDEX ix_maintenance_assignee ON rental.maintenance_tickets(assigned_to, status) WHERE assigned_to IS NOT NULL;

CREATE INDEX ix_valuation_property ON valuation.cases(property_id, requested_at DESC);
CREATE INDEX ix_valuation_status ON valuation.cases(status, requested_at DESC);
CREATE INDEX ix_valuation_comparables_result ON valuation.comparables(valuation_result_id);

CREATE INDEX ix_notifications_user_unread ON notification.notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX ix_notification_deliveries_pending ON notification.deliveries(status, created_at ASC) WHERE status IN ('pending','retry');

-- -----------------------------------------------------------------------------
-- GENERAL UPDATED_AT TRIGGER
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION platform.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON iam.users
FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TRIGGER trg_org_updated_at BEFORE UPDATE ON org.organizations
FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TRIGGER trg_geo_nodes_updated_at BEFORE UPDATE ON geo.nodes
FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TRIGGER trg_properties_updated_at BEFORE UPDATE ON property.properties
FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TRIGGER trg_listings_updated_at BEFORE UPDATE ON marketplace.listings
FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TRIGGER trg_saved_searches_updated_at BEFORE UPDATE ON marketplace.saved_searches
FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON project.projects
FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TRIGGER trg_project_units_updated_at BEFORE UPDATE ON project.units
FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON crm.leads
FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON billing.orders
FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TRIGGER trg_feature_flags_updated_at BEFORE UPDATE ON platform.feature_flags
FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TRIGGER trg_seo_pages_updated_at BEFORE UPDATE ON content.seo_pages
FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TRIGGER trg_cms_pages_updated_at BEFORE UPDATE ON content.cms_pages
FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();


CREATE TRIGGER trg_contracts_updated_at BEFORE UPDATE ON legal.contracts
FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TRIGGER trg_leases_updated_at BEFORE UPDATE ON rental.leases
FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON review.reviews
FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();


CREATE OR REPLACE FUNCTION property.validate_active_property_ownership()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        PERFORM property.validate_owner_share_total(NEW.id);
    END IF;
    RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_property_status_requires_full_ownership
AFTER UPDATE ON property.properties
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION property.validate_active_property_ownership();

-- -----------------------------------------------------------------------------
-- DATA INTEGRITY TRIGGERS
-- -----------------------------------------------------------------------------

-- Ensure exactly one primary email/phone is handled by partial unique indexes.
-- Ensure ownership shares sum to 100% with application transaction logic or a
-- deferred constraint trigger in the next migration; it cannot be expressed by
-- a simple CHECK constraint across rows.

CREATE OR REPLACE FUNCTION property.validate_owner_share_total(p_property_id uuid)
RETURNS void
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

CREATE OR REPLACE FUNCTION property.prevent_owner_share_overflow()
RETURNS trigger
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

CREATE CONSTRAINT TRIGGER trg_owner_share_total
AFTER INSERT OR UPDATE OR DELETE ON property.owners
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION property.prevent_owner_share_overflow();


CREATE OR REPLACE FUNCTION org.validate_profile_type()
RETURNS trigger
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

CREATE TRIGGER trg_agency_profile_type
BEFORE INSERT OR UPDATE ON org.agency_profiles
FOR EACH ROW EXECUTE FUNCTION org.validate_profile_type();

CREATE TRIGGER trg_developer_profile_type
BEFORE INSERT OR UPDATE ON org.developer_profiles
FOR EACH ROW EXECUTE FUNCTION org.validate_profile_type();

CREATE OR REPLACE FUNCTION billing.validate_ledger_transaction()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_debit numeric(30,4);
    v_credit numeric(30,4);
BEGIN
    SELECT COALESCE(SUM(CASE WHEN side = 'debit' THEN amount ELSE 0 END),0),
           COALESCE(SUM(CASE WHEN side = 'credit' THEN amount ELSE 0 END),0)
      INTO v_debit, v_credit
      FROM billing.ledger_entries
     WHERE transaction_id = COALESCE(NEW.transaction_id, OLD.transaction_id);

    IF v_debit <> v_credit THEN
        RAISE EXCEPTION 'Ledger transaction % is unbalanced: debit=% credit=%', COALESCE(NEW.transaction_id, OLD.transaction_id), v_debit, v_credit;
    END IF;
    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_ledger_balanced
AFTER INSERT OR UPDATE OR DELETE ON billing.ledger_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION billing.validate_ledger_transaction();


CREATE OR REPLACE FUNCTION rental.validate_rent_payment_currency()
RETURNS trigger
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

CREATE TRIGGER trg_rent_payment_currency
BEFORE INSERT OR UPDATE ON rental.rent_payments
FOR EACH ROW EXECUTE FUNCTION rental.validate_rent_payment_currency();


CREATE OR REPLACE FUNCTION billing.validate_payment_currency()
RETURNS trigger
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

CREATE TRIGGER trg_payment_currency
BEFORE INSERT OR UPDATE ON billing.payments
FOR EACH ROW EXECUTE FUNCTION billing.validate_payment_currency();


CREATE OR REPLACE FUNCTION marketplace.validate_listing_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = OLD.status THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'deleted' THEN
        RAISE EXCEPTION 'Deleted listing % cannot transition to %', NEW.id, NEW.status;
    END IF;

    IF NOT (
        (OLD.status = 'draft' AND NEW.status IN ('pending_moderation','deleted')) OR
        (OLD.status = 'pending_moderation' AND NEW.status IN ('published','rejected','draft','deleted')) OR
        (OLD.status = 'rejected' AND NEW.status IN ('draft','deleted')) OR
        (OLD.status = 'published' AND NEW.status IN ('paused','sold','rented','expired','archived','deleted')) OR
        (OLD.status = 'paused' AND NEW.status IN ('published','archived','deleted')) OR
        (OLD.status = 'expired' AND NEW.status IN ('draft','archived','deleted')) OR
        (OLD.status = 'sold' AND NEW.status IN ('archived','deleted')) OR
        (OLD.status = 'rented' AND NEW.status IN ('archived','deleted')) OR
        (OLD.status = 'archived' AND NEW.status IN ('deleted'))
    ) THEN
        RAISE EXCEPTION 'Invalid listing status transition: % -> %', OLD.status, NEW.status;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_listing_status_transition
BEFORE UPDATE OF status ON marketplace.listings
FOR EACH ROW EXECUTE FUNCTION marketplace.validate_listing_transition();

-- -----------------------------------------------------------------------------
-- SEED: common currency codes only; values can be extended by country deployment.
-- -----------------------------------------------------------------------------

INSERT INTO platform.currencies (code, name, symbol, minor_unit)
VALUES
    ('USD','US Dollar','$',2),
    ('EUR','Euro','€',2),
    ('GBP','British Pound','£',2),
    ('GEL','Georgian Lari','₾',2),
    ('AZN','Azerbaijani Manat','₼',2),
    ('TRY','Turkish Lira','₺',2),
    ('RUB','Russian Ruble','₽',2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO property.property_types (code, name, is_residential, is_commercial, is_land, is_hospitality)
VALUES
    ('apartment','Apartment',true,false,false,false),
    ('house','House',true,false,false,false),
    ('villa','Villa',true,false,false,false),
    ('country_house','Country House',true,false,false,false),
    ('land','Land',false,false,true,false),
    ('commercial','Commercial Property',false,true,false,false),
    ('office','Office',false,true,false,false),
    ('retail','Retail',false,true,false,false),
    ('warehouse','Warehouse',false,true,false,false),
    ('hotel','Hotel',false,false,false,true),
    ('parking','Parking',false,true,false,false),
    ('storage','Storage',false,true,false,false)
ON CONFLICT (code) DO NOTHING;

INSERT INTO property.amenities (code, category, name, data_type)
VALUES
    ('elevator','building','Elevator','boolean'),
    ('parking','building','Parking','boolean'),
    ('balcony','property','Balcony','boolean'),
    ('pool','building','Pool','boolean'),
    ('gym','building','Gym','boolean'),
    ('security','building','Security','boolean'),
    ('internet','utility','Internet','boolean'),
    ('gas','utility','Gas','boolean'),
    ('water','utility','Water','boolean'),
    ('electricity','utility','Electricity','boolean'),
    ('sewage','utility','Sewage','boolean'),
    ('air_conditioning','utility','Air Conditioning','boolean'),
    ('furnished','interior','Furnished','boolean'),
    ('pet_friendly','rules','Pet Friendly','boolean')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.roles (code, name, description, is_system)
VALUES
    ('platform_admin','Platform Admin','Full platform administration',true),
    ('org_admin','Organization Admin','Manage organization and members',true),
    ('agent','Agent','Manage assigned real-estate activities',true),
    ('developer_manager','Developer Manager','Manage developer projects and units',true),
    ('support_agent','Support Agent','Customer support and case handling',true),
    ('moderator','Moderator','Moderation and trust/safety operations',true),
    ('user','User','Standard platform user',true)
ON CONFLICT (code) DO NOTHING;

COMMIT;
