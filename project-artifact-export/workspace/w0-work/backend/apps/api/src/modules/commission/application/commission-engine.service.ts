import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CommissionRepository, IamRepository, type ApplicableRuleVersion } from '@platform/db';
import type { AuthenticatedUser } from '@platform/contracts';

export interface CommissionCalculateInput {
  listingId?: string;
  partyRole: 'Owner' | 'Agent' | 'Marketer' | 'Organization';
  partyUserId?: string;
  partyOrganizationId?: string;
  baseAmount: string;
  currencyCode: string;
  transactionType?: string;
  propertyType?: string;
  geoNodeId?: string;
  campaignId?: string;
  referralCode?: string;
  occurredAt?: Date;
}

export interface CommissionCalculationResult {
  calculationId: string;
  ruleCode: string;
  ruleVersion: number;
  calcMode: string;
  calcAmount: string;
  currencyCode: string;
  lines: Array<{ lineType: string; amount: string; currencyCode: string }>;
  ruleSnapshot: Record<string, unknown>;
  inputSnapshot: Record<string, unknown>;
}

interface CommissionParamConfig {
  mode?: 'percentage' | 'fixed' | undefined;
  amount?: number | undefined;
  min?: number | undefined;
  max?: number | undefined;
  currency?: string | undefined;
  splits?: Array<{ role?: string | undefined; share?: number | undefined }> | undefined;
}

const EPSILON = 0.0001;

/**
 * Gate 4 §7 — Commission Engine.
 * - Rule selection: ACTIVE rules, version effective at occurred_at, most
 *   specific matches first; missing dimension = not satisfied.
 * - Every calculation stores rule_snapshot + input_snapshot (immutability is
 *   DB-enforced by migration 0027 triggers).
 * - Future rule versions can NEVER alter historical calculations: selection
 *   is bound to occurred_at and snapshots are frozen at insert.
 * - Supported factors: percentage, fixed, min/max caps, splits, role,
 *   organization, transaction type, property type, geography, campaign,
 *   referral, effective date, currency.
 */
@Injectable()
export class CommissionEngineService {
  constructor(private readonly commission: CommissionRepository, private readonly iam: IamRepository) {}

  async calculate(input: CommissionCalculateInput, actor: AuthenticatedUser): Promise<CommissionCalculationResult> {
    const occurredAt = input.occurredAt ?? new Date();
    const candidates = await this.commission.findApplicableRuleVersions(input.partyRole, occurredAt);
    const dimensions = this.buildDimensions(input);
    const selected = this.selectRule(candidates, dimensions);
    if (!selected) {
      throw new NotFoundException({ code: 'COMMISSION_RULE_NOT_FOUND', message: 'No applicable commission rule version is effective for this input' });
    }

    const paramConfig = selected.version.paramConfig as unknown as CommissionParamConfig;
    const mode = paramConfig.mode;
    if (mode !== 'percentage' && mode !== 'fixed') {
      throw new UnprocessableEntityException({ code: 'VALIDATION_ERROR', message: 'Rule version param_config.mode must be percentage or fixed' });
    }

    const base = Number(input.baseAmount);
    if (!Number.isFinite(base) || base < 0) {
      throw new UnprocessableEntityException({ code: 'VALIDATION_ERROR', message: 'baseAmount must be a non-negative decimal string' });
    }

    const currency = this.resolveCurrency(paramConfig, input.currencyCode);
    let amount = mode === 'percentage' ? (base * Number(paramConfig.amount ?? 0)) / 100 : Number(paramConfig.amount ?? 0);
    if (paramConfig.min !== undefined && amount < Number(paramConfig.min)) amount = Number(paramConfig.min);
    if (paramConfig.max !== undefined && amount > Number(paramConfig.max)) amount = Number(paramConfig.max);
    const calcAmount = round4(amount);

    const lines: Array<{ lineType: string; amount: string; currencyCode: string; meta?: Record<string, unknown> }> = [
      { lineType: 'base', amount: input.baseAmount, currencyCode: currency },
      { lineType: 'commission', amount: calcAmount, currencyCode: currency, meta: { mode } },
    ];

    const splits = Array.isArray(paramConfig.splits) ? (paramConfig.splits as Array<{ role?: unknown; share?: unknown }>) : [];
    if (splits.length > 0) {
      const totalShare = splits.reduce((sum, split) => sum + Number(split.share ?? 0), 0);
      if (Math.abs(totalShare - 100) > EPSILON) {
        throw new UnprocessableEntityException({ code: 'VALIDATION_ERROR', message: 'Commission split shares must sum to 100' });
      }
      for (const split of splits) {
        lines.push({
          lineType: `split:${String(split.role ?? 'unknown')}`,
          amount: round4((Number(calcAmount) * Number(split.share ?? 0)) / 100),
          currencyCode: currency,
          meta: { share: split.share ?? null },
        });
      }
    }

    const ruleSnapshot = {
      ruleId: selected.rule.id,
      ruleCode: selected.rule.code,
      ruleName: selected.rule.name,
      partyRole: selected.rule.partyRole,
      matches: selected.rule.matches,
      versionId: selected.version.id,
      version: selected.version.version,
      paramConfig: selected.version.paramConfig,
      effectiveFrom: selected.version.effectiveFrom.toISOString(),
      effectiveTo: selected.version.effectiveTo ? selected.version.effectiveTo.toISOString() : null,
    };
    const inputSnapshot: Record<string, unknown> = {
      ...dimensions,
      baseAmount: input.baseAmount,
      currencyCode: input.currencyCode,
      listingId: input.listingId ?? null,
      occurredAt: occurredAt.toISOString(),
      calculatedBy: actor.id,
    };

    const calculation = await this.commission.createCalculation({
      listingId: input.listingId ?? null,
      partyUserId: input.partyUserId ?? null,
      partyOrganizationId: input.partyOrganizationId ?? null,
      partyRole: input.partyRole,
      ruleId: selected.rule.id,
      ruleVersionId: selected.version.id,
      ruleSnapshot,
      inputSnapshot,
      calcMode: mode,
      calcAmount: calcAmount,
      currencyCode: currency,
      calculatedBy: actor.id,
    });
    await this.commission.addCalculationLines(calculation.id, lines);

    return {
      calculationId: calculation.id,
      ruleCode: selected.rule.code,
      ruleVersion: selected.version.version,
      calcMode: mode,
      calcAmount: calcAmount,
      currencyCode: currency,
      lines: lines.map((line) => ({ lineType: line.lineType, amount: line.amount, currencyCode: line.currencyCode })),
      ruleSnapshot,
      inputSnapshot,
    };
  }

  async requireCommissionPermission(actor: AuthenticatedUser, permission: 'commission.view' | 'commission.manage', organizationId?: string): Promise<void> {
    const permissions = await this.iam.listPermissionCodesForUser(actor.id, organizationId);
    if (!permissions.includes(permission)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: `Required permission is missing: ${permission}` });
    }
  }

  private buildDimensions(input: CommissionCalculateInput): Record<string, unknown> {
    return {
      transaction_type: input.transactionType ?? null,
      property_type: input.propertyType ?? null,
      geo_node_id: input.geoNodeId ?? null,
      organization_id: input.partyOrganizationId ?? null,
      campaign_id: input.campaignId ?? null,
      referral_code: input.referralCode ?? null,
      currency_code: input.currencyCode,
      listing_id: input.listingId ?? null,
    };
  }

  private selectRule(candidates: ApplicableRuleVersion[], dimensions: Record<string, unknown>): ApplicableRuleVersion | null {
    for (const candidate of candidates) {
      if (this.matchesSatisfied(candidate.rule.matches, dimensions, dimensions.baseAmount as string | null)) {
        return candidate;
      }
    }
    return null;
  }

  private matchesSatisfied(matches: Record<string, unknown>, dimensions: Record<string, unknown>, baseAmount: string | null): boolean {
    const keys = Object.keys(matches ?? {});
    for (const key of keys) {
      const expected = matches[key];
      const actual = dimensions[key];
      if (key === 'price_band' && expected !== null && typeof expected === 'object') {
        const band = expected as { min?: unknown; max?: unknown };
        const value = Number(baseAmount ?? '0');
        if (band.min !== undefined && value < Number(band.min)) return false;
        if (band.max !== undefined && value > Number(band.max)) return false;
        continue;
      }
      if (expected === null || expected === undefined) continue; // wildcard
      if (actual !== expected) return false;
    }
    return true;
  }

  private resolveCurrency(paramConfig: CommissionParamConfig, inputCurrency: string): string {
    if (typeof paramConfig.currency === 'string' && /^[A-Z]{3}$/.test(paramConfig.currency)) return paramConfig.currency;
    return inputCurrency;
  }
}

function round4(value: number): string {
  return (Math.round(value * 10000) / 10000).toFixed(4);
}
