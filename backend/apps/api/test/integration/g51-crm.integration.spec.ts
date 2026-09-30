import { randomUUID } from 'node:crypto';
import {
  CrmRepository, IamRepository, ListingRepository, MediaRepository,
  OutboxRepository, PostgresDatabase, PropertyRepository,
} from '@platform/db';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CrmService } from '../../src/modules/crm/application/crm.service';
import type { AuthenticatedUser } from '@platform/contracts';

const enabled = Boolean(process.env.RUN_DB_TESTS && process.env.DATABASE_URL);
const d = enabled ? describe : describe.skip;

d('G5.1 CRM — integration against real PostgreSQL (Gate 5.1 Phase C)', () => {
  let db: PostgresDatabase;
  let iam: IamRepository;
  let properties: PropertyRepository;
  let listings: ListingRepository;
  let media: MediaRepository;
  let crmRepo: CrmRepository;
  let outbox: OutboxRepository;
  let service: CrmService;

  const createdUserIds: string[] = [];

  beforeAll(async () => {
    db = new PostgresDatabase({ connectionString: process.env.DATABASE_URL!, max: 5 });
    iam = new IamRepository(db);
    properties = new PropertyRepository(db);
    listings = new ListingRepository(db);
    media = new MediaRepository(db);
    crmRepo = new CrmRepository(db);
    outbox = new OutboxRepository(db);
    service = new CrmService(crmRepo, outbox, iam);
  });

  afterAll(async () => {
    await db.close();
  });

  async function grant(userId: string, codes: string[]): Promise<void> {
    await db.query(
      `INSERT INTO iam.user_permission_grants (user_id, permission_id, source)
       SELECT $1::uuid, p.id, 'DIRECT' FROM iam.permissions p WHERE p.code = ANY($2::text[])
       ON CONFLICT DO NOTHING`,
      [userId, codes],
    );
  }

  async function crmUser(permissions: string[] = ['crm.view', 'crm.manage', 'lead.read', 'lead.update']): Promise<AuthenticatedUser> {
    const user = await iam.createPasswordUser({ email: `g51crm-${randomUUID()}@t.local`, passwordHash: 'test-hash' });
    createdUserIds.push(user.id);
    await grant(user.id, permissions);
    return { id: user.id, status: 'active' } as AuthenticatedUser;
  }

  async function publishableListing(userId: string): Promise<string> {
    const typeId = await db.query<{ id: string }>(`SELECT id FROM property.property_types WHERE code = 'apartment' LIMIT 1`);
    const property = await properties.create({ propertyTypeId: typeId.rows[0]!.id, areaTotalM2: '60', createdByUserId: userId });
    const listing = await listings.create({
      propertyId: property.id, createdByUserId: userId, transactionType: 'sale',
      title: 'G5.1 CRM integration listing', description: 'created by the G5.1 CRM suite',
      currencyCode: 'USD', price: '250000.0000', pricePeriod: 'one_time',
    });
    const asset = await media.createAsset({
      storageProvider: 'local-fs', bucket: null, objectKey: `optimized/test/${randomUUID()}.webp`,
      mimeType: 'image/webp', sizeBytes: 1024, createdBy: userId,
    });
    await listings.attachMedia({ listingId: listing.id, mediaAssetId: asset.id, mediaType: 'photo', isCover: true, actorUserId: userId });
    return listing.id;
  }

  async function eventCount(eventType: string, aggregateId: string): Promise<number> {
    const r = await db.query<{ count: string }>(
      `SELECT count(*) AS count FROM audit.outbox_events WHERE event_type = $1 AND aggregate_id = $2::uuid`,
      [eventType, aggregateId],
    );
    return Number(r.rows[0]?.count ?? '0');
  }

  it('R1 — full pipeline Lead → Assignment → Contact → Qualified → Viewing → Negotiation → WON (deal) with atomic activity trail', async () => {
    const agent = await crmUser();
    const listingId = await publishableListing(agent.id);
    const lead = (await service.createLead({ source: 'website', listingId }, agent)) as { id: string; status: string };
    expect(lead.status).toBe('new');

    await service.assignLead(lead.id, agent.id, agent);
    await service.changeLeadStatus(lead.id, 'contacted', agent, 'intro call');
    await service.changeLeadStatus(lead.id, 'qualified', agent, 'budget confirmed');
    await service.scheduleViewing(lead.id, { listingId, scheduledStart: new Date(Date.now() + 86_400_000).toISOString(), scheduledEnd: new Date(Date.now() + 90_000_000).toISOString() }, agent);
    await service.changeLeadStatus(lead.id, 'negotiation', agent, 'offer round 1');
    await service.changeLeadStatus(lead.id, 'won', agent, 'deal closed');

    const after = (await service.getLead(lead.id, agent)) as { status: string; recentActivities: Array<{ activityType: string }> };
    expect(after.status).toBe('won');
    const types = after.recentActivities.map((a) => a.activityType);
    expect(types).toContain('status_change');
    expect(types).toContain('viewing');
    expect(await eventCount('CrmDealWon.v1', lead.id)).toBe(1);
    expect(await eventCount('CrmLeadCreated.v1', lead.id)).toBe(1);
    expect(await eventCount('CrmLeadAssigned.v1', lead.id)).toBe(1);
  });

  it('R2 — invalid transitions are rejected at DB level with 422 mapping', async () => {
    const agent = await crmUser();
    const lead = (await service.createLead({ source: 'referral' }, agent)) as { id: string };
    await expect(service.changeLeadStatus(lead.id, 'won', agent))
      .rejects.toMatchObject({ response: { code: 'LEAD_INVALID_TRANSITION' } });
    // DB-level defense in depth: raw SQL also blocked
    await expect(db.query(`UPDATE crm.leads SET status = 'won' WHERE id = $1::uuid`, [lead.id]))
      .rejects.toThrow(/LEAD_INVALID_TRANSITION/);
  });

  it('R3 — viewing agent overlap is rejected by the DB EXCLUDE constraint (mapped to 409)', async () => {
    const agent = await crmUser();
    const listingId = await publishableListing(agent.id);
    const lead = (await service.createLead({ source: 'website' }, agent)) as { id: string };
    await service.changeLeadStatus(lead.id, 'contacted', agent);
    await service.changeLeadStatus(lead.id, 'qualified', agent);
    const start = new Date(Date.now() + 172_800_000);
    const end = new Date(Date.now() + 176_000_000);
    await service.scheduleViewing(lead.id, { listingId, agentUserId: agent.id, scheduledStart: start.toISOString(), scheduledEnd: end.toISOString() }, agent);
    // second lead, same agent, overlapping window → 409
    const lead2 = (await service.createLead({ source: 'website' }, agent)) as { id: string };
    await service.changeLeadStatus(lead2.id, 'contacted', agent);
    await service.changeLeadStatus(lead2.id, 'qualified', agent);
    await expect(service.scheduleViewing(lead2.id, { listingId, agentUserId: agent.id, scheduledStart: new Date(Date.now() + 174_000_000).toISOString(), scheduledEnd: new Date(Date.now() + 178_000_000).toISOString() }, agent))
      .rejects.toMatchObject({ response: { code: 'VIEWING_AGENT_OVERLAP' } });
  });

  it('R4 — org scoping: outsider gets 404 (no existence leak) on every lead path', async () => {
    const insider = await crmUser();
    const outsider = await crmUser();
    const lead = (await service.createLead({ source: 'website' }, insider)) as { id: string };
    await expect(service.getLead(lead.id, outsider)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.assignLead(lead.id, outsider.id, outsider)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.changeLeadStatus(lead.id, 'contacted', outsider)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.listActivities(lead.id, outsider)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('R5 — viewing status flow: confirmed → completed (activity recorded)', async () => {
    const agent = await crmUser();
    const listingId = await publishableListing(agent.id);
    const lead = (await service.createLead({ source: 'website' }, agent)) as { id: string };
    await service.changeLeadStatus(lead.id, 'contacted', agent);
    await service.changeLeadStatus(lead.id, 'qualified', agent);
    const viewing = (await service.scheduleViewing(lead.id, { listingId, scheduledStart: new Date(Date.now() + 259_200_000).toISOString(), scheduledEnd: new Date(Date.now() + 262_800_000).toISOString() }, agent)) as { id: string; status: string };
    await service.updateViewingStatus(viewing.id, 'confirmed', agent);
    const done = (await service.updateViewingStatus(viewing.id, 'completed', agent)) as { status: string };
    expect(done.status).toBe('completed');
  });

  it('R6 — tasks tied to leads: create → complete; completion recorded once', async () => {
    const agent = await crmUser();
    const lead = (await service.createLead({ source: 'website' }, agent)) as { id: string };
    const task = (await service.createTask(lead.id, { title: 'Call client back', priority: 2 }, agent)) as { id: string };
    const done = (await service.completeTask(task.id, agent)) as { status: string };
    expect(done.status).toBe('completed');
    await expect(service.completeTask(task.id, agent)).rejects.toBeInstanceOf(Error);
  });

  it('R7 — status change without permission (view-only agent) is forbidden', async () => {
    const viewer = await crmUser(['crm.view']);
    const manager = await crmUser();
    const lead = (await service.createLead({ source: 'website' }, manager)) as { id: string };
    // viewer IS a party? no — viewer has no relation; create relation by assigning
    await service.assignLead(lead.id, viewer.id, manager);
    await expect(service.changeLeadStatus(lead.id, 'contacted', viewer))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});
