import { PostgresDatabase, type QueryExecutor } from './postgres-database';
export type ListingStatus = 'draft' | 'pending_verification' | 'pending_moderation' | 'published' | 'paused' | 'reserved' | 'under_contract' | 'rejected' | 'expired' | 'sold' | 'rented' | 'archived' | 'deleted';
export type TransactionType = 'sale' | 'rent' | 'daily_rent' | 'lease' | 'pledge';
export type PricePeriod = 'one_time' | 'monthly' | 'weekly' | 'daily';
export interface ListingRecord {
    id: string;
    publicCode: string;
    propertyId: string;
    managingOrganizationId: string | null;
    createdByUserId: string | null;
    transactionType: TransactionType;
    status: ListingStatus;
    title: string;
    description: string | null;
    currencyCode: string;
    price: string;
    pricePeriod: PricePeriod;
    version: number;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare class ListingRepository {
    private readonly db;
    constructor(db: PostgresDatabase);
    create(input: {
        propertyId: string;
        managingOrganizationId?: string;
        createdByUserId: string;
        transactionType: TransactionType;
        title: string;
        description?: string;
        currencyCode: string;
        price: string;
        pricePeriod: PricePeriod;
    }, context?: {
        actorUserId?: string;
        requestId?: string;
    }): Promise<ListingRecord>;
    getById(id: string, executor?: QueryExecutor, forUpdate?: boolean): Promise<ListingRecord | null>;
    updateStatus(input: {
        id: string;
        expectedVersion: number;
        from: ListingStatus;
        to: ListingStatus;
        actorUserId: string;
        reason?: string | undefined;
        eventType: string;
    }): Promise<ListingRecord>;
    attachMedia(input: {
        listingId: string;
        mediaAssetId: string;
        mediaType: string;
        isCover: boolean;
        actorUserId: string;
    }): Promise<void>;
}
