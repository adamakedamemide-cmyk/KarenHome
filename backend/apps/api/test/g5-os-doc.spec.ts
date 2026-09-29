import { toOsListingDoc, wktToPointString, OS_LISTINGS_INDEX, OS_LISTINGS_INDEX_DEFINITION } from '@platform/contracts';

describe('G5 Phase C — OpenSearch doc transform (single source of truth)', () => {
  it('converts WKT POINT(lon lat) to geo_point "lat,lon" strings', () => {
    expect(wktToPointString('POINT (51.3890 35.6892)')).toBe('35.6892,51.389');
    expect(wktToPointString('point(-0.1276 51.5072)')).toBe('51.5072,-0.1276');
    expect(wktToPointString('POINT(0 0)')).toBe('0,0');
    expect(wktToPointString('LINESTRING(0 0, 1 1)')).toBeUndefined();
    expect(wktToPointString('POINT (bad)')).toBeUndefined();
    expect(wktToPointString(null)).toBeUndefined();
    expect(wktToPointString(undefined)).toBeUndefined();
  });

  it('maps the camelCase canonical doc to the strict snake_case OS schema', () => {
    const doc = {
      listingId: 'b3f1c2a4-0000-4000-8000-000000000001',
      status: 'published',
      transactionType: 'sale',
      titleText: 'Apartment in Tehran',
      descriptionText: '2 rooms, furnished',
      price: '250000.0000',
      currencyCode: 'USD',
      pricePeriod: 'one_time',
      propertyTypeCode: 'apartment',
      geoNodeId: 'geo-1',
      locationPointWkt: 'POINT (51.3890 35.6892)',
      publishedAt: new Date('2026-09-29T10:00:00Z'),
    };
    const os = toOsListingDoc(doc);
    expect(os).not.toBeNull();
    expect(os!.listing_id).toBe(doc.listingId);
    expect(os!.title_text).toBe('Apartment in Tehran');
    expect(os!.description_text).toBe('2 rooms, furnished');
    expect(os!.price).toBe(250000); // numeric — never a PG numeric string
    expect(os!.currency_code).toBe('USD');
    expect(os!.transaction_type).toBe('sale');
    expect(os!.property_type_code).toBe('apartment');
    expect(os!.location_point).toBe('35.6892,51.389'); // geo_point — not WKT
    expect(os!.published_at).toBe('2026-09-29T10:00:00.000Z');
    expect(Object.keys(os!)).toEqual(expect.arrayContaining(['listing_id', 'status', 'title_text']));
  });

  it('rejects docs without a listing id and tolerates missing optionals', () => {
    expect(toOsListingDoc({})).toBeNull();
    expect(toOsListingDoc({ listingId: '' })).toBeNull();
    const minimal = toOsListingDoc({ listingId: 'b3f1c2a4-0000-4000-8000-000000000002', price: 'n/a' });
    expect(minimal).not.toBeNull();
    expect(minimal!.price).toBe(0);
    expect(minimal!.location_point).toBeUndefined();
  });

  it('exposes a strict index definition with analyzer, keyword facets and geo_point', () => {
    expect(OS_LISTINGS_INDEX).toBe('listings-v1');
    expect(OS_LISTINGS_INDEX_DEFINITION.mappings.dynamic).toBe('strict');
    expect(OS_LISTINGS_INDEX_DEFINITION.mappings.properties.location_point.type).toBe('geo_point');
    expect(OS_LISTINGS_INDEX_DEFINITION.mappings.properties.title_text.type).toBe('text');
    expect(OS_LISTINGS_INDEX_DEFINITION.mappings.properties.title_text.analyzer).toBe('listing_text_analyzer');
    expect(OS_LISTINGS_INDEX_DEFINITION.mappings.properties.transaction_type.type).toBe('keyword');
    expect(OS_LISTINGS_INDEX_DEFINITION.settings.analysis.analyzer.listing_text_analyzer.type).toBe('standard');
  });
});
