import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsNumberString, IsObject, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { AccessTokenGuard } from '../../../common/auth/access-token.guard';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '@platform/contracts';
import { CommissionEngineService, type CommissionCalculationResult } from '../application/commission-engine.service';
import { CommissionSettlementService } from '../application/commission-settlement.service';

export class CalculateCommissionDto {
  @IsOptional() @IsUUID() listingId?: string;
  @IsIn(['Owner', 'Agent', 'Marketer', 'Organization']) partyRole!: 'Owner' | 'Agent' | 'Marketer' | 'Organization';
  @IsOptional() @IsUUID() partyUserId?: string;
  @IsOptional() @IsUUID() partyOrganizationId?: string;
  @IsNumberString() baseAmount!: string;
  @IsString() @MinLength(3) @MaxLength(3) currencyCode!: string;
  @IsOptional() @IsString() transactionType?: string;
  @IsOptional() @IsString() propertyType?: string;
  @IsOptional() @IsUUID() geoNodeId?: string;
  @IsOptional() @IsUUID() campaignId?: string;
  @IsOptional() @IsString() referralCode?: string;
}

export class CreateCommissionRuleDto {
  @IsString() @MinLength(2) @MaxLength(64) code!: string;
  @IsString() @MinLength(2) @MaxLength(128) name!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsIn(['Owner', 'Agent', 'Marketer', 'Organization']) partyRole!: string;
  @IsObject() matches!: Record<string, unknown>;
  @IsNumberString() version!: string;
  @IsObject() paramConfig!: Record<string, unknown>;
}

export class RuleStatusDto {
  @IsIn(['TBD', 'CONFIGURABLE', 'UNDECIDED', 'ACTIVE', 'RETIRED']) status!: 'TBD' | 'CONFIGURABLE' | 'UNDECIDED' | 'ACTIVE' | 'RETIRED';
}

export class CreateSettlementDto {
  @IsUUID() calculationId!: string;
  @IsNumberString() amount!: string;
  @IsString() @MinLength(3) @MaxLength(3) currencyCode!: string;
}

export class SettlementStatusDto {
  @IsIn(['PENDING', 'APPROVED', 'SETTLED', 'CANCELLED']) status!: 'PENDING' | 'APPROVED' | 'SETTLED' | 'CANCELLED';
}

export class CreatePayoutDto {
  @IsOptional() @IsUUID() beneficiaryUserId?: string;
  @IsOptional() @IsUUID() beneficiaryOrganizationId?: string;
  @IsNumberString() amount!: string;
  @IsString() @MinLength(3) @MaxLength(3) currencyCode!: string;
  @IsOptional() @IsString() @MaxLength(128) reference?: string;
}

export class PayoutStatusDto {
  @IsIn(['REQUESTED', 'APPROVED', 'PAID', 'FAILED', 'CANCELLED']) status!: 'REQUESTED' | 'APPROVED' | 'PAID' | 'FAILED' | 'CANCELLED';
}

@Controller('commission')
@UseGuards(AccessTokenGuard)
export class CommissionController {
  constructor(
    private readonly engine: CommissionEngineService,
    private readonly settlement: CommissionSettlementService,
  ) {}

  @Post('calculations')
  async calculate(@Body() dto: CalculateCommissionDto, @CurrentUser() user: AuthenticatedUser): Promise<{ data: CommissionCalculationResult }> {
    await this.engine.requireCommissionPermission(user, 'commission.manage', dto.partyOrganizationId);
    return { data: await this.engine.calculate(dto, user) };
  }

  @Get('calculations/:id')
  async getCalculation(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.engine.requireCommissionPermission(user, 'commission.view');
    return { data: await this.settlement.getCalculation(id) };
  }

  @Post('rules')
  async createRule(@Body() dto: CreateCommissionRuleDto, @CurrentUser() user: AuthenticatedUser) {
    await this.engine.requireCommissionPermission(user, 'commission.manage');
    return { data: await this.settlement.createRuleWithVersion(dto, user.id) };
  }

  @Post('rules/:id/status')
  async setRuleStatus(@Param('id') id: string, @Body() dto: RuleStatusDto, @CurrentUser() user: AuthenticatedUser) {
    await this.engine.requireCommissionPermission(user, 'commission.manage');
    return { data: await this.settlement.setRuleStatus(id, dto.status) };
  }

  @Post('settlements')
  async createSettlement(@Body() dto: CreateSettlementDto, @CurrentUser() user: AuthenticatedUser) {
    await this.engine.requireCommissionPermission(user, 'commission.manage');
    return { data: await this.settlement.createSettlement(dto, user.id) };
  }

  @Post('settlements/:id/status')
  async setSettlementStatus(@Param('id') id: string, @Body() dto: SettlementStatusDto, @CurrentUser() user: AuthenticatedUser) {
    await this.engine.requireCommissionPermission(user, 'commission.manage');
    await this.settlement.updateSettlementStatus(id, dto.status, user.id);
    return { data: { id, status: dto.status } };
  }

  @Post('payouts')
  async createPayout(@Body() dto: CreatePayoutDto, @CurrentUser() user: AuthenticatedUser) {
    await this.engine.requireCommissionPermission(user, 'commission.manage');
    return { data: await this.settlement.createPayout(dto) };
  }

  @Post('payouts/:id/status')
  async setPayoutStatus(@Param('id') id: string, @Body() dto: PayoutStatusDto, @CurrentUser() user: AuthenticatedUser) {
    await this.engine.requireCommissionPermission(user, 'commission.manage');
    await this.settlement.updatePayoutStatus(id, dto.status);
    return { data: { id, status: dto.status } };
  }
}
