import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsInt, IsISO8601, IsNumberString, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { AccessTokenGuard } from '../../../common/auth/access-token.guard';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '@platform/contracts';
import { ProjectsService } from '../application/projects.service';

export class CreateProjectDto {
  @IsUUID() organizationId!: string;
  @IsString() @MinLength(1) @MaxLength(200) name!: string;
  @IsString() @MinLength(1) @MaxLength(220) slug!: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @IsOptional() @IsISO8601() startDate?: string;
  @IsOptional() @IsISO8601() completionDate?: string;
  @IsOptional() @IsString() @MaxLength(500) addressText?: string;
  @IsOptional() @IsInt() @Min(0) totalUnits?: number;
}

export class ProjectStatusDto {
  @IsIn(['planned', 'pre_sale', 'under_construction', 'completed', 'suspended', 'cancelled']) status!: string;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class CreateBuildingDto {
  @IsString() @MinLength(1) @MaxLength(64) code!: string;
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsInt() @Min(1) @Max(200) floorsCount?: number;
}

export class CreateFloorDto {
  @IsInt() @Min(0) @Max(200) floorNumber!: number;
}

export class CreateUnitDto {
  @IsString() @MinLength(1) @MaxLength(64) unitNumber!: string;
  @IsOptional() @IsUUID() floorId?: string;
  @IsOptional() @IsNumberString() areaTotalM2?: string;
  @IsOptional() @IsInt() @Min(0) bedrooms?: number;
  @IsOptional() @IsInt() @Min(0) bathrooms?: number;
}

export class SellUnitDto {
  @IsOptional() @IsNumberString() price?: string;
  @IsOptional() @IsString() @MaxLength(4) currencyCode?: string;
}

export class UnitActionDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class ListProjectsQuery {
  @IsOptional() @IsUUID() organizationId?: string | undefined;
  @IsOptional() @IsIn(['planned', 'pre_sale', 'under_construction', 'completed', 'suspended', 'cancelled']) status?: string | undefined;
}

export class ListUnitsQuery {
  @IsOptional() @IsUUID() buildingId?: string | undefined;
  @IsOptional() @IsIn(['available', 'reserved', 'sold', 'unavailable']) status?: string | undefined;
}

@Controller('projects')
@UseGuards(AccessTokenGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post()
  async createProject(@Body() dto: CreateProjectDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.projects.createProject(dto, user) };
  }

  @Get()
  async listProjects(@Query() query: ListProjectsQuery, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.projects.listProjects(user, query) };
  }

  @Get(':id')
  async getProject(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.projects.getProject(id, user) };
  }

  @Post(':id/status')
  async changeStatus(@Param('id') id: string, @Body() dto: ProjectStatusDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.projects.changeProjectStatus(id, dto.status, user, dto.reason) };
  }

  @Post(':id/buildings')
  async createBuilding(@Param('id') id: string, @Body() dto: CreateBuildingDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.projects.createBuilding(id, dto, user) };
  }

  @Get(':id/buildings')
  async listBuildings(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.projects.listBuildings(id, user) };
  }

  @Post(':id/buildings/:buildingId/floors')
  async createFloor(@Param('id') id: string, @Param('buildingId') buildingId: string, @Body() dto: CreateFloorDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.projects.createFloor(id, buildingId, dto, user) };
  }

  @Get(':id/buildings/:buildingId/floors')
  async listFloors(@Param('id') id: string, @Param('buildingId') buildingId: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.projects.listFloors(id, buildingId, user) };
  }

  @Post(':id/buildings/:buildingId/units')
  async createUnit(@Param('id') id: string, @Param('buildingId') buildingId: string, @Body() dto: CreateUnitDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.projects.createUnit(id, buildingId, dto, user) };
  }

  @Get(':id/units')
  async listUnits(@Param('id') id: string, @Query() query: ListUnitsQuery, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.projects.listUnits(id, user, query) };
  }

  @Post(':id/units/:unitId/reserve')
  async reserveUnit(@Param('id') id: string, @Param('unitId') unitId: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.projects.reserveUnit(id, unitId, user) };
  }

  @Post(':id/units/:unitId/release')
  async releaseUnit(@Param('id') id: string, @Param('unitId') unitId: string, @Body() dto: UnitActionDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.projects.releaseUnit(id, unitId, user, dto.reason) };
  }

  @Post(':id/units/:unitId/sell')
  async sellUnit(@Param('id') id: string, @Param('unitId') unitId: string, @Body() dto: SellUnitDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.projects.sellUnit(id, unitId, dto, user) };
  }

  @Post(':id/units/:unitId/unavailable')
  async markUnavailable(@Param('id') id: string, @Param('unitId') unitId: string, @Body() dto: UnitActionDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.projects.markUnitUnavailable(id, unitId, user, dto.reason) };
  }
}
