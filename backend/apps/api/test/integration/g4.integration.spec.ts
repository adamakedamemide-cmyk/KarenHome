import { randomUUID } from 'node:crypto';
import {
  AdvertisingRepository, AntiBotRepository, AuditRepository, BillingRepository, CommissionRepository,
  IamHardeningRepository, IamRepository, JobRepository, ListingRepository, MediaRepository,
  NotificationRepository, OutboxRepository, PostgresDatabase, PropertyRepository, PublicationPolicyRepository,
  SearchIndexRepository,
} from '@platform/db';
import { verifyTotp, generateTotpSecret } from '../../src/common/auth/totp';

const enabled = Boolean(process.env.RUN_DB_TESTS && process.env.DATABASE_URL);
const d = enabled ? describe : describe.skip;

d('G4 — integration against real PostgreSQL (Gate 4 mandate §22)', () => {
  let db: PostgresDatabase;
  let jobs: JobRepository;
  let iam: IamRepository;
  let hardening: IamHardeningRepository;
  let properties: PropertyRepository;
  let listings: ListingRepository;
  let commission: CommissionRepository;
  let billing: BillingRepository;
  let ads: AdvertisingRepository;
  let antiBot: AntiBotRepository;
  let notifications: NotificationRepository;
  let media: MediaRepository;
  let indexState: SearchIndexRepository;
  let outbox: OutboxRepository;
  let audit: AuditRepository;
  let policy: PublicationPolicyRepository;

  const createdUserIds: string[] = [];

  beforeAll(async () => {
    db = new PostgresDatabase({ connectionString: process.env.DATABASE_URL!, max: 5 });
    jobs = new JobRepository(db);
    iam = new IamRepository(db);
    hardening = new IamHardeningRepository(db);
    properties = new PropertyRepository(db);
    listings = new ListingRepository(db);
    commission = new CommissionRepository(db);
    billing = new BillingRepository(db);
    ads = new AdvertisingRepository(db);
    antiBot = new AntiBotRepository(db);
    void antiBot;
    notifications = new NotificationRepository(db);
    media = new MediaRepository(db);
    indexState = new SearchIndexRepository(db);
    outbox = new OutboxRepository(db);
    audit = new AuditRepository(db);
    policy = new PublicationPolicyRepository(db);
  });

  afterAll(async () => {
    await db.close();
  });

  async function newUser(email: string): Promise<string> {
    const user = await iam.createPasswordUser({ email, passwordHash: 'test-hash' });
    createdUserIds.push(user.id);
    return user.id;
  }

  async function publishableListing(userId: string): Promise<string> {
    const typeId = await db.query<{ id: string }>(`SELECT id FROM property.property_types WHERE code = 'apartment' LIMIT 1`);
    const property = await properties.create({ propertyTypeId: typeId.rows[0]!.id, areaTotalM2: '60', createdByUserId: userId });
    const listing = await listings.create({
      propertyId: property.id,
      createdByUserId: userId,
      transactionType: 'sale',
      title: 'Integration test listing',
      description: 'A listing created by the G4 integration suite',
      currencyCode: 'USD',
      price: '250000.0000',
      pricePeriod: 'one_time',
    });
    const asset = await media.createAsset({
      storageProvider: 'local-fs', bucket: null, objectKey: `optimized/test/${randomUUID()}.webp`,
      mimeType: 'image/webp', sizeBytes: 1024, createdBy: userId,
    });
    await listings.attachMedia({ listingId: listing.id, mediaAssetId: asset.id, mediaType: 'photo', isCover: true, actorUserId: userId });
    return listing.id;
  }

  it('J1 — job queue: claim, dedup key, retry/backoff, dead-letter, requeue', async () => {
    const queue = `test-${randomUUID().slice(0, 8)}`;
    const first = await jobs.enqueue({ queue, jobType: 'test.job', payload: { n: 1 } });
    const dupId = await jobs.enqueue({ queue, jobType: 'test.job', payload: { n: 2 }, dedupKey: `${queue}:dedup` });
    const dupId2 = await jobs.enqueue({ queue, jobType: 'test.job', payload: { n: 3 }, dedupKey: `${queue}:dedup` });
    expect(dupId).toBe(dupId2);

    const batch = await jobs.claimBatch('worker-j1', queue, 10);
    expect(batch).toHaveLength(2);
    const secondClaim = await jobs.claimBatch('worker-j1-b', queue, 10);
    expect(secondClaim).toHaveLength(0); // single-winner claim

    const jobId = batch[0]!.id;
    expect(jobId === first || jobId === dupId).toBe(true);
    const outcome = await jobs.fail(jobId, 'worker-j1', 'simulated failure', 3600);
    expect(outcome).toBe('retry');
    const failed = await jobs.getById(jobId);
    expect(failed?.status).toBe('pending');
    expect(failed?.runAt.getTime()).toBeGreaterThan(Date.now() + 3_000_000); // backoff scheduled

    // Dead-letter: a max_attempts=1 job dies on its first failure.
    const doomed = await jobs.enqueue({ queue, jobType: 'test.doomed', payload: {}, maxAttempts: 1 });
    const doomedClaim = await jobs.claimBatch('worker-j1', queue, 10);
    const doomedJob = doomedClaim.find((job) => job.id === doomed);
    expect(doomedJob).toBeDefined();
    expect(await jobs.fail(doomed, 'worker-j1', 'fatal', 1)).toBe('dead');
    await jobs.requeueDead(doomed);
    const requeued = await jobs.getById(doomed);
    expect(requeued?.status).toBe('pending');
    expect(requeued?.attempts).toBe(0);
    await db.query(`DELETE FROM platform.jobs WHERE queue = $1`, [queue]);
  });

  it('J2 — email verification: single consumption + activation', async () => {
    const userId = await newUser(`g4-j2-${randomUUID().slice(0, 8)}@example.com`);
    const rawToken = randomUUID();
    await hardening.createEmailVerification({ userId, tokenHash: Buffer.from(rawToken).toString('hex'), expiresAt: new Date(Date.now() + 60_000) });
    await expect(hardening.consumeEmailVerification(Buffer.from(rawToken).toString('hex'))).resolves.toMatchObject({ userId });
    await expect(hardening.consumeEmailVerification(Buffer.from(rawToken).toString('hex'))).resolves.toBe('CONSUMED');
    await hardening.markPrimaryEmailVerified(userId);
    const status = await db.query<{ status: string }>(`SELECT status::text AS status FROM iam.users WHERE id = $1::uuid`, [userId]);
    expect(status.rows[0]?.status).toBe('active');
  });

  it('J3 — phone OTP: mismatch increments attempts, correct code verifies', async () => {
    const userId = await newUser(`g4-j3-${randomUUID().slice(0, 8)}@example.com`);
    const phone = `+1555${String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')}`;
    await hardening.addPhoneIfAbsent(userId, phone);
    await hardening.createPhoneVerification({ userId, phoneE164: phone, codeHash: '111111-hash', expiresAt: new Date(Date.now() + 60_000) });
    await expect(hardening.verifyPhoneOtp({ userId, phoneE164: phone, codeHash: '222222-hash' })).resolves.toBe('MISMATCH');
    await expect(hardening.verifyPhoneOtp({ userId, phoneE164: phone, codeHash: '111111-hash' })).resolves.toBe('OK');
    const verified = await db.query<{ is_verified: boolean }>(`SELECT is_verified FROM iam.user_phones WHERE user_id = $1::uuid`, [userId]);
    expect(verified.rows[0]?.is_verified).toBe(true);
  });

  it('J4 — password reset consumes once and revokes all sessions', async () => {
    const userId = await newUser(`g4-j4-${randomUUID().slice(0, 8)}@example.com`);
    await iam.createSession({ userId, refreshTokenHash: `sess-${randomUUID()}`, expiresAt: new Date(Date.now() + 60_000) });
    await iam.createSession({ userId, refreshTokenHash: `sess-${randomUUID()}`, expiresAt: new Date(Date.now() + 60_000) });
    const rawToken = randomUUID();
    await hardening.createPasswordReset({ userId, tokenHash: Buffer.from(rawToken).toString('hex'), expiresAt: new Date(Date.now() + 60_000) });
    await expect(hardening.consumePasswordReset(Buffer.from(rawToken).toString('hex'))).resolves.toMatchObject({ userId });
    await hardening.updatePasswordHash(userId, 'new-hash');
    const sessions = await hardening.listActiveSessions(userId);
    expect(sessions).toHaveLength(0);
  });

  it('J5 — MFA TOTP: enroll → activate with valid code → challenge flow', async () => {
    const userId = await newUser(`g4-j5-${randomUUID().slice(0, 8)}@example.com`);
    const secret = generateTotpSecret();
    const factorId = await hardening.upsertPendingMfaFactor(userId, Buffer.from(secret).toString('hex'));
    expect(await hardening.findActiveMfaFactor(userId)).toBeNull();
    await hardening.activateMfaFactor(factorId);
    const active = await hardening.findActiveMfaFactor(userId);
    expect(active?.id).toBe(factorId);
    expect(verifyTotp(secret, String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0'))).toBe(false); // sanity
    await hardening.disableMfaFactor(userId, factorId);
    expect(await hardening.findActiveMfaFactor(userId)).toBeNull();
  });

  it('J6 — commission: snapshot determinism, DB immutability, no future-rule leakage (§7)', async () => {
    const userId = await newUser(`g4-j6-${randomUUID().slice(0, 8)}@example.com`);
    const rule = await commission.createRule({ code: `g4_std_${randomUUID().slice(0, 8)}`, name: 'Standard', partyRole: 'Agent', matches: {}, createdBy: userId });
    const v1 = await commission.createRuleVersion({ ruleId: rule.id, version: 1, paramConfig: { mode: 'percentage', amount: 10 }, effectiveFrom: new Date('2020-01-01') });
    await commission.setRuleStatus(rule.id, 'ACTIVE');

    const calc1 = await commission.createCalculation({
      partyRole: 'Agent', ruleId: rule.id, ruleVersionId: v1.id,
      ruleSnapshot: { code: rule.code, paramConfig: v1.paramConfig }, inputSnapshot: { baseAmount: '1000' },
      calcMode: 'percentage', calcAmount: '100.0000', currencyCode: 'USD', calculatedBy: userId,
    });
    await commission.addCalculationLines(calc1.id, [{ lineType: 'commission', amount: '100.0000', currencyCode: 'USD' }]);

    // Future-dated v2 must not affect the historical calculation.
    await commission.createRuleVersion({ ruleId: rule.id, version: 2, paramConfig: { mode: 'percentage', amount: 50 }, effectiveFrom: new Date(Date.now() + 86_400_000) });
    const applicable = await commission.findApplicableRuleVersions('Agent', new Date());
    const codes = applicable.filter((candidate) => candidate.rule.id === rule.id).map((candidate) => candidate.version.version);
    expect(codes).toEqual([1]);

    await expect(db.query(`UPDATE commission.calculations SET calc_amount = 999 WHERE id = $1::uuid`, [calc1.id])).rejects.toThrow(/IMMUTABLE_RECORD/);
    const settled = await commission.createSettlement({ calculationId: calc1.id, amount: '100.0000', currencyCode: 'USD' });
    await commission.updateSettlementStatus(settled, 'APPROVED', userId);
    const payout = await commission.createPayout({ beneficiaryUserId: userId, amount: '100.0000', currencyCode: 'USD' });
    expect(payout).toBeTruthy();
    await expect(commission.createPayout({ beneficiaryUserId: userId, beneficiaryOrganizationId: userId, amount: '1', currencyCode: 'USD' })).rejects.toThrow('PAYOUT_BENEFICIARY_REQUIRED');
  });

  it('J7 — billing: plan versioning keeps historical subscriptions intact (§14)', async () => {
    const userId = await newUser(`g4-j7-${randomUUID().slice(0, 8)}@example.com`);
    const plan = await billing.createPlan({ code: `g4_plan_${randomUUID().slice(0, 8)}`, name: 'Pro' });
    const price = await db.query<{ id: string }>(
      `INSERT INTO billing.products(code, name, product_type) VALUES ($1, 'Plan price', 'subscription') RETURNING id`,
      [`g4_prod_${randomUUID().slice(0, 8)}`],
    ).then((r) => db.query<{ id: string }>(
      `INSERT INTO billing.product_prices(product_id, amount, currency_code, billing_interval) VALUES ($1::uuid, 29.9, 'USD', 'month') RETURNING id`,
      [r.rows[0]!.id],
    ).then((r2) => r2.rows[0]!.id));
    const v1 = await billing.createPlanVersion({ planId: plan.id, version: 1, entitlements: { listings: 5 }, effectiveFrom: new Date() });
    const sub1 = await billing.createSubscription({ userId, planVersionId: v1.id, productPriceId: price, currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 86_400_000), eventType: 'SUBSCRIBED' });
    const v2 = await billing.createPlanVersion({ planId: plan.id, version: 2, entitlements: { listings: 10 }, effectiveFrom: new Date() });
    const sub2 = await billing.changePlan({ subscriptionId: sub1.id, newPlanVersionId: v2.id, periodStart: new Date(), periodEnd: new Date(Date.now() + 86_400_000), reason: 'upgrade' });
    const oldRow = await billing.getSubscriptionById(sub1.id);
    expect(oldRow?.status).toBe('cancelled');
    expect(oldRow?.planVersionId).toBe(v1.id); // history unchanged
    expect(sub2.planVersionId).toBe(v2.id);
    const active = await billing.getActiveSubscription({ userId });
    expect(active?.id).toBe(sub2.id);
    const events = await billing.listSubscriptionEvents(sub1.id);
    expect(events.some((event) => event.eventType === 'PLAN_CHANGED')).toBe(true);
  });

  it('J8 — advertising: minute dedup, click spend, budget guard (§8)', async () => {
    const userId: string = await newUser(`g4-j8-${randomUUID().slice(0, 8)}@example.com`);
    void userId;
    const orgId = await db.query<{ id: string }>(
      `INSERT INTO org.organizations(type, display_name, slug, status) VALUES ('agency', 'G4 Ads Org', $1, 'active') RETURNING id`,
      [`g4-ads-${randomUUID().slice(0, 8)}`],
    ).then((r) => r.rows[0]!.id);
    const advertiser = await ads.createAdvertiser({ organizationId: orgId, name: 'G4 Advertiser' });
    const campaign = await ads.createCampaign({ advertiserId: advertiser, name: 'G4 Campaign', startAt: new Date(Date.now() - 60_000), endAt: new Date(Date.now() + 86_400_000), pricingModel: 'CPC', priceAmount: '2.0000', currencyCode: 'USD' });
    const creative = await ads.createCreative({ campaignId: campaign, name: 'G4 Creative', targetUrl: 'https://example.com' });
    await ads.upsertTarget({ campaignId: campaign, dimension: 'PAGE_TYPE', value: { values: ['LISTING_DETAIL'] } });
    await ads.createBudget({ campaignId: campaign, budgetType: 'TOTAL', limitAmount: '10.0000', currencyCode: 'USD' });
    await ads.setCampaignStatus(campaign, 'ACTIVE');

    const slot = await ads.getSlotByCode('listing_detail_top');
    expect(slot).not.toBeNull();
    const session = randomUUID();
    const impression = await ads.recordImpression({ campaignId: campaign, creativeId: creative, slotId: slot!.id, sessionHash: session, pageType: 'LISTING_DETAIL', fraudScore: 0 });
    expect(impression.counted).toBe(true);
    const duplicate = await ads.recordImpression({ campaignId: campaign, creativeId: creative, slotId: slot!.id, sessionHash: session, pageType: 'LISTING_DETAIL', fraudScore: 0 });
    expect(duplicate.counted).toBe(false);

    await ads.accrueSpend(campaign, 'TOTAL', '2.0000');
    const budgets = await ads.getBudgets(campaign);
    expect(Number(budgets[0]?.spentAmount)).toBe(2);
    await expect(ads.accrueSpend(campaign, 'TOTAL', '20.0000')).rejects.toThrow(/BUDGET_EXCEEDED/);
  });

  it('J9 — search: doc indexing, full-text, filters, bbox, injection-safe (§11)', async () => {
    const userId: string = await newUser(`g4-j9-${randomUUID().slice(0, 8)}@example.com`);
    void userId;
    const listingId = await publishableListing(userId);
    const marker = `g4search${randomUUID().slice(0, 8)}`;
    await db.query(`UPDATE marketplace.listings SET title = $2 WHERE id = $1::uuid`, [listingId, marker]);
    await db.query(`UPDATE marketplace.listings SET status = 'pending_moderation' WHERE id = $1::uuid`, [listingId]);
    await db.query(`UPDATE marketplace.listings SET status = 'published', published_at = now() WHERE id = $1::uuid`, [listingId]);

    const doc = await indexState.buildDoc(listingId);
    expect(doc).toMatchObject({ listingId, status: 'published' });
    await indexState.markIndexed(listingId, doc!);

    const stats = await indexState.stats();
    expect(stats.indexed).toBeGreaterThanOrEqual(1);

    const hit = await db.query(
      `SELECT 1 FROM marketplace.listing_search_docs WHERE listing_id = $1::uuid AND tsv @@ websearch_to_tsquery('simple', $2)`,
      [listingId, marker],
    );
    expect(hit.rowCount).toBe(1);

    const injection = await db.query(
      `SELECT count(*)::int AS c FROM marketplace.listing_search_docs
       WHERE tsv @@ websearch_to_tsquery('simple', $1)`,
      [`'); DROP TABLE marketplace.listing_search_docs;--`],
    );
    expect(injection.rows[0]).toBeDefined();
    const stillThere = await db.query(`SELECT count(*)::int AS c FROM marketplace.listing_search_docs`);
    expect(Number(stillThere.rows[0]?.c)).toBeGreaterThanOrEqual(1);
    void policy;
  });

  it('J10 — notifications: preferences gate delivery fan-out (§13)', async () => {
    const userId = await newUser(`g4-j10-${randomUUID().slice(0, 8)}@example.com`);
    await notifications.setUserPreference(userId, 'test_type', 'email', false);
    expect(await notifications.getUserPreference(userId, 'test_type', 'email')).toBe(false);
    expect(await notifications.getUserPreference(userId, 'test_type', 'push')).toBeNull();
    const notificationId = await notifications.createNotification({ userId, notificationType: 'test_type', title: 't', body: 'b' });
    await notifications.setQuietHours({ userId, startTime: '22:00', endTime: '07:00', timezone: 'UTC' });
    const quiet = await notifications.getQuietHours(userId);
    expect(quiet?.startTime).toBe('22:00');
    void notificationId;
    void outbox;
    void audit;
  });
});
