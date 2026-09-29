import { DomainError } from '@platform/contracts';

/**
 * Gate 4 §15 — OAuth provider abstraction. Google/Facebook are implemented
 * over the OIDC/OAuth2 endpoints; credentials come from env and are never
 * hard-coded. An unconfigured provider yields a typed 503 — it must never
 * silently fake a login.
 */
export interface OAuthProviderProfile {
  providerUserId: string;
  email: string | null;
  displayName: string | null;
}

export interface OAuthProvider {
  readonly name: 'google' | 'facebook';
  authorizationUrl(state: string, redirectUri: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<OAuthProviderProfile>;
}

export class GoogleOAuthProvider implements OAuthProvider {
  readonly name = 'google' as const;
  constructor(private readonly clientId: string, private readonly clientSecret: string) {}

  authorizationUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthProviderProfile> {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: this.clientId, client_secret: this.clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
      signal: AbortSignal.timeout(10_000), // GATE5-G: bounded provider call
    });
    if (!tokenResponse.ok) throw new DomainError('UNAUTHORIZED', 'oauth.token_exchange_failed', { status: 502 });
    const tokenBody = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenBody.access_token) throw new DomainError('UNAUTHORIZED', 'oauth.token_missing', { status: 502 });
    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { authorization: `Bearer ${tokenBody.access_token}` },
      signal: AbortSignal.timeout(10_000), // GATE5-G: bounded provider call
    });
    if (!profileResponse.ok) throw new DomainError('UNAUTHORIZED', 'oauth.profile_failed', { status: 502 });
    const profile = (await profileResponse.json()) as { sub?: string; email?: string; name?: string };
    if (!profile.sub) throw new DomainError('UNAUTHORIZED', 'oauth.profile_incomplete', { status: 502 });
    return { providerUserId: profile.sub, email: profile.email ?? null, displayName: profile.name ?? null };
  }
}

export class FacebookOAuthProvider implements OAuthProvider {
  readonly name = 'facebook' as const;
  constructor(private readonly clientId: string, private readonly clientSecret: string) {}

  authorizationUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'email,public_profile',
      state,
    });
    return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthProviderProfile> {
    const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
    tokenUrl.searchParams.set('code', code);
    tokenUrl.searchParams.set('client_id', this.clientId);
    tokenUrl.searchParams.set('client_secret', this.clientSecret);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    const tokenResponse = await fetch(tokenUrl, { signal: AbortSignal.timeout(10_000) }); // GATE5-G: bounded provider call
    if (!tokenResponse.ok) throw new DomainError('UNAUTHORIZED', 'oauth.token_exchange_failed', { status: 502 });
    const tokenBody = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenBody.access_token) throw new DomainError('UNAUTHORIZED', 'oauth.token_missing', { status: 502 });
    const profileUrl = new URL('https://graph.facebook.com/me');
    profileUrl.searchParams.set('fields', 'id,name,email');
    profileUrl.searchParams.set('access_token', tokenBody.access_token);
    const profileResponse = await fetch(profileUrl, { signal: AbortSignal.timeout(10_000) }); // GATE5-G: bounded provider call
    if (!profileResponse.ok) throw new DomainError('UNAUTHORIZED', 'oauth.profile_failed', { status: 502 });
    const profile = (await profileResponse.json()) as { id?: string; name?: string; email?: string };
    if (!profile.id) throw new DomainError('UNAUTHORIZED', 'oauth.profile_incomplete', { status: 502 });
    return { providerUserId: profile.id, email: profile.email ?? null, displayName: profile.name ?? null };
  }
}

export class OAuthProviderRegistry {
  private readonly providers = new Map<string, OAuthProvider>();

  constructor(providers: Array<OAuthProvider | null>) {
    for (const provider of providers) {
      if (provider) this.providers.set(provider.name, provider);
    }
  }

  get(name: string): OAuthProvider | null {
    return this.providers.get(name) ?? null;
  }

  configuredNames(): string[] {
    return [...this.providers.keys()];
  }
}
