import { PostgresDatabase, type QueryExecutor } from './postgres-database';

export interface CrmLeadRow {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  listing_id: string | null;
  assigned_agent_id: string | null;
  source: string;
  status: string;
  score: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CrmActivityRow {
  id: string;
  lead_id: string;
  activity_type: string;
  performed_by: string | null;
  subject: string | null;
  body: string | null;
  metadata: Record<string, unknown>;
  occurred_at: Date;
}

export interface CrmTaskRow {
  id: string;
  organization_id: string | null;
  assignee_user_id: string | null;
  lead_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  due_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
}

export interface CrmViewingRow {
  id: string;
  listing_id: string;
  lead_id: string | null;
  agent_user_id: string | null;
  scheduled_start: Date;
  scheduled_end: Date;
  status: string;
  notes: string | null;
  created_at: Date;
}

export interface LeadFilter {
  organizationId?: string | undefined;
  agentUserId?: string | undefined;
  status?: string | undefined;
  limit?: number | undefined;
}

export class CrmRepository {
  constructor(private readonly db: PostgresDatabase) {}

  // ------------------------------------------------------------------ leads

  async createLead(input: {
    userId?: string | null | undefined;
    organizationId?: string | null | undefined;
    listingId?: string | null | undefined;
    assignedAgentId?: string | null | undefined;
    source: string;
    status?: string | undefined;
    score?: string | null | undefined;
    notes?: string | null | undefined;
    executor?: QueryExecutor | undefined;
  }): Promise<CrmLeadRow> {
    const ex = input.executor ?? this.db;
    const r = await ex.query<CrmLeadRow>(
      `INSERT INTO crm.leads (user_id, organization_id, listing_id, assigned_agent_id, source, status, score, notes)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6::crm.lead_status, $7, $8)
       RETURNING id, user_id, organization_id, listing_id, assigned_agent_id, source,
                 status::text AS status, score, notes, created_at, updated_at`,
      [
        input.userId ?? null, input.organizationId ?? null, input.listingId ?? null,
        input.assignedAgentId ?? null, input.source, input.status ?? 'new',
        input.score ?? null, input.notes ?? null,
      ],
    );
    const lead = r.rows[0];
    if (!lead) throw new Error('LEAD_INSERT_FAILED');
    return lead;
  }

  async getLead(id: string, executor: QueryExecutor = this.db): Promise<CrmLeadRow | null> {
    const r = await executor.query<CrmLeadRow>(
      `SELECT id, user_id, organization_id, listing_id, assigned_agent_id, source,
              status::text AS status, score, notes, created_at, updated_at
         FROM crm.leads WHERE id = $1::uuid`,
      [id],
    );
    return r.rows[0] ?? null;
  }

  async listLeads(filter: LeadFilter = {}): Promise<CrmLeadRow[]> {
    const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200);
    const r = await this.db.query<CrmLeadRow>(
      `SELECT id, user_id, organization_id, listing_id, assigned_agent_id, source,
              status::text AS status, score, notes, created_at, updated_at
         FROM crm.leads
        WHERE ($1::uuid IS NULL OR organization_id = $1::uuid)
          AND ($2::uuid IS NULL OR assigned_agent_id = $2::uuid)
          AND ($3::text IS NULL OR status = $3::crm.lead_status)
        ORDER BY created_at DESC
        LIMIT $4`,
      [filter.organizationId ?? null, filter.agentUserId ?? null, filter.status ?? null, limit],
    );
    return r.rows;
  }

  async assignLead(id: string, agentUserId: string, executor: QueryExecutor = this.db): Promise<CrmLeadRow | null> {
    const r = await executor.query<CrmLeadRow>(
      `UPDATE crm.leads SET assigned_agent_id = $2::uuid
        WHERE id = $1::uuid
        RETURNING id, user_id, organization_id, listing_id, assigned_agent_id, source,
                  status::text AS status, score, notes, created_at, updated_at`,
      [id, agentUserId],
    );
    return r.rows[0] ?? null;
  }

  async updateLeadStatus(id: string, status: string, executor: QueryExecutor = this.db): Promise<CrmLeadRow | null> {
    const r = await executor.query<CrmLeadRow>(
      `UPDATE crm.leads SET status = $2::crm.lead_status
        WHERE id = $1::uuid
        RETURNING id, user_id, organization_id, listing_id, assigned_agent_id, source,
                  status::text AS status, score, notes, created_at, updated_at`,
      [id, status],
    );
    return r.rows[0] ?? null;
  }

  async appendActivity(input: {
    leadId: string;
    activityType: string;
    performedBy?: string | null | undefined;
    subject?: string | null | undefined;
    body?: string | null | undefined;
    metadata?: Record<string, unknown> | undefined;
  }, executor: QueryExecutor = this.db): Promise<CrmActivityRow> {
    const r = await executor.query<CrmActivityRow>(
      `INSERT INTO crm.lead_activities (lead_id, activity_type, performed_by, subject, body, metadata)
       VALUES ($1::uuid, $2::crm.activity_type, $3::uuid, $4, $5, $6::jsonb)
       RETURNING id, lead_id, activity_type::text AS activity_type, performed_by, subject, body, metadata, occurred_at`,
      [input.leadId, input.activityType, input.performedBy ?? null, input.subject ?? null, input.body ?? null, JSON.stringify(input.metadata ?? {})],
    );
    const activity = r.rows[0];
    if (!activity) throw new Error('ACTIVITY_INSERT_FAILED');
    return activity;
  }

  async hasActivityByActor(leadId: string, actorUserId: string, executor: QueryExecutor = this.db): Promise<boolean> {
    const r = await executor.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM crm.lead_activities
          WHERE lead_id = $1::uuid AND performed_by = $2::uuid
       ) AS exists`,
      [leadId, actorUserId],
    );
    return r.rows[0]?.exists === true;
  }

  async listActivities(leadId: string, limit = 50): Promise<CrmActivityRow[]> {
    const r = await this.db.query<CrmActivityRow>(
      `SELECT id, lead_id, activity_type::text AS activity_type, performed_by, subject, body, metadata, occurred_at
         FROM crm.lead_activities
        WHERE lead_id = $1::uuid
        ORDER BY occurred_at DESC
        LIMIT $2`,
      [leadId, Math.min(Math.max(limit, 1), 200)],
    );
    return r.rows;
  }

  // ------------------------------------------------------------------ tasks

  async createTask(input: {
    organizationId?: string | null | undefined;
    assigneeUserId?: string | null | undefined;
    leadId?: string | null | undefined;
    title: string;
    description?: string | null | undefined;
    priority?: number | undefined;
    dueAt?: Date | null | undefined;
  }): Promise<CrmTaskRow> {
    const r = await this.db.query<CrmTaskRow>(
      `INSERT INTO crm.tasks (organization_id, assignee_user_id, lead_id, title, description, priority, due_at)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7)
       RETURNING id, organization_id, assignee_user_id, lead_id, title, description, status,
                 priority, due_at, completed_at, created_at`,
      [
        input.organizationId ?? null, input.assigneeUserId ?? null, input.leadId ?? null,
        input.title, input.description ?? null, input.priority ?? 3, input.dueAt ?? null,
      ],
    );
    const task = r.rows[0];
    if (!task) throw new Error('TASK_INSERT_FAILED');
    return task;
  }

  async getTask(id: string, executor: QueryExecutor = this.db): Promise<CrmTaskRow | null> {
    const r = await executor.query<CrmTaskRow>(
      `SELECT id, organization_id, assignee_user_id, lead_id, title, description, status,
              priority, due_at, completed_at, created_at
         FROM crm.tasks WHERE id = $1::uuid`,
      [id],
    );
    return r.rows[0] ?? null;
  }

  async completeTask(id: string, executor: QueryExecutor = this.db): Promise<CrmTaskRow | null> {
    const r = await executor.query<CrmTaskRow>(
      `UPDATE crm.tasks SET status = 'completed', completed_at = now()
        WHERE id = $1::uuid AND status <> 'completed'
        RETURNING id, organization_id, assignee_user_id, lead_id, title, description, status,
                  priority, due_at, completed_at, created_at`,
      [id],
    );
    return r.rows[0] ?? null;
  }

  // ------------------------------------------------------------------ viewings

  async createViewing(input: {
    listingId: string;
    leadId?: string | null | undefined;
    agentUserId?: string | null | undefined;
    scheduledStart: Date;
    scheduledEnd: Date;
    notes?: string | null | undefined;
    executor?: QueryExecutor | undefined;
  }): Promise<CrmViewingRow> {
    const ex = input.executor ?? this.db;
    const r = await ex.query<CrmViewingRow>(
      `INSERT INTO crm.viewings (listing_id, lead_id, agent_user_id, scheduled_start, scheduled_end, notes)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6)
       RETURNING id, listing_id, lead_id, agent_user_id, scheduled_start, scheduled_end,
                 status::text AS status, notes, created_at`,
      [input.listingId, input.leadId ?? null, input.agentUserId ?? null, input.scheduledStart, input.scheduledEnd, input.notes ?? null],
    );
    const viewing = r.rows[0];
    if (!viewing) throw new Error('VIEWING_INSERT_FAILED');
    return viewing;
  }

  async getViewing(id: string, executor: QueryExecutor = this.db): Promise<CrmViewingRow | null> {
    const r = await executor.query<CrmViewingRow>(
      `SELECT id, listing_id, lead_id, agent_user_id, scheduled_start, scheduled_end,
              status::text AS status, notes, created_at
         FROM crm.viewings WHERE id = $1::uuid`,
      [id],
    );
    return r.rows[0] ?? null;
  }

  async updateViewingStatus(id: string, status: string, executor: QueryExecutor = this.db): Promise<CrmViewingRow | null> {
    const r = await executor.query<CrmViewingRow>(
      `UPDATE crm.viewings SET status = $2::crm.viewing_status
        WHERE id = $1::uuid
        RETURNING id, listing_id, lead_id, agent_user_id, scheduled_start, scheduled_end,
                  status::text AS status, notes, created_at`,
      [id, status],
    );
    return r.rows[0] ?? null;
  }

  async listLeadViewings(leadId: string): Promise<CrmViewingRow[]> {
    const r = await this.db.query<CrmViewingRow>(
      `SELECT id, listing_id, lead_id, agent_user_id, scheduled_start, scheduled_end,
              status::text AS status, notes, created_at
         FROM crm.viewings
        WHERE lead_id = $1::uuid
        ORDER BY scheduled_start ASC`,
      [leadId],
    );
    return r.rows;
  }
}
