"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IamHardeningService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const argon2 = __importStar(require("argon2"));
const contracts_1 = require("@platform/contracts");
const db_1 = require("@platform/db");
const oauth_providers_1 = require("../infrastructure/oauth-providers");
const app_config_1 = require("../../../common/config/app-config");
const access_token_service_1 = require("../../../common/auth/access-token.service");
const secret_cipher_1 = require("../../../common/auth/secret-cipher");
const totp_1 = require("../../../common/auth/totp");
/**
 * Gate 4 §15 — IAM hardening application service.
 * Email/phone verification, password flows (change + reset), MFA (TOTP)
 * foundation, OAuth linking (provider abstraction) and logout-all.
 * Outbound messaging is event-driven: verification/reset requests enqueue
 * jobs on the email/sms queues; workers own delivery (§12/§13).
 */
let IamHardeningService = class IamHardeningService {
    hardening;
    iam;
    jobs;
    audit;
    tokens;
    oauthRegistry;
    config;
    cipher;
    constructor(hardening, iam, jobs, audit, tokens, oauthRegistry, config) {
        this.hardening = hardening;
        this.iam = iam;
        this.jobs = jobs;
        this.audit = audit;
        this.tokens = tokens;
        this.oauthRegistry = oauthRegistry;
        this.config = config;
        const key = this.config.mfaEncryptionKey;
        this.cipher = new secret_cipher_1.SecretCipher(key ?? 'development-only-mfa-encryption-key-0123456789abcdef0123456789');
    }
    // --- Email verification -----------------------------------------------------
    async requestEmailVerification(userId, meta = {}) {
        const user = await this.iam.findUserById(userId);
        if (!user)
            throw new contracts_1.DomainError('RESOURCE_NOT_FOUND', 'error.user_not_found');
        const last = await this.hardening.latestEmailVerificationSentAt(userId);
        if (last && Date.now() - last.getTime() < 60_000) {
            throw new contracts_1.DomainError('RATE_LIMITED', 'error.verification_resend_throttled');
        }
        const rawToken = (0, node_crypto_1.randomBytes)(32).toString('hex');
        await this.hardening.createEmailVerification({
            userId,
            tokenHash: (0, node_crypto_1.createHash)('sha256').update(rawToken).digest('hex'),
            expiresAt: new Date(Date.now() + this.config.emailVerificationTtlSeconds * 1000),
            createdIp: meta.ip,
        });
        await this.jobs.enqueue({
            queue: 'email',
            jobType: 'email.verification',
            payload: { userId, rawToken, locale: user.locale },
            dedupKey: `email.verification:${userId}`,
        });
        await this.audit.append({ actorUserId: userId, action: 'iam.email_verification_requested', entityType: 'iam.user', entityId: userId, ip: meta.ip, requestId: meta.requestId });
        return { queued: true };
    }
    async verifyEmail(rawToken) {
        const tokenHash = (0, node_crypto_1.createHash)('sha256').update(rawToken).digest('hex');
        const outcome = await this.hardening.consumeEmailVerification(tokenHash);
        if (outcome === 'NOT_FOUND')
            throw new contracts_1.DomainError('RESOURCE_NOT_FOUND', 'error.token_invalid');
        if (outcome === 'CONSUMED')
            throw new contracts_1.DomainError('TOKEN_CONSUMED', 'error.token_consumed');
        if (outcome === 'EXPIRED')
            throw new contracts_1.DomainError('TOKEN_EXPIRED', 'error.token_expired');
        await this.hardening.markPrimaryEmailVerified(outcome.userId);
        await this.audit.append({ actorUserId: outcome.userId, action: 'iam.email_verified', entityType: 'iam.user', entityId: outcome.userId });
        return { verified: true };
    }
    // --- Phone OTP ----------------------------------------------------------------
    async requestPhoneOtp(userId, phoneE164) {
        if (!/^\+[1-9][0-9]{7,14}$/.test(phoneE164))
            throw new contracts_1.DomainError('VALIDATION_ERROR', 'error.phone_invalid');
        await this.hardening.addPhoneIfAbsent(userId, phoneE164);
        const code = String((0, node_crypto_1.randomInt)(0, 1_000_000)).padStart(6, '0');
        await this.hardening.createPhoneVerification({
            userId,
            phoneE164,
            codeHash: (0, node_crypto_1.createHash)('sha256').update(code).digest('hex'),
            expiresAt: new Date(Date.now() + 600_000),
        });
        await this.jobs.enqueue({
            queue: 'sms',
            jobType: 'sms.otp',
            payload: { userId, phoneE164, code },
            dedupKey: `sms.otp:${userId}:${phoneE164}`,
        });
        return { queued: true };
    }
    async verifyPhoneOtp(userId, phoneE164, code) {
        const codeHash = (0, node_crypto_1.createHash)('sha256').update(code).digest('hex');
        const outcome = await this.hardening.verifyPhoneOtp({ userId, phoneE164, codeHash });
        if (outcome === 'MISMATCH')
            throw new contracts_1.DomainError('AUTH_MFA_INVALID', 'error.otp_invalid');
        if (outcome === 'TOO_MANY_ATTEMPTS')
            throw new contracts_1.DomainError('RATE_LIMITED', 'error.otp_too_many_attempts');
        if (outcome === 'EXPIRED')
            throw new contracts_1.DomainError('TOKEN_EXPIRED', 'error.otp_expired');
        if (outcome === 'CONSUMED')
            throw new contracts_1.DomainError('TOKEN_CONSUMED', 'error.otp_consumed');
        if (outcome === 'NOT_FOUND')
            throw new contracts_1.DomainError('RESOURCE_NOT_FOUND', 'error.otp_not_found');
        return { verified: true };
    }
    // --- Password flows -------------------------------------------------------------
    async requestPasswordReset(email, meta) {
        const user = await this.iam.findUserByEmail(email.trim().toLowerCase());
        // Anti-enumeration: identical response whether or not the account exists.
        if (!user)
            return { accepted: true };
        const rawToken = (0, node_crypto_1.randomBytes)(32).toString('hex');
        await this.hardening.createPasswordReset({
            userId: user.id,
            tokenHash: (0, node_crypto_1.createHash)('sha256').update(rawToken).digest('hex'),
            expiresAt: new Date(Date.now() + this.config.passwordResetTtlSeconds * 1000),
            createdIp: meta.ip,
        });
        await this.jobs.enqueue({
            queue: 'email',
            jobType: 'email.password_reset',
            payload: { userId: user.id, rawToken, locale: user.locale },
            dedupKey: `email.password_reset:${user.id}`,
        });
        await this.audit.append({ action: 'iam.password_reset_requested', entityType: 'iam.user', entityId: user.id, ip: meta.ip, requestId: meta.requestId });
        return { accepted: true };
    }
    async resetPassword(rawToken, newPassword) {
        const tokenHash = (0, node_crypto_1.createHash)('sha256').update(rawToken).digest('hex');
        const outcome = await this.hardening.consumePasswordReset(tokenHash);
        if (outcome === 'NOT_FOUND')
            throw new contracts_1.DomainError('RESOURCE_NOT_FOUND', 'error.token_invalid');
        if (outcome === 'CONSUMED')
            throw new contracts_1.DomainError('TOKEN_CONSUMED', 'error.token_consumed');
        if (outcome === 'EXPIRED')
            throw new contracts_1.DomainError('TOKEN_EXPIRED', 'error.token_expired');
        const hash = await argon2.hash(newPassword, { type: argon2.argon2id, memoryCost: 64 * 1024, timeCost: 3, parallelism: 1 });
        await this.hardening.updatePasswordHash(outcome.userId, hash);
        await this.audit.append({ actorUserId: outcome.userId, action: 'iam.password_reset_completed', entityType: 'iam.user', entityId: outcome.userId });
        return { reset: true };
    }
    async changePassword(userId, currentPassword, newPassword) {
        const credential = await this.iam.findCredentialByUserId(userId);
        if (!credential?.passwordHash || !(await argon2.verify(credential.passwordHash, currentPassword))) {
            throw new contracts_1.DomainError('AUTH_INVALID_CREDENTIALS', 'error.current_password_invalid');
        }
        const hash = await argon2.hash(newPassword, { type: argon2.argon2id, memoryCost: 64 * 1024, timeCost: 3, parallelism: 1 });
        await this.hardening.updatePasswordHash(userId, hash);
        await this.audit.append({ actorUserId: userId, action: 'iam.password_changed', entityType: 'iam.user', entityId: userId });
        return { changed: true };
    }
    // --- Sessions ---------------------------------------------------------------------
    async listSessions(userId) {
        const sessions = await this.hardening.listActiveSessions(userId);
        return sessions.map((session) => ({ id: session.id, deviceId: session.deviceId, expiresAt: session.expiresAt, createdAt: session.createdAt }));
    }
    async logoutAll(userId) {
        const revoked = await this.hardening.revokeAllSessions(userId);
        await this.audit.append({ actorUserId: userId, action: 'iam.logout_all', entityType: 'iam.user', entityId: userId });
        return { revoked };
    }
    // --- MFA (TOTP foundation) -----------------------------------------------------------
    async enrollTotp(userId) {
        if (await this.hardening.findActiveMfaFactor(userId)) {
            throw new contracts_1.DomainError('MFA_ALREADY_ACTIVE', 'error.mfa_already_active');
        }
        const user = await this.iam.findUserById(userId);
        const secret = (0, totp_1.generateTotpSecret)();
        const factorId = await this.hardening.upsertPendingMfaFactor(userId, this.cipher.encrypt(secret));
        return { factorId, otpauthUri: (0, totp_1.totpUri)(secret, user?.id ?? userId, this.config.jwtIssuer) };
    }
    async activateTotp(userId, code) {
        const pending = await this.hardening.findPendingMfaFactor(userId);
        if (!pending)
            throw new contracts_1.DomainError('RESOURCE_NOT_FOUND', 'error.mfa_no_pending');
        const secret = this.cipher.decrypt(pending.secretCipher);
        if (!(0, totp_1.verifyTotp)(secret, code))
            throw new contracts_1.DomainError('AUTH_MFA_INVALID', 'error.mfa_code_invalid');
        await this.hardening.activateMfaFactor(pending.id);
        await this.audit.append({ actorUserId: userId, action: 'iam.mfa_activated', entityType: 'iam.user', entityId: userId });
        return { activated: true };
    }
    async disableTotp(userId, code) {
        const active = await this.hardening.findActiveMfaFactor(userId);
        if (!active)
            throw new contracts_1.DomainError('RESOURCE_NOT_FOUND', 'error.mfa_not_active');
        const secret = this.cipher.decrypt(active.secretCipher);
        if (!(0, totp_1.verifyTotp)(secret, code))
            throw new contracts_1.DomainError('AUTH_MFA_INVALID', 'error.mfa_code_invalid');
        await this.hardening.disableMfaFactor(userId, active.id);
        await this.audit.append({ actorUserId: userId, action: 'iam.mfa_disabled', entityType: 'iam.user', entityId: userId });
        return { disabled: true };
    }
    async verifyMfaLogin(challengeToken, code, meta) {
        let userId;
        try {
            userId = await this.tokens.verifyMfaChallenge(challengeToken);
        }
        catch {
            throw new contracts_1.DomainError('UNAUTHORIZED', 'error.mfa_challenge_invalid');
        }
        const active = await this.hardening.findActiveMfaFactor(userId);
        if (!active)
            throw new contracts_1.DomainError('RESOURCE_NOT_FOUND', 'error.mfa_not_active');
        const secret = this.cipher.decrypt(active.secretCipher);
        if (!(0, totp_1.verifyTotp)(secret, code))
            throw new contracts_1.DomainError('AUTH_MFA_INVALID', 'error.mfa_code_invalid');
        await this.hardening.touchMfaUsed(active.id);
        return this.issueTokensForActiveUser(userId, meta);
    }
    // --- OAuth ---------------------------------------------------------------------------
    get configRedirectBase() {
        return this.config.oauthRedirectBase;
    }
    get configuredOAuthProviders() {
        return this.oauthRegistry.configuredNames();
    }
    async oauthAuthorizeUrl(providerName, redirectUri) {
        const provider = this.oauthRegistry.get(providerName);
        if (!provider)
            throw new contracts_1.DomainError('OAUTH_PROVIDER_NOT_CONFIGURED', 'error.oauth_not_configured');
        const state = (0, node_crypto_1.randomBytes)(16).toString('hex');
        return { authorizationUrl: provider.authorizationUrl(state, redirectUri) };
    }
    async oauthCallback(providerName, code, redirectUri, meta) {
        const provider = this.oauthRegistry.get(providerName);
        if (!provider)
            throw new contracts_1.DomainError('OAUTH_PROVIDER_NOT_CONFIGURED', 'error.oauth_not_configured');
        const profile = await provider.exchangeCode(code, redirectUri);
        const linked = await this.hardening.findOAuthIdentity(providerName, profile.providerUserId);
        if (linked)
            return this.issueTokensForActiveUser(linked.userId, meta);
        // Match by verified email, then link; otherwise provision a new active user.
        let user = profile.email ? await this.iam.findUserByEmail(profile.email) : null;
        if (!user && profile.email) {
            const created = await this.iam.createPasswordUser({
                email: profile.email,
                passwordHash: await argon2.hash((0, node_crypto_1.randomBytes)(32).toString('base64url'), { type: argon2.argon2id, memoryCost: 64 * 1024, timeCost: 3, parallelism: 1 }),
                ...(profile.displayName !== null ? { displayName: profile.displayName } : {}),
            });
            await this.hardening.markPrimaryEmailVerified(created.id);
            user = await this.iam.findUserById(created.id);
        }
        if (!user)
            throw new contracts_1.DomainError('UNAUTHORIZED', 'error.oauth_account_unresolvable');
        await this.hardening.linkOAuthIdentity({ userId: user.id, provider: providerName, providerUserId: profile.providerUserId, providerEmail: profile.email ?? undefined });
        await this.audit.append({ actorUserId: user.id, action: 'iam.oauth_linked', entityType: 'iam.user', entityId: user.id });
        return this.issueTokensForActiveUser(user.id, meta);
    }
    /** Shared token issuance for hardened flows (MFA / OAuth). */
    async issueTokensForActiveUser(userId, meta) {
        const user = await this.iam.findUserById(userId);
        if (!user || user.status !== 'active')
            throw new contracts_1.DomainError('AUTH_SESSION_REVOKED', 'error.user_not_active');
        await this.iam.updateLastLogin(user.id);
        const principal = { id: user.id, status: user.status };
        const accessToken = await this.tokens.sign(principal);
        const rawRefresh = (0, node_crypto_1.randomBytes)(48).toString('base64url');
        await this.iam.createSession({
            userId: user.id,
            refreshTokenHash: (0, node_crypto_1.createHash)('sha256').update(rawRefresh).digest('hex'),
            expiresAt: new Date(Date.now() + this.config.refreshTtlSeconds * 1000),
            deviceId: meta.deviceId,
            ip: meta.ip,
            userAgent: meta.userAgent,
        });
        return { tokenType: 'Bearer', accessToken, expiresIn: this.config.accessTtlSeconds, refreshToken: rawRefresh };
    }
};
exports.IamHardeningService = IamHardeningService;
exports.IamHardeningService = IamHardeningService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [db_1.IamHardeningRepository,
        db_1.IamRepository,
        db_1.JobRepository,
        db_1.AuditRepository,
        access_token_service_1.AccessTokenService,
        oauth_providers_1.OAuthProviderRegistry,
        app_config_1.AppConfig])
], IamHardeningService);
