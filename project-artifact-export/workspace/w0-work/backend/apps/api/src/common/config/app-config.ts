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

  // --- Gate 4 additions -----------------------------------------------------
  get mfaEncryptionKey(): string | null {
    const value = this.config.get<string>('MFA_ENCRYPTION_KEY', '');
    return value.length >= 43 ? value : null;
  }

  get oauthGoogleCredentials(): { clientId: string; clientSecret: string } | null {
    const clientId = this.config.get<string>('OAUTH_GOOGLE_CLIENT_ID', '');
    const clientSecret = this.config.get<string>('OAUTH_GOOGLE_CLIENT_SECRET', '');
    return clientId && clientSecret ? { clientId, clientSecret } : null;
  }

  get oauthFacebookCredentials(): { clientId: string; clientSecret: string } | null {
    const clientId = this.config.get<string>('OAUTH_FACEBOOK_CLIENT_ID', '');
    const clientSecret = this.config.get<string>('OAUTH_FACEBOOK_CLIENT_SECRET', '');
    return clientId && clientSecret ? { clientId, clientSecret } : null;
  }

  get oauthRedirectBase(): string {
    return this.config.get<string>('OAUTH_REDIRECT_BASE', `http://localhost:${this.port}/api/v1/auth/oauth`);
  }

  get emailFromAddress(): string {
    return this.config.get<string>('EMAIL_FROM', 'no-reply@karen-home.local');
  }

  get emailVerificationTtlSeconds(): number { return this.int('EMAIL_VERIFICATION_TTL_SECONDS', 86_400, 600, 604_800); }
  get passwordResetTtlSeconds(): number { return this.int('PASSWORD_RESET_TTL_SECONDS', 3_600, 600, 86_400); }
  get jobBackoffBaseSeconds(): number { return this.int('JOB_BACKOFF_BASE_SECONDS', 5, 1, 300); }
  get jobBackoffMaxSeconds(): number { return this.int('JOB_BACKOFF_MAX_SECONDS', 3_600, 60, 86_400); }
  get opensearchUrl(): string | null {
    const value = this.config.get<string>('OPENSEARCH_URL', '');
    return value ? value : null;
  }
  get mediaTmpDir(): string { return this.config.get<string>('MEDIA_TMP_DIR', '/tmp/karen-media'); }
  get mediaStorageDir(): string { return this.config.get<string>('MEDIA_STORAGE_DIR', '/tmp/karen-media-storage'); }
  get mediaMaxBytes(): number { return this.int('MEDIA_MAX_BYTES', 10_485_760, 1024, 104_857_600); }
  get publicationRequireSellerVerification(): boolean {
    return this.config.get<string>('PUBLICATION_REQUIRE_SELLER_VERIFICATION', 'false') === 'true';
  }
  get publicationAgreementCode(): string { return this.config.get<string>('PUBLICATION_AGREEMENT_CODE', 'seller_agreement'); }
  get publicationAgreementVersion(): number { return this.int('PUBLICATION_AGREEMENT_VERSION', 1, 1, 10_000); }
  get defaultLocale(): string { return this.config.get<string>('DEFAULT_LOCALE', 'en'); }

  /** Raw env access for optional settings (observability, worker wiring). */
  raw(name: string): string | undefined {
    return this.config.get<string>(name);
  }

  private required(name: string, fallback?: string): string {
    const value = this.config.get<string>(name) ?? fallback;
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
