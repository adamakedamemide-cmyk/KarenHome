import { randomBytes, randomUUID } from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyInstance } from 'fastify';
import { PostgresDatabase } from '@platform/db';
import type { MediaService as MediaServiceType } from '../src/modules/media/application/media.service';
import { ApiExceptionFilter } from '../src/common/errors/http-exception.filter';
import { RateLimitService } from '../src/common/http/rate-limit.service';

/**
 * Gate 4 §22/§23 — E2E + Red-Team regression suite.
 * Boots the real Nest application (no network listener) and drives it
 * through fastify.inject() against the migrated karen database.
 * Gated by RUN_DB_TESTS + DATABASE_URL like the integration suite.
 * Every red-team bypass that ever gets fixed must land here as a case.
 */
const enabled = Boolean(process.env.RUN_DB_TESTS && process.env.DATABASE_URL);
const d = enabled ? describe : describe.skip;

d('G4 — E2E + Red-Team (§22/§23)', () => {
  let app: NestFastifyApplication;
  let http: FastifyInstance;
  let db: PostgresDatabase;
  let MediaService: { new (...args: never[]): MediaServiceType };

  beforeAll(async () => {
    // Set env BEFORE importing AppModule — ConfigModule.forRoot validates eagerly.
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'g4-e2e-secret-0123456789abcdef0123456789abcdef0123456789abcdef';
    const [appModule, mediaModule] = await Promise.all([
      import('../src/app.module'),
      import('../src/modules/media/application/media.service'),
    ]);
    MediaService = mediaModule.MediaService as unknown as { new (...args: never[]): MediaServiceType };
    app = await NestFactory.create<NestFastifyApplication>(appModule.AppModule, new FastifyAdapter({ genReqId: () => randomUUID() }), { logger: ['error', 'warn'] });
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new ApiExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, forbidUnknownValues: true, validationError: { target: false, value: false } }));
    await app.init();
    http = app.getHttpAdapter().getInstance() as FastifyInstance;
    db = app.get(PostgresDatabase);
  }, 120_000);

  afterAll(async () => {
    await app.close();
  });

  async function registerUser(email: string): Promise<{ userId: string; rawToken: string }> {
    const register = await http.inject({ method: 'POST', url: '/api/v1/auth/register', payload: { email, password: 'StrongPassword!123', firstName: 'G4' } });
    expect(register.statusCode).toBe(201);
    const jobRow = await db.query<{ payload: { userId: string; rawToken: string } }>(
      `SELECT j.payload FROM platform.jobs j
       WHERE j.job_type = 'email.verification'
         AND j.payload->>'userId' = (SELECT ue.user_id::text FROM iam.user_emails ue WHERE ue.email = $1::citext LIMIT 1)
       ORDER BY j.created_at DESC LIMIT 1`,
      [email],
    );
    const payload = jobRow.rows[0]?.payload;
    if (!payload) return { userId: '', rawToken: '' };
    return { userId: payload.userId, rawToken: payload.rawToken };
  }

  async function activeTokens(email: string): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
    const { userId: _userId, rawToken } = await registerUser(email);
    const verify = await http.inject({ method: 'POST', url: '/api/v1/auth/email/verify', payload: { token: rawToken } });
    expect(verify.statusCode).toBe(200);
    const login = await http.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password: 'StrongPassword!123' } });
    expect(login.statusCode).toBe(200);
    const body = JSON.parse(login.body) as { data: { user: { id: string }; tokens: { accessToken: string; refreshToken: string } } };
    return { accessToken: body.data.tokens.accessToken, refreshToken: body.data.tokens.refreshToken, userId: body.data.user.id };
  }

  it('E0 — rate limit policy: auth bucket opens after 10 hits (§17)', async () => {
    const limiter = new RateLimitService();
    for (let i = 0; i < 10; i += 1) {
      const decision = await limiter.enforce('auth', 'e2e-ip-1');
      expect(decision.allowed).toBe(true);
    }
    const blocked = await limiter.enforce('auth', 'e2e-ip-1');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('E1 — health endpoints respond', async () => {
    const live = await http.inject({ method: 'GET', url: '/api/v1/health/live' });
    expect(live.statusCode).toBe(200);
    const ready = await http.inject({ method: 'GET', url: '/api/v1/health/ready' });
    expect(ready.statusCode).toBe(200);
  });

  it('E2 — full auth flow: register → verify → login → refresh rotation → replay detection (§15/§23)', async () => {
    const email = `g4e2-${randomUUID().slice(0, 8)}@example.com`;
    const { userId, rawToken } = await registerUser(email);
    void userId;

    // Pending users cannot log in.
    const early = await http.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password: 'StrongPassword!123' } });
    expect(early.statusCode).toBe(401);

    const verify = await http.inject({ method: 'POST', url: '/api/v1/auth/email/verify', payload: { token: rawToken } });
    expect(verify.statusCode).toBe(200);

    const login = await http.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password: 'StrongPassword!123' } });
    expect(login.statusCode).toBe(200);
    const tokens = (JSON.parse(login.body) as { data: { tokens: { accessToken: string; refreshToken: string } } }).data.tokens;

    // Refresh rotation issues a new token.
    const refresh = await http.inject({ method: 'POST', url: '/api/v1/auth/refresh', payload: { refreshToken: tokens.refreshToken } });
    expect(refresh.statusCode).toBe(200);
    const rotated = (JSON.parse(refresh.body) as { data: { refreshToken: string } }).data.refreshToken;
    expect(rotated).not.toBe(tokens.refreshToken);

    // Replay of the old refresh token → 401 and ALL sessions revoked (§23 Token replay).
    const replay = await http.inject({ method: 'POST', url: '/api/v1/auth/refresh', payload: { refreshToken: tokens.refreshToken } });
    expect(replay.statusCode).toBe(401);
    const sessions = await db.query(`SELECT 1 FROM iam.user_sessions WHERE user_id = $1::uuid AND revoked_at IS NULL`, [userId]);
    expect(sessions.rowCount).toBe(0);
  });

  it('E3 — owner listing lifecycle with publication policy gate (§4/§5/§6)', async () => {
    const email = `g4e3-${randomUUID().slice(0, 8)}@example.com`;
    const { accessToken, userId } = await activeTokens(email);
    const auth = { authorization: `Bearer ${accessToken}` };

    const typeId = (await db.query<{ id: string }>(`SELECT id FROM property.property_types WHERE code = 'apartment' LIMIT 1`)).rows[0]!.id;
    const property = await http.inject({ method: 'POST', url: '/api/v1/properties', headers: auth, payload: { propertyTypeId: typeId, areaTotalM2: '88.50' } });
    expect(property.statusCode).toBe(201);
    const propertyId = (JSON.parse(property.body) as { data: { id: string } }).data.id;

    const listing = await http.inject({
      method: 'POST', url: '/api/v1/listings', headers: auth,
      payload: { propertyId, transactionType: 'sale', title: 'E2E sunny apartment', currencyCode: 'USD', price: '150000.0000', pricePeriod: 'one_time' },
    });
    expect(listing.statusCode).toBe(201);
    const listingId = (JSON.parse(listing.body) as { data: { id: string; version: number } }).data.id;
    void userId;

    // Publication readiness must fail WITHOUT cover media (policy §6).
    const readiness = await http.inject({ method: 'GET', url: `/api/v1/listings/${listingId}/publication-readiness`, headers: auth });
    const readinessBody = JSON.parse(readiness.body) as { data: { canPublish: boolean; unmetChecks: Array<{ check: string }> } };
    expect(readinessBody.data.canPublish).toBe(false);
    expect(readinessBody.data.unmetChecks.map((unmet) => unmet.check)).toContain('cover_media');

    // §4 — property location via the real endpoint.
    const geo = await db.query<{ id: string }>(
      `INSERT INTO geo.nodes(node_type, name, slug, level, is_active) VALUES ('city', 'G4 City', $1, 2, true) RETURNING id`,
      [`g4-city-${randomUUID().slice(0, 8)}`],
    );
    const location = await http.inject({
      method: 'POST', url: `/api/v1/properties/${propertyId}/location`, headers: auth,
      payload: { geoNodeId: geo.rows[0]!.id, addressLine1: '12 E2E Street', lon: 44.5, lat: 40.2 },
    });
    expect(location.statusCode).toBe(201);

    // §6 — seller agreement acceptance via the real endpoint.
    const agreement = await http.inject({
      method: 'POST', url: '/api/v1/legal/agreements/seller_agreement/accept', headers: auth, payload: { version: 1 },
    });
    expect(agreement.statusCode).toBe(201);

    // Attach cover media (pre-created asset) and publish through moderation.
    const asset = await db.query<{ id: string }>(
      `INSERT INTO marketplace.media_assets(storage_provider, bucket, object_key, mime_type, size_bytes, sha256_hex, status, created_by)
       VALUES ('local-fs', 'karen-local', $1, 'image/webp', 2048, $2, 'ready', $3::uuid) RETURNING id`,
      [`optimized/e2e/${randomUUID()}.webp`, randomBytes(32).toString('hex'), userId],
    );
    await http.inject({ method: 'POST', url: `/api/v1/listings/${listingId}/media`, headers: auth, payload: { mediaAssetId: asset.rows[0]!.id, mediaType: 'photo', isCover: true } });

    // Optimistic concurrency: media attach bumped the version (0024 trigger).
    const submit = await http.inject({ method: 'POST', url: `/api/v1/listings/${listingId}/submit`, headers: auth, payload: { expectedVersion: 2 } });
    expect(submit.statusCode).toBe(200);

    const publish = await http.inject({ method: 'POST', url: `/api/v1/listings/${listingId}/publish`, headers: auth, payload: { expectedVersion: 3 } });
    expect(publish.statusCode).toBe(200);
    expect((JSON.parse(publish.body) as { data: { status: string; version: number } }).data.status).toBe('published');
    expect((JSON.parse(publish.body) as { data: { version: number } }).data.version).toBe(4);
  });

  it('E4 — IDOR: a stranger cannot publish someone else’s listing (§23)', async () => {
    const ownerTokens = await activeTokens(`g4e4a-${randomUUID().slice(0, 8)}@example.com`);
    const attacker = await activeTokens(`g4e4b-${randomUUID().slice(0, 8)}@example.com`);
    const typeId = (await db.query<{ id: string }>(`SELECT id FROM property.property_types WHERE code = 'apartment' LIMIT 1`)).rows[0]!.id;
    const property = await http.inject({ method: 'POST', url: '/api/v1/properties', headers: { authorization: `Bearer ${ownerTokens.accessToken}` }, payload: { propertyTypeId: typeId, areaTotalM2: '50' } });
    const propertyId = (JSON.parse(property.body) as { data: { id: string } }).data.id;
    const listing = await http.inject({ method: 'POST', url: '/api/v1/listings', headers: { authorization: `Bearer ${ownerTokens.accessToken}` }, payload: { propertyId, transactionType: 'rent', title: 'IDOR target home', currencyCode: 'USD', price: '900.0000', pricePeriod: 'monthly' } });
    const listingId = (JSON.parse(listing.body) as { data: { id: string } }).data.id;

    const attempt = await http.inject({ method: 'POST', url: `/api/v1/listings/${listingId}/submit`, headers: { authorization: `Bearer ${attacker.accessToken}` }, payload: { expectedVersion: 1 } });
    expect(attempt.statusCode).toBe(403);
    expect((JSON.parse(attempt.body) as { error: { code: string } }).error.code).toBe('RESOURCE_NOT_OWNED');
  });

  it('E5 — commission permission enforcement + direct grant path (§7/§23)', async () => {
    const user = await activeTokens(`g4e5-${randomUUID().slice(0, 8)}@example.com`);
    const payload = { partyRole: 'Agent', baseAmount: '1000.0000', currencyCode: 'USD' };
    const denied = await http.inject({ method: 'POST', url: '/api/v1/commission/calculations', headers: { authorization: `Bearer ${user.accessToken}` }, payload });
    expect(denied.statusCode).toBe(403);

    // Grant commission.manage directly (0030 personal-scope mechanism).
    await db.query(
      `INSERT INTO iam.user_permission_grants(user_id, permission_id, source)
       SELECT $1::uuid, p.id, 'DIRECT' FROM iam.permissions p WHERE p.code = 'commission.manage'`,
      [user.userId],
    );
    // Test hygiene: retire leftover integration rules so the DB starts with
    // zero ACTIVE commission rules for Agent (OD-03: production seeds none).
    await db.query(`UPDATE commission.rules SET status = 'RETIRED' WHERE code LIKE 'g4_%'`);
    // No ACTIVE rule matches this geo dimension (OD-03: zero invented values).
    const geoDim = randomUUID();
    const noRule = await http.inject({ method: 'POST', url: '/api/v1/commission/calculations', headers: { authorization: `Bearer ${user.accessToken}` }, payload: { ...payload, geoNodeId: geoDim } });
    expect(noRule.statusCode).toBe(404);
    expect((JSON.parse(noRule.body) as { error: { code: string } }).error.code).toBe('COMMISSION_RULE_NOT_FOUND');

    // Configure a real rule version — commercial parameters come from the
    // caller, never invented by the platform (OD-03/OD-04).
    const ruleCode = `g4e5_${randomUUID().slice(0, 8)}`;
    const rule = await http.inject({
      method: 'POST', url: '/api/v1/commission/rules', headers: { authorization: `Bearer ${user.accessToken}` },
      payload: { code: ruleCode, name: 'E5 rule', partyRole: 'Agent', matches: { geo_node_id: geoDim }, version: '1', paramConfig: { mode: 'percentage', amount: 7.5 } },
    });
    expect(rule.statusCode).toBe(201);
    const ruleId = (JSON.parse(rule.body) as { data: { ruleId: string } }).data.ruleId;
    await http.inject({ method: 'POST', url: `/api/v1/commission/rules/${ruleId}/status`, headers: { authorization: `Bearer ${user.accessToken}` }, payload: { status: 'ACTIVE' } });

    const calc = await http.inject({
      method: 'POST', url: '/api/v1/commission/calculations', headers: { authorization: `Bearer ${user.accessToken}` },
      payload: { ...payload, geoNodeId: geoDim },
    });
    expect(calc.statusCode).toBe(201);
    const calcBody = JSON.parse(calc.body) as { data: { calcAmount: string; ruleSnapshot: { ruleCode: string; paramConfig: { amount: number } } } };
    expect(calcBody.data.calcAmount).toBe('75.0000');
    expect(calcBody.data.ruleSnapshot.ruleCode).toBe(ruleCode);
    expect(calcBody.data.ruleSnapshot.paramConfig.amount).toBe(7.5);
  });

  it('E6 — search injection is neutralized by parameterization (§23)', async () => {
    const response = await http.inject({ method: 'GET', url: `/api/v1/search/listings?q=${encodeURIComponent("'); DROP TABLE marketplace.listing_search_docs;--")}` });
    expect(response.statusCode).toBe(200);
    const intact = await db.query(`SELECT count(*)::int AS c FROM marketplace.listing_search_docs`);
    expect(Number(intact.rows[0]?.c)).toBeGreaterThanOrEqual(0);
  });

  it('E7 — oversized and unsupported uploads are rejected at intake (§10/§23)', async () => {
    const user = await activeTokens(`g4e7-${randomUUID().slice(0, 8)}@example.com`);
    const mediaService = app.get<MediaServiceType>(MediaService);
    const bigBuffer = Buffer.alloc(11 * 1024 * 1024, 1); // > 10 MiB default cap
    await expect(mediaService.intake({ buffer: bigBuffer, declaredMime: 'image/png', createdBy: user.userId })).rejects.toMatchObject({ code: 'MEDIA_TOO_LARGE' });
    await expect(mediaService.intake({ buffer: Buffer.from('<script>alert(1)</script>'), declaredMime: 'image/svg+xml', createdBy: user.userId })).rejects.toMatchObject({ code: 'MEDIA_UNSUPPORTED_TYPE' });
  });

  it('E8 — subscription gate: no subscription → no entitlements (§14/§23)', async () => {
    const user = await activeTokens(`g4e8-${randomUUID().slice(0, 8)}@example.com`);
    const response = await http.inject({ method: 'GET', url: '/api/v1/billing/entitlements', headers: { authorization: `Bearer ${user.accessToken}` } });
    expect(response.statusCode).toBe(200);
    expect((JSON.parse(response.body) as { data: { active: boolean } }).data.active).toBe(false);
  });

  it('E9 — OpenAPI contract covers the Gate 4 surface (§17)', async () => {
    const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');
    const cfg = new DocumentBuilder().setTitle('Karen Home API').setVersion('1.1.0').addBearerAuth().build();
    const document = SwaggerModule.createDocument(app, cfg);
    const paths = Object.keys(document.paths ?? {});
    expect(paths.some((path) => path.startsWith('/api/v1/listings'))).toBe(true);
    expect(paths.some((path) => path.startsWith('/api/v1/commission'))).toBe(true);
    expect(paths.some((path) => path.startsWith('/api/v1/billing'))).toBe(true);
    expect(paths.some((path) => path.startsWith('/api/v1/ads'))).toBe(true);
    expect(paths.some((path) => path.startsWith('/api/v1/search'))).toBe(true);
    expect(paths.some((path) => path.startsWith('/api/v1/media'))).toBe(true);
    expect(paths.some((path) => path.startsWith('/api/v1/auth/mfa'))).toBe(true);
  });
});
