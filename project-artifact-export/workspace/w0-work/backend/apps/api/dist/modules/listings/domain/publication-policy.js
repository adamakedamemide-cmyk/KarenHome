"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluatePublicationPolicy = evaluatePublicationPolicy;
function evaluatePublicationPolicy(input) {
    const unmetChecks = [];
    const row = input.row;
    if (input.requireSellerVerification && !row.sellerVerified)
        unmetChecks.push({ check: 'seller_verified', code: 'VERIFICATION_REQUIRED' });
    if (input.requireAgreement && !row.agreementAccepted)
        unmetChecks.push({ check: 'agreement_accepted', code: 'AGREEMENT_REQUIRED' });
    if (!row.propertyStatus || !['active', 'draft'].includes(row.propertyStatus)) {
        unmetChecks.push({ check: 'property_valid', code: 'STATE_TRANSITION_NOT_ALLOWED' });
    }
    if (!row.hasCurrentPrice)
        unmetChecks.push({ check: 'current_price', code: 'LISTING_NOT_PUBLISHABLE' });
    if (row.photoCount < 1)
        unmetChecks.push({ check: 'required_media', code: 'LISTING_NOT_PUBLISHABLE' });
    if (row.coverCount < 1)
        unmetChecks.push({ check: 'cover_media', code: 'LISTING_NOT_PUBLISHABLE' });
    if (!row.propertyHasPrimaryLocation)
        unmetChecks.push({ check: 'required_location', code: 'LISTING_NOT_PUBLISHABLE' });
    if (row.titleLength < 5)
        unmetChecks.push({ check: 'required_content', code: 'VALIDATION_ERROR' });
    if (row.openModerationCases > 0)
        unmetChecks.push({ check: 'no_blocking_moderation_case', code: 'LISTING_NOT_PUBLISHABLE' });
    if (row.openFraudCases > 0)
        unmetChecks.push({ check: 'no_blocking_fraud_case', code: 'LISTING_NOT_PUBLISHABLE' });
    return { canPublish: unmetChecks.length === 0, unmetChecks };
}
