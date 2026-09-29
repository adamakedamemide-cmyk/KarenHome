import { PostgresDatabase, type QueryExecutor } from './postgres-database';
export interface CommissionRule {
    id: string;
    code: string;
    name: string;
    partyRole: string;
    matches: Record<string, unknown>;
    status: 'TBD' | 'CONFIGURABLE' | 'UNDECIDED' | 'ACTIVE' | 'RETIRED';
}
export interface CommissionRuleVersion {
    id: string;
    ruleId: string;
    version: number;
    paramConfig: Record<string, unknown>;
    paramStatus: string;
    effectiveFrom: Date;
    effectiveTo: Date | null;
}
export interface ApplicableRuleVersion {
    rule: CommissionRule;
    version: CommissionRuleVersion;
}
export interface CommissionCalculationRecord {
    id: string;
    listingId: string | null;
    partyRole: string;
    partyUserId: string | null;
    partyOrganizationId: string | null;
    ruleId: string;
    ruleVersionId: string;
    ruleSnapshot: Record<string, unknown>;
    inputSnapshot: Record<string, unknown>;
    calcMode: string;
    calcAmount: string | null;
    currencyCode: string;
    calculatedAt: Date;
}
/**
 * Commission Domain persistence (migration 0027).
 * rule_versions / calculations / calculation_lines are IMMUTABLE at the DB
 * level (forbid_mutation triggers) — the engine only ever inserts snapshots.
 * Future-dated rule versions can never affect historical calculations because
 * selection is bound to occurred_at and every calculation stores its snapshot.
 */
export declare class CommissionRepository {
    private readonly db;
    constructor(db: PostgresDatabase);
    createRule(input: {
        code: string;
        name: string;
        description?: string | undefined;
        partyRole: string;
        matches: Record<string, unknown>;
        createdBy: string;
    }): Promise<CommissionRule>;
    setRuleStatus(ruleId: string, status: CommissionRule['status']): Promise<void>;
    getRuleByCode(code: string): Promise<CommissionRule | null>;
    createRuleVersion(input: {
        ruleId: string;
        version: number;
        paramConfig: Record<string, unknown>;
        effectiveFrom: Date;
        effectiveTo?: Date | null;
    }): Promise<CommissionRuleVersion>;
    /**
     * All ACTIVE rule versions for a party role effective at occurred_at,
     * ordered by specificity (dimension count DESC) — the engine picks the
     * first whose matches are satisfied by the input dimensions.
     */
    findApplicableRuleVersions(partyRole: string, occurredAt: Date, limit?: number): Promise<ApplicableRuleVersion[]>;
    createCalculation(input: {
        listingId?: string | null;
        contractId?: string | null;
        partyUserId?: string | null;
        partyOrganizationId?: string | null;
        partyRole: string;
        ruleId: string;
        ruleVersionId: string;
        ruleSnapshot: Record<string, unknown>;
        inputSnapshot: Record<string, unknown>;
        calcMode: string;
        calcAmount: string | null;
        currencyCode: string;
        calculatedBy: string;
    }, executor?: QueryExecutor): Promise<CommissionCalculationRecord>;
    addCalculationLines(calculationId: string, lines: Array<{
        lineType: string;
        amount: string;
        currencyCode: string;
        meta?: Record<string, unknown>;
    }>, executor?: QueryExecutor): Promise<void>;
    createSettlement(input: {
        calculationId: string;
        amount: string;
        currencyCode: string;
        meta?: Record<string, unknown>;
    }, executor?: QueryExecutor): Promise<string>;
    updateSettlementStatus(settlementId: string, status: 'PENDING' | 'APPROVED' | 'SETTLED' | 'CANCELLED', settledBy?: string | undefined): Promise<void>;
    createAdjustment(input: {
        calculationId: string;
        adjustmentType: 'REVERSAL' | 'CORRECTION';
        amount: string;
        currencyCode: string;
        reason: string;
        createdBy: string;
    }): Promise<string>;
    createPayout(input: {
        beneficiaryUserId?: string | null;
        beneficiaryOrganizationId?: string | null;
        amount: string;
        currencyCode: string;
        reference?: string | undefined;
        meta?: Record<string, unknown>;
    }, executor?: QueryExecutor): Promise<string>;
    updatePayoutStatus(payoutId: string, status: 'REQUESTED' | 'APPROVED' | 'PAID' | 'FAILED' | 'CANCELLED'): Promise<void>;
    getCalculation(calculationId: string): Promise<CommissionCalculationRecord | null>;
}
