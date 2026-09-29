# GATE4_I18N_REPORT (§9)

## Architecture

- **Languages:** English + Russian seeded in the error catalog and template flow; architecture accepts any `^[a-z]{2}(-[A-Z]{2})?$` locale (SQL-validated `platform.is_valid_locale`).
- **Translatable entities (0029 tables):** Listing (title/description/slug/SEO), Project, Organization (agency/agent profiles), User (display name/bio), PropertyType (amenities labels via amenities table), CMS/SEO surfaces (content.seo_pages/cms_pages frozen) and **Notifications** (template rows per code+locale+channel).
- **Fallback chain:** SQL `platform.translation_fallback_chain` (ru → [ru, en]; X → [X, en]) mirrored by `I18nService.resolveFallbackChain`, **configurable** via `platform.settings['i18n.fallback_chain_overrides']` (jsonb, 60s hot-reload TTL). Verified by unit tests: default chain, override chain, mid-chain miss, BASE fallback.
- **No hard-coded strings:** API error messages resolve by code through `ERROR_MESSAGE_CATALOG` (en/ru) with Accept-Language negotiation and en fallback — implemented in the global exception filter. Workers localize transactional email subject/body by user locale (`localeText` en/ru).
- **Translation management API:** `GET /i18n/config?locale=`, `GET /i18n/listings/:id?locale=` (effective translation with source=locale|BASE), `POST /i18n/listings/:id/translations` (guard: listing.update via org role or 0030 personal grant).

## Verification

- Unit: chain resolution (ru→en), settings override, published-translation selection, BASE fallback with source, invalid locale rejected on upsert.
- DB invariants (G3 suite): fallback_ru, fallback_other, translation uniqueness per (listing, locale), slug uniqueness per locale, cross-locale slug OK, invalid locale rejected — all still PASS on karen_g4_fresh (37/37).

## Honest notes

- Armenian/German/Turkish/French/Chinese are **architecturally supported** (locale regex + chain + tables) but have no seeded catalog content — adding a language is data + settings, not code.
- Notification template localization uses the same chain; template rows are currently seeded only in en/ru pairs for the transactional set.
