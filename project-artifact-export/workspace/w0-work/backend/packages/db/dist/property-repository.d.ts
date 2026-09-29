import { PostgresDatabase, type QueryExecutor } from './postgres-database';
export interface PropertyRecord {
    id: string;
    publicCode: string;
    propertyTypeId: string;
    status: 'draft' | 'active' | 'inactive' | 'sold' | 'rented' | 'archived' | 'deleted';
    ownershipType: string;
    areaTotalM2: string | null;
    areaUsableM2: string | null;
    rooms: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    floor: number | null;
    totalFloors: number | null;
    createdByUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface OwnershipRecord {
    id: string;
    propertyId: string;
    userId: string | null;
    organizationId: string | null;
    ownershipShare: string;
    verified: boolean;
}
export declare class PropertyRepository {
    private readonly db;
    constructor(db: PostgresDatabase);
    create(input: {
        propertyTypeId: string;
        areaTotalM2?: string | undefined;
        rooms?: string | undefined;
        createdByUserId: string;
    }): Promise<PropertyRecord>;
    getById(id: string, executor?: QueryExecutor): Promise<PropertyRecord | null>;
    canManage(id: string, userId: string, executor?: QueryExecutor): Promise<boolean>;
    getOwnership(id: string, executor?: QueryExecutor): Promise<OwnershipRecord[]>;
    getOwnershipTotal(id: string, executor?: QueryExecutor): Promise<{
        totalShare: string;
        ownerCount: number;
    }>;
    addLocation(input: {
        propertyId: string;
        geoNodeId?: string | undefined;
        addressLine1?: string | undefined;
        postalCode?: string | undefined;
        lon?: number | undefined;
        lat?: number | undefined;
    }, context?: {
        actorUserId?: string;
        requestId?: string;
    }): Promise<{
        id: string;
    }>;
    markLocationPrimary(propertyId: string, locationId: string, context?: {
        actorUserId?: string;
        requestId?: string;
    }): Promise<void>;
    assignOwner(input: {
        propertyId: string;
        userId?: string | undefined;
        organizationId?: string | undefined;
        ownershipShare: string;
    }, context?: {
        actorUserId?: string;
        requestId?: string;
    }): Promise<OwnershipRecord>;
}
