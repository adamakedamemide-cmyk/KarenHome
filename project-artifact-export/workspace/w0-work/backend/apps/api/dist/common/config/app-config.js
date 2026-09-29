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
exports.AppConfig = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let AppConfig = class AppConfig {
    config;
    constructor(config) {
        this.config = config;
    }
    get databaseUrl() {
        const value = this.config.get('DATABASE_URL');
        if (!value)
            throw new Error('DATABASE_URL is required');
        return value;
    }
    get databaseSsl() {
        return this.config.get('DATABASE_SSL', 'false') === 'true';
    }
    get databasePoolMax() {
        return this.int('DATABASE_POOL_MAX', 20, 1, 100);
    }
    get jwtIssuer() { return this.required('JWT_ISSUER', 'enterprise-real-estate-platform'); }
    get jwtAudience() { return this.required('JWT_AUDIENCE', 'real-estate-api'); }
    get jwtSecret() {
        const encoded = this.config.get('JWT_SECRET', '');
        if (encoded.length < 43)
            throw new Error('JWT_SECRET must be at least 43 characters of high-entropy material');
        return new TextEncoder().encode(encoded);
    }
    get accessTtlSeconds() { return this.int('ACCESS_TOKEN_TTL_SECONDS', 900, 60, 3600); }
    get refreshTtlSeconds() { return this.int('REFRESH_TOKEN_TTL_SECONDS', 60 * 60 * 24 * 30, 3600, 60 * 60 * 24 * 365); }
    get port() { return this.int('PORT', 3000, 1, 65535); }
    get nodeEnv() { return this.config.get('NODE_ENV', 'development'); }
    get docsEnabled() { return this.nodeEnv !== 'production' || this.config.get('ENABLE_API_DOCS', 'false') === 'true'; }
    // --- Gate 4 additions -----------------------------------------------------
    get mfaEncryptionKey() {
        const value = this.config.get('MFA_ENCRYPTION_KEY', '');
        return value.length >= 43 ? value : null;
    }
    get oauthGoogleCredentials() {
        const clientId = this.config.get('OAUTH_GOOGLE_CLIENT_ID', '');
        const clientSecret = this.config.get('OAUTH_GOOGLE_CLIENT_SECRET', '');
        return clientId && clientSecret ? { clientId, clientSecret } : null;
    }
    get oauthFacebookCredentials() {
        const clientId = this.config.get('OAUTH_FACEBOOK_CLIENT_ID', '');
        const clientSecret = this.config.get('OAUTH_FACEBOOK_CLIENT_SECRET', '');
        return clientId && clientSecret ? { clientId, clientSecret } : null;
    }
    get oauthRedirectBase() {
        return this.config.get('OAUTH_REDIRECT_BASE', `http://localhost:${this.port}/api/v1/auth/oauth`);
    }
    get emailFromAddress() {
        return this.config.get('EMAIL_FROM', 'no-reply@karen-home.local');
    }
    get emailVerificationTtlSeconds() { return this.int('EMAIL_VERIFICATION_TTL_SECONDS', 86_400, 600, 604_800); }
    get passwordResetTtlSeconds() { return this.int('PASSWORD_RESET_TTL_SECONDS', 3_600, 600, 86_400); }
    get jobBackoffBaseSeconds() { return this.int('JOB_BACKOFF_BASE_SECONDS', 5, 1, 300); }
    get jobBackoffMaxSeconds() { return this.int('JOB_BACKOFF_MAX_SECONDS', 3_600, 60, 86_400); }
    get opensearchUrl() {
        const value = this.config.get('OPENSEARCH_URL', '');
        return value ? value : null;
    }
    get mediaTmpDir() { return this.config.get('MEDIA_TMP_DIR', '/tmp/karen-media'); }
    get mediaStorageDir() { return this.config.get('MEDIA_STORAGE_DIR', '/tmp/karen-media-storage'); }
    get mediaMaxBytes() { return this.int('MEDIA_MAX_BYTES', 10_485_760, 1024, 104_857_600); }
    get publicationRequireSellerVerification() {
        return this.config.get('PUBLICATION_REQUIRE_SELLER_VERIFICATION', 'false') === 'true';
    }
    get publicationAgreementCode() { return this.config.get('PUBLICATION_AGREEMENT_CODE', 'seller_agreement'); }
    get publicationAgreementVersion() { return this.int('PUBLICATION_AGREEMENT_VERSION', 1, 1, 10_000); }
    get defaultLocale() { return this.config.get('DEFAULT_LOCALE', 'en'); }
    /** Raw env access for optional settings (observability, worker wiring). */
    raw(name) {
        return this.config.get(name);
    }
    required(name, fallback) {
        const value = this.config.get(name) ?? fallback;
        if (!value)
            throw new Error(`${name} is required`);
        return value;
    }
    int(name, fallback, min, max) {
        const raw = this.config.get(name, fallback);
        const value = Number(raw);
        if (!Number.isInteger(value) || value < min || value > max) {
            throw new Error(`${name} must be an integer in [${min}, ${max}]`);
        }
        return value;
    }
};
exports.AppConfig = AppConfig;
exports.AppConfig = AppConfig = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AppConfig);
