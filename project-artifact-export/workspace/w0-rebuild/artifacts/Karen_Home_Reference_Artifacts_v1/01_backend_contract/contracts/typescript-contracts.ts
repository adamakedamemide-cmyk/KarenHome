/** Canonical application contracts. These are examples of the stable boundary;
 * persistence models must not leak through the API. */

export type UUID = string;
export type PublicId = string;
export type CurrencyCode = string;

export interface RequestContext {
  requestId: string;
  userId?: UUID;
  organizationId?: UUID;
  roles: string[];
  locale: string;
}

export interface ListingSummary {
  id: PublicId;
  transactionType: 'sale' | 'rent' | 'daily_rent' | 'lease' | 'pledge';
  status: 'draft' | 'pending_moderation' | 'published' | 'paused' | 'rejected' | 'expired' | 'sold' | 'rented' | 'archived' | 'deleted';
  title: string;
  price: { amount: string; currency: CurrencyCode; period: 'one_time' | 'monthly' | 'weekly' | 'daily' };
  location: { country: string; city?: string; district?: string; latitude?: number; longitude?: number };
  coverMediaUrl?: string;
}

export interface SearchListingsQuery {
  transactionTypes?: string[];
  propertyTypeIds?: UUID[];
  geoNodeIds?: UUID[];
  minPrice?: string;
  maxPrice?: string;
  currency?: CurrencyCode;
  minAreaM2?: string;
  maxAreaM2?: string;
  minRooms?: number;
  maxRooms?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  amenityCodes?: string[];
  bbox?: { west: number; south: number; east: number; north: number };
  sort?: 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'area_asc' | 'area_desc';
  limit?: number;
  cursor?: string;
}

export interface PublishListingCommand {
  listingId: UUID;
  expectedVersion: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{ field?: string; reason: string; value?: unknown }>;
    requestId: string;
  };
}
