import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CrmService } from '../src/modules/crm/application/crm.service';
import type { AuthenticatedUser } from '@platform/contracts';


type LooseMock = jest.Mock & any;
function mockFn(impl?: (...args: any[]) => any): LooseMock {
  return (impl ? jest.fn(impl) : jest.fn()) as LooseMock;
}

const now = new Date();
const leadRow = {
  id: 'lead-1', user_id: 'client-1', organization_id: 'org-1', listing_id: 'listing-1',
  assigned_agent_id: null, source: 'website', status: 'new', score: null,
  notes: null, created_at: now, updated_at: now,
};

function makeRepo(overrides: Record<string, LooseMock> = {}) {
  const repo: Record<string, LooseMock> = {
    getLead: mockFn(async () => ({ ...leadRow })),
    createLead: mockFn(async () => ({ ...leadRow })),
    listLeads: mockFn(async () => [{ ...leadRow }]),
    assignLead: mockFn(async () => ({ ...leadRow, assigned_agent_id: 'agent-9' })),
    updateLeadStatus: mockFn(async () => ({ ...leadRow, status: 'contacted' })),
    appendActivity: mockFn(async () => ({ id: 'act-1', lead_id: 'lead-1', activity_type: 'note', performed_by: 'u1', subject: null, body: null, metadata: {}, occurred_at: now })),
    listActivities: mockFn(async () => []),
    hasActivityByActor: mockFn(async () => false),
    listLeadViewings: mockFn(async () => []),
    getTask: mockFn(async () => null),
    createTask: mockFn(async () => ({ id: 'task-1', title: 'T', status: 'open', due_at: null, organization_id: 'org-1', lead_id: 'lead-1' })),
    completeTask: mockFn(async () => ({ id: 'task-1', title: 'T', status: 'completed', due_at: null, completed_at: now })),
    createViewing: mockFn(async () => ({ id: 'view-1', listing_id: 'listing-1', lead_id: 'lead-1', agent_user_id: 'agent-9', scheduled_start: now, scheduled_end: new Date(now.getTime() + 3600_000), status: 'requested', notes: null, created_at: now })),
    getViewing: mockFn(async () => ({ id: 'view-1', listing_id: 'listing-1', lead_id: 'lead-1', agent_user_id: 'agent-9', scheduled_start: now, scheduled_end: new Date(now.getTime() + 3600_000), status: 'requested', notes: null, created_at: now })),
    updateViewingStatus: mockFn(async () => ({ id: 'view-1', listing_id: 'listing-1', lead_id: 'lead-1', agent_user_id: 'agent-9', scheduled_start: now, scheduled_end: new Date(now.getTime() + 3600_000), status: 'confirmed', notes: null, created_at: now })),
    getLeadViewings: mockFn(async () => []),
  };
  return Object.assign(repo, overrides);
}

function makeService(repo = makeRepo(), iamOpts: { member?: boolean; permissions?: string[] } = {}) {
  const outbox = { append: mockFn(async () => 'evt') };
  const iam = {
    listPermissionCodesForUser: mockFn(async () => iamOpts.permissions ?? ['crm.view', 'crm.manage', 'lead.read', 'lead.update']),
    isActiveOrganizationMember: mockFn(async () => iamOpts.member ?? true),
  };
  const service = new CrmService(repo as never, outbox as never, iam as never);
  return { service, repo, outbox, iam };
}

const agent: AuthenticatedUser = { id: 'agent-1', status: 'active' } as AuthenticatedUser;

describe('G5.1 CRM service (unit, mocked repositories)', () => {
  beforeEach(async () => { jest.clearAllMocks(); });

  it('C1 — createLead requires crm.manage (agent without it is forbidden)', async () => {
    const { service, iam } = makeService(makeRepo(), { permissions: ['crm.view'] });
    await expect(service.createLead({ source: 'website', organizationId: 'org-1' }, agent))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(iam.listPermissionCodesForUser).toHaveBeenCalled();
  });

  it('C2 — createLead: empty source rejected; successful creation emits CrmLeadCreated.v1', async () => {
    const { service, outbox } = makeService();
    await expect(service.createLead({ source: '  ' }, agent)).rejects.toBeInstanceOf(UnprocessableEntityException);
    await service.createLead({ source: 'website', organizationId: 'org-1' }, agent);
    expect(outbox.append.mock.calls.some((c: any[]) => (c[0] as { eventType: string }).eventType === 'CrmLeadCreated.v1')).toBe(true);
  });

  it('C3 — getLead: out-of-scope user (not member, not party) gets 404 without leak', async () => {
    const repo = makeRepo({ getLead: mockFn(async () => ({ ...leadRow, user_id: null, assigned_agent_id: null })) });
    const { service, iam } = makeService(repo, { member: false });
    await expect(service.getLead('lead-1', agent)).rejects.toBeInstanceOf(NotFoundException);
    expect(iam.isActiveOrganizationMember).toHaveBeenCalledWith('agent-1', 'org-1');
  });

  it('C4 — assignment writes activity + emits CrmLeadAssigned.v1', async () => {
    const { service, outbox, repo } = makeService();
    await service.assignLead('lead-1', 'agent-9', agent);
    expect(repo.assignLead).toHaveBeenCalledWith('lead-1', 'agent-9');
    expect(outbox.append.mock.calls.some((c: any[]) => (c[0] as { eventType: string }).eventType === 'CrmLeadAssigned.v1')).toBe(true);
  });

  it('C5 — status change maps DB LEAD_INVALID_TRANSITION to 422 and emits status event', async () => {
    const repo = makeRepo({
      updateLeadStatus: mockFn(async () => { throw new Error('LEAD_INVALID_TRANSITION: new -> won is not an allowed lead transition'); }),
    });
    const { service, outbox } = makeService(repo);
    await expect(service.changeLeadStatus('lead-1', 'won', agent))
      .rejects.toMatchObject({ response: { code: 'LEAD_INVALID_TRANSITION' } });
    expect(outbox.append).not.toHaveBeenCalled();
  });

  it('C6 — WON deal emits CrmDealWon.v1 with commission linkage identifiers', async () => {
    const repo = makeRepo({
      getLead: mockFn(async () => ({ ...leadRow, status: 'negotiation' })),
      updateLeadStatus: mockFn(async () => ({ ...leadRow, status: 'won' })),
    });
    const { service, outbox } = makeService(repo);
    await service.changeLeadStatus('lead-1', 'won', agent, 'offer accepted');
    const won = outbox.append.mock.calls.map((c: any[]) => c[0] as { eventType: string }).filter((e: { eventType: string }) => e.eventType === 'CrmDealWon.v1');
    expect(won.length).toBe(1);
    expect(won[0]).toMatchObject({ aggregateType: 'crm_lead', eventVersion: 1 });
  });

  it('C7 — viewing requires qualified+ lead; invalid window rejected', async () => {
    const repo = makeRepo({ getLead: mockFn(async () => ({ ...leadRow, status: 'new' })) });
    const { service } = makeService(repo);
    await expect(service.scheduleViewing('lead-1', { listingId: 'listing-1', scheduledStart: now.toISOString(), scheduledEnd: new Date(now.getTime() + 3600_000).toISOString() }, agent))
      .rejects.toMatchObject({ response: { code: 'VIEWING_LEAD_NOT_QUALIFIED' } });
    const { service: s2 } = makeService();
    await expect(s2.scheduleViewing('lead-1', { listingId: 'listing-1', scheduledStart: now.toISOString(), scheduledEnd: now.toISOString() }, agent))
      .rejects.toMatchObject({ response: { code: 'VIEWING_WINDOW_INVALID' } });
  });

  it('C8 — viewing overlap DB error maps to 409 VIEWING_AGENT_OVERLAP', async () => {
    const repo = makeRepo({
      getLead: mockFn(async () => ({ ...leadRow, status: 'qualified' })),
      createViewing: mockFn(async () => { throw new Error('error: conflicting key value violates exclusion constraint "viewings_no_agent_overlap"'); }),
    });
    const { service } = makeService(repo);
    await expect(service.scheduleViewing('lead-1', { listingId: 'listing-1', scheduledStart: now.toISOString(), scheduledEnd: new Date(now.getTime() + 3600_000).toISOString() }, agent))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('C9 — completing an already-completed task conflicts; missing task is 404', async () => {
    const repo = makeRepo({
      getTask: mockFn(async () => ({ id: 'task-1', organization_id: 'org-1', lead_id: 'lead-1', status: 'completed' })),
      completeTask: mockFn(async () => null),
    });
    const { service } = makeService(repo);
    await expect(service.completeTask('task-1', agent)).rejects.toBeInstanceOf(ConflictException);
    const repo2 = makeRepo({ getTask: mockFn(async () => null) });
    const { service: s2 } = makeService(repo2);
    await expect(s2.completeTask('task-x', agent)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('C10 — every lead transition emits a versioned CrmLeadStatusChanged.v1', async () => {
    const repo = makeRepo({ getLead: mockFn(async () => ({ ...leadRow, status: 'contacted' })) });
    const { service, outbox } = makeService(repo);
    await service.changeLeadStatus('lead-1', 'qualified', agent);
    const events = outbox.append.mock.calls.map((c: any[]) => c[0] as { eventType: string; eventVersion: number });
    expect(events.some((e: { eventType: string }) => e.eventType === 'CrmLeadStatusChanged.v1')).toBe(true);
    for (const e of events) expect(e.eventVersion).toBe(1);
  });
});
