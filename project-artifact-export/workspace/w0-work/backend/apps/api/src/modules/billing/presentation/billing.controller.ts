import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsNumber, IsObject, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { AccessTokenGuard } from '../../../common/auth/access-token.guard';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '@platform/contracts';
import { BillingService } from '../application/billing.service';

export class CreatePlanDto {
  @IsString() @MinLength(2) @MaxLength(64) code!: string;
  @IsString() @MinLength(2) @MaxLength(128) name!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
}

export class CreatePlanVersionDto {
  @IsString() @MinLength(2) @MaxLength(64) planCode!: string;
  @IsNumber() @Min(1) @Max(100000) version!: number;
  @IsObject() entitlements!: Record<string, unknown>;
  @IsOptional() @IsString() effectiveFrom?: string;
}

export class SubscribeDto {
  @IsOptional() @IsUUID() userId?: string;
  @IsOptional() @IsUUID() organizationId?: string;
  @IsString() @MinLength(2) @MaxLength(64) planCode!: string;
  @IsOptional() @IsNumber() @Min(1) @Max(365) periodDays?: number;
  @IsUUID() productPriceId!: string;
}

export class ChangePlanDto {
  @IsString() @MinLength(2) @MaxLength(64) planCode!: string;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class CancelSubscriptionDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

@Controller('billing')
@UseGuards(AccessTokenGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('plans')
  listPlans() {
    return this.billing.listPlans().then((plans) => ({ data: plans }));
  }

  @Post('plans')
  createPlan(@Body() dto: CreatePlanDto, @CurrentUser() user: AuthenticatedUser) {
    return this.billing.createPlan(dto, user).then((plan) => ({ data: plan }));
  }

  @Post('plans/versions')
  createPlanVersion(@Body() dto: CreatePlanVersionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.billing.createPlanVersion(dto, user).then((version) => ({ data: version }));
  }

  @Post('subscriptions')
  subscribe(@Body() dto: SubscribeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.billing.subscribe(dto, user).then((subscription) => ({ data: subscription }));
  }

  @Post('subscriptions/:id/change-plan')
  changePlan(@Param('id') id: string, @Body() dto: ChangePlanDto, @CurrentUser() user: AuthenticatedUser) {
    return this.billing.changePlan(id, dto.planCode, user, dto.reason).then((subscription) => ({ data: subscription }));
  }

  @Post('subscriptions/:id/cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelSubscriptionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.billing.cancel(id, user, dto.reason).then(() => ({ data: { cancelled: true } }));
  }

  @Get('subscriptions/:id/events')
  listEvents(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.billing.listEvents(id, user).then((events) => ({ data: events }));
  }

  @Get('entitlements')
  myEntitlements(@CurrentUser() user: AuthenticatedUser) {
    return this.billing.resolveEntitlements({ userId: user.id }).then((resolution) => ({ data: resolution }));
  }

  @Get('organizations/:id/entitlements')
  orgEntitlements(@Param('id') id: string) {
    return this.billing.resolveEntitlements({ organizationId: id }).then((resolution) => ({ data: resolution }));
  }
}
