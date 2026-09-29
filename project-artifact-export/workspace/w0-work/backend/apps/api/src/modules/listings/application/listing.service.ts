import { ForbiddenException, Injectable, NotFoundException, ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { IamRepository, ListingRepository, PropertyRepository, PublicationPolicyRepository, type ListingRecord } from '@platform/db';
import type { AuthenticatedUser } from '@platform/contracts';
import { AppConfig } from '../../../common/config/app-config';
import { findTransitionRule, type ListingStatus13 } from '../domain/listing-state.machine';
import { evaluatePublicationPolicy } from '../domain/publication-policy';
import type { CreateListingDto } from '../presentation/dto/create-listing.dto';

export type ListingAction =
  | 'submit' | 'submit_verification' | 'verify' | 'moderate_publish' | 'publish' | 'pause'
  | 'resume' | 'reserve' | 'under_contract' | 'sold' | 'rented' | 'expire' | 'reject' | 'archive';

const TARGET_BY_ACTION: Record<ListingAction, ListingStatus13> = {
  submit: 'pending_moderation',
  submit_verification: 'pending_verification',
  verify: 'pending_moderation',
  moderate_publish: 'published',
  publish: 'published',
  pause: 'paused',
  resume: 'published',
  reserve: 'reserved',
  under_contract: 'under_contract',
  sold: 'sold',
  rented: 'rented',
  expire: 'expired',
  reject: 'rejected',
  archive: 'archived',
};

const EVENT_BY_TARGET: Partial<Record<ListingStatus13, string>> = {
  pending_verification: 'ListingSubmittedForVerification.v1',
  pending_moderation: 'ListingSubmittedForModeration.v1',
  published: 'ListingPublished.v1',
  paused: 'ListingPaused.v1',
  reserved: 'ListingReserved.v1',
  under_contract: 'ListingUnderContract.v1',
  sold: 'ListingSold.v1',
  rented: 'ListingRented.v1',
  expired: 'ListingExpired.v1',
  rejected: 'ListingRejected.v1',
  archived: 'ListingArchived.v1',
};

/** Actions that require the platform moderator permission (§5 Permission per transition). */
const MODERATOR_ACTIONS: ReadonlySet<ListingAction> = new Set(['verify', 'moderate_publish', 'reject', 'expire']);

/**
 * Transitions that move a listing into a payment/contract-evidenced state —
 * per canonical matrix `requires_payment_or_contract`.
 */
const PAYMENT_OR_CONTRACT_ACTIONS: ReadonlySet<ListingAction> = new Set(['reserve', 'under_contract', 'sold', 'rented']);

@Injectable()
export class ListingService {
  constructor(
    private readonly listings: ListingRepository,
    private readonly properties: PropertyRepository,
    private readonly iam: IamRepository,
    private readonly policy: PublicationPolicyRepository,
    private readonly config: AppConfig,
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

  async transition(id: string, action: ListingAction, dto: { expectedVersion: number; reason?: string | undefined }, actor: AuthenticatedUser) {
    const listing = await this.listings.getById(id);
    if (!listing) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Listing not found' });
    if (!await this.canManageListing(listing, actor.id)) throw new ForbiddenException({ code: 'RESOURCE_NOT_OWNED', message: 'Listing is not managed by the current user' });

    if (MODERATOR_ACTIONS.has(action)) {
      const permissions = await this.iam.listPermissionCodesForUser(actor.id, listing.managingOrganizationId ?? undefined);
      if (!permissions.includes('listing.moderate')) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Moderator permission is required' });
      }
    }

    const target = TARGET_BY_ACTION[action];
    const rule = findTransitionRule(listing.status as ListingStatus13, target);
    if (!rule) throw new ConflictException({ code: 'LISTING_STATE_CONFLICT', message: 'Listing state does not permit this transition' });

    if (PAYMENT_OR_CONTRACT_ACTIONS.has(action) && rule.requiresPaymentOrContract) {
      const evidence = await this.policy.hasActiveLeaseForListing(id);
      if (!evidence) {
        throw new UnprocessableEntityException({ code: 'STATE_TRANSITION_NOT_ALLOWED', message: 'Payment or contract evidence (active lease) is required for this transition' });
      }
    }

    // §6 — Publication policy is enforced on every path that ends in `published`.
    if (target === 'published') {
      await this.enforcePublicationPolicy(id);
    }

    try {
      const result = await this.listings.updateStatus({
        id,
        expectedVersion: dto.expectedVersion,
        from: listing.status,
        to: target,
        actorUserId: actor.id,
        reason: dto.reason,
        eventType: EVENT_BY_TARGET[target] ?? `Listing${target.charAt(0).toUpperCase() + target.slice(1)}.v1`,
      });
      return { data: result };
    } catch (error) {
      if (error instanceof Error && error.message === 'LISTING_VERSION_CONFLICT') throw new ConflictException({ code: 'CONFLICT', message: 'Listing was modified by another request' });
      if (error instanceof Error && error.message === 'LISTING_STATE_CONFLICT') throw new ConflictException({ code: 'LISTING_STATE_CONFLICT', message: 'Listing state has changed' });
      if (error instanceof Error && error.message === 'LISTING_NOT_FOUND') throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Listing not found' });
      throw error;
    }
  }

  /** §6 — server-side publication readiness: 10 real checks, structured unmet list. */
  async publicationReadiness(id: string): Promise<{ data: { canPublish: boolean; unmetChecks: Array<{ check: string; code: string }> } }> {
    const policyInput = await this.policy.collect(id, {
      agreementCode: this.config.publicationAgreementCode,
      agreementVersion: this.config.publicationAgreementVersion,
      requireSellerVerification: this.config.publicationRequireSellerVerification,
    });
    const result = evaluatePublicationPolicy({
      row: policyInput,
      requireSellerVerification: this.config.publicationRequireSellerVerification,
      requireAgreement: true,
    });
    return { data: result };
  }

  private async enforcePublicationPolicy(id: string): Promise<void> {
    const policyInput = await this.policy.collect(id, {
      agreementCode: this.config.publicationAgreementCode,
      agreementVersion: this.config.publicationAgreementVersion,
      requireSellerVerification: this.config.publicationRequireSellerVerification,
    });
    const result = evaluatePublicationPolicy({
      row: policyInput,
      requireSellerVerification: this.config.publicationRequireSellerVerification,
      requireAgreement: true,
    });
    if (!result.canPublish) {
      throw new UnprocessableEntityException({
        code: 'LISTING_NOT_PUBLISHABLE',
        message: 'Listing does not satisfy publication requirements',
        ...(result.unmetChecks.length ? { details: result.unmetChecks } : {}),
      });
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

  async get(id: string): Promise<{ data: ListingRecord }> {
    const listing = await this.listings.getById(id);
    if (!listing) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Listing not found' });
    return { data: listing };
  }

  private async canManageListing(listing: { managingOrganizationId: string | null; createdByUserId: string | null }, actorUserId: string): Promise<boolean> {
    if (!listing.managingOrganizationId) return listing.createdByUserId === actorUserId;
    return this.iam.isActiveOrganizationMember(actorUserId, listing.managingOrganizationId);
  }
}

function isPublicationConstraint(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'P0001';
}
