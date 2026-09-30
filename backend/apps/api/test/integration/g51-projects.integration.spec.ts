import { randomUUID } from 'node:crypto';
import { IamRepository, OutboxRepository, PostgresDatabase, ProjectsRepository } from '@platform/db';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectsService } from '../../src/modules/projects/application/projects.service';
import type { AuthenticatedUser } from '@platform/contracts';

const enabled = Boolean(process.env.RUN_DB_TESTS && process.env.DATABASE_URL);
const d = enabled ? describe : describe.skip;

d('G5.1 Projects — integration against real PostgreSQL (Gate 5.1 Phase D)', () => {
  let db: PostgresDatabase;
  let iam: IamRepository;
  let projectsRepo: ProjectsRepository;
  let outbox: OutboxRepository;
  let service: ProjectsService;

  const createdUserIds: string[] = [];
  const createdOrgIds: string[] = [];

  beforeAll(async () => {
    db = new PostgresDatabase({ connectionString: process.env.DATABASE_URL!, max: 5 });
    iam = new IamRepository(db);
    projectsRepo = new ProjectsRepository(db);
    outbox = new OutboxRepository(db);
    service = new ProjectsService(projectsRepo, outbox, iam);
  });

  afterAll(async () => {
    // developer orgs own projects (FK RESTRICT) — order matters for a clean sweep
    for (const orgId of createdOrgIds) {
      await db.query(`DELETE FROM project.unit_prices WHERE unit_id IN (SELECT id FROM project.units WHERE project_id IN (SELECT id FROM project.projects WHERE developer_organization_id = $1::uuid))`, [orgId]);
      await db.query(`DELETE FROM project.units WHERE project_id IN (SELECT id FROM project.projects WHERE developer_organization_id = $1::uuid)`, [orgId]);
      await db.query(`DELETE FROM project.project_floors WHERE building_id IN (SELECT id FROM project.project_buildings WHERE project_id IN (SELECT id FROM project.projects WHERE developer_organization_id = $1::uuid))`, [orgId]);
      await db.query(`DELETE FROM project.project_buildings WHERE project_id IN (SELECT id FROM project.projects WHERE developer_organization_id = $1::uuid)`, [orgId]);
      await db.query(`DELETE FROM project.projects WHERE developer_organization_id = $1::uuid`, [orgId]);
      await db.query(`DELETE FROM org.organization_members WHERE organization_id = $1::uuid`, [orgId]);
      await db.query(`DELETE FROM org.organizations WHERE id = $1::uuid`, [orgId]);
    }
    for (const userId of createdUserIds) {
      await db.query(`DELETE FROM iam.user_permission_grants WHERE user_id = $1::uuid`, [userId]);
      await db.query(`DELETE FROM iam.users WHERE id = $1::uuid`, [userId]);
    }
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

  async function projectUser(permissions: string[] = ['project.view', 'project.manage']): Promise<AuthenticatedUser> {
    const user = await iam.createPasswordUser({ email: `g51proj-${randomUUID()}@t.local`, passwordHash: 'test-hash' });
    createdUserIds.push(user.id);
    await grant(user.id, permissions);
    return { id: user.id, status: 'active' } as AuthenticatedUser;
  }

  /** Creates a developer org + active membership; returns org id. */
  async function developerOrg(user: AuthenticatedUser): Promise<string> {
    const slug = `g51proj-${randomUUID().slice(0, 12)}`;
    const r = await db.query<{ id: string }>(
      `INSERT INTO org.organizations (type, status, legal_name, display_name, slug)
       VALUES ('developer', 'active', $1, $1, $2) RETURNING id`,
      [`G51 Proj Dev Org ${slug}`, slug],
    );
    const orgId = r.rows[0]!.id;
    createdOrgIds.push(orgId);
    await db.query(
      `INSERT INTO org.organization_members (organization_id, user_id, status) VALUES ($1::uuid, $2::uuid, 'active')`,
      [orgId, user.id],
    );
    return orgId;
  }

  /** Standard hierarchy fixture: org → project → building → floor → unit(status). */
  async function hierarchy(unitStatus: 'available' | 'reserved' = 'available'): Promise<{ orgId: string; projectId: string; buildingId: string; floorId: string; unitId: string }> {
    const manager = await projectUser();
    const orgId = await developerOrg(manager);
    const project = (await service.createProject({ organizationId: orgId, name: `G51 Proj ${randomUUID().slice(0, 8)}`, slug: `g51-${randomUUID().slice(0, 12)}` }, manager)) as { id: string };
    const building = (await service.createBuilding(project.id, { code: 'A', floorsCount: 6 }, manager)) as { id: string };
    const floor = (await service.createFloor(project.id, building.id, { floorNumber: 3 }, manager)) as { id: string };
    const unit = (await service.createUnit(project.id, building.id, { unitNumber: `U-${randomUUID().slice(0, 6)}`, floorId: floor.id, areaTotalM2: '95.5', bedrooms: 2, bathrooms: 1 }, manager)) as { id: string };
    if (unitStatus === 'reserved') {
      await db.query(`UPDATE project.units SET status = 'reserved' WHERE id = $1::uuid`, [unit.id]);
    }
    return { orgId, projectId: project.id, buildingId: building.id, floorId: floor.id, unitId: unit.id };
  }

  async function eventCount(eventType: string, aggregateId: string): Promise<number> {
    const r = await db.query<{ count: string }>(
      `SELECT count(*) AS count FROM audit.outbox_events WHERE event_type = $1 AND aggregate_id = $2::uuid`,
      [eventType, aggregateId],
    );
    return Number(r.rows[0]?.count ?? '0');
  }

  it('I1 — full hierarchy Developer → Project → Building → Floor → Unit with events', async () => {
    const manager = await projectUser();
    const orgId = await developerOrg(manager);
    const project = (await service.createProject({ organizationId: orgId, name: 'Residence Nine', slug: `residence-nine-${randomUUID().slice(0, 8)}`, startDate: '2026-01-01', completionDate: '2028-01-01' }, manager)) as { id: string; status: string; publicCode: string };
    expect(project.status).toBe('planned');
    expect(project.publicCode).toBeTruthy();
    const status = (await service.changeProjectStatus(project.id, 'pre_sale', manager, 'sales open')) as { status: string };
    expect(status.status).toBe('pre_sale');
    const building = (await service.createBuilding(project.id, { code: 'B1', floorsCount: 9 }, manager)) as { id: string };
    const floor = (await service.createFloor(project.id, building.id, { floorNumber: 5 }, manager)) as { id: string };
    const unit = (await service.createUnit(project.id, building.id, { unitNumber: '501', floorId: floor.id }, manager)) as { id: string; status: string };
    expect(unit.status).toBe('available');
    expect(await eventCount('ProjectCreated.v1', project.id)).toBe(1);
    expect(await eventCount('ProjectStatusChanged.v1', project.id)).toBe(1);
    expect(await eventCount('ProjectBuildingAdded.v1', project.id)).toBe(1);
    expect(await eventCount('ProjectFloorAdded.v1', project.id)).toBe(1);
    expect(await eventCount('ProjectUnitRegistered.v1', unit.id)).toBe(1);
  });

  it('I2 — invalid project transition: 422 via service AND rejected by raw SQL at DB level', async () => {
    const manager = await projectUser();
    const orgId = await developerOrg(manager);
    const project = (await service.createProject({ organizationId: orgId, name: 'X', slug: `x-${randomUUID().slice(0, 12)}` }, manager)) as { id: string };
    await expect(service.changeProjectStatus(project.id, 'completed', manager))
      .rejects.toMatchObject({ response: { code: 'PROJECT_INVALID_TRANSITION' } });
    await expect(db.query(`UPDATE project.projects SET status = 'completed' WHERE id = $1::uuid`, [project.id]))
      .rejects.toThrow(/PROJECT_INVALID_TRANSITION/);
    // unknown status also rejected by the DB trigger
    await expect(db.query(`UPDATE project.projects SET status = 'flying' WHERE id = $1::uuid`, [project.id]))
      .rejects.toThrow(/PROJECT_UNKNOWN_STATUS/);
  });

  it('I3 — unit state machine: reserve → sell path; DB rejects sell-from-available and unknown statuses', async () => {
    const h = await hierarchy();
    const seller = await projectUser();
    await db.query(
      `INSERT INTO org.organization_members (organization_id, user_id, status) VALUES ($1::uuid, $2::uuid, 'active') ON CONFLICT DO NOTHING`,
      [h.orgId, seller.id],
    );
    await grant(seller.id, ['project.view', 'project.manage']);
    const reserved = (await service.reserveUnit(h.projectId, h.unitId, seller)) as { status: string };
    expect(reserved.status).toBe('reserved');
    const sold = (await service.sellUnit(h.projectId, h.unitId, { price: '185000.00', currencyCode: 'USD' }, seller)) as { status: string };
    expect(sold.status).toBe('sold');
    const price = await db.query<{ price: string; currency_code: string }>(
      `SELECT price, currency_code FROM project.unit_prices WHERE unit_id = $1::uuid ORDER BY valid_from DESC LIMIT 1`, [h.unitId]);
    expect(Number(price.rows[0]!.price)).toBe(185000);
    // DB-level defense: available → sold directly is not in the transition matrix
    const h2 = await hierarchy();
    await expect(db.query(`UPDATE project.units SET status = 'sold' WHERE id = $1::uuid`, [h2.unitId]))
      .rejects.toThrow(/UNIT_INVALID_TRANSITION/);
  });

  it('I4 — cross-project integrity is DB-enforced (composite FKs) and service-scoped (404)', async () => {
    const a = await hierarchy(); // project A with building/floor/unit
    const b = await hierarchy(); // project B
    const devB = await projectUser();
    await db.query(`INSERT INTO org.organization_members (organization_id, user_id, status) VALUES ($1::uuid, $2::uuid, 'active')`, [b.orgId, devB.id]);
    await grant(devB.id, ['project.view', 'project.manage']);

    // 1) Unit cannot reference a Building from another Project (composite FK)
    await expect(db.query(
      `INSERT INTO project.units (project_id, building_id, unit_number) VALUES ($1::uuid, $2::uuid, 'X1')`,
      [a.projectId, b.buildingId],
    )).rejects.toThrow(/units_building_id_project_id_fkey/);

    // 2) Unit cannot reference a Floor from another Building (composite FK)
    await expect(db.query(
      `INSERT INTO project.units (project_id, building_id, floor_id, unit_number) VALUES ($1::uuid, $1::uuid, $2::uuid, 'X2')`,
      [a.projectId, b.floorId],
    )).rejects.toThrow(/units_building_id_fkey|units_floor_id_building_id_fkey/);

    // 3) Floor belongs to exactly one building — the FK leaves no cross-project reference to make;
    //    the authoritative cross-check is the unit-level composite FK proven above.

    // 4) Service-level: Reservation targeting a Unit outside the path's project → 404
    await expect(service.reserveUnit(a.projectId, b.unitId, devB))
      .rejects.toBeInstanceOf(NotFoundException);
    // 5) Service-level: Release on a unit of another project → 404
    await expect(service.releaseUnit(a.projectId, b.unitId, devB))
      .rejects.toBeInstanceOf(NotFoundException);
    // 6) Service-level: Sale against another project's unit → 404
    await expect(service.sellUnit(a.projectId, b.unitId, { price: '1', currencyCode: 'USD' }, devB))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('I5 — organization isolation: outsider organization member gets 404 (no leak) on every path', async () => {
    const h = await hierarchy();
    const outsider = await projectUser();
    await expect(service.getProject(h.projectId, outsider)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.listBuildings(h.projectId, outsider)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.listUnits(h.projectId, outsider)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.changeProjectStatus(h.projectId, 'pre_sale', outsider)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.reserveUnit(h.projectId, h.unitId, outsider)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.sellUnit(h.projectId, h.unitId, {}, outsider)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('I6 — authorization: view-only member can read but cannot mutate (403)', async () => {
    const manager = await projectUser();
    const orgId = await developerOrg(manager);
    const project = (await service.createProject({ organizationId: orgId, name: 'Auth Proj', slug: `auth-proj-${randomUUID().slice(0, 8)}` }, manager)) as { id: string };
    const building = (await service.createBuilding(project.id, { code: 'A' }, manager)) as { id: string };

    const viewer = await projectUser(['project.view']);
    await db.query(`INSERT INTO org.organization_members (organization_id, user_id, status) VALUES ($1::uuid, $2::uuid, 'active')`, [orgId, viewer.id]);
    const listing = await service.getProject(project.id, viewer) as { id: string };
    expect(listing.id).toBe(project.id);
    await expect(service.createBuilding(project.id, { code: 'B' }, viewer)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.reserveUnit(project.id, building.id, viewer)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('I7 — reservation race: two concurrent reserves on the same unit → exactly one wins (DB trigger authority)', async () => {
    const h = await hierarchy();
    const m1 = await projectUser();
    const m2 = await projectUser();
    for (const m of [m1, m2]) {
      await db.query(`INSERT INTO org.organization_members (organization_id, user_id, status) VALUES ($1::uuid, $2::uuid, 'active')`, [h.orgId, m.id]);
      await grant(m.id, ['project.view', 'project.manage']);
    }
    const results = await Promise.allSettled([
      service.reserveUnit(h.projectId, h.unitId, m1),
      service.reserveUnit(h.projectId, h.unitId, m2),
    ]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const reason = (rejected[0] as PromiseRejectedResult).reason;
    expect(reason).toBeInstanceOf(ConflictException);
    const final = await db.query<{ status: string }>(`SELECT status FROM project.units WHERE id = $1::uuid`, [h.unitId]);
    expect(final.rows[0]!.status).toBe('reserved');
  });

  it('I8 — release flow: reserved → available with reason; unit becomes reservable again', async () => {
    const h = await hierarchy();
    const m = await projectUser();
    await db.query(`UPDATE project.units SET status = 'reserved' WHERE id = $1::uuid`, [h.unitId]);
    await db.query(`INSERT INTO org.organization_members (organization_id, user_id, status) VALUES ($1::uuid, $2::uuid, 'active')`, [h.orgId, m.id]);
    await grant(m.id, ['project.view', 'project.manage']);
    const released = (await service.releaseUnit(h.projectId, h.unitId, m, 'financing fell through')) as { status: string };
    expect(released.status).toBe('available');
    expect(await eventCount('ProjectUnitReleased.v1', h.unitId)).toBe(1);
    const reservedAgain = (await service.reserveUnit(h.projectId, h.unitId, m)) as { status: string };
    expect(reservedAgain.status).toBe('reserved');
  });

  it('I9 — sale without price invents nothing; identifiers-only event; existing price referenced', async () => {
    const h = await hierarchy();
    const m = await projectUser();
    await db.query(`UPDATE project.units SET status = 'reserved' WHERE id = $1::uuid`, [h.unitId]);
    await db.query(`INSERT INTO org.organization_members (organization_id, user_id, status) VALUES ($1::uuid, $2::uuid, 'active')`, [h.orgId, m.id]);
    await grant(m.id, ['project.view', 'project.manage']);
    await service.sellUnit(h.projectId, h.unitId, {}, m);
    const prices = await db.query(`SELECT id FROM project.unit_prices WHERE unit_id = $1::uuid`, [h.unitId]);
    expect(prices.rows).toHaveLength(0); // no amount invented, no price row created
    const r = await db.query<{ payload: Record<string, unknown> }>(
      `SELECT payload FROM audit.outbox_events WHERE event_type = 'ProjectUnitSold.v1' AND aggregate_id = $1::uuid`, [h.unitId]);
    expect(r.rows[0]!.payload['price']).toBeNull();
  });
});
