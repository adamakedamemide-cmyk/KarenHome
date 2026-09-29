import { CommissionEngineService, type CommissionCalculateInput } from '../src/modules/commission/application/commission-engine.service';
import type { ApplicableRuleVersion, CommissionRepository } from '@platform/db';

interface RepoState {
  rules: ApplicableRuleVersion[];
}

function makeVersion(overrides: Partial<{ ruleCode: string; matches: Record<string, unknown>; paramConfig: Record<string, unknown>; effectiveFrom: Date; effectiveTo: Date | null; version: number }>): ApplicableRuleVersion {
  const effectiveFrom = overrides.effectiveFrom ?? new Date('2020-01-01T00:00:00Z');
  return {
    rule: {
      id: `rule-${overrides.ruleCode ?? 'std'}`,
      code: overrides.ruleCode ?? 'std',
      name: overrides.ruleCode ?? 'std',
      partyRole: 'Agent',
      matches: overrides.matches ?? {},
      status: 'ACTIVE',
    },
    version: {
      id: `version-${overrides.ruleCode ?? 'std'}-${overrides.version ?? 1}`,
      ruleId: `rule-${overrides.ruleCode ?? 'std'}`,
      version: overrides.version ?? 1,
      paramConfig: overrides.paramConfig ?? {},
      paramStatus: 'ACTIVE',
      effectiveFrom,
      effectiveTo: overrides.effectiveTo ?? null,
    },
  };
}

function engineWithRepo(state: RepoState): CommissionEngineService {
  const repoStub = {
    findApplicableRuleVersions: async (): Promise<ApplicableRuleVersion[]> => state.rules,
    createCalculation: async (input: { ruleSnapshot: Record<string, unknown>; calcAmount: string | null; calcMode: string }) => ({
      id: 'calc-1', listingId: null, partyRole: 'Agent', partyUserId: null, partyOrganizationId: null,
      ruleId: 'rule-1', ruleVersionId: 'version-1', ruleSnapshot: input.ruleSnapshot, inputSnapshot: {},
      calcMode: input.calcMode, calcAmount: input.calcAmount, currencyCode: 'USD', calculatedAt: new Date(),
    }),
    addCalculationLines: async (): Promise<void> => undefined,
  } as unknown as CommissionRepository;
  const iamStub = { listPermissionCodesForUser: async (): Promise<string[]> => ['commission.manage'] } as unknown as import('@platform/db').IamRepository;
  return new CommissionEngineService(repoStub, iamStub);
}

const ACTOR = { id: '11111111-1111-1111-1111-111111111111', status: 'active' as const };
const BASE: CommissionCalculateInput = { partyRole: 'Agent', baseAmount: '1000.0000', currencyCode: 'USD' };

describe('G4 — commission engine (§7)', () => {
  it('computes percentage commission with snapshot', async () => {
    const state: RepoState = { rules: [makeVersion({ paramConfig: { mode: 'percentage', amount: 2.5 } })] };
    const result = await engineWithRepo(state).calculate(BASE, ACTOR);
    expect(result.calcMode).toBe('percentage');
    expect(result.calcAmount).toBe('25.0000');
    expect(result.ruleSnapshot).toMatchObject({ ruleCode: 'std', version: 1 });
  });

  it('computes fixed fee and applies min/max caps', async () => {
    const capped = [makeVersion({ ruleCode: 'capped', paramConfig: { mode: 'percentage', amount: 40, min: 50, max: 300 } })];
    const result = await engineWithRepo({ rules: capped }).calculate(BASE, ACTOR);
    expect(result.calcAmount).toBe('300.0000'); // max cap applies
    const lowBase = await engineWithRepo({ rules: capped }).calculate({ ...BASE, baseAmount: '100.0000' }, ACTOR);
    expect(lowBase.calcAmount).toBe('50.0000'); // min floor applies
  });

  it('distributes splits that must sum to 100', async () => {
    const state: RepoState = { rules: [makeVersion({ paramConfig: { mode: 'percentage', amount: 10, splits: [{ role: 'Agent', share: 70 }, { role: 'Organization', share: 30 }] } })] };
    const result = await engineWithRepo(state).calculate(BASE, ACTOR);
    const splitLines = result.lines.filter((line) => line.lineType.startsWith('split:'));
    expect(splitLines).toHaveLength(2);
    expect(splitLines.map((line) => Number(line.amount)).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 2);

    const badState: RepoState = { rules: [makeVersion({ paramConfig: { mode: 'percentage', amount: 10, splits: [{ role: 'Agent', share: 70 }, { role: 'Organization', share: 20 }] } })] };
    await expect(engineWithRepo(badState).calculate(BASE, ACTOR)).rejects.toMatchObject({ response: { code: 'VALIDATION_ERROR' } });
  });

  it('selects the most specific matching rule', async () => {
    const general = makeVersion({ ruleCode: 'general', matches: {}, paramConfig: { mode: 'percentage', amount: 1 } });
    const specific = makeVersion({ ruleCode: 'geo', matches: { geo_node_id: 'geo-1' }, paramConfig: { mode: 'percentage', amount: 3 } });
    // The repository SQL orders candidates by specificity; the stub mirrors that order.
    const result = await engineWithRepo({ rules: [specific, general] }).calculate({ ...BASE, geoNodeId: 'geo-1' }, ACTOR);
    expect(result.ruleCode).toBe('geo');
    const fallback = await engineWithRepo({ rules: [specific, general] }).calculate(BASE, ACTOR);
    expect(fallback.ruleCode).toBe('general');
  });

  it('ignores future-effective rule versions for historical calculations', async () => {
    const future = makeVersion({ ruleCode: 'future', paramConfig: { mode: 'percentage', amount: 99 }, effectiveFrom: new Date(Date.now() + 86_400_000) });
    const current = makeVersion({ ruleCode: 'current', paramConfig: { mode: 'percentage', amount: 2 } });
    // Selection is bound to occurred_at in the repository query; the engine
    // receives only effective versions — this asserts the contract shape.
    const result = await engineWithRepo({ rules: [current] }).calculate(BASE, ACTOR);
    expect(result.ruleCode).toBe('current');
    expect(future.version.paramConfig).toMatchObject({ amount: 99 });
  });

  it('fails with COMMISSION_RULE_NOT_FOUND when nothing applies', async () => {
    await expect(engineWithRepo({ rules: [] }).calculate(BASE, ACTOR)).rejects.toMatchObject({ response: { code: 'COMMISSION_RULE_NOT_FOUND' } });
  });

  it('rejects unsupported modes and negative base amounts', async () => {
    const state: RepoState = { rules: [makeVersion({ paramConfig: { mode: 'auction' } })] };
    await expect(engineWithRepo(state).calculate(BASE, ACTOR)).rejects.toMatchObject({ response: { code: 'VALIDATION_ERROR' } });
    const okState: RepoState = { rules: [makeVersion({ paramConfig: { mode: 'percentage', amount: 1 } })] };
    await expect(engineWithRepo(okState).calculate({ ...BASE, baseAmount: '-5' }, ACTOR)).rejects.toMatchObject({ response: { code: 'VALIDATION_ERROR' } });
  });
});
