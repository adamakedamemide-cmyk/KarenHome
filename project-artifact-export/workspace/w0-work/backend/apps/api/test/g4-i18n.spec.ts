import { PostgresDatabase } from '@platform/db';
import { I18nService } from '../src/modules/i18n/application/i18n.service';

interface QueryStub {
  rows: Array<Record<string, unknown>>;
}

/** Builds an I18nService over a scripted PostgresDatabase double. */
function serviceWith(script: Array<(text: string, params: readonly unknown[]) => QueryStub | null>): I18nService {
  let call = 0;
  const dbStub = {
    query: async (text: string, params: readonly unknown[] = []): Promise<QueryStub> => {
      const responder = script[call];
      call += 1;
      const response = responder ? responder(text, params) : null;
      return response ?? { rows: [] };
    },
  } as unknown as PostgresDatabase;
  return new I18nService(dbStub);
}

describe('G4 — i18n fallback chain (§9)', () => {
  it('returns the SQL default chain for ru (ru → en)', async () => {
    const service = serviceWith([() => ({ rows: [{ chain: ['ru', 'en'] }] })]);
    const chain = await service.resolveFallbackChain('ru');
    expect(chain).toEqual(['ru', 'en']);
  });

  it('prefers the configurable settings override (hot-reloadable)', async () => {
    const service = serviceWith([
      () => ({ rows: [{ value: { ru: ['ru', 'de', 'en'] } }] }),
      () => ({ rows: [{ chain: ['ru', 'en'] }] }),
    ]);
    const chain = await service.resolveFallbackChain('ru');
    expect(chain).toEqual(['ru', 'de', 'en']);
  });

  it('translates a listing through the chain before hitting the BASE fallback', async () => {
    const service = serviceWith([
      () => ({ rows: [{ chain: ['ru', 'en'] }] }),
      () => ({ rows: [] }), // ru missing
      () => ({ rows: [{ locale: 'en', title: 'English title', description: null, slug: 'english', seo_title: null, seo_description: null }] }),
    ]);
    const result = await service.translateListing('11111111-1111-1111-1111-111111111111', 'ru');
    expect(result?.source).toBe('en');
    expect(result?.title).toBe('English title');
  });

  it('falls back to BASE content with explicit source when no translation exists', async () => {
    const service = serviceWith([
      () => ({ rows: [] }), // platform.settings overrides probe
      () => ({ rows: [{ chain: ['ka', 'en'] }] }),
      () => ({ rows: [] }),
      () => ({ rows: [] }),
      () => ({ rows: [{ title: 'Base title', description: 'Base description', locale: 'en' }] }),
    ]);
    const result = await service.translateListing('11111111-1111-1111-1111-111111111111', 'ka');
    expect(result?.source).toBe('BASE');
    expect(result?.title).toBe('Base title');
  });

  it('rejects invalid locale formats on upsert', async () => {
    const service = serviceWith([]);
    await expect(service.upsertListingTranslation({
      listingId: '11111111-1111-1111-1111-111111111111', locale: 'ukr', title: 'x', slug: 'x',
    })).rejects.toThrow('VALIDATION_ERROR');
  });
});
