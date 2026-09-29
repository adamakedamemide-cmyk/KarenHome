import { Injectable } from '@nestjs/common';
import { PostgresDatabase } from '@platform/db';

export interface EffectiveTranslation {
  locale: string;
  source: string;
  title: string;
  description: string | null;
  slug: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

export const I18N_SETTINGS_KEY = 'i18n.fallback_chain_overrides';
const OVERRIDES_TTL_MS = 60_000;

/**
 * Gate 4 §9 — Backend localization.
 * Fallback chain mirrors the SQL `platform.translation_fallback_chain`
 * (ru → en, X → [X, en]) but stays CONFIGURABLE: platform.settings
 * `i18n.fallback_chain_overrides` (jsonb, e.g. {"ru":["ru","en","de"]})
 * takes precedence and is hot-reloaded with a 60s TTL. No UI/content
 * strings are hard-coded; consumers resolve via this service.
 */
@Injectable()
export class I18nService {
  private overrides: Record<string, string[]> | null = null;
  private overridesLoadedAt = 0;

  constructor(private readonly db: PostgresDatabase) {}

  async resolveFallbackChain(locale: string): Promise<string[]> {
    const requested = locale.trim().toLowerCase();
    const overrides = await this.loadOverrides();
    if (overrides && Object.prototype.hasOwnProperty.call(overrides, requested)) {
      const chain = overrides[requested];
      if (Array.isArray(chain) && chain.length > 0) return chain;
    }
    const r = await this.db.query<{ chain: string[] }>(
      `SELECT platform.translation_fallback_chain($1) AS chain`,
      [requested],
    );
    return r.rows[0]?.chain ?? [requested, 'en'];
  }

  async translateListing(listingId: string, locale: string): Promise<EffectiveTranslation | null> {
    const chain = await this.resolveFallbackChain(locale);
    for (const candidate of chain) {
      const r = await this.db.query<{
        locale: string; title: string; description: string | null; slug: string; seo_title: string | null; seo_description: string | null;
      }>(
        `SELECT locale, title, description, slug, seo_title, seo_description
         FROM marketplace.listing_translations
         WHERE listing_id = $1::uuid AND locale = $2 AND status = 'PUBLISHED'`,
        [listingId, candidate],
      );
      const row = r.rows[0];
      if (row) {
        return { locale: row.locale, source: row.locale, title: row.title, description: row.description, slug: row.slug, seoTitle: row.seo_title, seoDescription: row.seo_description };
      }
    }
    const base = await this.db.query<{ title: string; description: string | null; locale: string }>(
      `SELECT title, description, locale FROM marketplace.listings WHERE id = $1::uuid AND deleted_at IS NULL`,
      [listingId],
    );
    const baseRow = base.rows[0];
    if (!baseRow) return null;
    return { locale, source: 'BASE', title: baseRow.title, description: baseRow.description, slug: null, seoTitle: null, seoDescription: null };
  }

  async translatePropertyType(propertyTypeId: string, locale: string): Promise<{ label: string; source: string } | null> {
    const chain = await this.resolveFallbackChain(locale);
    for (const candidate of chain) {
      const r = await this.db.query<{ label: string }>(
        `SELECT label FROM property.property_type_translations WHERE property_type_id = $1::uuid AND locale = $2`,
        [propertyTypeId, candidate],
      );
      if (r.rows[0]) return { label: r.rows[0].label, source: candidate };
    }
    const fallback = await this.db.query<{ name: string }>(`SELECT name FROM property.property_types WHERE id = $1::uuid`, [propertyTypeId]);
    return fallback.rows[0] ? { label: fallback.rows[0].name, source: 'BASE' } : null;
  }

  async upsertListingTranslation(input: {
    listingId: string; locale: string; title: string; description?: string | undefined; slug: string;
    seoTitle?: string | undefined; seoDescription?: string | undefined; status?: 'DRAFT' | 'PUBLISHED' | undefined;
  }): Promise<void> {
    if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(input.locale)) throw new Error('VALIDATION_ERROR');
    await this.db.query(
      `INSERT INTO marketplace.listing_translations(listing_id, locale, title, description, slug, seo_title, seo_description, status)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, COALESCE($8::text, 'DRAFT'))
       ON CONFLICT (listing_id, locale) DO UPDATE SET
         title = EXCLUDED.title, description = EXCLUDED.description, slug = EXCLUDED.slug,
         seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, status = COALESCE(EXCLUDED.status, status), updated_at = now()`,
      [input.listingId, input.locale, input.title, input.description ?? null, input.slug, input.seoTitle ?? null, input.seoDescription ?? null, input.status ?? null],
    );
  }

  private async loadOverrides(): Promise<Record<string, string[]> | null> {
    const now = Date.now();
    if (this.overrides && now - this.overridesLoadedAt < OVERRIDES_TTL_MS) return this.overrides;
    const r = await this.db.query<{ value: unknown }>(`SELECT value FROM platform.settings WHERE key = $1`, [I18N_SETTINGS_KEY]);
    const raw = r.rows[0]?.value;
    this.overrides = raw && typeof raw === 'object' ? (raw as Record<string, string[]>) : null;
    this.overridesLoadedAt = now;
    return this.overrides;
  }
}
