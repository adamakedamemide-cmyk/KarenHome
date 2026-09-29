import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import * as argon2 from 'argon2';
import type { AuthTokens, AuthenticatedUser } from '@platform/contracts';
import { IamRepository, type IamUser } from '@platform/db';
import { AppConfig } from '../../../common/config/app-config';
import { AccessTokenService } from '../../../common/auth/access-token.service';
import { InvalidCredentialsError, SessionInvalidError, UserAlreadyExistsError } from '../domain/iam.errors';

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
  deviceId?: string;
}

@Injectable()
export class IamService {
  constructor(
    private readonly repo: IamRepository,
    private readonly tokens: AccessTokenService,
    private readonly config: AppConfig,
  ) {}

  async register(input: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    locale?: string;
    timezone?: string;
  }): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    const email = input.email.trim().toLowerCase();
    if (await this.repo.findUserByEmail(email)) throw new UserAlreadyExistsError('Email is already registered');

    try {
      const hash = await argon2.hash(input.password, { type: argon2.argon2id, memoryCost: 64 * 1024, timeCost: 3, parallelism: 1 });
      const user = await this.repo.createPasswordUser({ ...input, email, passwordHash: hash });
      const auth = await this.issueTokens(user, { });
      return { user: toPublicUser(user), tokens: auth };
    } catch (error) {
      if (isUniqueViolation(error)) throw new UserAlreadyExistsError('Email is already registered');
      throw error;
    }
  }

  async login(email: string, password: string, meta: RequestMeta): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    const user = await this.repo.findUserByEmail(email.trim().toLowerCase());
    if (!user) throw new InvalidCredentialsError('Invalid email or password');
    const credential = await this.repo.findCredentialByUserId(user.id);
    if (!credential?.passwordHash || !(await argon2.verify(credential.passwordHash, password))) {
      throw new InvalidCredentialsError('Invalid email or password');
    }
    if (user.status !== 'active') throw new InvalidCredentialsError('Invalid email or password');
    await this.repo.updateLastLogin(user.id);
    return { user: toPublicUser(user), tokens: await this.issueTokens(user, meta) };
  }

  async refresh(refreshToken: string, meta: RequestMeta): Promise<AuthTokens> {
    const hash = hashRefreshToken(refreshToken);
    const session = await this.repo.findSessionByRefreshHash(hash);
    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) throw new SessionInvalidError('Refresh session is invalid');
    const user = await this.repo.findUserById(session.userId);
    if (!user || user.status !== 'active') throw new SessionInvalidError('Refresh session is invalid');
    await this.repo.revokeSessionByRefreshHash(hash);
    return this.issueTokens(user, meta);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.repo.revokeSessionByRefreshHash(hashRefreshToken(refreshToken));
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.repo.findUserById(userId);
    if (!user) throw new UnauthorizedException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    return toPublicUser(user);
  }

  private async issueTokens(user: IamUser, meta: RequestMeta): Promise<AuthTokens> {
    const permissions = await this.repo.listPermissionCodesForUser(user.id);
    const principal: AuthenticatedUser = { id: user.id, status: user.status as AuthenticatedUser['status'], permissions };
    const accessToken = await this.tokens.sign(principal);
    const rawRefresh = randomBytes(48).toString('base64url');
    const refreshHash = hashRefreshToken(rawRefresh);
    const sessionInput: { userId: string; refreshTokenHash: string; expiresAt: Date; deviceId?: string; ip?: string; userAgent?: string } = {
      userId: user.id,
      refreshTokenHash: refreshHash,
      expiresAt: new Date(Date.now() + this.config.refreshTtlSeconds * 1000),
    };
    if (meta.deviceId) sessionInput.deviceId = meta.deviceId;
    if (meta.ip) sessionInput.ip = meta.ip;
    if (meta.userAgent) sessionInput.userAgent = meta.userAgent;
    await this.repo.createSession(sessionInput);
    return { tokenType: 'Bearer', accessToken, expiresIn: this.config.accessTtlSeconds, refreshToken: rawRefresh };
  }
}

export interface PublicUser {
  id: string;
  status: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  locale: string;
  timezone: string;
}

function toPublicUser(user: IamUser): PublicUser {
  return { id: user.id, status: user.status, firstName: user.firstName, lastName: user.lastName, displayName: user.displayName, locale: user.locale, timezone: user.timezone };
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === '23505';
}
