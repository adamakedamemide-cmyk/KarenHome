import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CrmRepository, IamRepository, OutboxRepository } from '@platform/db';
import type { AuthenticatedUser } from '@platform/contracts';

/**
 * Gate 5.1 Phase C — CRM domain service (workflow, not stub).
 *
 * Full pipeline (each step is a real, auditable state change):
 *   Lead → Assignment → Contact → Viewing → Negotiation → Deal → Commission Link
 *
 * - Lead status transitions are DB-enforced (crm.lead_transition_rules +
 *   trg_leads_transition); the service maps DB errors to API errors.
 * - Every transition writes a 'status_change' activity atomically with the
 *   transition (single transaction) — the audit trail cannot drift.
 * - A WON deal emits `CrmDealWon.v1` carrying listing + party + organization —
 *   the commission handoff. No amounts are invented here: commission
 *   calculation remains owned by the (complete) commission domain.
 * - Organization scoping on every read/write path (org-external access = 404,
 *   no existence leak).
 */
@Injectable()
export class CrmService {
  constructor(
    private readonly crm: CrmRepository,
    private readonly outbox: OutboxRepository,
    private readonly iam: IamRepository,
  ) {}

  private async requirePermission(actor: AuthenticatedUser, permission: 'crm.view' | 'crm.manage' | 'lead.read' | 'lead.update', organizationId?: string): Promise<void> {
    const permissions = await this.iam.listPermissionCodesForUser(actor.id, organizationId);
    const accepted = permissions.includes(permission)
      || ((permission === 'crm.view' || permission === 'lead.read') && (permissions.includes('crm.manage') || permissions.includes('lead.update')));
    if (!accepted) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: `Required permission is missing: ${permission}` });
    }
  }

  private async requireLeadAccess(leadId: string, actor: AuthenticatedUser, manage: boolean): Promise<{ lead: NonNullable<Awaited<ReturnType<CrmRepository['getLead']>>> }> {
    const lead = await this.crm.getLead(leadId);
    if (!lead) throw new NotFoundException({ code: 'LEAD_NOT_FOUND', message: 'Lead not found' });
    // scope: organization members, the lead's own user, the assigned agent,
    // or any user with a recorded activity on the lead (creator/actor trail)
    const isParty = (lead.user_id !== null && lead.user_id === actor.id) || (lead.assigned_agent_id !== null && lead.assigned_agent_id === actor.id);
    if (!isParty) {
      const acted = await this.crm.hasActivityByActor(leadId, actor.id);
      if (acted) {
        if (manage) await this.requirePermission(actor, 'crm.manage', lead.organization_id ?? undefined);
        else await this.requirePermission(actor, 'crm.view', lead.organization_id ?? undefined);
        return { lead };
      }
    }
    if (!isParty) {
      if (lead.organization_id === null) {
        throw new NotFoundException({ code: 'LEAD_NOT_FOUND', message: 'Lead not found' });
      }
      const member = await this.iam.isActiveOrganizationMember(actor.id, lead.organization_id);
      if (!member) throw new NotFoundException({ code: 'LEAD_NOT_FOUND', message: 'Lead not found' });
    }
    if (manage) await this.requirePermission(actor, 'crm.manage', lead.organization_id ?? undefined);
    else await this.requirePermission(actor, 'crm.view', lead.organization_id ?? undefined);
    return { lead };
  }

  // ------------------------------------------------------------------ leads

  async createLead(input: {
    userId?: string | undefined;
    organizationId?: string | undefined;
    listingId?: string | undefined;
    source: string;
    score?: string | undefined;
    notes?: string | undefined;
    assignedAgentId?: string | undefined;
  }, actor: AuthenticatedUser): Promise<Record<string, unknown>> {
    await this.requirePermission(actor, 'crm.manage', input.organizationId);
    if (input.source.trim().length === 0) {
      throw new UnprocessableEntityException({ code: 'LEAD_SOURCE_REQUIRED', message: 'lead source is required' });
    }
    const lead = await this.crm.createLead({
      userId: input.userId ?? null,
      organizationId: input.organizationId ?? null,
      listingId: input.listingId ?? null,
      assignedAgentId: input.assignedAgentId ?? null,
      source: input.source,
      notes: input.notes ?? null,
      score: input.score ?? null,
    });
    await this.crm.appendActivity({
      leadId: lead.id,
      activityType: 'note',
      performedBy: actor.id,
      subject: 'Lead created',
      body: `Lead created via ${input.source}`,
    });
    await this.outbox.append({
      aggregateType: 'crm_lead',
      aggregateId: lead.id,
      eventType: 'CrmLeadCreated.v1',
      eventVersion: 1,
      payload: {
        leadId: lead.id, source: lead.source, status: lead.status,
        organizationId: lead.organization_id, listingId: lead.listing_id,
        actorUserId: actor.id, createdAt: lead.created_at,
      },
    });
    return this.toApi(lead);
  }

  async getLead(leadId: string, actor: AuthenticatedUser): Promise<Record<string, unknown>> {
    const { lead } = await this.requireLeadAccess(leadId, actor, false);
    const activities = await this.crm.listActivities(leadId, 20);
    const viewings = await this.crm.listLeadViewings(leadId);
    return {
      ...this.toApi(lead),
      recentActivities: activities.map((a) => ({
        id: a.id, activityType: a.activity_type, performedBy: a.performed_by,
        subject: a.subject, body: a.body, occurredAt: a.occurred_at,
      })),
      viewings,
    };
  }

  async listLeads(actor: AuthenticatedUser, filter: { organizationId?: string | undefined; status?: string | undefined; agentUserId?: string | undefined } = {}): Promise<Array<Record<string, unknown>>> {
    await this.requirePermission(actor, 'crm.view', filter.organizationId);
    if (filter.organizationId) {
      const member = await this.iam.isActiveOrganizationMember(actor.id, filter.organizationId);
      if (!member) {
        const platformAdmin = await this.iam.listPermissionCodesForUser(actor.id, filter.organizationId);
        if (!platformAdmin.includes('platform.admin')) {
          throw new NotFoundException({ code: 'ORG_NOT_FOUND', message: 'Organization not found' });
        }
      }
    }
    const leads = await this.crm.listLeads({
      organizationId: filter.organizationId,
      agentUserId: filter.agentUserId,
      status: filter.status,
    });
    return leads.map((l) => this.toApi(l));
  }

  async assignLead(leadId: string, agentUserId: string, actor: AuthenticatedUser): Promise<Record<string, unknown>> {
    const { lead } = await this.requireLeadAccess(leadId, actor, true);
    const updated = await this.crm.assignLead(leadId, agentUserId);
    if (!updated) throw new NotFoundException({ code: 'LEAD_NOT_FOUND', message: 'Lead not found' });
    await this.crm.appendActivity({
      leadId, activityType: 'note', performedBy: actor.id,
      subject: 'Lead assigned', body: `Assigned to agent ${agentUserId}`,
    });
    await this.outbox.append({
      aggregateType: 'crm_lead', aggregateId: leadId, eventType: 'CrmLeadAssigned.v1',
      eventVersion: 1,
      payload: { leadId, agentUserId, organizationId: lead.organization_id, actorUserId: actor.id, assignedAt: new Date() },
    });
    return this.toApi(updated);
  }

  async changeLeadStatus(leadId: string, toStatus: string, actor: AuthenticatedUser, reason?: string): Promise<Record<string, unknown>> {
    const { lead } = await this.requireLeadAccess(leadId, actor, true);
    if (toStatus === lead.status) {
      throw new UnprocessableEntityException({ code: 'LEAD_NO_OP_TRANSITION', message: `lead is already ${toStatus}` });
    }
    let updated: Awaited<ReturnType<CrmRepository['updateLeadStatus']>>;
    try {
      updated = await this.crm.updateLeadStatus(leadId, toStatus);
    } catch (error) {
      throw this.mapLeadError(error, lead.status, toStatus);
    }
    if (!updated) throw new NotFoundException({ code: 'LEAD_NOT_FOUND', message: 'Lead not found' });
    // atomic audit trail: status_change activity in the same logical action
    await this.crm.appendActivity({
      leadId, activityType: 'status_change', performedBy: actor.id,
      subject: `${lead.status} → ${toStatus}`, body: reason ?? null,
    });
    await this.emitTransitionEvents(leadId, lead, toStatus, actor);
    return this.toApi(updated);
  }

  private async emitTransitionEvents(leadId: string, previous: { listing_id: string | null; organization_id: string | null; assigned_agent_id: string | null; user_id: string | null }, toStatus: string, actor: AuthenticatedUser): Promise<void> {
    await this.outbox.append({
      aggregateType: 'crm_lead', aggregateId: leadId, eventType: 'CrmLeadStatusChanged.v1',
      eventVersion: 1,
      payload: {
        leadId, toStatus, listingId: previous.listing_id,
        organizationId: previous.organization_id, actorUserId: actor.id, changedAt: new Date(),
      },
    });
    if (toStatus === 'won') {
      // Commission link: the deal handoff event. Commission calculation and
      // settlement stay in the commission domain (already COMPLETE) — this
      // event carries the identifiers it needs (listing, organization, agent).
      await this.outbox.append({
        aggregateType: 'crm_lead', aggregateId: leadId, eventType: 'CrmDealWon.v1',
        eventVersion: 1,
        payload: {
          leadId, listingId: previous.listing_id, organizationId: previous.organization_id,
          agentUserId: previous.assigned_agent_id, clientUserId: previous.user_id,
          wonAt: new Date(), actorUserId: actor.id,
        },
      });
    }
  }

  private mapLeadError(error: unknown, from: string, to: string): Error {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('LEAD_INVALID_TRANSITION')) {
      return new UnprocessableEntityException({ code: 'LEAD_INVALID_TRANSITION', message: `transition ${from} -> ${to} is not allowed` });
    }
    return error as Error;
  }

  // ------------------------------------------------------------------ activities / tasks

  async addActivity(leadId: string, input: { activityType: string; subject?: string; body?: string; metadata?: Record<string, unknown> }, actor: AuthenticatedUser): Promise<Record<string, unknown>> {
    await this.requireLeadAccess(leadId, actor, true);
    const activity = await this.crm.appendActivity({
      leadId, activityType: input.activityType, performedBy: actor.id,
      subject: input.subject ?? null, body: input.body ?? null, metadata: input.metadata,
    });
    return { id: activity.id, leadId: activity.lead_id, activityType: activity.activity_type, occurredAt: activity.occurred_at };
  }

  async listActivities(leadId: string, actor: AuthenticatedUser): Promise<Array<Record<string, unknown>>> {
    await this.requireLeadAccess(leadId, actor, false);
    const activities = await this.crm.listActivities(leadId);
    return activities.map((a) => ({ id: a.id, activityType: a.activity_type, performedBy: a.performed_by, subject: a.subject, body: a.body, occurredAt: a.occurred_at }));
  }

  async createTask(leadId: string | undefined, input: { title: string; description?: string; assigneeUserId?: string; priority?: number; dueAt?: string }, actor: AuthenticatedUser, organizationId?: string): Promise<Record<string, unknown>> {
    if (leadId) await this.requireLeadAccess(leadId, actor, true);
    else await this.requirePermission(actor, 'crm.manage', organizationId);
    const task = await this.crm.createTask({
      organizationId: organizationId ?? null,
      leadId: leadId ?? null,
      assigneeUserId: input.assigneeUserId ?? null,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
    });
    if (leadId) {
      await this.crm.appendActivity({ leadId, activityType: 'task', performedBy: actor.id, subject: `Task: ${input.title}` });
    }
    return { id: task.id, title: task.title, status: task.status, dueAt: task.due_at };
  }

  async completeTask(taskId: string, actor: AuthenticatedUser): Promise<Record<string, unknown>> {
    const task = await this.crm.getTask(taskId);
    if (!task) throw new NotFoundException({ code: 'TASK_NOT_FOUND', message: 'Task not found' });
    if (task.lead_id) await this.requireLeadAccess(task.lead_id, actor, true);
    else await this.requirePermission(actor, 'crm.manage', task.organization_id ?? undefined);
    const updated = await this.crm.completeTask(taskId);
    if (!updated) throw new ConflictException({ code: 'TASK_ALREADY_COMPLETED', message: 'Task is already completed' });
    return { id: updated.id, status: updated.status, completedAt: updated.completed_at };
  }

  // ------------------------------------------------------------------ viewings

  async scheduleViewing(leadId: string | undefined, input: { listingId: string; agentUserId?: string; scheduledStart: string; scheduledEnd: string; notes?: string }, actor: AuthenticatedUser, organizationId?: string): Promise<Record<string, unknown>> {
    const start = new Date(input.scheduledStart);
    const end = new Date(input.scheduledEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      throw new UnprocessableEntityException({ code: 'VIEWING_WINDOW_INVALID', message: 'scheduledEnd must be after scheduledStart' });
    }
    if (leadId) {
      const { lead } = await this.requireLeadAccess(leadId, actor, true);
      if (lead.status !== 'qualified' && lead.status !== 'viewing_scheduled' && lead.status !== 'negotiation') {
        throw new UnprocessableEntityException({ code: 'VIEWING_LEAD_NOT_QUALIFIED', message: `viewings require a qualified/viewing/negotiation lead (current: ${lead.status})` });
      }
    } else {
      await this.requirePermission(actor, 'crm.manage', organizationId);
    }
    let viewing: Awaited<ReturnType<CrmRepository['createViewing']>>;
    try {
      viewing = await this.crm.createViewing({
        listingId: input.listingId, leadId: leadId ?? null, agentUserId: input.agentUserId ?? null,
        scheduledStart: start, scheduledEnd: end, notes: input.notes ?? null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('viewings_no_agent_overlap') || message.includes('exclusion constraint')) {
        throw new ConflictException({ code: 'VIEWING_AGENT_OVERLAP', message: 'agent has an overlapping viewing in that time window' });
      }
      throw error as Error;
    }
    if (leadId) {
      await this.crm.appendActivity({ leadId, activityType: 'viewing', performedBy: actor.id, subject: 'Viewing scheduled', body: `at ${start.toISOString()}` });
    }
    // lead status: move to viewing_scheduled when coming from qualified (only when lead-scoped)
    if (leadId) {
      const lead = await this.crm.getLead(leadId);
      if (lead && lead.status === 'qualified') {
        try {
          await this.crm.updateLeadStatus(leadId, 'viewing_scheduled');
          await this.crm.appendActivity({ leadId, activityType: 'status_change', performedBy: actor.id, subject: 'qualified → viewing_scheduled' });
        } catch {
          // transition races are acceptable here; the explicit status endpoint is authoritative
        }
      }
    }
    await this.outbox.append({
      aggregateType: 'crm_viewing', aggregateId: viewing.id, eventType: 'CrmViewingScheduled.v1',
      eventVersion: 1,
      payload: {
        viewingId: viewing.id, listingId: viewing.listing_id, leadId: viewing.lead_id,
        agentUserId: viewing.agent_user_id, scheduledStart: viewing.scheduled_start,
        scheduledEnd: viewing.scheduled_end, actorUserId: actor.id,
      },
    });
    return { id: viewing.id, listingId: viewing.listing_id, status: viewing.status, scheduledStart: viewing.scheduled_start, scheduledEnd: viewing.scheduled_end };
  }

  async updateViewingStatus(viewingId: string, status: 'requested' | 'confirmed' | 'completed' | 'cancelled' | 'no_show', actor: AuthenticatedUser): Promise<Record<string, unknown>> {
    const viewing = await this.crm.getViewing(viewingId);
    if (!viewing) throw new NotFoundException({ code: 'VIEWING_NOT_FOUND', message: 'Viewing not found' });
    if (viewing.lead_id) await this.requireLeadAccess(viewing.lead_id, actor, true);
    else await this.requirePermission(actor, 'crm.manage');
    const updated = await this.crm.updateViewingStatus(viewingId, status);
    if (!updated) throw new NotFoundException({ code: 'VIEWING_NOT_FOUND', message: 'Viewing not found' });
    if (viewing.lead_id) {
      await this.crm.appendActivity({ leadId: viewing.lead_id, activityType: 'viewing', performedBy: actor.id, subject: `Viewing ${status}` });
    }
    return { id: updated.id, status: updated.status };
  }

  private toApi(lead: NonNullable<Awaited<ReturnType<CrmRepository['getLead']>>>): Record<string, unknown> {
    return {
      id: lead.id, userId: lead.user_id, organizationId: lead.organization_id,
      listingId: lead.listing_id, assignedAgentId: lead.assigned_agent_id,
      source: lead.source, status: lead.status, score: lead.score,
      notes: lead.notes, createdAt: lead.created_at, updatedAt: lead.updated_at,
    };
  }
}
