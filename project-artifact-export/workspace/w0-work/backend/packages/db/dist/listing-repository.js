"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListingRepository = void 0;
class ListingRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async create(input, context = {}) {
        return this.db.transaction(async (client) => {
            const propertyLock = await client.query(`SELECT id FROM property.properties WHERE id = $1::uuid AND deleted_at IS NULL FOR UPDATE`, [input.propertyId]);
            if (!propertyLock.rows[0])
                throw new Error('PROPERTY_NOT_FOUND');
            const manageCheck = await client.query(`SELECT EXISTS (SELECT 1 FROM property.properties WHERE id = $1::uuid AND created_by = $2::uuid) OR EXISTS (SELECT 1 FROM property.owners WHERE property_id = $1::uuid AND user_id = $2::uuid) AS ok`, [input.propertyId, input.createdByUserId]);
            if (!manageCheck.rows[0]?.ok)
                throw new Error('RESOURCE_NOT_OWNED');
            if (input.managingOrganizationId) {
                const orgCheck = await client.query(`SELECT EXISTS (SELECT 1 FROM org.organization_members om JOIN org.organizations o ON o.id = om.organization_id WHERE om.user_id = $1::uuid AND om.organization_id = $2::uuid AND om.status = 'active' AND o.status = 'active') AS ok`, [input.createdByUserId, input.managingOrganizationId]);
                if (!orgCheck.rows[0]?.ok)
                    throw new Error('ORG_SCOPE_REQUIRED');
            }
            const listingResult = await client.query(`INSERT INTO marketplace.listings
           (property_id, managing_organization_id, created_by_user_id, transaction_type, status, title, description, currency_code, price, price_period)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::marketplace.transaction_type, 'draft', $5, $6, $7::char(3), $8::numeric, $9::marketplace.price_period)
         RETURNING id, public_code, property_id, managing_organization_id, created_by_user_id,
                   transaction_type::text, status::text, title, description, currency_code, price::text,
                   price_period::text, version, published_at, created_at, updated_at`, [input.propertyId, input.managingOrganizationId ?? null, input.createdByUserId, input.transactionType, input.title, input.description ?? null, input.currencyCode, input.price, input.pricePeriod]);
            const createdRow = listingResult.rows[0];
            if (!createdRow)
                throw new Error('LISTING_CREATE_FAILED');
            const listing = mapListing(createdRow);
            await client.query(`INSERT INTO marketplace.listing_prices (listing_id, price, currency_code, price_period, valid_from)
         VALUES ($1::uuid, $2::numeric, $3::char(3), $4::marketplace.price_period, now())`, [listing.id, input.price, input.currencyCode, input.pricePeriod]);
            await client.query(`INSERT INTO audit.outbox_events(aggregate_type, aggregate_id, event_type, payload)
         VALUES ('listing', $1::uuid, 'ListingCreated.v1', $2::jsonb)`, [listing.id, JSON.stringify({ listingId: listing.id, propertyId: input.propertyId, transactionType: input.transactionType })]);
            return listing;
        }, context);
    }
    async getById(id, executor = this.db, forUpdate = false) {
        const result = await executor.query(`SELECT id, public_code, property_id, managing_organization_id, created_by_user_id,
              transaction_type::text, status::text, title, description, currency_code, price::text,
              price_period::text, version, published_at, created_at, updated_at
         FROM marketplace.listings
        WHERE id = $1::uuid AND deleted_at IS NULL
        ${forUpdate ? 'FOR UPDATE' : ''}`, [id]);
        return result.rows[0] ? mapListing(result.rows[0]) : null;
    }
    async updateStatus(input) {
        return this.db.transaction(async (client) => {
            const current = await this.getById(input.id, client, true);
            if (!current)
                throw new Error('LISTING_NOT_FOUND');
            if (Number(current.version) !== input.expectedVersion)
                throw new Error('LISTING_VERSION_CONFLICT');
            if (current.status !== input.from)
                throw new Error('LISTING_STATE_CONFLICT');
            const result = await client.query(`UPDATE marketplace.listings
            SET status = $2::marketplace.listing_status, updated_at = now()
          WHERE id = $1::uuid AND version = $3
          RETURNING id, public_code, property_id, managing_organization_id, created_by_user_id,
                    transaction_type::text, status::text, title, description, currency_code, price::text,
                    price_period::text, version, published_at, created_at, updated_at`, [input.id, input.to, input.expectedVersion]);
            if (result.rowCount !== 1)
                throw new Error('LISTING_VERSION_CONFLICT');
            await client.query(`INSERT INTO audit.outbox_events(aggregate_type, aggregate_id, event_type, payload)
         VALUES ('listing', $1::uuid, $2, $3::jsonb)`, [input.id, input.eventType, JSON.stringify({ listingId: input.id, from: input.from, to: input.to, reason: input.reason ?? null })]);
            const updatedRow = result.rows[0];
            if (!updatedRow)
                throw new Error('LISTING_UPDATE_FAILED');
            return mapListing(updatedRow);
        }, { actorUserId: input.actorUserId, statusChangeReason: input.reason });
    }
    async attachMedia(input) {
        await this.db.transaction(async (client) => {
            const ownership = await client.query(`SELECT EXISTS (
          SELECT 1 FROM marketplace.media_assets ma
           WHERE ma.id = $1::uuid AND ma.created_by = $2::uuid
        ) AS ok`, [input.mediaAssetId, input.actorUserId]);
            if (!ownership.rows[0]?.ok)
                throw new Error('MEDIA_NOT_OWNED');
            await client.query(`INSERT INTO marketplace.listing_media(listing_id, media_asset_id, media_type, is_cover)
         VALUES ($1::uuid, $2::uuid, $3::marketplace.media_type, $4)`, [input.listingId, input.mediaAssetId, input.mediaType, input.isCover]);
            await client.query(`UPDATE marketplace.listings SET updated_at = now() WHERE id = $1::uuid`, [input.listingId]);
            await client.query(`INSERT INTO audit.outbox_events(aggregate_type, aggregate_id, event_type, payload)
         VALUES ('listing', $1::uuid, 'ListingMediaAttached.v1', $2::jsonb)`, [input.listingId, JSON.stringify({ listingId: input.listingId, mediaAssetId: input.mediaAssetId, isCover: input.isCover })]);
        }, { actorUserId: input.actorUserId });
    }
}
exports.ListingRepository = ListingRepository;
function mapListing(r) { return { id: r.id, publicCode: r.public_code, propertyId: r.property_id, managingOrganizationId: r.managing_organization_id, createdByUserId: r.created_by_user_id, transactionType: r.transaction_type, status: r.status, title: r.title, description: r.description, currencyCode: r.currency_code, price: r.price, pricePeriod: r.price_period, version: Number(r.version), publishedAt: r.published_at, createdAt: r.created_at, updatedAt: r.updated_at }; }
