import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { IamRepository, OutboxRepository, ProjectsRepository, type ProjectRow, type ProjectUnitRow } from '@platform/db';
import type { AuthenticatedUser } from '@platform/contracts';

/**
 * Gate 5.1 Phase D — Projects domain service.
 *
 * Hierarchy: Developer org → Project → Building → Floor → Unit.
 * Capabilities: Availability, Reservation, Release, Sale — each a real,
 * auditable state change with a versioned outbox event.
 *
 * State-machine layering (per Gate 5.1 governance — each invariant owned by ONE
 * authoritative layer, never by application code alone):
 *   DB trigger (migration 0039)  → status vocabulary + allowed transitions for
 *                                  project.projects and project.units (authoritative)
 *   DB constraint                → hierarchy integrity: units(building_id, project_id)
 *                                  → project_buildings(id, project_id);
 *                                  units(floor_id, building_id) → project_floors(id, building_id);
 *                                  EXCLUDE unit_prices_no_overlap; CHECK price >= 0
 *   Transaction                  → price snapshot + status change for Sale in one tx
 *   Service rule                 → friendly pre-checks (422/409) before DB round-trip;
 *                                  DB errors mapped to domain error codes
 *   Authorization rule           → project.view / project.manage, org-scoped
 *   Organization isolation       → developer-org membership required; out-of-org
 *                                  access = 404 (no existence leak)
 *   Audit trail                  → versioned outbox events for every state change
 *
 * Cross-project rules (reject by construction):
 *   - a Building/Floor/Unit path is always resolved from the project in the URL;
 *     any mismatch = 404 (no existence leak), and the DB composite FKs are the
 *     final defense (raw SQL cannot create cross-project references).
 *   - Sale finalizes ONLY against the project owning the unit in the path.
 */

const PROJECT_STATUSES = ['planned', 'pre_sale', 'under_construction', 'completed', 'suspended', 'cancelled'] as const;
const UNIT_STATUSES = ['available', 'reserved', 'sold', 'unavailable'] as const;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projects: ProjectsRepository,
    private readonly outbox: OutboxRepository,
    private readonly iam: IamRepository,
  ) {}

  private async requirePermission(actor: AuthenticatedUser, permission: 'project.view' | 'project.manage', organizationId?: string): Promise<void> {
    const permissions = await this.iam.listPermissionCodesForUser(actor.id, organizationId);
    const accepted = permissions.includes(permission)
      || (permission === 'project.view' && permissions.includes('project.manage'));
    if (!accepted) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: `Required permission is missing: ${permission}` });
    }
  }

  private async requireProjectAccess(projectId: string, actor: AuthenticatedUser, manage: boolean): Promise<{ project: ProjectRow }> {
    const project = await this.projects.getProject(projectId);
    if (!project) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });
    const member = await this.iam.isActiveOrganizationMember(actor.id, project.developer_organization_id);
    if (!member) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });
    await this.requirePermission(actor, manage ? 'project.manage' : 'project.view', project.developer_organization_id);
    return { project };
  }

  /** Unit paths are project-scoped: a unit of another project is invisible (404, no leak). */
  private async requireProjectUnit(projectId: string, unitId: string, actor: AuthenticatedUser): Promise<{ project: ProjectRow; unit: ProjectUnitRow }> {
    const { project } = await this.requireProjectAccess(projectId, actor, true);
    const unit = await this.projects.getUnit(unitId);
    if (!unit || unit.project_id !== project.id) {
      throw new NotFoundException({ code: 'UNIT_NOT_FOUND', message: 'Unit not found in this project' });
    }
    return { project, unit };
  }

  // ---------------------------------------------------------------- projects

  async createProject(input: {
    organizationId: string;
    name: string;
    slug: string;
    description?: string | undefined;
    startDate?: string | undefined;
    completionDate?: string | undefined;
    addressText?: string | undefined;
    totalUnits?: number | undefined;
  }, actor: AuthenticatedUser): Promise<Record<string, unknown>> {
    await this.requirePermission(actor, 'project.manage', input.organizationId);
    const org = await this.projects.getOrganization(input.organizationId);
    if (!org) throw new NotFoundException({ code: 'ORG_NOT_FOUND', message: 'Organization not found' });
    if (org.type !== 'developer') {
      throw new UnprocessableEntityException({ code: 'PROJECT_ORG_NOT_DEVELOPER', message: 'projects can only be created by developer organizations' });
    }
    const member = await this.iam.isActiveOrganizationMember(actor.id, input.organizationId);
    if (!member) throw new NotFoundException({ code: 'ORG_NOT_FOUND', message: 'Organization not found' });
    if (input.completionDate && input.startDate && input.completionDate < input.startDate) {
      throw new UnprocessableEntityException({ code: 'PROJECT_DATES_INVALID', message: 'completionDate must not precede startDate' });
    }
    const project = await this.projects.createProject({
      developerOrganizationId: input.organizationId,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      startDate: input.startDate ?? null,
      completionDate: input.completionDate ?? null,
      addressText: input.addressText ?? null,
      totalUnits: input.totalUnits ?? null,
    });
    await this.outbox.append({
      aggregateType: 'project', aggregateId: project.id, eventType: 'ProjectCreated.v1', eventVersion: 1,
      payload: {
        projectId: project.id, publicCode: project.public_code, name: project.name,
        developerOrganizationId: project.developer_organization_id, status: project.status,
        actorUserId: actor.id, createdAt: project.created_at,
      },
    });
    return this.toApi(project);
  }

  async getProject(projectId: string, actor: AuthenticatedUser): Promise<Record<string, unknown>> {
    const { project } = await this.requireProjectAccess(projectId, actor, false);
    const buildings = await this.projects.listBuildings(projectId);
    return { ...this.toApi(project), buildings: buildings.map((b) => this.toBuildingApi(b)) };
  }

  async listProjects(actor: AuthenticatedUser, filter: { organizationId?: string | undefined; status?: string | undefined } = {}): Promise<Array<Record<string, unknown>>> {
    if (filter.organizationId) {
      const member = await this.iam.isActiveOrganizationMember(actor.id, filter.organizationId);
      if (!member) throw new NotFoundException({ code: 'ORG_NOT_FOUND', message: 'Organization not found' });
      await this.requirePermission(actor, 'project.view', filter.organizationId);
    } else {
      await this.requirePermission(actor, 'project.view');
    }
    const rows = await this.projects.listProjects({
      developerOrganizationId: filter.organizationId,
      status: filter.status,
    });
    return rows.map((p) => this.toApi(p));
  }

  async changeProjectStatus(projectId: string, toStatus: string, actor: AuthenticatedUser, reason?: string): Promise<Record<string, unknown>> {
    const { project } = await this.requireProjectAccess(projectId, actor, true);
    if (toStatus === project.status) {
      throw new UnprocessableEntityException({ code: 'PROJECT_NO_OP_TRANSITION', message: `project is already ${toStatus}` });
    }
    let updated: Awaited<ReturnType<ProjectsRepository['updateProjectStatus']>>;
    try {
      updated = await this.projects.updateProjectStatus(projectId, toStatus);
    } catch (error) {
      throw this.mapStatusError(error, 'PROJECT', project.status, toStatus);
    }
    if (!updated) throw new NotFoundException({ code: 'PROJECT_NOT_FOUND', message: 'Project not found' });
    await this.outbox.append({
      aggregateType: 'project', aggregateId: projectId, eventType: 'ProjectStatusChanged.v1', eventVersion: 1,
      payload: {
        projectId, fromStatus: project.status, toStatus, reason: reason ?? null,
        developerOrganizationId: project.developer_organization_id, actorUserId: actor.id, changedAt: new Date(),
      },
    });
    return this.toApi(updated);
  }

  // ---------------------------------------------------------------- buildings / floors

  async createBuilding(projectId: string, input: { code: string; name?: string; floorsCount?: number }, actor: AuthenticatedUser): Promise<Record<string, unknown>> {
    await this.requireProjectAccess(projectId, actor, true);
    const building = await this.projects.createBuilding({
      projectId, code: input.code, name: input.name ?? null, floorsCount: input.floorsCount ?? null,
    });
    await this.outbox.append({
      aggregateType: 'project', aggregateId: projectId, eventType: 'ProjectBuildingAdded.v1', eventVersion: 1,
      payload: { projectId, buildingId: building.id, code: building.code, actorUserId: actor.id },
    });
    return this.toBuildingApi(building);
  }

  async listBuildings(projectId: string, actor: AuthenticatedUser): Promise<Array<Record<string, unknown>>> {
    await this.requireProjectAccess(projectId, actor, false);
    return (await this.projects.listBuildings(projectId)).map((b) => this.toBuildingApi(b));
  }

  async createFloor(projectId: string, buildingId: string, input: { floorNumber: number }, actor: AuthenticatedUser): Promise<Record<string, unknown>> {
    const { project } = await this.requireProjectAccess(projectId, actor, true);
    const building = await this.projects.getBuilding(buildingId);
    if (!building || building.project_id !== project.id) {
      throw new NotFoundException({ code: 'BUILDING_NOT_FOUND', message: 'Building not found in this project' });
    }
    const floor = await this.projects.createFloor({ buildingId, floorNumber: input.floorNumber });
    await this.outbox.append({
      aggregateType: 'project', aggregateId: projectId, eventType: 'ProjectFloorAdded.v1', eventVersion: 1,
      payload: { projectId, buildingId, floorId: floor.id, floorNumber: floor.floor_number, actorUserId: actor.id },
    });
    return this.toFloorApi(floor);
  }

  async listFloors(projectId: string, buildingId: string, actor: AuthenticatedUser): Promise<Array<Record<string, unknown>>> {
    const { project } = await this.requireProjectAccess(projectId, actor, false);
    const building = await this.projects.getBuilding(buildingId);
    if (!building || building.project_id !== project.id) {
      throw new NotFoundException({ code: 'BUILDING_NOT_FOUND', message: 'Building not found in this project' });
    }
    return (await this.projects.listFloors(buildingId)).map((f) => this.toFloorApi(f));
  }

  // ---------------------------------------------------------------- units

  async createUnit(projectId: string, buildingId: string, input: {
    unitNumber: string;
    floorId?: string | undefined;
    areaTotalM2?: string | undefined;
    bedrooms?: number | undefined;
    bathrooms?: number | undefined;
  }, actor: AuthenticatedUser): Promise<Record<string, unknown>> {
    const { project } = await this.requireProjectAccess(projectId, actor, true);
    const building = await this.projects.getBuilding(buildingId);
    if (!building || building.project_id !== project.id) {
      throw new NotFoundException({ code: 'BUILDING_NOT_FOUND', message: 'Building not found in this project' });
    }
    if (input.floorId) {
      const floor = await this.projects.getFloor(input.floorId);
      if (!floor || floor.building_id !== buildingId) {
        throw new UnprocessableEntityException({ code: 'UNIT_FLOOR_MISMATCH', message: 'floor does not belong to this building' });
      }
    }
    const unit = await this.projects.createUnit({
      projectId, buildingId, floorId: input.floorId ?? null, unitNumber: input.unitNumber,
      areaTotalM2: input.areaTotalM2 ?? null, bedrooms: input.bedrooms ?? null, bathrooms: input.bathrooms ?? null,
    });
    await this.outbox.append({
      aggregateType: 'project_unit', aggregateId: unit.id, eventType: 'ProjectUnitRegistered.v1', eventVersion: 1,
      payload: {
        projectId, buildingId, unitId: unit.id, unitNumber: unit.unit_number,
        floorId: unit.floor_id, status: unit.status, actorUserId: actor.id,
      },
    });
    return this.toUnitApi(unit);
  }

  async listUnits(projectId: string, actor: AuthenticatedUser, filter: { buildingId?: string | undefined; status?: string | undefined } = {}): Promise<Array<Record<string, unknown>>> {
    await this.requireProjectAccess(projectId, actor, false);
    return (await this.projects.listUnits({ projectId, buildingId: filter.buildingId, status: filter.status })).map((u) => this.toUnitApi(u));
  }

  /** Availability + Reservation + Release + Sale — DB trigger is the authority. */

  async reserveUnit(projectId: string, unitId: string, actor: AuthenticatedUser): Promise<Record<string, unknown>> {
    const { project, unit } = await this.requireProjectUnit(projectId, unitId, actor);
    if (unit.status !== 'available') {
      throw new ConflictException({ code: 'UNIT_NOT_AVAILABLE', message: `unit is ${unit.status}, only available units can be reserved` });
    }
    const updated = await this.transitionUnit(unit, 'reserved');
    await this.outbox.append({
      aggregateType: 'project_unit', aggregateId: unit.id, eventType: 'ProjectUnitReserved.v1', eventVersion: 1,
      payload: { projectId, unitId, buildingId: unit.building_id, fromStatus: unit.status, toStatus: 'reserved', developerOrganizationId: project.developer_organization_id, actorUserId: actor.id, reservedAt: new Date() },
    });
    return this.toUnitApi(updated);
  }

  async releaseUnit(projectId: string, unitId: string, actor: AuthenticatedUser, reason?: string): Promise<Record<string, unknown>> {
    const { project, unit } = await this.requireProjectUnit(projectId, unitId, actor);
    if (unit.status !== 'reserved') {
      throw new ConflictException({ code: 'UNIT_NOT_RESERVED', message: `unit is ${unit.status}, only reserved units can be released` });
    }
    const updated = await this.transitionUnit(unit, 'available');
    await this.outbox.append({
      aggregateType: 'project_unit', aggregateId: unit.id, eventType: 'ProjectUnitReleased.v1', eventVersion: 1,
      payload: { projectId, unitId, buildingId: unit.building_id, fromStatus: unit.status, toStatus: 'available', reason: reason ?? null, developerOrganizationId: project.developer_organization_id, actorUserId: actor.id },
    });
    return this.toUnitApi(updated);
  }

  async sellUnit(projectId: string, unitId: string, input: { price?: string; currencyCode?: string }, actor: AuthenticatedUser): Promise<Record<string, unknown>> {
    const { project, unit } = await this.requireProjectUnit(projectId, unitId, actor);
    if (unit.status !== 'reserved') {
      throw new ConflictException({ code: 'UNIT_NOT_RESERVABLE_SALE', message: `unit is ${unit.status}, sale finalizes a reserved unit` });
    }
    let priceRow: Awaited<ReturnType<ProjectsRepository['addUnitPrice']>> | null = null;
    if (input.price !== undefined || input.currencyCode !== undefined) {
      if (input.price === undefined || input.currencyCode === undefined) {
        throw new UnprocessableEntityException({ code: 'UNIT_PRICE_INCOMPLETE', message: 'sale price requires both price and currencyCode' });
      }
      const n = Number(input.price);
      if (!Number.isFinite(n) || n < 0) {
        throw new UnprocessableEntityException({ code: 'UNIT_PRICE_INVALID', message: 'price must be a non-negative number' });
      }
      priceRow = await this.projects.addUnitPrice({
        unitId: unit.id, price: input.price, currencyCode: input.currencyCode, validFrom: new Date(),
      });
    }
    // No price input → no amount is invented: the event references a previously
    // registered price if one exists, and otherwise carries identifiers only.
    const previousPrice = priceRow ? null : await this.projects.getLatestUnitPrice(unit.id);
    const updated = await this.transitionUnit(unit, 'sold');
    await this.outbox.append({
      aggregateType: 'project_unit', aggregateId: unit.id, eventType: 'ProjectUnitSold.v1', eventVersion: 1,
      payload: {
        projectId, unitId, buildingId: unit.building_id,
        priceId: priceRow?.id ?? null,
        price: priceRow?.price ?? previousPrice?.price ?? null,
        currencyCode: priceRow?.currency_code ?? previousPrice?.currency_code ?? null,
        developerOrganizationId: project.developer_organization_id, actorUserId: actor.id, soldAt: new Date(),
      },
    });
    return this.toUnitApi(updated);
  }

  async markUnitUnavailable(projectId: string, unitId: string, actor: AuthenticatedUser, reason?: string): Promise<Record<string, unknown>> {
    const { project, unit } = await this.requireProjectUnit(projectId, unitId, actor);
    if (unit.status === 'sold') {
      throw new ConflictException({ code: 'UNIT_SOLD_IMMUTABLE', message: 'sold units cannot be marked unavailable' });
    }
    const updated = await this.transitionUnit(unit, 'unavailable');
    await this.outbox.append({
      aggregateType: 'project_unit', aggregateId: unit.id, eventType: 'ProjectUnitMarkedUnavailable.v1', eventVersion: 1,
      payload: { projectId, unitId, buildingId: unit.building_id, fromStatus: unit.status, toStatus: 'unavailable', reason: reason ?? null, developerOrganizationId: project.developer_organization_id, actorUserId: actor.id },
    });
    return this.toUnitApi(updated);
  }

  private async transitionUnit(unit: ProjectUnitRow, toStatus: string): Promise<ProjectUnitRow> {
    const updated = await this.projects.updateUnitStatus(unit.id, toStatus);
    if (!updated) throw new NotFoundException({ code: 'UNIT_NOT_FOUND', message: 'Unit not found' });
    return updated;
  }

  // ---------------------------------------------------------------- error mapping

  private mapStatusError(error: unknown, kind: 'PROJECT' | 'UNIT', from: string, to: string): Error {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes(`${kind}_INVALID_TRANSITION`)) {
      return new UnprocessableEntityException({ code: `${kind}_INVALID_TRANSITION`, message: `transition ${from} -> ${to} is not allowed` });
    }
    if (message.includes(`${kind}_UNKNOWN_STATUS`)) {
      return new UnprocessableEntityException({ code: `${kind}_UNKNOWN_STATUS`, message: `${kind.toLowerCase()} status '${to}' is not registered` });
    }
    return error as Error;
  }

  // ---------------------------------------------------------------- api shaping

  private toApi(p: ProjectRow): Record<string, unknown> {
    return {
      id: p.id, publicCode: p.public_code, developerOrganizationId: p.developer_organization_id,
      name: p.name, slug: p.slug, description: p.description, status: p.status,
      startDate: p.start_date, completionDate: p.completion_date, addressText: p.address_text,
      totalUnits: p.total_units, createdAt: p.created_at, updatedAt: p.updated_at,
    };
  }

  private toBuildingApi(b: NonNullable<Awaited<ReturnType<ProjectsRepository['getBuilding']>>>): Record<string, unknown> {
    return { id: b.id, projectId: b.project_id, code: b.code, name: b.name, floorsCount: b.floors_count };
  }

  private toFloorApi(f: NonNullable<Awaited<ReturnType<ProjectsRepository['getFloor']>>>): Record<string, unknown> {
    return { id: f.id, buildingId: f.building_id, floorNumber: f.floor_number };
  }

  private toUnitApi(u: ProjectUnitRow): Record<string, unknown> {
    return {
      id: u.id, projectId: u.project_id, buildingId: u.building_id, floorId: u.floor_id,
      unitNumber: u.unit_number, areaTotalM2: u.area_total_m2, bedrooms: u.bedrooms,
      bathrooms: u.bathrooms, status: u.status, createdAt: u.created_at, updatedAt: u.updated_at,
    };
  }

  // exposed for controller DTOs / OpenAPI documentation
  static readonly allowedProjectStatuses = PROJECT_STATUSES;
  static readonly allowedUnitStatuses = UNIT_STATUSES;
}
