"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommissionRepository = void 0;
/**
 * Commission Domain persistence (migration 0027).
 * rule_versions / calculations / calculation_lines are IMMUTABLE at the DB
 * level (forbid_mutation triggers) — the engine only ever inserts snapshots.
 * Future-dated rule versions can never affect historical calculations because
 * selection is bound to occurred_at and every calculation stores its snapshot.
 */
class CommissionRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async createRule(input) {
        const r = await this.db.query(`INSERT INTO commission.rules(code, name, description, party_role, matches, created_by)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::uuid)
       RETURNING id, code, name, description, party_role, matches, status`, [input.code, input.name, input.description ?? null, input.partyRole, JSON.stringify(input.matches ?? {}), input.createdBy]);
        const row = r.rows[0];
        if (!row)
            throw new Error('COMMISSION_RULE_CREATE_FAILED');
        return { id: row.id, code: row.code, name: row.name, partyRole: row.party_role, matches: (row.matches ?? {}), status: row.status };
    }
    async setRuleStatus(ruleId, status) {
        await this.db.query(`UPDATE commission.rules SET status = $2 WHERE id = $1::uuid`, [ruleId, status]);
    }
    async getRuleByCode(code) {
        const r = await this.db.query(`SELECT id, code, name, description, party_role, matches, status FROM commission.rules WHERE code = $1`, [code]);
        const row = r.rows[0];
        if (!row)
            return null;
        return { id: row.id, code: row.code, name: row.name, partyRole: row.party_role, matches: (row.matches ?? {}), status: row.status };
    }
    async createRuleVersion(input) {
        const r = await this.db.query(`INSERT INTO commission.rule_versions(rule_id, version, param_config, param_status, effective_from, effective_to)
       VALUES ($1::uuid, $2, $3::jsonb, 'CONFIGURABLE', $4::timestamptz, $5::timestamptz)
       RETURNING id, rule_id, version, param_config, param_status, effective_from, effective_to`, [input.ruleId, input.version, JSON.stringify(input.paramConfig), input.effectiveFrom, input.effectiveTo ?? null]);
        const row = r.rows[0];
        if (!row)
            throw new Error('COMMISSION_RULE_VERSION_CREATE_FAILED');
        return { id: row.id, ruleId: row.rule_id, version: row.version, paramConfig: row.param_config, paramStatus: row.param_status, effectiveFrom: row.effective_from, effectiveTo: row.effective_to };
    }
    /**
     * All ACTIVE rule versions for a party role effective at occurred_at,
     * ordered by specificity (dimension count DESC) — the engine picks the
     * first whose matches are satisfied by the input dimensions.
     */
    async findApplicableRuleVersions(partyRole, occurredAt, limit = 50) {
        const r = await this.db.query(`SELECT ru.id AS rule_id, ru.code, ru.name, ru.description, ru.party_role, ru.matches, ru.status,
              rv.id AS version_id, rv.version, rv.param_config, rv.param_status, rv.effective_from, rv.effective_to
       FROM commission.rules ru
       JOIN commission.rule_versions rv ON rv.rule_id = ru.id
       WHERE ru.status = 'ACTIVE'
         AND ru.party_role = $1
         AND rv.effective_from <= $2::timestamptz
         AND (rv.effective_to IS NULL OR rv.effective_to > $2::timestamptz)
       ORDER BY (SELECT count(*) FROM jsonb_object_keys(ru.matches)) DESC NULLS LAST, ru.created_at
       LIMIT $3`, [partyRole, occurredAt, limit]);
        return r.rows.map((row) => ({
            rule: { id: row.rule_id, code: row.code, name: row.name, partyRole: row.party_role, matches: (row.matches ?? {}), status: row.status },
            version: { id: row.version_id, ruleId: row.rule_id, version: row.version, paramConfig: row.param_config, paramStatus: row.param_status, effectiveFrom: row.effective_from, effectiveTo: row.effective_to },
        }));
    }
    async createCalculation(input, executor = this.db) {
        const r = await executor.query(`INSERT INTO commission.calculations(
         listing_id, contract_id, party_user_id, party_organization_id, party_role,
         rule_id, rule_version_id, rule_snapshot, input_snapshot, calc_mode, calc_amount, currency_code, calculated_by
       ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6::uuid, $7::uuid, $8::jsonb, $9::jsonb, $10, $11::numeric, $12, $13::uuid)
       RETURNING id, listing_id, party_role, party_user_id, party_organization_id, rule_id, rule_version_id,
                 rule_snapshot, input_snapshot, calc_mode, calc_amount, currency_code, calculated_at`, [
            input.listingId ?? null, input.contractId ?? null, input.partyUserId ?? null, input.partyOrganizationId ?? null,
            input.partyRole, input.ruleId, input.ruleVersionId, JSON.stringify(input.ruleSnapshot), JSON.stringify(input.inputSnapshot),
            input.calcMode, input.calcAmount, input.currencyCode, input.calculatedBy,
        ]);
        const row = r.rows[0];
        if (!row)
            throw new Error('COMMISSION_CALCULATION_FAILED');
        return {
            id: row.id, listingId: row.listing_id, partyRole: row.party_role, partyUserId: row.party_user_id,
            partyOrganizationId: row.party_organization_id, ruleId: row.rule_id, ruleVersionId: row.rule_version_id,
            ruleSnapshot: row.rule_snapshot, inputSnapshot: row.input_snapshot,
            calcMode: row.calc_mode, calcAmount: row.calc_amount, currencyCode: row.currency_code, calculatedAt: row.calculated_at,
        };
    }
    async addCalculationLines(calculationId, lines, executor = this.db) {
        for (const line of lines) {
            await executor.query(`INSERT INTO commission.calculation_lines(calculation_id, line_type, amount, currency_code, meta)
         VALUES ($1::uuid, $2, $3::numeric, $4, $5::jsonb)`, [calculationId, line.lineType, line.amount, line.currencyCode, JSON.stringify(line.meta ?? {})]);
        }
    }
    async createSettlement(input, executor = this.db) {
        const r = await executor.query(`INSERT INTO commission.settlements(calculation_id, amount, currency_code, meta)
       VALUES ($1::uuid, $2::numeric, $3, $4::jsonb) RETURNING id`, [input.calculationId, input.amount, input.currencyCode, JSON.stringify(input.meta ?? {})]);
        const id = r.rows[0]?.id;
        if (!id)
            throw new Error('COMMISSION_SETTLEMENT_FAILED');
        return id;
    }
    async updateSettlementStatus(settlementId, status, settledBy) {
        await this.db.query(`UPDATE commission.settlements SET status = $2,
        settled_at = CASE WHEN $2 IN ('SETTLED','CANCELLED') THEN now() ELSE settled_at END,
        settled_by = COALESCE($3::uuid, settled_by)
       WHERE id = $1::uuid`, [settlementId, status, settledBy ?? null]);
    }
    async createAdjustment(input) {
        const r = await this.db.query(`INSERT INTO commission.adjustments(calculation_id, adjustment_type, amount, currency_code, reason, created_by)
       VALUES ($1::uuid, $2, $3::numeric, $4, $5, $6::uuid) RETURNING id`, [input.calculationId, input.adjustmentType, input.amount, input.currencyCode, input.reason, input.createdBy]);
        const id = r.rows[0]?.id;
        if (!id)
            throw new Error('COMMISSION_ADJUSTMENT_FAILED');
        return id;
    }
    async createPayout(input, executor = this.db) {
        if ((input.beneficiaryUserId ? 1 : 0) + (input.beneficiaryOrganizationId ? 1 : 0) !== 1) {
            throw new Error('PAYOUT_BENEFICIARY_REQUIRED');
        }
        const r = await executor.query(`INSERT INTO commission.payouts(beneficiary_user_id, beneficiary_organization_id, amount, currency_code, reference, meta)
       VALUES ($1::uuid, $2::uuid, $3::numeric, $4, $5, $6::jsonb) RETURNING id`, [input.beneficiaryUserId ?? null, input.beneficiaryOrganizationId ?? null, input.amount, input.currencyCode, input.reference ?? null, JSON.stringify(input.meta ?? {})]);
        const id = r.rows[0]?.id;
        if (!id)
            throw new Error('COMMISSION_PAYOUT_FAILED');
        return id;
    }
    async updatePayoutStatus(payoutId, status) {
        await this.db.query(`UPDATE commission.payouts SET status = $2, paid_at = CASE WHEN $2 = 'PAID' THEN now() ELSE paid_at END
       WHERE id = $1::uuid`, [payoutId, status]);
    }
    async getCalculation(calculationId) {
        const r = await this.db.query(`SELECT id, listing_id, party_role, party_user_id, party_organization_id, rule_id, rule_version_id,
              rule_snapshot, input_snapshot, calc_mode, calc_amount, currency_code, calculated_at
       FROM commission.calculations WHERE id = $1::uuid`, [calculationId]);
        const row = r.rows[0];
        if (!row)
            return null;
        return {
            id: row.id, listingId: row.listing_id, partyRole: row.party_role, partyUserId: row.party_user_id,
            partyOrganizationId: row.party_organization_id, ruleId: row.rule_id, ruleVersionId: row.rule_version_id,
            ruleSnapshot: row.rule_snapshot, inputSnapshot: row.input_snapshot,
            calcMode: row.calc_mode, calcAmount: row.calc_amount, currencyCode: row.currency_code, calculatedAt: row.calculated_at,
        };
    }
}
exports.CommissionRepository = CommissionRepository;
