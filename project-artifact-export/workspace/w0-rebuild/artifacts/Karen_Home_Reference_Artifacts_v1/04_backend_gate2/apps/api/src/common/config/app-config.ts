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

  get databaseSsl(): boolean {
    return this.config.get<string>('DATABASE_SSL', 'false') === 'true';
  }

  get databasePoolMax(): number {
    return this.int('DATABASE_POOL_MAX', 20, 1, 100);
  }

  get jwtIssuer(): string { return this.required('JWT_ISSUER', 'enterprise-real-estate-platform'); }
  get jwtAudience(): string { return this.required('JWT_AUDIENCE', 'real-estate-api'); }

  get jwtSecret(): Uint8Array {
    const encoded = this.config.get<string>('JWT_SECRET', '');
    if (encoded.length < 43) throw new Error('JWT_SECRET must be at least 43 characters of high-entropy material');
    return new TextEncoder().encode(encoded);
  }

  get accessTtlSeconds(): number { return this.int('ACCESS_TOKEN_TTL_SECONDS', 900, 60, 3600); }
  get refreshTtlSeconds(): number { return this.int('REFRESH_TOKEN_TTL_SECONDS', 60 * 60 * 24 * 30, 3600, 60 * 60 * 24 * 365); }
  get port(): number { return this.int('PORT', 3000, 1, 65535); }
  get nodeEnv(): string { return this.config.get<string>('NODE_ENV', 'development'); }
  get docsEnabled(): boolean { return this.nodeEnv !== 'production' || this.config.get<string>('ENABLE_API_DOCS', 'false') === 'true'; }

  private required(name: string, fallback?: string): string {
    const value = this.config.get<string>(name, fallback);
    if (!value) throw new Error(`${name} is required`);
    return value;
  }

  private int(name: string, fallback: number, min: number, max: number): number {
    const raw = this.config.get<string | number>(name, fallback);
    const value = Number(raw);
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new Error(`${name} must be an integer in [${min}, ${max}]`);
    }
    return value;
  }
}
