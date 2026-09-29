-- ============================================================================
-- 0029_i18n_translations.sql — Gate 3-DB
-- OD (user, earlier): English + Russian required; future locales must not need
--   refactoring; fallback chain ru → en → default; no hard-coded translations.
-- 5 translation tables (W0-G design origin 0102, SYNTAX_OK on PG16):
--   marketplace.listing_translations, project.project_translations,
--   org.organization_translations, iam.user_translations,
--   property.property_type_translations
-- + locale fallback helper (ru → en → default) reused by all read models.
-- Localized slugs are UNIQUE per (locale, slug) — SEO-GEO requirement.
-- ============================================================================
BEGIN;

CREATE OR REPLACE FUNCTION platform.is_valid_locale(p_locale text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $fn$
BEGIN
    RETURN p_locale ~ '^[a-z]{2}(-[A-Z]{2})?$';
END;
$fn$;

CREATE OR REPLACE FUNCTION platform.translation_fallback_chain(p_locale text)
RETURNS text[] LANGUAGE plpgsql IMMUTABLE AS $fn$
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
$fn$;

-- --- listing ---------------------------------------------------------------
CREATE TABLE marketplace.listing_translations (
    listing_id uuid NOT NULL REFERENCES marketplace.listings(id) ON DELETE CASCADE,
    locale text NOT NULL CHECK (platform.is_valid_locale(locale)),
    title text NOT NULL,
    description text,
    slug text NOT NULL,
    seo_title text,
    seo_description text,
    status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (listing_id, locale)
);
CREATE UNIQUE INDEX uq_listing_translations_slug ON marketplace.listing_translations(locale, slug);

-- --- project ---------------------------------------------------------------
CREATE TABLE project.project_translations (
    project_id uuid NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    locale text NOT NULL CHECK (platform.is_valid_locale(locale)),
    name text NOT NULL,
    description text,
    slug text NOT NULL,
    seo_title text,
    seo_description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, locale)
);
CREATE UNIQUE INDEX uq_project_translations_slug ON project.project_translations(locale, slug);

-- --- organization ----------------------------------------------------------
CREATE TABLE org.organization_translations (
    organization_id uuid NOT NULL REFERENCES org.organizations(id) ON DELETE CASCADE,
    locale text NOT NULL CHECK (platform.is_valid_locale(locale)),
    display_name text NOT NULL,
    description text,
    slug text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (organization_id, locale)
);
CREATE UNIQUE INDEX uq_org_translations_slug ON org.organization_translations(locale, slug);

-- --- user ------------------------------------------------------------------
CREATE TABLE iam.user_translations (
    user_id uuid NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    locale text NOT NULL CHECK (platform.is_valid_locale(locale)),
    display_name text,
    bio text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, locale)
);

-- --- property type labels --------------------------------------------------
CREATE TABLE property.property_type_translations (
    property_type_id uuid NOT NULL REFERENCES property.property_types(id) ON DELETE CASCADE,
    locale text NOT NULL CHECK (platform.is_valid_locale(locale)),
    label text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (property_type_id, locale)
);

-- --- fallback read model (ru → en → default row of base table) -------------
CREATE OR REPLACE VIEW marketplace.v_listing_translations_effective AS
SELECT
    l.id AS listing_id,
    chain.locale AS requested_locale,
    COALESCE(t_req.title, t_en.title, l.title)          AS title,
    COALESCE(t_req.description, t_en.description, l.description) AS description,
    COALESCE(t_req.slug, t_en.slug)                    AS slug,
    COALESCE(t_req.seo_title, t_en.seo_title)          AS seo_title,
    COALESCE(t_req.seo_description, t_en.seo_description) AS seo_description,
    CASE WHEN t_req.listing_id IS NOT NULL THEN t_req.status ELSE 'BASE' END AS source
FROM marketplace.listings l
CROSS JOIN LATERAL unnest(platform.translation_fallback_chain('en')) AS chain(locale)
LEFT JOIN marketplace.listing_translations t_req
       ON t_req.listing_id = l.id AND t_req.locale = chain.locale AND t_req.status = 'PUBLISHED'
LEFT JOIN marketplace.listing_translations t_en
       ON t_en.listing_id = l.id AND t_en.locale = 'en' AND t_en.status = 'PUBLISHED';

CREATE TRIGGER trg_listing_translations_updated_at BEFORE UPDATE ON marketplace.listing_translations
    FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();
CREATE TRIGGER trg_project_translations_updated_at BEFORE UPDATE ON project.project_translations
    FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();
CREATE TRIGGER trg_org_translations_updated_at BEFORE UPDATE ON org.organization_translations
    FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();
CREATE TRIGGER trg_user_translations_updated_at BEFORE UPDATE ON iam.user_translations
    FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE INDEX ix_listing_translations_locale_status ON marketplace.listing_translations(locale, status);
CREATE INDEX ix_project_translations_locale ON project.project_translations(locale);
CREATE INDEX ix_org_translations_locale ON org.organization_translations(locale);

COMMIT;
