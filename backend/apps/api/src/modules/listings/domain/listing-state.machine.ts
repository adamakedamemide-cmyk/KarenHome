import type { ListingStatus } from '@platform/db';

/**
 * Canonical 13-state listing machine — TS mirror of the DB-side
 * `marketplace.listing_transition_rules` seeded by migration 0031 (33 rules,
 * OD-09). `deleted` is the frozen terminal cleanup path (any state → deleted).
 * Derived states (reserved/under_contract) are PROJECTIONS of legal/rental
 * facts (v_listing_derived_status); transitions into them require
 * payment-or-contract evidence per the rules matrix.
 */
export type ListingStatus13 = ListingStatus | 'pending_verification' | 'reserved' | 'under_contract';

export interface TransitionRule {
  from: ListingStatus13;
  to: ListingStatus13;
  requiresVerification: boolean;
  requiresPaymentOrContract: boolean;
  allowedRoles: readonly string[];
}

export const LISTING_TRANSITION_RULES: readonly TransitionRule[] = [
  { from: 'draft', to: 'pending_verification', requiresVerification: false, requiresPaymentOrContract: false, allowedRoles: ['any'] },
  { from: 'draft', to: 'pending_moderation', requiresVerification: false, requiresPaymentOrContract: false, allowedRoles: ['any'] },
  { from: 'draft', to: 'archived', requiresVerification: false, requiresPaymentOrContract: false, allowedRoles: ['any'] },

  { from: 'pending_verification', to: 'pending_moderation', requiresVerification: false, requiresPaymentOrContract: false, allowedRoles: ['moderator', 'system'] },
  { from: 'pending_verification', to: 'rejected', requiresVerification: false, requiresPaymentOrContract: false, allowedRoles: ['moderator', 'system'] },
  { from: 'pending_verification', to: 'draft', requiresVerification: false, requiresPaymentOrContract: false, allowedRoles: ['any'] },

  { from: 'pending_moderation', to: 'published', requiresVerification: false, requiresPaymentOrContract: false, allowedRoles: ['moderator', 'system'] },
  { from: 'pending_moderation', to: 'rejected', requiresVerification: false, requiresPaymentOrContract: false, allowedRoles: ['moderator', 'system'] },
  { from: 'pending_moderation', to: 'draft', requiresVerification: false, requiresPaymentOrContract: false, allowedRoles: ['any'] },

  { from: 'published', to: 'paused', requiresVerification: false, requiresPaymentOrContract: false, allowedRoles: ['any'] },
  { from: 'published', to: 'reserved', requiresVerification: false, requiresPaymentOrContract: true, allowedRoles: ['any'] },
  { from: 'published', to: 'under_contract', requiresVerification: false, requiresPaymentOrContract: true, allowedRoles: ['any'] },
  { from: 'published', to: 'sold', requiresVerification: false, requiresPaymentOrContract: true, allowedRoles: ['any'] },
  { from: 'published', to: 'rented', requiresVerification: false, requiresPaymentOrContract: true, allowedRoles: ['any'] },
  { from: 'published', to: 'expired', requiresVerification: false, requiresPaymentOrContract: false, allowedRoles: ['system'] },
  { from: 'published', to: 'archived', requiresVerification: false, requiresPaymentOrContract: false, allowedRoles: ['any'] },

  { from: 'paused', to: 'published', requiresVerification: false, requiresPaymentOrContract: false, allowedRoles: ['any'] },
  { from: 'paused', to: 'archived', requiresVerification: false, requiresPaymentOrContract: false, allowedRoles: ['any'] },
  { from: 'paused', to: 'expired', requiresVerification: false, requiresPaymentOrContract: false, allowedRoles: ['system'] },

  { from: 'reserved', to: 'under_contract', requiresVerification: false, requiresPaymentOrContract: true, allowedRoles: ['any'] },
  { from: 'reserved', to: 'published', requiresVerification: false, requiresPaymentOrContract: false, allowedRoles: ['any'] },
  { from: 'reserved', to: 'sold', requiresVerification: false, requiresPaymentOrContract: true, allowedRoles: ['any'] },
  { from: 'reserved', to: 'rented', requiresVerification: false, requiresPaymentOrContract: true, allowedRoles: ['any'] },
  { from: 'reserved', to: 'archived', requiresVerification: false, requiresPaymentOrContract: false, allowedRoles: ['any'] },

  { from: 'under_contract', to: 'sold', requiresVerification: false, requiresPaymentOrContract: true, allowedRoles: ['any'] },
  { from: 'under_contract', to: 'rented', requiresVerification: false, requiresPaymentOrContract: true, allowedRoles: ['any'] },
  { from: 'under_contract', to: 'reserved', requiresVerification: false, requiresPaymentOrContract: false, allowedRoles: ['any'] },
  { from: 'under_contract', to: 'archived', requiresVerification: false, requiresPaymentOrContract: false, allowedRoles: ['any'] },

  { from: 'expired', to: 'published', requiresVerification: false, requiresPaymentOrContract: false, allowedRoles: ['any'] },
  { from: 'expired', to: 'draft', requiresVerification: false, requiresPaymentOrContract: false, allowedRoles: ['any'] },
  { from: 'expired', to: 'archived', requiresVerification: false, requiresPaymentOrContract: false, allowedRoles: ['any'] },

  { from: 'rejected', to: 'draft', requiresVerification: false, requiresPaymentOrContract: false, allowedRoles: ['any'] },
  { from: 'rejected', to: 'archived', requiresVerification: false, requiresPaymentOrContract: false, allowedRoles: ['any'] },
];

const RULE_COUNT_EXPECTED = 33;

export function findTransitionRule(from: ListingStatus13, to: ListingStatus13): TransitionRule | null {
  if (to === 'deleted') return { from, to, requiresVerification: false, requiresPaymentOrContract: false, allowedRoles: ['any'] };
  return LISTING_TRANSITION_RULES.find((rule) => rule.from === from && rule.to === to) ?? null;
}

export function canTransition(from: ListingStatus13, to: ListingStatus13): boolean {
  return findTransitionRule(from, to) !== null;
}

/** Throws LISTING_STATE_CONFLICT when the transition is not in the canonical matrix. */
export function assertTransition(from: ListingStatus13, to: ListingStatus13): TransitionRule {
  const rule = findTransitionRule(from, to);
  if (!rule) throw new Error('LISTING_STATE_CONFLICT');
  return rule;
}

/** Structural invariant: the TS mirror must equal the DB-seeded matrix size. */
export function transitionRuleCount(): number {
  return LISTING_TRANSITION_RULES.length;
}

export function assertMachineParityWithSeed(): void {
  if (transitionRuleCount() !== RULE_COUNT_EXPECTED) {
    throw new Error(`TRANSITION_MATRIX_DRIFT: expected ${RULE_COUNT_EXPECTED}, got ${transitionRuleCount()}`);
  }
}
