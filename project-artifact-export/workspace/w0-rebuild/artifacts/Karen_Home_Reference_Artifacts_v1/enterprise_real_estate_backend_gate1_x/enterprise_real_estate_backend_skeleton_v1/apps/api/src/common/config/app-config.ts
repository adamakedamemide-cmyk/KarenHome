import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfig {
  constructor(private readonly config: ConfigService) {}

  get databaseUrl(): string {
    const value = this.config.get<string>('DATABASE_URL');
    if (!value) throw new Error('DATABASE_URL is required');
    return value;
  }

  get jwtIssuer(): string { return this.config.get<string>('JWT_ISSUER', 'enterprise-real-estate-platform'); }
  get jwtAudience(): string { return this.config.get<string>('JWT_AUDIENCE', 'real-estate-api'); }
  get jwtSecret(): Uint8Array {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret || secret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
    return new TextEncoder().encode(secret);
  }
  get accessTtlSeconds(): number {
    return this.config.get<number>('ACCESS_TOKEN_TTL_SECONDS', 900);
  }
  get refreshTtlSeconds(): number {
    return this.config.get<number>('REFRESH_TOKEN_TTL_SECONDS', 60 * 60 * 24 * 30);
  }
  get nodeEnv(): string { return this.config.get<string>('NODE_ENV', 'development'); }
}
