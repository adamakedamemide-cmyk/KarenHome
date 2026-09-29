import { Injectable } from '@nestjs/common';
import { randomBytes, createHash, randomInt } from 'node:crypto';
import * as argon2 from 'argon2';
import { DomainError } from '@platform/contracts';
import { AuditRepository, IamHardeningRepository, IamRepository, JobRepository, type IamUser } from '@platform/db';
import { OAuthProviderRegistry } from '../infrastructure/oauth-providers';
import { AppConfig } from '../../../common/config/app-config';
import { AccessTokenService } from '../../../common/auth/access-token.service';
import { SecretCipher } from '../../../common/auth/secret-cipher';
import { generateTotpSecret, totpUri, verifyTotp } from '../../../common/auth/totp';
import type { AuthTokens } from '@platform/contracts';
import type { OAuthProviderProfile } from '../infrastructure/oauth-providers';

export interface RequestMeta { ip?: string | undefined; userAgent?: string | undefined; requestId?: string | undefined; }

/**
 * Gate 4 §15 — IAM hardening application service.
 * Email/phone verification, password flows (change + reset), MFA (TOTP)
 * foundation, OAuth linking (provider abstraction) and logout-all.
 * Outbound messaging is event-driven: verification/reset requests enqueue
 * jobs on the email/sms queues; workers own delivery (§12/§13).
 */
@Injectable()
export class IamHardeningService {
  private readonly cipher: SecretCipher;

  constructor(
    private readonly hardening: IamHardeningRepository,
    private readonly iam: IamRepository,
    private readonly jobs: JobRepository,
    private readonly audit: AuditRepository,
    private readonly tokens: AccessTokenService,
    private readonly oauthRegistry: OAuthProviderRegistry,
    private readonly config: AppConfig,
  ) {
    // Gate 4.1 (Phase Q fix): the hard-coded development fallback key is REMOVED.
    // - production without MFA_ENCRYPTION_KEY fails fast (no silent weak crypto)
    // - non-production uses an ephemeral per-process random key (no constant secret
    //   in source; TOTP secrets remain process-local and are never persisted across restarts)
    const configuredKey = this.config.mfaEncryptionKey;
    if (configuredKey) {
      this.cipher = new SecretCipher(configuredKey);
    } else if (this.config.nodeEnv === 'production') {
      throw new Error('MFA_ENCRYPTION_KEY (>=43 chars) is required when NODE_ENV=production');
    } else {
      this.cipher = new SecretCipher(randomBytes(48).toString('base64'));
    }
  }

  // --- Email verification -----------------------------------------------------
  async requestEmailVerification(userId: string, meta: RequestMeta = {}): Promise<{ queued: true }> {
    const user = await this.iam.findUserById(userId);
    if (!user) throw new DomainError('RESOURCE_NOT_FOUND', 'error.user_not_found');
    const last = await this.hardening.latestEmailVerificationSentAt(userId);
    if (last && Date.now() - last.getTime() < 60_000) {
      throw new DomainError('RATE_LIMITED', 'error.verification_resend_throttled');
    }
    const rawToken = randomBytes(32).toString('hex');
    await this.hardening.createEmailVerification({
      userId,
      tokenHash: createHash('sha256').update(rawToken).digest('hex'),
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

  async verifyEmail(rawToken: string): Promise<{ verified: true }> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const outcome = await this.hardening.consumeEmailVerification(tokenHash);
    if (outcome === 'NOT_FOUND') throw new DomainError('RESOURCE_NOT_FOUND', 'error.token_invalid');
    if (outcome === 'CONSUMED') throw new DomainError('TOKEN_CONSUMED', 'error.token_consumed');
    if (outcome === 'EXPIRED') throw new DomainError('TOKEN_EXPIRED', 'error.token_expired');
    await this.hardening.markPrimaryEmailVerified(outcome.userId);
    await this.audit.append({ actorUserId: outcome.userId, action: 'iam.email_verified', entityType: 'iam.user', entityId: outcome.userId });
    return { verified: true };
  }

  // --- Phone OTP ----------------------------------------------------------------
  async requestPhoneOtp(userId: string, phoneE164: string): Promise<{ queued: true }> {
    if (!/^\+[1-9][0-9]{7,14}$/.test(phoneE164)) throw new DomainError('VALIDATION_ERROR', 'error.phone_invalid');
    await this.hardening.addPhoneIfAbsent(userId, phoneE164);
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.hardening.createPhoneVerification({
      userId,
      phoneE164,
      codeHash: createHash('sha256').update(code).digest('hex'),
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

  async verifyPhoneOtp(userId: string, phoneE164: string, code: string): Promise<{ verified: true }> {
    const codeHash = createHash('sha256').update(code).digest('hex');
    const outcome = await this.hardening.verifyPhoneOtp({ userId, phoneE164, codeHash });
    if (outcome === 'MISMATCH') throw new DomainError('AUTH_MFA_INVALID', 'error.otp_invalid');
    if (outcome === 'TOO_MANY_ATTEMPTS') throw new DomainError('RATE_LIMITED', 'error.otp_too_many_attempts');
    if (outcome === 'EXPIRED') throw new DomainError('TOKEN_EXPIRED', 'error.otp_expired');
    if (outcome === 'CONSUMED') throw new DomainError('TOKEN_CONSUMED', 'error.otp_consumed');
    if (outcome === 'NOT_FOUND') throw new DomainError('RESOURCE_NOT_FOUND', 'error.otp_not_found');
    return { verified: true };
  }

  // --- Password flows -------------------------------------------------------------
  async requestPasswordReset(email: string, meta: RequestMeta): Promise<{ accepted: true }> {
    const user = await this.iam.findUserByEmail(email.trim().toLowerCase());
    // Anti-enumeration: identical response whether or not the account exists.
    if (!user) return { accepted: true };
    const rawToken = randomBytes(32).toString('hex');
    await this.hardening.createPasswordReset({
      userId: user.id,
      tokenHash: createHash('sha256').update(rawToken).digest('hex'),
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

  async resetPassword(rawToken: string, newPassword: string): Promise<{ reset: true }> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const outcome = await this.hardening.consumePasswordReset(tokenHash);
    if (outcome === 'NOT_FOUND') throw new DomainError('RESOURCE_NOT_FOUND', 'error.token_invalid');
    if (outcome === 'CONSUMED') throw new DomainError('TOKEN_CONSUMED', 'error.token_consumed');
    if (outcome === 'EXPIRED') throw new DomainError('TOKEN_EXPIRED', 'error.token_expired');
    const hash = await argon2.hash(newPassword, { type: argon2.argon2id, memoryCost: 64 * 1024, timeCost: 3, parallelism: 1 });
    await this.hardening.updatePasswordHash(outcome.userId, hash);
    await this.audit.append({ actorUserId: outcome.userId, action: 'iam.password_reset_completed', entityType: 'iam.user', entityId: outcome.userId });
    return { reset: true };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ changed: true }> {
    const credential = await this.iam.findCredentialByUserId(userId);
    if (!credential?.passwordHash || !(await argon2.verify(credential.passwordHash, currentPassword))) {
      throw new DomainError('AUTH_INVALID_CREDENTIALS', 'error.current_password_invalid');
    }
    const hash = await argon2.hash(newPassword, { type: argon2.argon2id, memoryCost: 64 * 1024, timeCost: 3, parallelism: 1 });
    await this.hardening.updatePasswordHash(userId, hash);
    await this.audit.append({ actorUserId: userId, action: 'iam.password_changed', entityType: 'iam.user', entityId: userId });
    return { changed: true };
  }

  // --- Sessions ---------------------------------------------------------------------
  async listSessions(userId: string): Promise<Array<{ id: string; deviceId: string | null; expiresAt: Date; createdAt: Date }>> {
    const sessions = await this.hardening.listActiveSessions(userId);
    return sessions.map((session) => ({ id: session.id, deviceId: session.deviceId, expiresAt: session.expiresAt, createdAt: session.createdAt }));
  }

  async logoutAll(userId: string): Promise<{ revoked: number }> {
    const revoked = await this.hardening.revokeAllSessions(userId);
    await this.audit.append({ actorUserId: userId, action: 'iam.logout_all', entityType: 'iam.user', entityId: userId });
    return { revoked };
  }

  // --- MFA (TOTP foundation) -----------------------------------------------------------
  async enrollTotp(userId: string): Promise<{ factorId: string; otpauthUri: string }> {
    if (await this.hardening.findActiveMfaFactor(userId)) {
      throw new DomainError('MFA_ALREADY_ACTIVE', 'error.mfa_already_active');
    }
    const user = await this.iam.findUserById(userId);
    const secret = generateTotpSecret();
    const factorId = await this.hardening.upsertPendingMfaFactor(userId, this.cipher.encrypt(secret));
    return { factorId, otpauthUri: totpUri(secret, user?.id ?? userId, this.config.jwtIssuer) };
  }

  async activateTotp(userId: string, code: string): Promise<{ activated: true }> {
    const pending = await this.hardening.findPendingMfaFactor(userId);
    if (!pending) throw new DomainError('RESOURCE_NOT_FOUND', 'error.mfa_no_pending');
    const secret = this.cipher.decrypt(pending.secretCipher);
    if (!verifyTotp(secret, code)) throw new DomainError('AUTH_MFA_INVALID', 'error.mfa_code_invalid');
    await this.hardening.activateMfaFactor(pending.id);
    await this.audit.append({ actorUserId: userId, action: 'iam.mfa_activated', entityType: 'iam.user', entityId: userId });
    return { activated: true };
  }

  async disableTotp(userId: string, code: string): Promise<{ disabled: true }> {
    const active = await this.hardening.findActiveMfaFactor(userId);
    if (!active) throw new DomainError('RESOURCE_NOT_FOUND', 'error.mfa_not_active');
    const secret = this.cipher.decrypt(active.secretCipher);
    if (!verifyTotp(secret, code)) throw new DomainError('AUTH_MFA_INVALID', 'error.mfa_code_invalid');
    await this.hardening.disableMfaFactor(userId, active.id);
    await this.audit.append({ actorUserId: userId, action: 'iam.mfa_disabled', entityType: 'iam.user', entityId: userId });
    return { disabled: true };
  }

  async verifyMfaLogin(challengeToken: string, code: string, meta: { deviceId?: string; ip?: string; userAgent?: string; requestId?: string }): Promise<AuthTokens> {
    let userId: string;
    try {
      userId = await this.tokens.verifyMfaChallenge(challengeToken);
    } catch {
      throw new DomainError('UNAUTHORIZED', 'error.mfa_challenge_invalid');
    }
    const active = await this.hardening.findActiveMfaFactor(userId);
    if (!active) throw new DomainError('RESOURCE_NOT_FOUND', 'error.mfa_not_active');
    const secret = this.cipher.decrypt(active.secretCipher);
    if (!verifyTotp(secret, code)) throw new DomainError('AUTH_MFA_INVALID', 'error.mfa_code_invalid');
    await this.hardening.touchMfaUsed(active.id);
    return this.issueTokensForActiveUser(userId, meta);
  }

  // --- OAuth ---------------------------------------------------------------------------
  get configRedirectBase(): string {
    return this.config.oauthRedirectBase;
  }

  get configuredOAuthProviders(): string[] {
    return this.oauthRegistry.configuredNames();
  }

  async oauthAuthorizeUrl(providerName: string, redirectUri: string): Promise<{ authorizationUrl: string }> {
    const provider = this.oauthRegistry.get(providerName);
    if (!provider) throw new DomainError('OAUTH_PROVIDER_NOT_CONFIGURED', 'error.oauth_not_configured');
    const state = randomBytes(16).toString('hex');
    return { authorizationUrl: provider.authorizationUrl(state, redirectUri) };
  }

  async oauthCallback(providerName: string, code: string, redirectUri: string, meta: { deviceId?: string; ip?: string; userAgent?: string; requestId?: string }): Promise<AuthTokens> {
    const provider = this.oauthRegistry.get(providerName);
    if (!provider) throw new DomainError('OAUTH_PROVIDER_NOT_CONFIGURED', 'error.oauth_not_configured');
    const profile: OAuthProviderProfile = await provider.exchangeCode(code, redirectUri);
    const linked = await this.hardening.findOAuthIdentity(providerName, profile.providerUserId);
    if (linked) return this.issueTokensForActiveUser(linked.userId, meta);
    // Match by verified email, then link; otherwise provision a new active user.
    let user: IamUser | null = profile.email ? await this.iam.findUserByEmail(profile.email) : null;
    if (!user && profile.email) {
      const created = await this.iam.createPasswordUser({
        email: profile.email,
        passwordHash: await argon2.hash(randomBytes(32).toString('base64url'), { type: argon2.argon2id, memoryCost: 64 * 1024, timeCost: 3, parallelism: 1 }),
        ...(profile.displayName !== null ? { displayName: profile.displayName } : {}),
      });
      await this.hardening.markPrimaryEmailVerified(created.id);
      user = await this.iam.findUserById(created.id);
    }
    if (!user) throw new DomainError('UNAUTHORIZED', 'error.oauth_account_unresolvable');
    await this.hardening.linkOAuthIdentity({ userId: user.id, provider: providerName, providerUserId: profile.providerUserId, providerEmail: profile.email ?? undefined });
    await this.audit.append({ actorUserId: user.id, action: 'iam.oauth_linked', entityType: 'iam.user', entityId: user.id });
    return this.issueTokensForActiveUser(user.id, meta);
  }

  /** Shared token issuance for hardened flows (MFA / OAuth). */
  async issueTokensForActiveUser(userId: string, meta: { deviceId?: string; ip?: string; userAgent?: string; requestId?: string }): Promise<AuthTokens> {
    const user = await this.iam.findUserById(userId);
    if (!user || user.status !== 'active') throw new DomainError('AUTH_SESSION_REVOKED', 'error.user_not_active');
    await this.iam.updateLastLogin(user.id);
    const principal = { id: user.id, status: user.status as 'active' };
    const accessToken = await this.tokens.sign(principal);
    const rawRefresh = randomBytes(48).toString('base64url');
    await this.iam.createSession({
      userId: user.id,
      refreshTokenHash: createHash('sha256').update(rawRefresh).digest('hex'),
      expiresAt: new Date(Date.now() + this.config.refreshTtlSeconds * 1000),
      deviceId: meta.deviceId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { tokenType: 'Bearer', accessToken, expiresIn: this.config.accessTtlSeconds, refreshToken: rawRefresh };
  }
}
