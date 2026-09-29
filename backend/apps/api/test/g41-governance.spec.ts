import { randomUUID } from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyInstance } from 'fastify';
import { PostgresDatabase } from '@platform/db';
import { CommissionEngineService } from '../src/modules/commission/application/commission-engine.service';
import { AdvertisingService } from '../src/modules/advertising/application/advertising.service';
import { ApiExceptionFilter } from '../src/common/errors/http-exception.filter';

/**
 * GATE 4.1 — Governance regression suite (Phases G/H/L).
 * Boots the real Nest application and drives it through fastify.inject()
 * against the migrated karen database. Gated by RUN_DB_TESTS + DATABASE_URL.
 *
 * Covers:
 *  - Advertising admin authorization (permission gate + organization isolation + platform.admin override)
 *  - Commission retroactive immutability: rule change MUST NOT alter old calculations
 *    (occurred_at-bound version selection + DB immutability triggers)
 *  - Commission reversal endpoint (explicit REVERSAL adjustment, amount derived from the stored calculation)
 *  - Advertising click anti-double-billing (validity-window protection)
 */
const enabled = Boolean(process.env.RUN_DB_TESTS && process.env.DATABASE_URL);
const d = enabled ? describe : describe.skip;

d('G41 — Governance (advertising authz, commission retroactive, reversal, click billing)', () => {
  let app: NestFastifyApplication;
  let http: FastifyInstance;
  let db: PostgresDatabase;
  let engine: CommissionEngineService;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'g41-secret-0123456789abcdef0123456789abcdef0123456789abcdef';
    const [appModule] = await Promise.all([import('../src/app.module')]);
    app = await NestFactory.create<NestFastifyApplication>(appModule.AppModule, new FastifyAdapter({ genReqId: () => randomUUID() }), { logger: ['error', 'warn'] });
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new ApiExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, forbidUnknownValues: true, validationError: { target: false, value: false } }));
    await app.init();
    http = app.getHttpAdapter().getInstance() as FastifyInstance;
    db = app.get(PostgresDatabase);
    engine = app.get(CommissionEngineService);
  }, 120_000);

  afterAll(async () => {
    await app.close();
  });

  async function activeTokens(email: string): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
    const register = await http.inject({ method: 'POST', url: '/api/v1/auth/register', payload: { email, password: 'StrongPassword!123', firstName: 'G41' } });
    expect(register.statusCode).toBe(201);
    const jobRow = await db.query<{ payload: { userId: string; rawToken: string } }>(
      `SELECT j.payload FROM platform.jobs j
       WHERE j.job_type = 'email.verification'
         AND j.payload->>'userId' = (SELECT ue.user_id::text FROM iam.user_emails ue WHERE ue.email = $1::citext LIMIT 1)
       ORDER BY j.created_at DESC LIMIT 1`,
      [email],
    );
    const rawToken = jobRow.rows[0]?.payload.rawToken ?? '';
    expect(rawToken).not.toBe('');
    const verify = await http.inject({ method: 'POST', url: '/api/v1/auth/email/verify', payload: { token: rawToken } });
    expect(verify.statusCode).toBe(200);
    const login = await http.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password: 'StrongPassword!123' } });
    expect(login.statusCode).toBe(200);
    const body = JSON.parse(login.body) as { data: { user: { id: string }; tokens: { accessToken: string; refreshToken: string } } };
    return { accessToken: body.data.tokens.accessToken, refreshToken: body.data.tokens.refreshToken, userId: body.data.user.id };
  }

  async function grant(userId: string, permission: string): Promise<void> {
    await db.query(
      `INSERT INTO iam.user_permission_grants(user_id, permission_id, source)
       SELECT $1::uuid, p.id, 'DIRECT' FROM iam.permissions p WHERE p.code = $2`,
      [userId, permission],
    );
  }

  async function createOrg(slugPrefix: string): Promise<string> {
    return db.query<{ id: string }>(
      `INSERT INTO org.organizations(type, display_name, slug, status) VALUES ('agency', 'G41 Org', $1, 'active') RETURNING id`,
      [`${slugPrefix}-${randomUUID().slice(0, 8)}`],
    ).then((r) => r.rows[0]!.id);
  }

  it('T1 — advertising admin requires advertising.manage (401 / ORG_SCOPE_REQUIRED / FORBIDDEN / grant-positive)', async () => {
    const noAuth = await http.inject({ method: 'POST', url: '/api/v1/admin/ads/advertisers', payload: { organizationId: randomUUID(), name: 'X' } });
    expect(noAuth.statusCode).toBe(401);

    const user = await activeTokens(`g41-ads1-${randomUUID().slice(0, 8)}@example.com`);
    const orgId = await createOrg('g41-ads-org');
    await db.query(`INSERT INTO org.organization_members(organization_id, user_id, status) VALUES ($1::uuid, $2::uuid, 'active')`, [orgId, user.userId]);

    // No x-organization-id header → scope required
    const noScope = await http.inject({ method: 'POST', url: '/api/v1/admin/ads/advertisers', headers: { authorization: `Bearer ${user.accessToken}` }, payload: { organizationId: orgId, name: 'G41 Adv' } });
    expect(noScope.statusCode).toBe(403);
    expect((JSON.parse(noScope.body) as { error: { code: string } }).error.code).toBe('ORG_SCOPE_REQUIRED');

    // Scope present but permission missing → FORBIDDEN
    const noPerm = await http.inject({ method: 'POST', url: '/api/v1/admin/ads/advertisers', headers: { authorization: `Bearer ${user.accessToken}`, 'x-organization-id': orgId }, payload: { organizationId: orgId, name: 'G41 Adv' } });
    expect(noPerm.statusCode).toBe(403);
    expect((JSON.parse(noPerm.body) as { error: { code: string } }).error.code).toBe('FORBIDDEN');

    // DIRECT grant → positive control (0030 personal-scope mechanism)
    await grant(user.userId, 'advertising.manage');
    const ok = await http.inject({ method: 'POST', url: '/api/v1/admin/ads/advertisers', headers: { authorization: `Bearer ${user.accessToken}`, 'x-organization-id': orgId }, payload: { organizationId: orgId, name: 'G41 Adv' } });
    expect(ok.statusCode).toBe(201);
    const advId = (JSON.parse(ok.body) as { data: { id: string } }).data.id;

    // Campaign for the caller's own organization works
    const camp = await http.inject({ method: 'POST', url: '/api/v1/admin/ads/campaigns', headers: { authorization: `Bearer ${user.accessToken}`, 'x-organization-id': orgId }, payload: { advertiserId: advId, name: 'G41 Campaign', startAt: new Date(Date.now() - 60_000).toISOString(), endAt: new Date(Date.now() + 3_600_000).toISOString() } });
    expect(camp.statusCode).toBe(201);
    const campaignId = (JSON.parse(camp.body) as { data: { id: string } }).data.id;

    // Report path is protected as well
    const date = new Date().toISOString().slice(0, 10);
    const rep = await http.inject({ method: 'GET', url: `/api/v1/admin/ads/campaigns/${campaignId}/report/${date}`, headers: { authorization: `Bearer ${user.accessToken}`, 'x-organization-id': orgId } });
    expect(rep.statusCode).toBe(200);
  });

  it('T2 — advertising organization isolation: foreign org rejected, platform.admin override allowed', async () => {
    const orgA = await createOrg('g41-iso-a');
    const owner = await activeTokens(`g41-iso-own-${randomUUID().slice(0, 8)}@example.com`);
    await db.query(`INSERT INTO org.organization_members(organization_id, user_id, status) VALUES ($1::uuid, $2::uuid, 'active')`, [orgA, owner.userId]);
    await grant(owner.userId, 'advertising.manage');
    const adv = await http.inject({ method: 'POST', url: '/api/v1/admin/ads/advertisers', headers: { authorization: `Bearer ${owner.accessToken}`, 'x-organization-id': orgA }, payload: { organizationId: orgA, name: 'OrgA Adv' } });
    expect(adv.statusCode).toBe(201);
    const advId = (JSON.parse(adv.body) as { data: { id: string } }).data.id;

    // User B: member of org B with advertising.manage in B, but targets org A's advertiser
    const orgB = await createOrg('g41-iso-b');
    const stranger = await activeTokens(`g41-iso-str-${randomUUID().slice(0, 8)}@example.com`);
    await db.query(`INSERT INTO org.organization_members(organization_id, user_id, status) VALUES ($1::uuid, $2::uuid, 'active')`, [orgB, stranger.userId]);
    await grant(stranger.userId, 'advertising.manage');
    const foreign = await http.inject({ method: 'POST', url: '/api/v1/admin/ads/campaigns', headers: { authorization: `Bearer ${stranger.accessToken}`, 'x-organization-id': orgB }, payload: { advertiserId: advId, name: 'Evil', startAt: new Date(Date.now() - 60_000).toISOString(), endAt: new Date(Date.now() + 3_600_000).toISOString() } });
    expect(foreign.statusCode).toBe(403);
    expect((JSON.parse(foreign.body) as { error: { code: string } }).error.code).toBe('RESOURCE_NOT_OWNED');

    // platform.admin override (positive control) — mirrors the seeded platform_admin
    // role which carries ALL permissions (incl. advertising.manage) via CROSS JOIN.
    const padmin = await activeTokens(`g41-iso-pa-${randomUUID().slice(0, 8)}@example.com`);
    await grant(padmin.userId, 'platform.admin');
    await grant(padmin.userId, 'advertising.manage');
    const override = await http.inject({ method: 'POST', url: '/api/v1/admin/ads/campaigns', headers: { authorization: `Bearer ${padmin.accessToken}`, 'x-organization-id': orgA }, payload: { advertiserId: advId, name: 'PA Campaign', startAt: new Date(Date.now() - 60_000).toISOString(), endAt: new Date(Date.now() + 3_600_000).toISOString() } });
    expect(override.statusCode).toBe(201);
  });

  it('T3 — commission retroactive immutability + explicit reversal endpoint (Phase G mandate)', async () => {
    const user = await activeTokens(`g41-com-${randomUUID().slice(0, 8)}@example.com`);
    await grant(user.userId, 'commission.manage');

    // Test hygiene (mirrors E5): retire leftover ACTIVE Agent rules from earlier
    // suites on this throwaway DB so specificity selection starts from zero.
    await db.query(`UPDATE commission.rules SET status = 'RETIRED' WHERE status = 'ACTIVE' AND party_role = 'Agent'`);

    // v1: 5% percentage rule, ACTIVE, effective now
    const ruleCode = `g41_${randomUUID().slice(0, 8)}`;
    const rule = await http.inject({ method: 'POST', url: '/api/v1/commission/rules', headers: { authorization: `Bearer ${user.accessToken}` }, payload: { code: ruleCode, name: 'G41 rule', partyRole: 'Agent', matches: {}, version: '1', paramConfig: { mode: 'percentage', amount: 5 } } });
    expect(rule.statusCode).toBe(201);
    const ruleId = (JSON.parse(rule.body) as { data: { ruleId: string } }).data.ruleId;
    const activate = await http.inject({ method: 'POST', url: `/api/v1/commission/rules/${ruleId}/status`, headers: { authorization: `Bearer ${user.accessToken}` }, payload: { status: 'ACTIVE' } });
    expect(activate.statusCode).toBe(201);

    // Historical calculation: engine binds occurred_at (stored in inputSnapshot) to the rule version
    const calc1 = await engine.calculate({ partyRole: 'Agent', baseAmount: '1000.0000', currencyCode: 'USD' }, { id: user.userId } as never);
    expect(calc1.calcAmount).toBe('50.0000');
    const occurredAt = new Date((calc1.inputSnapshot as { occurredAt: string }).occurredAt);

    // Rule CHANGE: create + activate v2 with a different rate (effective now — does not reach into the past)
    const v2 = await http.inject({ method: 'POST', url: '/api/v1/commission/rules', headers: { authorization: `Bearer ${user.accessToken}` }, payload: { code: ruleCode, name: 'G41 rule', partyRole: 'Agent', matches: {}, version: '2', paramConfig: { mode: 'percentage', amount: 9 } } });
    expect(v2.statusCode).toBe(201);
    await http.inject({ method: 'POST', url: `/api/v1/commission/rules/${ruleId}/status`, headers: { authorization: `Bearer ${user.accessToken}` }, payload: { status: 'ACTIVE' } });

    // Recompute the SAME historical occurred_at — MUST still use v1 → identical result (no retroactive drift)
    const calc2 = await engine.calculate({ partyRole: 'Agent', baseAmount: '1000.0000', currencyCode: 'USD', occurredAt }, { id: user.userId } as never);
    expect(calc2.calcAmount).toBe('50.0000');
    expect(calc2.ruleVersion).toBe(calc1.ruleVersion);
    expect(calc2.ruleSnapshot).toEqual(calc1.ruleSnapshot);

    // Stored calculation rows are physically immutable (DB triggers)
    await expect(db.query(`UPDATE commission.calculations SET calc_amount = '999' WHERE id = $1::uuid`, [calc1.calculationId])).rejects.toThrow(/IMMUTABLE_RECORD/);

    // Reversal endpoint: permission enforced
    const noGrant = await activeTokens(`g41-com-ng-${randomUUID().slice(0, 8)}@example.com`);
    const denied = await http.inject({ method: 'POST', url: `/api/v1/commission/calculations/${calc1.calculationId}/reversals`, headers: { authorization: `Bearer ${noGrant.accessToken}` }, payload: { reason: 'should be denied' } });
    expect(denied.statusCode).toBe(403);

    // Reversal derives its amount from the stored calculation (cannot over-reverse)
    const reversal = await http.inject({ method: 'POST', url: `/api/v1/commission/calculations/${calc1.calculationId}/reversals`, headers: { authorization: `Bearer ${user.accessToken}` }, payload: { reason: 'G41 mandated reversal path' } });
    expect(reversal.statusCode).toBe(201);
    const revBody = JSON.parse(reversal.body) as { data: { amount: string; adjustmentType: string; calculationId: string } };
    expect(revBody.data.adjustmentType).toBe('REVERSAL');
    expect(revBody.data.amount).toBe('-50.0000');
    expect(revBody.data.calculationId).toBe(calc1.calculationId);

    // Original calculation row unchanged after reversal
    const row = await db.query<{ calc_amount: string }>(`SELECT calc_amount::text FROM commission.calculations WHERE id = $1::uuid`, [calc1.calculationId]);
    expect(row.rows[0]?.calc_amount).toBe('50.0000');
  });

  it('T4 — advertising click anti-double-billing: repeat click within validity window does not double-charge', async () => {
    const ads = await import('@platform/db').then((m) => new m.AdvertisingRepository(db));
    const orgId = await createOrg('g41-click');
    const advertiserId = await ads.createAdvertiser({ organizationId: orgId, name: 'G41 Click Adv' });
    const campaignId = await ads.createCampaign({ advertiserId, name: 'G41 Click Camp', startAt: new Date(Date.now() - 60_000), endAt: new Date(Date.now() + 3_600_000), pricingModel: 'CPC', priceAmount: '2.0000', currencyCode: 'USD' });
    const creativeId = await ads.createCreative({ campaignId, name: 'G41 Click Creative', targetUrl: 'https://example.com/click' });
    await ads.createBudget({ campaignId, budgetType: 'TOTAL', limitAmount: '10.0000', currencyCode: 'USD' });
    const slot = await ads.getSlotByCode('listing_detail_top');
    expect(slot).not.toBeNull();
    const impression = await ads.recordImpression({ campaignId, creativeId, slotId: slot!.id, sessionHash: randomUUID(), pageType: 'LISTING_DETAIL', fraudScore: 0 });
    expect(impression.counted).toBe(true);

    const first = await ads.recordClick({ impressionId: impression.id, fraudScore: 0, isValid: true });
    expect(first.counted).toBe(true);
    await ads.accrueSpend(campaignId, 'TOTAL', '2.0000');
    const budgets1 = await ads.getBudgets(campaignId);
    expect(Number(budgets1[0]?.spentAmount)).toBe(2);

    // Repeat click on the SAME impression inside the validity window:
    // stored auditable as is_valid=false / duplicate_click, billing unchanged (migration 0036).
    const service = app.get(AdvertisingService);
    const second = await service.click(impression.id, { ip: '127.0.0.1' });
    expect(second.accepted).toBe(false);
    expect(second.reason).toBe('duplicate_click');
    const budgets2 = await ads.getBudgets(campaignId);
    expect(Number(budgets2[0]?.spentAmount)).toBe(2);
  });
});
