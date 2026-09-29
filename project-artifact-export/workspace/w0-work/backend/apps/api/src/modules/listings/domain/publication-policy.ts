import type { PublicationPolicyInputRow } from '@platform/db';

/**
 * Gate 4 §6 — Listing Publication Policy (pure, unit-testable).
 * Publication is allowed ONLY when every real check passes. This is the
 * backend enforcement record; the DB adds its own integrity triggers
 * (price row + cover media) so no bypass can slip through both layers.
 */
export interface PublicationPolicyInput {
  row: PublicationPolicyInputRow;
  requireSellerVerification: boolean;
  requireAgreement: boolean;
}

export interface UnmetCheck {
  check: string;
  code: string;
}

export interface PublicationPolicyResult {
  canPublish: boolean;
  unmetChecks: UnmetCheck[];
}

export function evaluatePublicationPolicy(input: PublicationPolicyInput): PublicationPolicyResult {
  const unmetChecks: UnmetCheck[] = [];
  const row = input.row;

  if (input.requireSellerVerification && !row.sellerVerified) unmetChecks.push({ check: 'seller_verified', code: 'VERIFICATION_REQUIRED' });
  if (input.requireAgreement && !row.agreementAccepted) unmetChecks.push({ check: 'agreement_accepted', code: 'AGREEMENT_REQUIRED' });
  if (!row.propertyStatus || !['active', 'draft'].includes(row.propertyStatus)) {
    unmetChecks.push({ check: 'property_valid', code: 'STATE_TRANSITION_NOT_ALLOWED' });
  }
  if (!row.hasCurrentPrice) unmetChecks.push({ check: 'current_price', code: 'LISTING_NOT_PUBLISHABLE' });
  if (row.photoCount < 1) unmetChecks.push({ check: 'required_media', code: 'LISTING_NOT_PUBLISHABLE' });
  if (row.coverCount < 1) unmetChecks.push({ check: 'cover_media', code: 'LISTING_NOT_PUBLISHABLE' });
  if (!row.propertyHasPrimaryLocation) unmetChecks.push({ check: 'required_location', code: 'LISTING_NOT_PUBLISHABLE' });
  if (row.titleLength < 5) unmetChecks.push({ check: 'required_content', code: 'VALIDATION_ERROR' });
  if (row.openModerationCases > 0) unmetChecks.push({ check: 'no_blocking_moderation_case', code: 'LISTING_NOT_PUBLISHABLE' });
  if (row.openFraudCases > 0) unmetChecks.push({ check: 'no_blocking_fraud_case', code: 'LISTING_NOT_PUBLISHABLE' });

  return { canPublish: unmetChecks.length === 0, unmetChecks };
}
