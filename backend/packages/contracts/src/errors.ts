/**
 * Gate 4 — Code-based error model (mandate §18).
 * Dependency-free so both @platform/api and @platform/worker can use it.
 * Message keys are localization-ready: UI/backend resolves them via the
 * i18n catalog (en + ru seeded, fallback chain configurable).
 */

export const ERROR_CODES = [
  'RESOURCE_NOT_FOUND',
  'FORBIDDEN',
  'UNAUTHORIZED',
  'AUTH_REQUIRED',
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_SESSION_REVOKED',
  'AUTH_MFA_REQUIRED',
  'AUTH_MFA_INVALID',
  'VALIDATION_ERROR',
  'STATE_TRANSITION_NOT_ALLOWED',
  'VERIFICATION_REQUIRED',
  'AGREEMENT_REQUIRED',
  'COMMISSION_RULE_NOT_FOUND',
  'SUBSCRIPTION_REQUIRED',
  'PAYMENT_FAILED',
  'RATE_LIMITED',
  'CONFLICT',
  'RESOURCE_NOT_OWNED',
  'ORG_SCOPE_REQUIRED',
  'LISTING_NOT_PUBLISHABLE',
  'LISTING_VERSION_CONFLICT',
  'LISTING_STATE_CONFLICT',
  'MEDIA_NOT_OWNED',
  'MEDIA_QUARANTINED',
  'MEDIA_TOO_LARGE',
  'MEDIA_UNSUPPORTED_TYPE',
  'OAUTH_PROVIDER_NOT_CONFIGURED',
  'OAUTH_STATE_INVALID',
  'CHALLENGE_REQUIRED',
  'TEMPORARILY_BLOCKED',
  'DISPOSABLE_EMAIL_REJECTED',
  'MFA_ALREADY_ACTIVE',
  'TOKEN_EXPIRED',
  'TOKEN_CONSUMED',
  'QUOTA_EXCEEDED',
  'BUDGET_EXCEEDED',
  'AD_NOT_SERVED',
  'ENTITLEMENT_LIMIT_REACHED',
  'DEPENDENCY_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface DomainErrorDetail {
  field?: string;
  reason: string;
  value?: unknown;
}

const STATUS_BY_CODE: Record<string, number> = {
  RESOURCE_NOT_FOUND: 404,
  FORBIDDEN: 403,
  UNAUTHORIZED: 401,
  AUTH_REQUIRED: 401,
  AUTH_INVALID_CREDENTIALS: 401,
  AUTH_SESSION_REVOKED: 401,
  AUTH_MFA_REQUIRED: 401,
  AUTH_MFA_INVALID: 401,
  VALIDATION_ERROR: 400,
  STATE_TRANSITION_NOT_ALLOWED: 409,
  VERIFICATION_REQUIRED: 403,
  AGREEMENT_REQUIRED: 403,
  COMMISSION_RULE_NOT_FOUND: 404,
  SUBSCRIPTION_REQUIRED: 402,
  PAYMENT_FAILED: 402,
  RATE_LIMITED: 429,
  CONFLICT: 409,
  RESOURCE_NOT_OWNED: 403,
  ORG_SCOPE_REQUIRED: 403,
  LISTING_NOT_PUBLISHABLE: 422,
  LISTING_VERSION_CONFLICT: 409,
  LISTING_STATE_CONFLICT: 409,
  MEDIA_NOT_OWNED: 403,
  MEDIA_QUARANTINED: 422,
  MEDIA_TOO_LARGE: 413,
  MEDIA_UNSUPPORTED_TYPE: 415,
  OAUTH_PROVIDER_NOT_CONFIGURED: 503,
  OAUTH_STATE_INVALID: 401,
  CHALLENGE_REQUIRED: 428,
  TEMPORARILY_BLOCKED: 429,
  DISPOSABLE_EMAIL_REJECTED: 422,
  MFA_ALREADY_ACTIVE: 409,
  TOKEN_EXPIRED: 401,
  TOKEN_CONSUMED: 409,
  QUOTA_EXCEEDED: 402,
  BUDGET_EXCEEDED: 409,
  AD_NOT_SERVED: 404,
  ENTITLEMENT_LIMIT_REACHED: 402,
  DEPENDENCY_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};

export function httpStatusForCode(code: string): number {
  return STATUS_BY_CODE[code] ?? 500;
}

export class DomainError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: DomainErrorDetail[] | undefined;
  /** Stable localization key — never a hard-coded user-facing sentence. */
  readonly messageKey: string;

  constructor(
    code: ErrorCode | string,
    messageKey: string,
    options: { message?: string; details?: DomainErrorDetail[]; status?: number } = {},
  ) {
    super(options.message ?? messageKey);
    this.name = 'DomainError';
    this.code = code;
    this.messageKey = messageKey;
    this.status = options.status ?? httpStatusForCode(code);
    this.details = options.details;
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return (
    typeof error === 'object' &&
    error !== null &&
    error instanceof Error &&
    (error as { name?: unknown }).name === 'DomainError' &&
    typeof (error as { code?: unknown }).code === 'string'
  );
}
