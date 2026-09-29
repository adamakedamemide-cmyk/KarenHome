import { Injectable } from '@nestjs/common';
import { jwtVerify, SignJWT } from 'jose';
import { AppConfig } from '../config/app-config';
import type { AuthenticatedUser } from '@platform/contracts';

@Injectable()
export class AccessTokenService {
  constructor(private readonly config: AppConfig) {}

  async sign(user: AuthenticatedUser): Promise<string> {
    return new SignJWT({ status: user.status, tokenType: 'access' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(user.id)
      .setIssuer(this.config.jwtIssuer)
      .setAudience(this.config.jwtAudience)
      .setIssuedAt()
      .setExpirationTime(`${this.config.accessTtlSeconds}s`)
      .sign(this.config.jwtSecret);
  }

  async verify(token: string): Promise<AuthenticatedUser> {
    const { payload } = await jwtVerify(token, this.config.jwtSecret, {
      issuer: this.config.jwtIssuer,
      audience: this.config.jwtAudience,
      algorithms: ['HS256'],
    });
    if (!payload.sub || payload.tokenType !== 'access' || typeof payload.status !== 'string') {
      throw new Error('Invalid access token claims');
    }
    return { id: payload.sub, status: payload.status as AuthenticatedUser['status'] };
  }

  /** Short-lived MFA challenge token (§15) — NOT an access token. */
  async signMfaChallenge(userId: string): Promise<string> {
    return new SignJWT({ tokenType: 'mfa_challenge' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(userId)
      .setIssuer(this.config.jwtIssuer)
      .setAudience(this.config.jwtAudience)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(this.config.jwtSecret);
  }

  async verifyMfaChallenge(token: string): Promise<string> {
    const { payload } = await jwtVerify(token, this.config.jwtSecret, {
      issuer: this.config.jwtIssuer,
      audience: this.config.jwtAudience,
      algorithms: ['HS256'],
    });
    if (!payload.sub || payload.tokenType !== 'mfa_challenge') throw new Error('Invalid MFA challenge claims');
    return payload.sub;
  }
}
