import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsInt, IsISO8601, IsObject, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { AccessTokenGuard } from '../../../common/auth/access-token.guard';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '@platform/contracts';
import { CrmService } from '../application/crm.service';

export class CreateLeadDto {
  @IsOptional() @IsUUID() userId?: string;
  @IsOptional() @IsUUID() organizationId?: string;
  @IsOptional() @IsUUID() listingId?: string;
  @IsOptional() @IsUUID() assignedAgentId?: string;
  @IsString() @MinLength(1) @MaxLength(64) source!: string;
  @IsOptional() @IsString() @MaxLength(4) score?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class AssignLeadDto {
  @IsUUID() agentUserId!: string;
}

export class LeadStatusDto {
  @IsIn(['new', 'contacted', 'qualified', 'viewing_scheduled', 'negotiation', 'won', 'lost', 'archived'])
  status!: string;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class LeadActivityDto {
  @IsIn(['note', 'call', 'email', 'sms', 'whatsapp', 'meeting', 'other']) activityType!: string;
  @IsOptional() @IsString() @MaxLength(200) subject?: string;
  @IsOptional() @IsString() @MaxLength(4000) body?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class LeadTaskDto {
  @IsString() @MinLength(1) @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsUUID() assigneeUserId?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) priority?: number;
  @IsOptional() @IsISO8601() dueAt?: string;
}

export class CreateViewingDto {
  @IsUUID() listingId!: string;
  @IsOptional() @IsUUID() agentUserId?: string;
  @IsISO8601() scheduledStart!: string;
  @IsISO8601() scheduledEnd!: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class ViewingStatusDto {
  @IsIn(['requested', 'confirmed', 'completed', 'cancelled', 'no_show']) status!: 'requested' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
}

export class ListLeadsQuery {
  @IsOptional() @IsUUID() organizationId?: string | undefined;
  @IsOptional() @IsIn(['new', 'contacted', 'qualified', 'viewing_scheduled', 'negotiation', 'won', 'lost', 'archived']) status?: string | undefined;
  @IsOptional() @IsUUID() agentUserId?: string | undefined;
  @IsOptional() @IsInt() @Min(1) @Max(200) limit?: number | undefined;
}

@Controller('crm')
@UseGuards(AccessTokenGuard)
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Post('leads')
  async createLead(@Body() dto: CreateLeadDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.crm.createLead(dto, user) };
  }

  @Get('leads')
  async listLeads(@Query() query: ListLeadsQuery, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.crm.listLeads(user, query) };
  }

  @Get('leads/:id')
  async getLead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.crm.getLead(id, user) };
  }

  @Post('leads/:id/assign')
  async assignLead(@Param('id') id: string, @Body() dto: AssignLeadDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.crm.assignLead(id, dto.agentUserId, user) };
  }

  @Post('leads/:id/status')
  async changeStatus(@Param('id') id: string, @Body() dto: LeadStatusDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.crm.changeLeadStatus(id, dto.status, user, dto.reason) };
  }

  @Post('leads/:id/activities')
  async addActivity(@Param('id') id: string, @Body() dto: LeadActivityDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.crm.addActivity(id, dto, user) };
  }

  @Get('leads/:id/activities')
  async listActivities(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.crm.listActivities(id, user) };
  }

  @Post('leads/:id/tasks')
  async createLeadTask(@Param('id') id: string, @Body() dto: LeadTaskDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.crm.createTask(id, dto, user) };
  }

  @Post('tasks')
  async createTask(@Body() dto: LeadTaskDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.crm.createTask(undefined, dto, user) };
  }

  @Post('tasks/:id/complete')
  async completeTask(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.crm.completeTask(id, user) };
  }

  @Post('leads/:id/viewings')
  async scheduleLeadViewing(@Param('id') id: string, @Body() dto: CreateViewingDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.crm.scheduleViewing(id, dto, user) };
  }

  @Post('viewings')
  async scheduleViewing(@Body() dto: CreateViewingDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.crm.scheduleViewing(undefined, dto, user) };
  }

  @Post('viewings/:id/status')
  async updateViewingStatus(@Param('id') id: string, @Body() dto: ViewingStatusDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.crm.updateViewingStatus(id, dto.status, user) };
  }
}
