import { ForbiddenException, Injectable, NotFoundException, ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { IamRepository, ListingRepository, PropertyRepository } from '@platform/db';
import type { AuthenticatedUser } from '@platform/contracts';
import { assertTransition } from '../domain/listing-state.machine';
import type { CreateListingDto } from '../presentation/dto/create-listing.dto';

@Injectable()
export class ListingService {
  constructor(
    private readonly listings: ListingRepository,
    private readonly properties: PropertyRepository,
    private readonly iam: IamRepository,
  ) {}

  async create(dto: CreateListingDto, actor: AuthenticatedUser) {
    const property = await this.properties.getById(dto.propertyId);
    if (!property) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Property not found' });
    if (!await this.properties.canManage(dto.propertyId, actor.id)) {
      throw new ForbiddenException({ code: 'RESOURCE_NOT_OWNED', message: 'Property is not managed by the current user' });
    }
    if (dto.managingOrganizationId && !await this.iam.isActiveOrganizationMember(actor.id, dto.managingOrganizationId)) {
      throw new ForbiddenException({ code: 'ORG_SCOPE_REQUIRED', message: 'User is not an active member of the organization' });
    }
    const listing = await this.listings.create({ ...dto, createdByUserId: actor.id }).catch((error) => {
      if (error instanceof Error && error.message === 'PROPERTY_NOT_FOUND') throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Property not found' });
      if (error instanceof Error && error.message === 'RESOURCE_NOT_OWNED') throw new ForbiddenException({ code: 'RESOURCE_NOT_OWNED', message: 'Property is not managed by the current user' });
      if (error instanceof Error && error.message === 'ORG_SCOPE_REQUIRED') throw new ForbiddenException({ code: 'ORG_SCOPE_REQUIRED', message: 'User is not an active member of the organization' });
      throw error;
    });
    return { data: listing };
  }

  async transition(id: string, action: 'submit' | 'publish' | 'pause' | 'archive' | 'sold' | 'rented', dto: { expectedVersion: number; reason?: string }, actor: AuthenticatedUser) {
    const listing = await this.listings.getById(id);
    if (!listing) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Listing not found' });
    if (!await this.canManageListing(listing, actor.id)) throw new ForbiddenException({ code: 'RESOURCE_NOT_OWNED', message: 'Listing is not managed by the current user' });

    const targetByAction = { submit: 'pending_moderation', publish: 'published', pause: 'paused', archive: 'archived', sold: 'sold', rented: 'rented' } as const;
    const target = targetByAction[action];
    try { assertTransition(listing.status, target); } catch { throw new ConflictException({ code: 'LISTING_STATE_CONFLICT', message: 'Listing state does not permit this transition' }); }

    try {
      const result = await this.listings.updateStatus({
        id,
        expectedVersion: dto.expectedVersion,
        from: listing.status,
        to: target,
        actorUserId: actor.id,
        reason: dto.reason,
        eventType: `Listing${target === 'pending_moderation' ? 'SubmittedForModeration' : target[0].toUpperCase() + target.slice(1)}.v1`,
      });
      return { data: result };
    } catch (error) {
      if (error instanceof Error && error.message === 'LISTING_VERSION_CONFLICT') throw new ConflictException({ code: 'CONFLICT', message: 'Listing was modified by another request' });
      if (error instanceof Error && error.message === 'LISTING_STATE_CONFLICT') throw new ConflictException({ code: 'LISTING_STATE_CONFLICT', message: 'Listing state has changed' });
      if (error instanceof Error && error.message === 'LISTING_NOT_FOUND') throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Listing not found' });
      if (action === 'publish') throw new UnprocessableEntityException({ code: 'LISTING_NOT_PUBLISHABLE', message: 'Listing does not satisfy publication requirements' });
      throw error;
    }
  }

  async attachMedia(id: string, input: { mediaAssetId: string; mediaType: string; isCover: boolean }, actor: AuthenticatedUser) {
    const listing = await this.listings.getById(id);
    if (!listing) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Listing not found' });
    if (!await this.canManageListing(listing, actor.id)) throw new ForbiddenException({ code: 'RESOURCE_NOT_OWNED', message: 'Listing is not managed by the current user' });
    try {
      await this.listings.attachMedia({ listingId: id, mediaAssetId: input.mediaAssetId, mediaType: input.mediaType, isCover: input.isCover, actorUserId: actor.id });
    } catch (error) {
      if (error instanceof Error && error.message === 'MEDIA_NOT_OWNED') throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Media asset is not owned by the current user' });
      if (isPublicationConstraint(error)) throw new ConflictException({ code: 'LISTING_NOT_PUBLISHABLE', message: 'Listing publication constraints are not satisfied' });
      throw error;
    }
    return { data: { accepted: true } };
  }

  private async canManageListing(listing: { managingOrganizationId: string | null; createdByUserId: string | null }, actorUserId: string): Promise<boolean> {
    if (!listing.managingOrganizationId) return listing.createdByUserId === actorUserId;
    return this.iam.isActiveOrganizationMember(actorUserId, listing.managingOrganizationId);
  }
}

function isPublicationConstraint(error: unknown): boolean { return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'P0001'; }
