import { Injectable, NotFoundException } from '@nestjs/common';
import { CommissionRepository } from '@platform/db';

/**
 * Settlement / adjustment / payout application service (§7).
 * Settlements freeze the calculation amount; payouts reference beneficiaries;
 * adjustments are explicit REVERSAL/CORRECTION records (never silent edits).
 */
@Injectable()
export class CommissionSettlementService {
  constructor(private readonly commission: CommissionRepository) {}

  async createRuleWithVersion(input: {
    code: string; name: string; description?: string; partyRole: string; matches: Record<string, unknown>;
    version: string; paramConfig: Record<string, unknown>;
  }, createdBy: string): Promise<{ ruleId: string; versionId: string }> {
    const existing = await this.commission.getRuleByCode(input.code);
    if (existing) {
      const version = await this.commission.createRuleVersion({
        ruleId: existing.id,
        version: Number(input.version),
        paramConfig: input.paramConfig,
        effectiveFrom: new Date(),
      });
      return { ruleId: existing.id, versionId: version.id };
    }
    const rule = await this.commission.createRule({
      code: input.code,
      name: input.name,
      description: input.description,
      partyRole: input.partyRole,
      matches: input.matches,
      createdBy,
    });
    const version = await this.commission.createRuleVersion({
      ruleId: rule.id,
      version: Number(input.version),
      paramConfig: input.paramConfig,
      effectiveFrom: new Date(),
    });
    return { ruleId: rule.id, versionId: version.id };
  }

  async setRuleStatus(ruleId: string, status: string): Promise<{ id: string; status: string }> {
    await this.commission.setRuleStatus(ruleId, status as 'ACTIVE' | 'RETIRED' | 'TBD' | 'CONFIGURABLE' | 'UNDECIDED');
    return { id: ruleId, status };
  }

  async createSettlement(input: { calculationId: string; amount: string; currencyCode: string }, actorUserId: string): Promise<{ id: string }> {
    const calculation = await this.commission.getCalculation(input.calculationId);
    if (!calculation) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Calculation not found' });
    const id = await this.commission.createSettlement({
      calculationId: input.calculationId,
      amount: input.amount,
      currencyCode: input.currencyCode,
      meta: { createdBy: actorUserId },
    });
    return { id };
  }

  async updateSettlementStatus(settlementId: string, status: 'PENDING' | 'APPROVED' | 'SETTLED' | 'CANCELLED', settledBy: string): Promise<void> {
    await this.commission.updateSettlementStatus(settlementId, status, settledBy);
  }

  async createPayout(input: { beneficiaryUserId?: string; beneficiaryOrganizationId?: string; amount: string; currencyCode: string; reference?: string }): Promise<{ id: string }> {
    const id = await this.commission.createPayout({
      beneficiaryUserId: input.beneficiaryUserId ?? null,
      beneficiaryOrganizationId: input.beneficiaryOrganizationId ?? null,
      amount: input.amount,
      currencyCode: input.currencyCode,
      reference: input.reference,
    });
    return { id };
  }

  async updatePayoutStatus(payoutId: string, status: 'REQUESTED' | 'APPROVED' | 'PAID' | 'FAILED' | 'CANCELLED'): Promise<void> {
    await this.commission.updatePayoutStatus(payoutId, status);
  }

  async getCalculation(calculationId: string): Promise<unknown> {
    const calculation = await this.commission.getCalculation(calculationId);
    if (!calculation) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Calculation not found' });
    return calculation;
  }
}
