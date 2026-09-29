/**
 * Gate 4 — Code-based error model (mandate §18).
 * Dependency-free so both @platform/api and @platform/worker can use it.
 * Message keys are localization-ready: UI/backend resolves them via the
 * i18n catalog (en + ru seeded, fallback chain configurable).
 */
export declare const ERROR_CODES: readonly ["RESOURCE_NOT_FOUND", "FORBIDDEN", "UNAUTHORIZED", "AUTH_REQUIRED", "AUTH_INVALID_CREDENTIALS", "AUTH_SESSION_REVOKED", "AUTH_MFA_REQUIRED", "AUTH_MFA_INVALID", "VALIDATION_ERROR", "STATE_TRANSITION_NOT_ALLOWED", "VERIFICATION_REQUIRED", "AGREEMENT_REQUIRED", "COMMISSION_RULE_NOT_FOUND", "SUBSCRIPTION_REQUIRED", "PAYMENT_FAILED", "RATE_LIMITED", "CONFLICT", "RESOURCE_NOT_OWNED", "ORG_SCOPE_REQUIRED", "LISTING_NOT_PUBLISHABLE", "LISTING_VERSION_CONFLICT", "LISTING_STATE_CONFLICT", "MEDIA_NOT_OWNED", "MEDIA_QUARANTINED", "MEDIA_TOO_LARGE", "MEDIA_UNSUPPORTED_TYPE", "OAUTH_PROVIDER_NOT_CONFIGURED", "CHALLENGE_REQUIRED", "TEMPORARILY_BLOCKED", "DISPOSABLE_EMAIL_REJECTED", "MFA_ALREADY_ACTIVE", "TOKEN_EXPIRED", "TOKEN_CONSUMED", "QUOTA_EXCEEDED", "BUDGET_EXCEEDED", "AD_NOT_SERVED", "ENTITLEMENT_LIMIT_REACHED", "DEPENDENCY_UNAVAILABLE", "INTERNAL_ERROR"];
export type ErrorCode = (typeof ERROR_CODES)[number];
export interface DomainErrorDetail {
    field?: string;
    reason: string;
    value?: unknown;
}
export declare function httpStatusForCode(code: string): number;
export declare class DomainError extends Error {
    readonly code: string;
    readonly status: number;
    readonly details: DomainErrorDetail[] | undefined;
    /** Stable localization key — never a hard-coded user-facing sentence. */
    readonly messageKey: string;
    constructor(code: ErrorCode | string, messageKey: string, options?: {
        message?: string;
        details?: DomainErrorDetail[];
        status?: number;
    });
}
export declare function isDomainError(error: unknown): error is DomainError;
