import { OAuthProviderRegistry, type OAuthProvider, type OAuthProviderProfile } from '../src/modules/iam/infrastructure/oauth-providers';
import { IamHardeningService } from '../src/modules/iam/application/iam-hardening.service';
import { AppConfig } from '../src/common/config/app-config';
import type { AccessTokenService } from '../src/common/auth/access-token.service';
import { DomainError } from '@platform/contracts';
import type { AuditRepository, IamHardeningRepository, IamRepository, JobRepository } from '@platform/db';

/**
 * GATE 5 Phase G — OAuth state (CSRF) security tests.
 * Regression coverage for finding G5-F-03: Gate 4 issued a random state but
 * the callback never verified it. State is now HMAC-signed with an expiry and
 * mandatory at the callback.
 */

function makeService(provider: OAuthProvider): { service: IamHardeningService; exchangeCalls: string[] } {
  const exchangeCalls: string[] = [];
  const fakeProvider: OAuthProvider = {
    name: 'google',
    authorizationUrl: (state, redirectUri) => `https://accounts.example.com/auth?state=${state}&redirect=${redirectUri}`,
    exchangeCode: async (code) => {
      exchangeCalls.push(code);
      const profile: OAuthProviderProfile = { providerUserId: 'prov-1', email: 'oauth.user@example.com', displayName: 'OAuth User' };
      return profile;
    },
  };
  const registry = new OAuthProviderRegistry([fakeProvider]);
  const hardeningRepo = {
    findOAuthIdentity: async () => null,
    markPrimaryEmailVerified: async () => undefined,
    linkOAuthIdentity: async () => undefined,
  };
  const iamRepo = {
    findUserByEmail: async () => null,
    createPasswordUser: async () => ({ id: 'user-1', status: 'active' }),
    findUserById: async () => ({ id: 'user-1', status: 'active' }),
    updateLastLogin: async () => undefined,
    createSession: async () => ({ id: 'session-1' }),
  };
  const jobsRepo = { enqueue: async () => 'job-1' };
  const auditRepo = { append: async () => undefined };
  const tokens = { sign: async () => 'access-token' };
  const config = {
    jwtSecret: new TextEncoder().encode('unit-test-secret-material-0123456789abcdef0123456789abcd'),
    refreshTtlSeconds: 3600,
    accessTtlSeconds: 900,
  };
  const service = new IamHardeningService(
    hardeningRepo as unknown as IamHardeningRepository,
    iamRepo as unknown as IamRepository,
    jobsRepo as unknown as JobRepository,
    auditRepo as unknown as AuditRepository,
    tokens as unknown as AccessTokenService,
    registry,
    config as unknown as AppConfig,
  );
  void provider;
  return { service, exchangeCalls };
}

describe('G5-G — OAuth signed state (CSRF protection)', () => {
  it('authorize returns a signed state that is embedded in the authorization URL', async () => {
    const { service } = makeService(undefined as unknown as OAuthProvider);
    const result = await service.oauthAuthorizeUrl('google', 'https://api.example.test/callback');
    expect(result.state.split('.')).toHaveLength(3);
    expect(result.authorizationUrl).toContain(`state=${result.state}`);
  });

  it('rejects the callback when the state is missing, malformed or tampered — provider is never called', async () => {
    const { service, exchangeCalls } = makeService(undefined as unknown as OAuthProvider);
    for (const badState of ['', 'garbage', 'a.b.c.d', 'nonce.99999999999999.forged-mac']) {
      await expect(service.oauthCallback('google', 'auth-code', badState, 'https://api.example.test/callback', {})).rejects.toMatchObject({
        name: 'DomainError',
        code: 'OAUTH_STATE_INVALID',
      });
    }
    await expect(service.oauthCallback('google', 'auth-code', undefined as unknown as string, 'https://api.example.test/callback', {})).rejects.toMatchObject({ code: 'OAUTH_STATE_INVALID' });
    expect(exchangeCalls).toHaveLength(0); // CSRF rejection happens before any provider exchange
  });

  it('rejects an expired state (10-minute TTL)', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick'] });
    try {
      const { service } = makeService(undefined as unknown as OAuthProvider);
      const { state } = await service.oauthAuthorizeUrl('google', 'https://api.example.test/callback');
      jest.setSystemTime(Date.now() + 11 * 60 * 1000);
      await expect(service.oauthCallback('google', 'auth-code', state, 'https://api.example.test/callback', {})).rejects.toMatchObject({
        code: 'OAUTH_STATE_INVALID',
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('a fresh valid state passes verification and proceeds to the provider exchange + linking', async () => {
    const { service, exchangeCalls } = makeService(undefined as unknown as OAuthProvider);
    const { state } = await service.oauthAuthorizeUrl('google', 'https://api.example.test/callback');
    const tokens = await service.oauthCallback('google', 'auth-code-123', state, 'https://api.example.test/callback', { ip: '127.0.0.1', requestId: 'req-1' });
    expect(exchangeCalls).toEqual(['auth-code-123']);
    expect(tokens.tokenType).toBe('Bearer');
    expect(tokens.accessToken).toBe('access-token');
    expect(typeof tokens.refreshToken).toBe('string');
  });

  it('unconfigured providers still yield OAUTH_PROVIDER_NOT_CONFIGURED (503 semantics)', async () => {
    const { service } = makeService(undefined as unknown as OAuthProvider);
    await expect(service.oauthAuthorizeUrl('facebook', 'https://api.example.test/callback')).rejects.toMatchObject({
      code: 'OAUTH_PROVIDER_NOT_CONFIGURED',
    });
    await expect(service.oauthCallback('facebook', 'code', 'x.y.z', 'https://api.example.test/callback', {})).rejects.toBeInstanceOf(DomainError);
  });
});
