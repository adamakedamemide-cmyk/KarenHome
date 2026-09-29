import type { PublicationPolicyInputRow } from '@platform/db';
import { evaluatePublicationPolicy } from '../src/modules/listings/domain/publication-policy';

function healthyRow(): PublicationPolicyInputRow {
  return {
    sellerVerified: true,
    agreementAccepted: true,
    openModerationCases: 0,
    openFraudCases: 0,
    propertyStatus: 'active',
    propertyHasPrimaryLocation: true,
    hasCurrentPrice: true,
    photoCount: 3,
    coverCount: 1,
    titleLength: 40,
    descriptionLength: 200,
  };
}

describe('G4 — publication policy (§6)', () => {
  it('publishes when every real check passes', () => {
    const result = evaluatePublicationPolicy({ row: healthyRow(), requireSellerVerification: true, requireAgreement: true });
    expect(result.canPublish).toBe(true);
    expect(result.unmetChecks).toHaveLength(0);
  });

  it('blocks on missing cover media and required photos', () => {
    const row = { ...healthyRow(), coverCount: 0, photoCount: 0 };
    const result = evaluatePublicationPolicy({ row, requireSellerVerification: false, requireAgreement: false });
    expect(result.canPublish).toBe(false);
    const checks = result.unmetChecks.map((unmet) => unmet.check);
    expect(checks).toContain('cover_media');
    expect(checks).toContain('required_media');
  });

  it('blocks on seller verification when policy requires KYC', () => {
    const row = { ...healthyRow(), sellerVerified: false };
    const result = evaluatePublicationPolicy({ row, requireSellerVerification: true, requireAgreement: false });
    expect(result.canPublish).toBe(false);
    expect(result.unmetChecks[0]?.code).toBe('VERIFICATION_REQUIRED');
  });

  it('blocks on missing agreement', () => {
    const row = { ...healthyRow(), agreementAccepted: false };
    const result = evaluatePublicationPolicy({ row, requireSellerVerification: false, requireAgreement: true });
    expect(result.unmetChecks[0]?.code).toBe('AGREEMENT_REQUIRED');
  });

  it('blocks on blocking moderation and fraud cases', () => {
    const row = { ...healthyRow(), openModerationCases: 1, openFraudCases: 2 };
    const result = evaluatePublicationPolicy({ row, requireSellerVerification: false, requireAgreement: false });
    const checks = result.unmetChecks.map((unmet) => unmet.check);
    expect(checks).toContain('no_blocking_moderation_case');
    expect(checks).toContain('no_blocking_fraud_case');
  });

  it('blocks on invalid property state and missing location/price', () => {
    const row = { ...healthyRow(), propertyStatus: 'deleted', propertyHasPrimaryLocation: false, hasCurrentPrice: false };
    const result = evaluatePublicationPolicy({ row, requireSellerVerification: false, requireAgreement: false });
    const checks = result.unmetChecks.map((unmet) => unmet.check);
    expect(checks).toContain('property_valid');
    expect(checks).toContain('required_location');
    expect(checks).toContain('current_price');
  });

  it('aggregates multiple unmet checks with stable codes', () => {
    const row = { ...healthyRow(), coverCount: 0, agreementAccepted: false, openFraudCases: 1 };
    const result = evaluatePublicationPolicy({ row, requireSellerVerification: false, requireAgreement: true });
    expect(result.unmetChecks.length).toBeGreaterThanOrEqual(3);
  });
});
