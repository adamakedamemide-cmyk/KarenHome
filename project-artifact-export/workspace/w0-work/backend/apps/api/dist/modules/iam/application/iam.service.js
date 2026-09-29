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
exports.IamService = void 0;
exports.hashRefreshToken = hashRefreshToken;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const argon2 = __importStar(require("argon2"));
const contracts_1 = require("@platform/contracts");
const db_1 = require("@platform/db");
const app_config_1 = require("../../../common/config/app-config");
const access_token_service_1 = require("../../../common/auth/access-token.service");
const antibot_service_1 = require("../../../common/antibot/antibot.service");
const iam_errors_1 = require("../domain/iam.errors");
let IamService = class IamService {
    repo;
    tokens;
    config;
    hardening;
    antiBot;
    jobs;
    constructor(repo, tokens, config, hardening, antiBot, jobs) {
        this.repo = repo;
        this.tokens = tokens;
        this.config = config;
        this.hardening = hardening;
        this.antiBot = antiBot;
        this.jobs = jobs;
    }
    async register(input, meta) {
        const email = input.email.trim().toLowerCase();
        const decision = await this.antiBot.precheck({ ip: meta?.ip ?? '0.0.0.0', email, action: 'register' });
        if (decision.signals.includes('disposable_email'))
            throw new contracts_1.DomainError('DISPOSABLE_EMAIL_REJECTED', 'error.disposable_email');
        if (!decision.allowed)
            throw new contracts_1.DomainError('TEMPORARILY_BLOCKED', 'error.temporarily_blocked');
        if (await this.repo.findUserByEmail(email))
            throw new iam_errors_1.UserAlreadyExistsError('Email is already registered');
        try {
            const hash = await argon2.hash(input.password, { type: argon2.argon2id, memoryCost: 64 * 1024, timeCost: 3, parallelism: 1 });
            const user = await this.repo.createPasswordUser({ ...input, email, passwordHash: hash });
            // New accounts stay pending until verification. Queue the verification email (event-driven §12).
            const rawToken = (0, node_crypto_1.randomBytes)(32).toString('hex');
            await this.hardening.createEmailVerification({
                userId: user.id,
                tokenHash: (0, node_crypto_1.createHash)('sha256').update(rawToken).digest('hex'),
                expiresAt: new Date(Date.now() + this.config.emailVerificationTtlSeconds * 1000),
                createdIp: meta?.ip,
            });
            await this.jobs.enqueue({ queue: 'email', jobType: 'email.verification', payload: { userId: user.id, rawToken, locale: user.locale }, dedupKey: `email.verification:${user.id}` });
            return { user: toPublicUser(user), verificationRequired: true };
        }
        catch (error) {
            if (isUniqueViolation(error) && uniqueConstraint(error) === 'user_emails_email_key')
                throw new iam_errors_1.UserAlreadyExistsError('Email is already registered');
            throw error;
        }
    }
    async login(email, password, meta) {
        const normalizedEmail = email.trim().toLowerCase();
        const decision = await this.antiBot.precheck({ ip: meta.ip ?? '0.0.0.0', email: normalizedEmail, action: 'login' });
        if (!decision.allowed)
            throw new contracts_1.DomainError('TEMPORARILY_BLOCKED', 'error.temporarily_blocked');
        const user = await this.repo.findUserByEmail(normalizedEmail);
        const credential = user ? await this.repo.findCredentialByUserId(user.id) : null;
        const passwordOk = credential?.passwordHash ? await argon2.verify(credential.passwordHash, password) : false;
        if (!user || !passwordOk) {
            await this.hardening.recordLoginAttempt({ email: normalizedEmail, success: false, ip: meta.ip, userAgent: meta.userAgent });
            await this.antiBot.recordFailure({ ip: meta.ip ?? '0.0.0.0', email: normalizedEmail, action: 'login' });
            throw new iam_errors_1.InvalidCredentialsError('Invalid email or password');
        }
        if (user.status !== 'active') {
            await this.hardening.recordLoginAttempt({ email: normalizedEmail, userId: user.id, success: false, ip: meta.ip, userAgent: meta.userAgent });
            throw new iam_errors_1.InvalidCredentialsError('Invalid email or password');
        }
        // MFA foundation (§15): active TOTP factor forces a short-lived challenge.
        const mfaFactor = await this.hardening.findActiveMfaFactor(user.id);
        if (mfaFactor) {
            const challengeToken = await this.tokens.signMfaChallenge(user.id);
            return { mfaRequired: true, challengeToken };
        }
        await this.hardening.recordLoginAttempt({ email: normalizedEmail, userId: user.id, success: true, ip: meta.ip, userAgent: meta.userAgent });
        await this.repo.updateLastLogin(user.id);
        return { user: toPublicUser(user), tokens: await this.issueTokens(user, meta, true) };
    }
    async refresh(refreshToken, meta) {
        const currentHash = hashRefreshToken(refreshToken);
        const rawNextRefresh = (0, node_crypto_1.randomBytes)(48).toString('base64url');
        const currentSession = await this.repo.findSessionByRefreshHash(currentHash);
        if (!currentSession)
            throw new iam_errors_1.SessionInvalidError('Refresh session is invalid');
        const user = await this.repo.findUserById(currentSession.userId);
        if (!user || user.status !== 'active')
            throw new iam_errors_1.SessionInvalidError('Refresh session is invalid');
        const accessToken = await this.tokens.sign({ id: user.id, status: user.status });
        const rotation = await this.repo.rotateRefreshSessionWithToken({
            currentHash,
            newHash: hashRefreshToken(rawNextRefresh),
            userId: user.id,
            deviceId: meta.deviceId,
            ip: meta.ip,
            userAgent: meta.userAgent,
            expiresAt: new Date(Date.now() + this.config.refreshTtlSeconds * 1000),
        }, { requestId: meta.requestId });
        if (rotation.reused)
            throw new iam_errors_1.SessionInvalidError('Refresh session is invalid');
        return { tokenType: 'Bearer', accessToken, expiresIn: this.config.accessTtlSeconds, refreshToken: rawNextRefresh };
    }
    async logout(refreshToken) { await this.repo.revokeSessionByRefreshHash(hashRefreshToken(refreshToken)); }
    async me(userId) {
        const user = await this.repo.findUserById(userId);
        if (!user)
            throw new common_1.UnauthorizedException({ code: 'RESOURCE_NOT_FOUND', message: 'User not found' });
        return toPublicUser(user);
    }
    async issueTokens(user, meta, requireActive) {
        if (requireActive && user.status !== 'active')
            throw new iam_errors_1.InvalidCredentialsError('Invalid email or password');
        const principal = { id: user.id, status: user.status };
        const accessToken = await this.tokens.sign(principal);
        const rawRefresh = (0, node_crypto_1.randomBytes)(48).toString('base64url');
        await this.repo.createSession({ userId: user.id, refreshTokenHash: hashRefreshToken(rawRefresh), expiresAt: new Date(Date.now() + this.config.refreshTtlSeconds * 1000), deviceId: meta.deviceId, ip: meta.ip, userAgent: meta.userAgent });
        return { tokenType: 'Bearer', accessToken, expiresIn: this.config.accessTtlSeconds, refreshToken: rawRefresh };
    }
};
exports.IamService = IamService;
exports.IamService = IamService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [db_1.IamRepository, access_token_service_1.AccessTokenService, app_config_1.AppConfig, db_1.IamHardeningRepository, antibot_service_1.AntiBotService, db_1.JobRepository])
], IamService);
function toPublicUser(user) { return { id: user.id, status: user.status, firstName: user.firstName, lastName: user.lastName, displayName: user.displayName, locale: user.locale, timezone: user.timezone }; }
function hashRefreshToken(token) { return (0, node_crypto_1.createHash)('sha256').update(token, 'utf8').digest('hex'); }
function isUniqueViolation(error) { return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'; }
function uniqueConstraint(error) { return typeof error === 'object' && error !== null && 'constraint' in error ? String(error.constraint) : undefined; }
