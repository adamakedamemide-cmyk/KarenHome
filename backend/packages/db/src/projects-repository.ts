import { PostgresDatabase, type QueryExecutor } from './postgres-database';

/**
 * Gate 5.1 Phase D — Projects domain repository.
 *
 * Hierarchy: Developer (org) → Project → Building → Floor → Unit (+ prices, plans).
 * Cross-project integrity is DB-enforced by the frozen schema's composite foreign
 * keys (units(building_id, project_id) → project_buildings(id, project_id) and
 * units(floor_id, building_id) → project_floors(id, building_id)); this repository
 * never bypasses them. Unit/project status transitions are DB-enforced by the
 * Phase D migration 0039 (project.status_values / status_transitions + triggers).
 */

export interface ProjectRow {
  id: string;
  public_code: string;
  developer_organization_id: string;
  name: string;
  slug: string | null;
  description: string | null;
  status: string;
  start_date: string | null;
  completion_date: string | null;
  address_text: string | null;
  total_units: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectBuildingRow {
  id: string;
  project_id: string;
  code: string;
  name: string | null;
  floors_count: number | null;
}

export interface ProjectFloorRow {
  id: string;
  building_id: string;
  floor_number: number;
}

export interface ProjectUnitRow {
  id: string;
  project_id: string;
  building_id: string;
  floor_id: string | null;
  property_id: string | null;
  unit_number: string;
  area_total_m2: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectUnitPriceRow {
  id: string;
  unit_id: string;
  price: string;
  currency_code: string;
  valid_from: Date;
  valid_to: Date | null;
}

const PROJECT_COLS = `id, public_code, developer_organization_id, name, slug, description,
  status, start_date, completion_date, address_text, total_units, created_at, updated_at`;

export class ProjectsRepository {
  constructor(private readonly db: PostgresDatabase) {}

  // ---------------------------------------------------------------- organizations

  async getOrganization(id: string, executor: QueryExecutor = this.db): Promise<{ id: string; type: string; status: string } | null> {
    const r = await executor.query<{ id: string; type: string; status: string }>(
      `SELECT id, type::text AS type, status::text AS status FROM org.organizations WHERE id = $1::uuid`,
      [id],
    );
    return r.rows[0] ?? null;
  }

  // ---------------------------------------------------------------- projects

  async createProject(input: {
    developerOrganizationId: string;
    name: string;
    slug?: string | null | undefined;
    description?: string | null | undefined;
    status?: string | undefined;
    startDate?: string | null | undefined;
    completionDate?: string | null | undefined;
    addressText?: string | null | undefined;
    totalUnits?: number | null | undefined;
    executor?: QueryExecutor | undefined;
  }): Promise<ProjectRow> {
    const ex = input.executor ?? this.db;
    const r = await ex.query<ProjectRow>(
      `INSERT INTO project.projects
         (developer_organization_id, name, slug, description, status, start_date, completion_date, address_text, total_units)
       VALUES ($1::uuid, $2, $3, $4, $5, $6::date, $7::date, $8, $9)
       RETURNING ${PROJECT_COLS}`,
      [
        input.developerOrganizationId, input.name, input.slug ?? null, input.description ?? null,
        input.status ?? 'planned', input.startDate ?? null, input.completionDate ?? null,
        input.addressText ?? null, input.totalUnits ?? null,
      ],
    );
    const project = r.rows[0];
    if (!project) throw new Error('PROJECT_INSERT_FAILED');
    return project;
  }

  async getProject(id: string, executor: QueryExecutor = this.db): Promise<ProjectRow | null> {
    const r = await executor.query<ProjectRow>(
      `SELECT ${PROJECT_COLS} FROM project.projects WHERE id = $1::uuid`,
      [id],
    );
    return r.rows[0] ?? null;
  }

  async listProjects(filter: { developerOrganizationId?: string | undefined; status?: string | undefined; limit?: number | undefined } = {}): Promise<ProjectRow[]> {
    const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200);
    const r = await this.db.query<ProjectRow>(
      `SELECT ${PROJECT_COLS} FROM project.projects
        WHERE ($1::uuid IS NULL OR developer_organization_id = $1::uuid)
          AND ($2::text IS NULL OR status = $2::text)
        ORDER BY created_at DESC
        LIMIT $3`,
      [filter.developerOrganizationId ?? null, filter.status ?? null, limit],
    );
    return r.rows;
  }

  async updateProjectStatus(id: string, status: string, executor: QueryExecutor = this.db): Promise<ProjectRow | null> {
    const r = await executor.query<ProjectRow>(
      `UPDATE project.projects SET status = $2::text
        WHERE id = $1::uuid
        RETURNING ${PROJECT_COLS}`,
      [id, status],
    );
    return r.rows[0] ?? null;
  }

  // ---------------------------------------------------------------- buildings

  async createBuilding(input: {
    projectId: string;
    code: string;
    name?: string | null | undefined;
    floorsCount?: number | null | undefined;
    executor?: QueryExecutor | undefined;
  }): Promise<ProjectBuildingRow> {
    const ex = input.executor ?? this.db;
    const r = await ex.query<ProjectBuildingRow>(
      `INSERT INTO project.project_buildings (project_id, code, name, floors_count)
       VALUES ($1::uuid, $2, $3, $4)
       RETURNING id, project_id, code, name, floors_count`,
      [input.projectId, input.code, input.name ?? null, input.floorsCount ?? null],
    );
    const building = r.rows[0];
    if (!building) throw new Error('BUILDING_INSERT_FAILED');
    return building;
  }

  async getBuilding(id: string, executor: QueryExecutor = this.db): Promise<ProjectBuildingRow | null> {
    const r = await executor.query<ProjectBuildingRow>(
      `SELECT id, project_id, code, name, floors_count FROM project.project_buildings WHERE id = $1::uuid`,
      [id],
    );
    return r.rows[0] ?? null;
  }

  async listBuildings(projectId: string): Promise<ProjectBuildingRow[]> {
    const r = await this.db.query<ProjectBuildingRow>(
      `SELECT id, project_id, code, name, floors_count
         FROM project.project_buildings WHERE project_id = $1::uuid ORDER BY code ASC`,
      [projectId],
    );
    return r.rows;
  }

  // ---------------------------------------------------------------- floors

  async createFloor(input: {
    buildingId: string;
    floorNumber: number;
    executor?: QueryExecutor | undefined;
  }): Promise<ProjectFloorRow> {
    const ex = input.executor ?? this.db;
    const r = await ex.query<ProjectFloorRow>(
      `INSERT INTO project.project_floors (building_id, floor_number)
       VALUES ($1::uuid, $2)
       RETURNING id, building_id, floor_number`,
      [input.buildingId, input.floorNumber],
    );
    const floor = r.rows[0];
    if (!floor) throw new Error('FLOOR_INSERT_FAILED');
    return floor;
  }

  async getFloor(id: string, executor: QueryExecutor = this.db): Promise<ProjectFloorRow | null> {
    const r = await executor.query<ProjectFloorRow>(
      `SELECT id, building_id, floor_number FROM project.project_floors WHERE id = $1::uuid`,
      [id],
    );
    return r.rows[0] ?? null;
  }

  async listFloors(buildingId: string): Promise<ProjectFloorRow[]> {
    const r = await this.db.query<ProjectFloorRow>(
      `SELECT id, building_id, floor_number
         FROM project.project_floors WHERE building_id = $1::uuid ORDER BY floor_number ASC`,
      [buildingId],
    );
    return r.rows;
  }

  // ---------------------------------------------------------------- units

  async createUnit(input: {
    projectId: string;
    buildingId: string;
    floorId?: string | null | undefined;
    propertyId?: string | null | undefined;
    unitNumber: string;
    areaTotalM2?: string | null | undefined;
    bedrooms?: number | null | undefined;
    bathrooms?: number | null | undefined;
    status?: string | undefined;
    executor?: QueryExecutor | undefined;
  }): Promise<ProjectUnitRow> {
    const ex = input.executor ?? this.db;
    const r = await ex.query<ProjectUnitRow>(
      `INSERT INTO project.units
         (project_id, building_id, floor_id, property_id, unit_number, area_total_m2, bedrooms, bathrooms, status)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6, $7, $8, $9)
       RETURNING id, project_id, building_id, floor_id, property_id, unit_number,
                 area_total_m2, bedrooms, bathrooms, status, created_at, updated_at`,
      [
        input.projectId, input.buildingId, input.floorId ?? null, input.propertyId ?? null,
        input.unitNumber, input.areaTotalM2 ?? null, input.bedrooms ?? null,
        input.bathrooms ?? null, input.status ?? 'available',
      ],
    );
    const unit = r.rows[0];
    if (!unit) throw new Error('UNIT_INSERT_FAILED');
    return unit;
  }

  async getUnit(id: string, executor: QueryExecutor = this.db): Promise<ProjectUnitRow | null> {
    const r = await executor.query<ProjectUnitRow>(
      `SELECT id, project_id, building_id, floor_id, property_id, unit_number,
              area_total_m2, bedrooms, bathrooms, status, created_at, updated_at
         FROM project.units WHERE id = $1::uuid`,
      [id],
    );
    return r.rows[0] ?? null;
  }

  async listUnits(filter: { projectId: string; buildingId?: string | undefined; status?: string | undefined; limit?: number | undefined }): Promise<ProjectUnitRow[]> {
    const limit = Math.min(Math.max(filter.limit ?? 100, 1), 500);
    const r = await this.db.query<ProjectUnitRow>(
      `SELECT id, project_id, building_id, floor_id, property_id, unit_number,
              area_total_m2, bedrooms, bathrooms, status, created_at, updated_at
         FROM project.units
        WHERE project_id = $1::uuid
          AND ($2::uuid IS NULL OR building_id = $2::uuid)
          AND ($3::text IS NULL OR status = $3::text)
        ORDER BY created_at DESC
        LIMIT $4`,
      [filter.projectId, filter.buildingId ?? null, filter.status ?? null, limit],
    );
    return r.rows;
  }

  async updateUnitStatus(id: string, status: string, executor: QueryExecutor = this.db): Promise<ProjectUnitRow | null> {
    const r = await executor.query<ProjectUnitRow>(
      `UPDATE project.units SET status = $2::text
        WHERE id = $1::uuid
        RETURNING id, project_id, building_id, floor_id, property_id, unit_number,
                  area_total_m2, bedrooms, bathrooms, status, created_at, updated_at`,
      [id, status],
    );
    return r.rows[0] ?? null;
  }

  // ---------------------------------------------------------------- prices

  async addUnitPrice(input: {
    unitId: string;
    price: string;
    currencyCode: string;
    validFrom?: Date | null | undefined;
    executor?: QueryExecutor | undefined;
  }): Promise<ProjectUnitPriceRow> {
    const ex = input.executor ?? this.db;
    const r = await ex.query<ProjectUnitPriceRow>(
      `INSERT INTO project.unit_prices (unit_id, price, currency_code, valid_from)
       VALUES ($1::uuid, $2, $3::char(4), COALESCE($4::timestamptz, now()))
       RETURNING id, unit_id, price, currency_code, valid_from, valid_to`,
      [input.unitId, input.price, input.currencyCode, input.validFrom ?? null],
    );
    const row = r.rows[0];
    if (!row) throw new Error('UNIT_PRICE_INSERT_FAILED');
    return row;
  }

  async getLatestUnitPrice(unitId: string, executor: QueryExecutor = this.db): Promise<ProjectUnitPriceRow | null> {
    const r = await executor.query<ProjectUnitPriceRow>(
      `SELECT id, unit_id, price, currency_code, valid_from, valid_to
         FROM project.unit_prices WHERE unit_id = $1::uuid
        ORDER BY valid_from DESC LIMIT 1`,
      [unitId],
    );
    return r.rows[0] ?? null;
  }
}
