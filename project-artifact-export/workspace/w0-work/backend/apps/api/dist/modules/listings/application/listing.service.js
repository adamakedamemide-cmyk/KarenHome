"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListingService = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@platform/db");
const app_config_1 = require("../../../common/config/app-config");
const listing_state_machine_1 = require("../domain/listing-state.machine");
const publication_policy_1 = require("../domain/publication-policy");
const TARGET_BY_ACTION = {
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
const EVENT_BY_TARGET = {
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
const MODERATOR_ACTIONS = new Set(['verify', 'moderate_publish', 'reject', 'expire']);
/**
 * Transitions that move a listing into a payment/contract-evidenced state —
 * per canonical matrix `requires_payment_or_contract`.
 */
const PAYMENT_OR_CONTRACT_ACTIONS = new Set(['reserve', 'under_contract', 'sold', 'rented']);
let ListingService = class ListingService {
    listings;
    properties;
    iam;
    policy;
    config;
    constructor(listings, properties, iam, policy, config) {
        this.listings = listings;
        this.properties = properties;
        this.iam = iam;
        this.policy = policy;
        this.config = config;
    }
    async create(dto, actor) {
        const property = await this.properties.getById(dto.propertyId);
        if (!property)
            throw new common_1.NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Property not found' });
        if (!await this.properties.canManage(dto.propertyId, actor.id)) {
            throw new common_1.ForbiddenException({ code: 'RESOURCE_NOT_OWNED', message: 'Property is not managed by the current user' });
        }
        if (dto.managingOrganizationId && !await this.iam.isActiveOrganizationMember(actor.id, dto.managingOrganizationId)) {
            throw new common_1.ForbiddenException({ code: 'ORG_SCOPE_REQUIRED', message: 'User is not an active member of the organization' });
        }
        const listing = await this.listings.create({ ...dto, createdByUserId: actor.id }).catch((error) => {
            if (error instanceof Error && error.message === 'PROPERTY_NOT_FOUND')
                throw new common_1.NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Property not found' });
            if (error instanceof Error && error.message === 'RESOURCE_NOT_OWNED')
                throw new common_1.ForbiddenException({ code: 'RESOURCE_NOT_OWNED', message: 'Property is not managed by the current user' });
            if (error instanceof Error && error.message === 'ORG_SCOPE_REQUIRED')
                throw new common_1.ForbiddenException({ code: 'ORG_SCOPE_REQUIRED', message: 'User is not an active member of the organization' });
            throw error;
        });
        return { data: listing };
    }
    async transition(id, action, dto, actor) {
        const listing = await this.listings.getById(id);
        if (!listing)
            throw new common_1.NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Listing not found' });
        if (!await this.canManageListing(listing, actor.id))
            throw new common_1.ForbiddenException({ code: 'RESOURCE_NOT_OWNED', message: 'Listing is not managed by the current user' });
        if (MODERATOR_ACTIONS.has(action)) {
            const permissions = await this.iam.listPermissionCodesForUser(actor.id, listing.managingOrganizationId ?? undefined);
            if (!permissions.includes('listing.moderate')) {
                throw new common_1.ForbiddenException({ code: 'FORBIDDEN', message: 'Moderator permission is required' });
            }
        }
        const target = TARGET_BY_ACTION[action];
        const rule = (0, listing_state_machine_1.findTransitionRule)(listing.status, target);
        if (!rule)
            throw new common_1.ConflictException({ code: 'LISTING_STATE_CONFLICT', message: 'Listing state does not permit this transition' });
        if (PAYMENT_OR_CONTRACT_ACTIONS.has(action) && rule.requiresPaymentOrContract) {
            const evidence = await this.policy.hasActiveLeaseForListing(id);
            if (!evidence) {
                throw new common_1.UnprocessableEntityException({ code: 'STATE_TRANSITION_NOT_ALLOWED', message: 'Payment or contract evidence (active lease) is required for this transition' });
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
        }
        catch (error) {
            if (error instanceof Error && error.message === 'LISTING_VERSION_CONFLICT')
                throw new common_1.ConflictException({ code: 'CONFLICT', message: 'Listing was modified by another request' });
            if (error instanceof Error && error.message === 'LISTING_STATE_CONFLICT')
                throw new common_1.ConflictException({ code: 'LISTING_STATE_CONFLICT', message: 'Listing state has changed' });
            if (error instanceof Error && error.message === 'LISTING_NOT_FOUND')
                throw new common_1.NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Listing not found' });
            throw error;
        }
    }
    /** §6 — server-side publication readiness: 10 real checks, structured unmet list. */
    async publicationReadiness(id) {
        const policyInput = await this.policy.collect(id, {
            agreementCode: this.config.publicationAgreementCode,
            agreementVersion: this.config.publicationAgreementVersion,
            requireSellerVerification: this.config.publicationRequireSellerVerification,
        });
        const result = (0, publication_policy_1.evaluatePublicationPolicy)({
            row: policyInput,
            requireSellerVerification: this.config.publicationRequireSellerVerification,
            requireAgreement: true,
        });
        return { data: result };
    }
    async enforcePublicationPolicy(id) {
        const policyInput = await this.policy.collect(id, {
            agreementCode: this.config.publicationAgreementCode,
            agreementVersion: this.config.publicationAgreementVersion,
            requireSellerVerification: this.config.publicationRequireSellerVerification,
        });
        const result = (0, publication_policy_1.evaluatePublicationPolicy)({
            row: policyInput,
            requireSellerVerification: this.config.publicationRequireSellerVerification,
            requireAgreement: true,
        });
        if (!result.canPublish) {
            throw new common_1.UnprocessableEntityException({
                code: 'LISTING_NOT_PUBLISHABLE',
                message: 'Listing does not satisfy publication requirements',
                ...(result.unmetChecks.length ? { details: result.unmetChecks } : {}),
            });
        }
    }
    async attachMedia(id, input, actor) {
        const listing = await this.listings.getById(id);
        if (!listing)
            throw new common_1.NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Listing not found' });
        if (!await this.canManageListing(listing, actor.id))
            throw new common_1.ForbiddenException({ code: 'RESOURCE_NOT_OWNED', message: 'Listing is not managed by the current user' });
        try {
            await this.listings.attachMedia({ listingId: id, mediaAssetId: input.mediaAssetId, mediaType: input.mediaType, isCover: input.isCover, actorUserId: actor.id });
        }
        catch (error) {
            if (error instanceof Error && error.message === 'MEDIA_NOT_OWNED')
                throw new common_1.ForbiddenException({ code: 'FORBIDDEN', message: 'Media asset is not owned by the current user' });
            if (isPublicationConstraint(error))
                throw new common_1.ConflictException({ code: 'LISTING_NOT_PUBLISHABLE', message: 'Listing publication constraints are not satisfied' });
            throw error;
        }
        return { data: { accepted: true } };
    }
    async get(id) {
        const listing = await this.listings.getById(id);
        if (!listing)
            throw new common_1.NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Listing not found' });
        return { data: listing };
    }
    async canManageListing(listing, actorUserId) {
        if (!listing.managingOrganizationId)
            return listing.createdByUserId === actorUserId;
        return this.iam.isActiveOrganizationMember(actorUserId, listing.managingOrganizationId);
    }
};
exports.ListingService = ListingService;
exports.ListingService = ListingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [db_1.ListingRepository,
        db_1.PropertyRepository,
        db_1.IamRepository,
        db_1.PublicationPolicyRepository,
        app_config_1.AppConfig])
], ListingService);
function isPublicationConstraint(error) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P0001';
}
