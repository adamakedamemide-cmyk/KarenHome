import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsNumberString, IsObject, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import type { FastifyRequest } from 'fastify';
import type { AuthenticatedUser } from '@platform/contracts';
import { AccessTokenGuard } from '../../../common/auth/access-token.guard';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { PermissionsGuard } from '../../../common/auth/permissions.guard';
import { RequirePermissions } from '../../../common/auth/permissions.decorator';
import { AdvertisingService } from '../application/advertising.service';
import { AdvertisingAdminService, type AdminContext } from '../application/advertising-admin.service';

export class ServeAdDto {
  @IsString() @MinLength(2) @MaxLength(64) slotCode!: string;
  @IsString() @MinLength(8) @MaxLength(128) sessionHash!: string;
  @IsOptional() @IsString() @MaxLength(10) locale?: string;
  @IsString() @MinLength(2) @MaxLength(32) pageType!: string;
  @IsOptional() @IsUUID() geoNodeId?: string;
}

export class ClickAdDto {
  @IsOptional() @IsString() @MaxLength(2048) referer?: string;
}

export class CreateAdvertiserDto {
  @IsUUID() organizationId!: string;
  @IsString() @MinLength(2) @MaxLength(128) name!: string;
  @IsOptional() @IsObject() contact?: Record<string, unknown>;
}

export class CreateCampaignDto {
  @IsUUID() advertiserId!: string;
  @IsString() @MinLength(2) @MaxLength(128) name!: string;
  @IsString() startAt!: string;
  @IsString() endAt!: string;
  @IsOptional() @IsIn(['CPM', 'CPC', 'FIXED', 'UNDECIDED']) pricingModel?: string;
  @IsOptional() @IsNumberString() priceAmount?: string;
  @IsOptional() @Matches(/^[A-Z]{3}$/) currencyCode?: string;
}

export class CreateCreativeDto {
  @IsUUID() campaignId!: string;
  @IsString() @MinLength(1) @MaxLength(128) name!: string;
  @IsString() @MinLength(5) @MaxLength(2048) targetUrl!: string;
  @IsOptional() @IsUUID() mediaAssetId?: string;
}

export class CreateBudgetDto {
  @IsUUID() campaignId!: string;
  @IsIn(['TOTAL', 'DAILY', 'MONTHLY']) budgetType!: 'TOTAL' | 'DAILY' | 'MONTHLY';
  @IsNumberString() limitAmount!: string;
  @Matches(/^[A-Z]{3}$/) currencyCode!: string;
}

export class UpsertTargetDto {
  @IsUUID() campaignId!: string;
  @IsIn(['COUNTRY', 'CITY', 'DISTRICT', 'PAGE_TYPE', 'PROPERTY_TYPE', 'AUDIENCE_SEGMENT', 'DEVICE', 'LANGUAGE', 'TIME_WINDOW']) dimension!: string;
  @IsOptional() @IsIn(['IN', 'NOT_IN', 'EQUALS']) operator?: string;
  @IsObject() value!: unknown;
  @IsOptional() @IsNumberString() weight?: string;
}

@Controller('ads')
export class AdsController {
  constructor(private readonly ads: AdvertisingService, private readonly admin: AdvertisingAdminService) {}

  @Post('serve')
  async serve(@Body() dto: ServeAdDto, @Req() request: FastifyRequest) {
    const result = await this.ads.serve({
      slotCode: dto.slotCode,
      sessionHash: dto.sessionHash,
      ip: request.ip,
      userAgent: typeof request.headers['user-agent'] === 'string' ? (request.headers['user-agent'] as string) : undefined,
      locale: dto.locale,
      pageType: dto.pageType,
      geoNodeId: dto.geoNodeId,
    });
    return { data: result };
  }

  @Post('impressions/:id/click')
  async click(@Param('id') id: string, @Body() dto: ClickAdDto, @Req() request: FastifyRequest) {
    const result = await this.ads.click(id, {
      ip: request.ip,
      userAgent: typeof request.headers['user-agent'] === 'string' ? (request.headers['user-agent'] as string) : undefined,
      referer: dto.referer,
    });
    return { data: result };
  }

  @Get('slots')
  async slots() {
    return { data: await this.admin.listSlots() };
  }
}

/**
 * Gate 4.1 (Phase E/H fix): the admin surface now requires the
 * `advertising.manage` permission (resolved by the 0030 effective-permission
 * engine for the x-organization-id scope) AND organization isolation is
 * enforced in AdvertisingAdminService (platform.admin override allowed).
 */
@Controller('admin/ads')
@UseGuards(AccessTokenGuard, PermissionsGuard)
@RequirePermissions('advertising.manage')
export class AdvertisingAdminController {
  constructor(private readonly admin: AdvertisingAdminService) {}

  private ctx(user: AuthenticatedUser, request: FastifyRequest): AdminContext {
    const raw = request.headers['x-organization-id'];
    return { actor: user, organizationId: typeof raw === 'string' ? raw : undefined };
  }

  @Post('advertisers')
  createAdvertiser(@Body() dto: CreateAdvertiserDto, @CurrentUser() user: AuthenticatedUser, @Req() request: FastifyRequest) {
    return this.admin.createAdvertiser(this.ctx(user, request), dto).then((advertiser) => ({ data: advertiser }));
  }

  @Post('campaigns')
  createCampaign(@Body() dto: CreateCampaignDto, @CurrentUser() user: AuthenticatedUser, @Req() request: FastifyRequest) {
    return this.admin.createCampaign(this.ctx(user, request), dto).then((campaign) => ({ data: campaign }));
  }

  @Post('campaigns/:id/status')
  setCampaignStatus(@Param('id') id: string, @Body() body: { status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'ENDED' | 'REJECTED' }, @CurrentUser() user: AuthenticatedUser, @Req() request: FastifyRequest) {
    return this.admin.setCampaignStatus(this.ctx(user, request), id, body.status).then(() => ({ data: { id, status: body.status } }));
  }

  @Post('campaigns/:id/creatives')
  createCreative(@Param('id') id: string, @Body() dto: CreateCreativeDto, @CurrentUser() user: AuthenticatedUser, @Req() request: FastifyRequest) {
    return this.admin.createCreative(this.ctx(user, request), { ...dto, campaignId: id }).then((creative) => ({ data: creative }));
  }

  @Post('campaigns/:id/targets')
  upsertTarget(@Param('id') id: string, @Body() dto: UpsertTargetDto, @CurrentUser() user: AuthenticatedUser, @Req() request: FastifyRequest) {
    return this.admin.upsertTarget(this.ctx(user, request), { ...dto, campaignId: id }).then(() => ({ data: { accepted: true } }));
  }

  @Post('campaigns/:id/budgets')
  createBudget(@Param('id') id: string, @Body() dto: CreateBudgetDto, @CurrentUser() user: AuthenticatedUser, @Req() request: FastifyRequest) {
    return this.admin.createBudget(this.ctx(user, request), { ...dto, campaignId: id }).then((budget) => ({ data: budget }));
  }

  @Get('campaigns/:id/report/:date')
  report(@Param('id') id: string, @Param('date') date: string, @CurrentUser() user: AuthenticatedUser, @Req() request: FastifyRequest) {
    return this.admin.report(this.ctx(user, request), id, date).then((r) => ({ data: r }));
  }
}
