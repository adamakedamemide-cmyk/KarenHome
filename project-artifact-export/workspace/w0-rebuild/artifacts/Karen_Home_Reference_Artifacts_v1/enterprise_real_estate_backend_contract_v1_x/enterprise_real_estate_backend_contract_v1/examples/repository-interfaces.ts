export interface ListingRepository {
  getById(id: string): Promise<ListingAggregate | null>;
  save(aggregate: ListingAggregate): Promise<void>;
  existsByPropertyAndActiveTransaction(propertyId: string, transactionType: string): Promise<boolean>;
}

export interface PropertyRepository {
  getById(id: string): Promise<PropertyAggregate | null>;
  save(aggregate: PropertyAggregate): Promise<void>;
  getOwnershipSummary(id: string): Promise<{ totalShare: string; ownerCount: number }>;
}

export interface SearchProjection {
  upsertListing(listing: SearchDocument): Promise<void>;
  removeListing(listingId: string): Promise<void>;
  search(query: SearchListingsQuery): Promise<SearchResultPage>;
}

export interface OutboxPublisher {
  append(event: IntegrationEvent): Promise<void>;
}

declare interface ListingAggregate { }
declare interface PropertyAggregate { }
declare interface SearchDocument { }
declare interface SearchListingsQuery { }
declare interface SearchResultPage { }
declare interface IntegrationEvent { }
