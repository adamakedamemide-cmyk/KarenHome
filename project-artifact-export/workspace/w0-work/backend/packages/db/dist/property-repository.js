"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropertyRepository = void 0;
class PropertyRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async create(input) {
        const result = await this.db.query(`INSERT INTO property.properties (property_type_id, area_total_m2, rooms, created_by, status)
       VALUES ($1::uuid, $2::numeric, $3::numeric, $4::uuid, 'draft')
       RETURNING id, public_code, property_type_id, status::text, ownership_type::text,
                 area_total_m2::text, area_usable_m2::text, rooms::text, bedrooms,
                 bathrooms, floor, total_floors, created_by, created_at, updated_at`, [input.propertyTypeId, input.areaTotalM2 ?? null, input.rooms ?? null, input.createdByUserId]);
        const created = result.rows[0];
        if (!created)
            throw new Error('PROPERTY_CREATE_FAILED');
        return mapProperty(created);
    }
    async getById(id, executor = this.db) {
        const result = await executor.query(`SELECT id, public_code, property_type_id, status::text, ownership_type::text,
              area_total_m2::text, area_usable_m2::text, rooms::text, bedrooms,
              bathrooms, floor, total_floors, created_by, created_at, updated_at
         FROM property.properties WHERE id = $1::uuid AND deleted_at IS NULL`, [id]);
        return result.rows[0] ? mapProperty(result.rows[0]) : null;
    }
    async canManage(id, userId, executor = this.db) {
        const result = await executor.query(`SELECT EXISTS (
         SELECT 1 FROM property.properties p
          WHERE p.id = $1::uuid AND p.deleted_at IS NULL AND p.created_by = $2::uuid
         UNION ALL
         SELECT 1 FROM property.owners o
          WHERE o.property_id = $1::uuid AND o.user_id = $2::uuid
       ) AS ok`, [id, userId]);
        return result.rows[0]?.ok ?? false;
    }
    async getOwnership(id, executor = this.db) {
        const result = await executor.query(`SELECT id, property_id, user_id, organization_id, ownership_share::text, verified
         FROM property.owners WHERE property_id = $1::uuid ORDER BY created_at ASC`, [id]);
        return result.rows.map(mapOwnership);
    }
    async getOwnershipTotal(id, executor = this.db) {
        const result = await executor.query(`SELECT COALESCE(SUM(ownership_share), 0)::text AS total_share, COUNT(*)::text AS owner_count
         FROM property.owners WHERE property_id = $1::uuid`, [id]);
        return { totalShare: result.rows[0]?.total_share ?? '0', ownerCount: Number(result.rows[0]?.owner_count ?? 0) };
    }
    async addLocation(input, context = {}) {
        const r = await this.db.transaction(async (client) => {
            const property = await client.query(`SELECT id FROM property.properties WHERE id = $1::uuid FOR UPDATE`, [input.propertyId]);
            if (!property.rows[0]?.id)
                throw new Error('PROPERTY_NOT_FOUND');
            const inserted = await client.query(`INSERT INTO property.property_locations(property_id, geo_node_id, address_line_1, postal_code, location_point, is_primary)
         VALUES ($1::uuid, $2::uuid, $3, $4,
                 CASE WHEN $5::text IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint($6::float8, $7::float8), 4326)::geography END,
                 false)
         RETURNING id`, [
                input.propertyId, input.geoNodeId ?? null, input.addressLine1 ?? null, input.postalCode ?? null,
                input.lon !== undefined && input.lat !== undefined ? 'point' : null,
                input.lon ?? 0, input.lat ?? 0,
            ]);
            const id = inserted.rows[0]?.id;
            if (!id)
                throw new Error('PROPERTY_LOCATION_FAILED');
            return { id };
        }, context);
        return r;
    }
    async markLocationPrimary(propertyId, locationId, context = {}) {
        await this.db.transaction(async (client) => {
            await client.query(`UPDATE property.property_locations SET is_primary = false WHERE property_id = $1::uuid`, [propertyId]);
            await client.query(`UPDATE property.property_locations SET is_primary = true WHERE id = $2::uuid AND property_id = $1::uuid`, [propertyId, locationId]);
        }, context);
    }
    async assignOwner(input, context = {}) {
        return this.db.transaction(async (client) => {
            const lock = await client.query(`SELECT id FROM property.properties WHERE id = $1::uuid FOR UPDATE`, [input.propertyId]);
            if (!lock.rows[0])
                throw new Error('PROPERTY_NOT_FOUND');
            const ownerResult = await client.query(`INSERT INTO property.owners (property_id, user_id, organization_id, ownership_share)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::numeric)
         RETURNING id, property_id, user_id, organization_id, ownership_share::text, verified`, [input.propertyId, input.userId ?? null, input.organizationId ?? null, input.ownershipShare]);
            await client.query(`INSERT INTO audit.logs(actor_user_id, action, entity_type, entity_id, after_data, request_id)
         VALUES ($1::uuid, 'property.owner_assigned', 'property.property', $2::uuid, $3::jsonb, $4::uuid)`, [context.actorUserId ?? null, input.propertyId, JSON.stringify(input), context.requestId ?? null]);
            const ownerRow = ownerResult.rows[0];
            if (!ownerRow)
                throw new Error('PROPERTY_OWNER_ASSIGN_FAILED');
            return mapOwnership(ownerRow);
        }, context);
    }
}
exports.PropertyRepository = PropertyRepository;
function mapProperty(r) { return { id: r.id, publicCode: r.public_code, propertyTypeId: r.property_type_id, status: r.status, ownershipType: r.ownership_type, areaTotalM2: r.area_total_m2, areaUsableM2: r.area_usable_m2, rooms: r.rooms, bedrooms: r.bedrooms, bathrooms: r.bathrooms, floor: r.floor, totalFloors: r.total_floors, createdByUserId: r.created_by, createdAt: r.created_at, updatedAt: r.updated_at }; }
function mapOwnership(r) { return { id: r.id, propertyId: r.property_id, userId: r.user_id, organizationId: r.organization_id, ownershipShare: r.ownership_share, verified: r.verified }; }
