import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import * as argon2 from 'argon2';
import type { AuthTokens, AuthenticatedUser } from '@platform/contracts';
import { DomainError } from '@platform/contracts';
import { IamHardeningRepository, IamRepository, JobRepository, type IamUser } from '@platform/db';
import { AppConfig } from '../../../common/config/app-config';
import { AccessTokenService } from '../../../common/auth/access-token.service';
import { AntiBotService } from '../../../common/antibot/antibot.service';
import { InvalidCredentialsError, SessionInvalidError, UserAlreadyExistsError } from '../domain/iam.errors';

export interface RequestMeta { ip?: string | undefined; userAgent?: string | undefined; deviceId?: string | undefined; requestId?: string | undefined; }

@Injectable()
export class IamService {
  constructor(private readonly repo: IamRepository, private readonly tokens: AccessTokenService, private readonly config: AppConfig, private readonly hardening: IamHardeningRepository, private readonly antiBot: AntiBotService, private readonly jobs: JobRepository) {}

  async register(input: { email: string; password: string; firstName?: string; lastName?: string; displayName?: string; locale?: string; timezone?: string }, meta?: { ip?: string; requestId?: string }): Promise<{ user: PublicUser; verificationRequired: true }> {
    const email = input.email.trim().toLowerCase();
    const decision = await this.antiBot.precheck({ ip: meta?.ip ?? '0.0.0.0', email, action: 'register' });
    if (decision.signals.includes('disposable_email')) throw new DomainError('DISPOSABLE_EMAIL_REJECTED', 'error.disposable_email');
    if (!decision.allowed) throw new DomainError('TEMPORARILY_BLOCKED', 'error.temporarily_blocked');
    if (await this.repo.findUserByEmail(email)) throw new UserAlreadyExistsError('Email is already registered');
    try {
      const hash = await argon2.hash(input.password, { type: argon2.argon2id, memoryCost: 64 * 1024, timeCost: 3, parallelism: 1 });
      const user = await this.repo.createPasswordUser({ ...input, email, passwordHash: hash });
      // New accounts stay pending until verification. Queue the verification email (event-driven §12).
      const rawToken = randomBytes(32).toString('hex');
      await this.hardening.createEmailVerification({
        userId: user.id,
        tokenHash: createHash('sha256').update(rawToken).digest('hex'),
        expiresAt: new Date(Date.now() + this.config.emailVerificationTtlSeconds * 1000),
        createdIp: meta?.ip,
      });
      await this.jobs.enqueue({ queue: 'email', jobType: 'email.verification', payload: { userId: user.id, rawToken, locale: user.locale }, dedupKey: `email.verification:${user.id}` });
      return { user: toPublicUser(user), verificationRequired: true };
    } catch (error) {
      if (isUniqueViolation(error) && uniqueConstraint(error) === 'user_emails_email_key') throw new UserAlreadyExistsError('Email is already registered');
      throw error;
    }
  }

  async login(email: string, password: string, meta: RequestMeta): Promise<{ user: PublicUser; tokens: AuthTokens } | { mfaRequired: true; challengeToken: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const decision = await this.antiBot.precheck({ ip: meta.ip ?? '0.0.0.0', email: normalizedEmail, action: 'login' });
    if (!decision.allowed) throw new DomainError('TEMPORARILY_BLOCKED', 'error.temporarily_blocked');
    const user = await this.repo.findUserByEmail(normalizedEmail);
    const credential = user ? await this.repo.findCredentialByUserId(user.id) : null;
    const passwordOk = credential?.passwordHash ? await argon2.verify(credential.passwordHash, password) : false;
    if (!user || !passwordOk) {
      await this.hardening.recordLoginAttempt({ email: normalizedEmail, success: false, ip: meta.ip, userAgent: meta.userAgent });
      await this.antiBot.recordFailure({ ip: meta.ip ?? '0.0.0.0', email: normalizedEmail, action: 'login' });
      throw new InvalidCredentialsError('Invalid email or password');
    }
    if (user.status !== 'active') {
      await this.hardening.recordLoginAttempt({ email: normalizedEmail, userId: user.id, success: false, ip: meta.ip, userAgent: meta.userAgent });
      throw new InvalidCredentialsError('Invalid email or password');
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

  async refresh(refreshToken: string, meta: RequestMeta): Promise<AuthTokens> {
    const currentHash = hashRefreshToken(refreshToken);
    const rawNextRefresh = randomBytes(48).toString('base64url');
    const currentSession = await this.repo.findSessionByRefreshHash(currentHash);
    if (!currentSession) throw new SessionInvalidError('Refresh session is invalid');
    const user = await this.repo.findUserById(currentSession.userId);
    if (!user || user.status !== 'active') throw new SessionInvalidError('Refresh session is invalid');
    const accessToken = await this.tokens.sign({ id: user.id, status: user.status as AuthenticatedUser['status'] });
    const rotation = await this.repo.rotateRefreshSessionWithToken({
      currentHash,
      newHash: hashRefreshToken(rawNextRefresh),
      userId: user.id,
      deviceId: meta.deviceId,
      ip: meta.ip,
      userAgent: meta.userAgent,
      expiresAt: new Date(Date.now() + this.config.refreshTtlSeconds * 1000),
    }, { requestId: meta.requestId });
    if (rotation.reused) throw new SessionInvalidError('Refresh session is invalid');
    return { tokenType: 'Bearer', accessToken, expiresIn: this.config.accessTtlSeconds, refreshToken: rawNextRefresh };
  }

  async logout(refreshToken: string): Promise<void> { await this.repo.revokeSessionByRefreshHash(hashRefreshToken(refreshToken)); }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.repo.findUserById(userId);
    if (!user) throw new UnauthorizedException({ code: 'RESOURCE_NOT_FOUND', message: 'User not found' });
    return toPublicUser(user);
  }

  private async issueTokens(user: IamUser, meta: RequestMeta, requireActive: boolean): Promise<AuthTokens> {
    if (requireActive && user.status !== 'active') throw new InvalidCredentialsError('Invalid email or password');
    const principal: AuthenticatedUser = { id: user.id, status: user.status as AuthenticatedUser['status'] };
    const accessToken = await this.tokens.sign(principal);
    const rawRefresh = randomBytes(48).toString('base64url');
    await this.repo.createSession({ userId: user.id, refreshTokenHash: hashRefreshToken(rawRefresh), expiresAt: new Date(Date.now() + this.config.refreshTtlSeconds * 1000), deviceId: meta.deviceId, ip: meta.ip, userAgent: meta.userAgent });
    return { tokenType: 'Bearer', accessToken, expiresIn: this.config.accessTtlSeconds, refreshToken: rawRefresh };
  }
}

export interface PublicUser { id: string; status: string; firstName: string | null; lastName: string | null; displayName: string | null; locale: string; timezone: string; }
function toPublicUser(user: IamUser): PublicUser { return { id: user.id, status: user.status, firstName: user.firstName, lastName: user.lastName, displayName: user.displayName, locale: user.locale, timezone: user.timezone }; }
export function hashRefreshToken(token: string): string { return createHash('sha256').update(token, 'utf8').digest('hex'); }
function isUniqueViolation(error: unknown): boolean { return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === '23505'; }
function uniqueConstraint(error: unknown): string | undefined { return typeof error === 'object' && error !== null && 'constraint' in error ? String((error as { constraint?: unknown }).constraint) : undefined; }

