"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthProviderRegistry = exports.FacebookOAuthProvider = exports.GoogleOAuthProvider = void 0;
const contracts_1 = require("@platform/contracts");
class GoogleOAuthProvider {
    clientId;
    clientSecret;
    name = 'google';
    constructor(clientId, clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }
    authorizationUrl(state, redirectUri) {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'openid email profile',
            state,
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }
    async exchangeCode(code, redirectUri) {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ code, client_id: this.clientId, client_secret: this.clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
        });
        if (!tokenResponse.ok)
            throw new contracts_1.DomainError('UNAUTHORIZED', 'oauth.token_exchange_failed', { status: 502 });
        const tokenBody = (await tokenResponse.json());
        if (!tokenBody.access_token)
            throw new contracts_1.DomainError('UNAUTHORIZED', 'oauth.token_missing', { status: 502 });
        const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
            headers: { authorization: `Bearer ${tokenBody.access_token}` },
        });
        if (!profileResponse.ok)
            throw new contracts_1.DomainError('UNAUTHORIZED', 'oauth.profile_failed', { status: 502 });
        const profile = (await profileResponse.json());
        if (!profile.sub)
            throw new contracts_1.DomainError('UNAUTHORIZED', 'oauth.profile_incomplete', { status: 502 });
        return { providerUserId: profile.sub, email: profile.email ?? null, displayName: profile.name ?? null };
    }
}
exports.GoogleOAuthProvider = GoogleOAuthProvider;
class FacebookOAuthProvider {
    clientId;
    clientSecret;
    name = 'facebook';
    constructor(clientId, clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }
    authorizationUrl(state, redirectUri) {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'email,public_profile',
            state,
        });
        return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
    }
    async exchangeCode(code, redirectUri) {
        const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
        tokenUrl.searchParams.set('code', code);
        tokenUrl.searchParams.set('client_id', this.clientId);
        tokenUrl.searchParams.set('client_secret', this.clientSecret);
        tokenUrl.searchParams.set('redirect_uri', redirectUri);
        const tokenResponse = await fetch(tokenUrl);
        if (!tokenResponse.ok)
            throw new contracts_1.DomainError('UNAUTHORIZED', 'oauth.token_exchange_failed', { status: 502 });
        const tokenBody = (await tokenResponse.json());
        if (!tokenBody.access_token)
            throw new contracts_1.DomainError('UNAUTHORIZED', 'oauth.token_missing', { status: 502 });
        const profileUrl = new URL('https://graph.facebook.com/me');
        profileUrl.searchParams.set('fields', 'id,name,email');
        profileUrl.searchParams.set('access_token', tokenBody.access_token);
        const profileResponse = await fetch(profileUrl);
        if (!profileResponse.ok)
            throw new contracts_1.DomainError('UNAUTHORIZED', 'oauth.profile_failed', { status: 502 });
        const profile = (await profileResponse.json());
        if (!profile.id)
            throw new contracts_1.DomainError('UNAUTHORIZED', 'oauth.profile_incomplete', { status: 502 });
        return { providerUserId: profile.id, email: profile.email ?? null, displayName: profile.name ?? null };
    }
}
exports.FacebookOAuthProvider = FacebookOAuthProvider;
class OAuthProviderRegistry {
    providers = new Map();
    constructor(providers) {
        for (const provider of providers) {
            if (provider)
                this.providers.set(provider.name, provider);
        }
    }
    get(name) {
        return this.providers.get(name) ?? null;
    }
    configuredNames() {
        return [...this.providers.keys()];
    }
}
exports.OAuthProviderRegistry = OAuthProviderRegistry;
