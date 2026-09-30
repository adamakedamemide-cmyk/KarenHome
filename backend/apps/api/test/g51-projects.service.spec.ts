import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectsService } from '../src/modules/projects/application/projects.service';
import type { AuthenticatedUser } from '@platform/contracts';

type LooseMock = jest.Mock & any;
function mockFn(impl?: (...args: any[]) => any): LooseMock {
  return (impl ? jest.fn(impl) : jest.fn()) as LooseMock;
}

const now = new Date();
const projectRow = {
  id: 'proj-1', public_code: '1001', developer_organization_id: 'org-1', name: 'Tower A',
  slug: 'tower-a', description: null, status: 'planned', start_date: null, completion_date: null,
  address_text: null, total_units: null, created_at: now, updated_at: now,
};
const unitRow = {
  id: 'unit-1', project_id: 'proj-1', building_id: 'bld-1', floor_id: null, property_id: null,
  unit_number: '101', area_total_m2: '85.50', bedrooms: 2, bathrooms: 1, status: 'available',
  created_at: now, updated_at: now,
};

function makeRepo(overrides: Record<string, LooseMock> = {}) {
  const repo: Record<string, LooseMock> = {
    getOrganization: mockFn(async () => ({ id: 'org-1', type: 'developer', status: 'active' })),
    createProject: mockFn(async () => ({ ...projectRow })),
    getProject: mockFn(async () => ({ ...projectRow })),
    listProjects: mockFn(async () => [{ ...projectRow }]),
    updateProjectStatus: mockFn(async () => ({ ...projectRow, status: 'pre_sale' })),
    createBuilding: mockFn(async () => ({ id: 'bld-1', project_id: 'proj-1', code: 'A', name: null, floors_count: 5 })),
    getBuilding: mockFn(async () => ({ id: 'bld-1', project_id: 'proj-1', code: 'A', name: null, floors_count: 5 })),
    listBuildings: mockFn(async () => []),
    createFloor: mockFn(async () => ({ id: 'flr-1', building_id: 'bld-1', floor_number: 3 })),
    getFloor: mockFn(async () => ({ id: 'flr-1', building_id: 'bld-1', floor_number: 3 })),
    listFloors: mockFn(async () => []),
    createUnit: mockFn(async () => ({ ...unitRow })),
    getUnit: mockFn(async () => ({ ...unitRow })),
    listUnits: mockFn(async () => [{ ...unitRow }]),
    updateUnitStatus: mockFn(async () => ({ ...unitRow, status: 'reserved' })),
    addUnitPrice: mockFn(async () => ({ id: 'price-1', unit_id: 'unit-1', price: '120000.00', currency_code: 'USD', valid_from: now, valid_to: null })),
    getLatestUnitPrice: mockFn(async () => null),
  };
  return Object.assign(repo, overrides);
}

function makeService(repo = makeRepo(), iamOpts: { member?: boolean; permissions?: string[] } = {}) {
  const outbox = { append: mockFn(async () => 'evt') };
  const iam = {
    listPermissionCodesForUser: mockFn(async () => iamOpts.permissions ?? ['project.view', 'project.manage']),
    isActiveOrganizationMember: mockFn(async () => iamOpts.member ?? true),
  };
  const service = new ProjectsService(repo as never, outbox as never, iam as never);
  return { service, repo, outbox, iam };
}

const manager: AuthenticatedUser = { id: 'dev-1', status: 'active' } as AuthenticatedUser;

describe('G5.1 Projects service (unit, mocked repositories)', () => {
  beforeEach(async () => { jest.clearAllMocks(); });

  it('P1 — createProject requires project.manage (view-only member is forbidden)', async () => {
    const { service } = makeService(makeRepo(), { permissions: ['project.view'] });
    await expect(service.createProject({ organizationId: 'org-1', name: 'X', slug: 'x-p1' }, manager))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('P2 — createProject: non-developer organization rejected (422), unknown org 404', async () => {
    const { service } = makeService(makeRepo({ getOrganization: mockFn(async () => ({ id: 'org-1', type: 'agency', status: 'active' })) }));
    await expect(service.createProject({ organizationId: 'org-1', name: 'X', slug: 'x-1' }, manager))
      .rejects.toMatchObject({ response: { code: 'PROJECT_ORG_NOT_DEVELOPER' } });
    const { service: s2 } = makeService(makeRepo({ getOrganization: mockFn(async () => null) }));
    await expect(s2.createProject({ organizationId: 'org-x', name: 'X', slug: 'x-2' }, manager))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('P3 — createProject success emits ProjectCreated.v1', async () => {
    const { service, outbox } = makeService();
    const created = await service.createProject({ organizationId: 'org-1', name: 'Tower A', slug: 'tower-a' }, manager) as { status: string };
    expect(created.status).toBe('planned');
    expect(outbox.append).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'ProjectCreated.v1' }));
  });

  it('P4 — out-of-org member gets 404 without leak on every project path', async () => {
    const { service } = makeService(makeRepo(), { member: false });
    await expect(service.getProject('proj-1', manager)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.changeProjectStatus('proj-1', 'pre_sale', manager)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.reserveUnit('proj-1', 'unit-1', manager)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.listUnits('proj-1', manager)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('P5 — cross-project paths rejected at service level (building/floor/unit mismatch)', async () => {
    const { service } = makeService(makeRepo({
      getBuilding: mockFn(async (id: string) => id === 'bld-1'
        ? { id: 'bld-1', project_id: 'proj-1', code: 'A', name: null, floors_count: 5 }
        : { id: 'bld-9', project_id: 'proj-OTHER', code: 'A', name: null, floors_count: null }),
      getFloor: mockFn(async (id: string) => id === 'flr-1'
        ? { id: 'flr-1', building_id: 'bld-1', floor_number: 3 }
        : { id: 'flr-9', building_id: 'bld-OTHER', floor_number: 1 }),
    }));
    await expect(service.createFloor('proj-1', 'bld-9', { floorNumber: 1 }, manager))
      .rejects.toBeInstanceOf(NotFoundException);
    await expect(service.createUnit('proj-1', 'bld-9', { unitNumber: '1' }, manager))
      .rejects.toBeInstanceOf(NotFoundException);
    await expect(service.createUnit('proj-1', 'bld-1', { unitNumber: '1', floorId: 'flr-9' }, manager))
      .rejects.toMatchObject({ response: { code: 'UNIT_FLOOR_MISMATCH' } });
    const { service: s2 } = makeService(makeRepo({
      getUnit: mockFn(async () => ({ ...unitRow, project_id: 'proj-OTHER' })),
    }));
    await expect(s2.reserveUnit('proj-1', 'unit-1', manager)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('P6 — reserve → release → sell happy path emits versioned events; sell without price invents nothing', async () => {
    const { service, outbox } = makeService(makeRepo({
      getUnit: mockFn()
        .mockResolvedValueOnce({ ...unitRow, status: 'available' })
        .mockResolvedValueOnce({ ...unitRow, status: 'reserved' })
        .mockResolvedValueOnce({ ...unitRow, status: 'reserved' })
        .mockResolvedValue({ ...unitRow, status: 'reserved' }),
      updateUnitStatus: mockFn()
        .mockResolvedValueOnce({ ...unitRow, status: 'reserved' })
        .mockResolvedValueOnce({ ...unitRow, status: 'available' })
        .mockResolvedValue({ ...unitRow, status: 'sold' }),
    }));
    await service.reserveUnit('proj-1', 'unit-1', manager);
    await service.releaseUnit('proj-1', 'unit-1', manager, 'buyer withdrew');
    const sold = await service.sellUnit('proj-1', 'unit-1', {}, manager) as { status: string };
    expect(sold.status).toBe('sold');
    const events = outbox.append.mock.calls.map((c: any[]) => c[0].eventType);
    expect(events).toContain('ProjectUnitReserved.v1');
    expect(events).toContain('ProjectUnitReleased.v1');
    expect(events).toContain('ProjectUnitSold.v1');
    const soldPayload = outbox.append.mock.calls.map((c: any[]) => c[0]).find((e: any) => e.eventType === 'ProjectUnitSold.v1');
    expect(soldPayload.payload.price).toBeNull();
  });

  it('P7 — reserve on a non-available unit → 409 (service pre-check, DB trigger is authority)', async () => {
    const { service } = makeService(makeRepo({
      getUnit: mockFn(async () => ({ ...unitRow, status: 'reserved' })),
    }));
    await expect(service.reserveUnit('proj-1', 'unit-1', manager)).rejects.toBeInstanceOf(ConflictException);
  });

  it('P8 — DB transition violation maps to 422 with domain code', async () => {
    const { service } = makeService(makeRepo({
      updateProjectStatus: mockFn(async () => { throw new Error('PROJECT_INVALID_TRANSITION: planned -> completed'); }),
    }));
    await expect(service.changeProjectStatus('proj-1', 'completed', manager))
      .rejects.toMatchObject({ response: { code: 'PROJECT_INVALID_TRANSITION' } });
  });

  it('P9 — sale price validation: incomplete pair rejected; negative price rejected', async () => {
    const { service } = makeService(makeRepo({
      getUnit: mockFn(async () => ({ ...unitRow, status: 'reserved' })),
    }));
    await expect(service.sellUnit('proj-1', 'unit-1', { price: '100' }, manager))
      .rejects.toMatchObject({ response: { code: 'UNIT_PRICE_INCOMPLETE' } });
    await expect(service.sellUnit('proj-1', 'unit-1', { price: '-5', currencyCode: 'USD' }, manager))
      .rejects.toMatchObject({ response: { code: 'UNIT_PRICE_INVALID' } });
  });

  it('P10 — project status no-op and unknown status rejected', async () => {
    const { service } = makeService(makeRepo({
      getProject: mockFn(async () => ({ ...projectRow, status: 'pre_sale' })),
    }));
    await expect(service.changeProjectStatus('proj-1', 'pre_sale', manager))
      .rejects.toMatchObject({ response: { code: 'PROJECT_NO_OP_TRANSITION' } });
    const { service: s2 } = makeService(makeRepo({
      updateProjectStatus: mockFn(async () => { throw new Error('PROJECT_UNKNOWN_STATUS: flying is not a registered project status'); }),
    }));
    await expect(s2.changeProjectStatus('proj-1', 'flying', manager))
      .rejects.toMatchObject({ response: { code: 'PROJECT_UNKNOWN_STATUS' } });
  });
});
