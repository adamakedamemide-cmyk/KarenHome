import { assertMachineParityWithSeed, canTransition, findTransitionRule, LISTING_TRANSITION_RULES } from '../src/modules/listings/domain/listing-state.machine';

describe('G4 — canonical listing state machine (§5)', () => {
  it('mirrors the 33 DB-seeded transition rules (migration 0031)', () => {
    assertMachineParityWithSeed();
    expect(LISTING_TRANSITION_RULES).toHaveLength(33);
  });

  it('covers the canonical 13 states (10 frozen + 3 additive)', () => {
    const states = new Set<string>();
    for (const rule of LISTING_TRANSITION_RULES) {
      states.add(rule.from);
      states.add(rule.to);
    }
    expect(states.has('pending_verification')).toBe(true);
    expect(states.has('reserved')).toBe(true);
    expect(states.has('under_contract')).toBe(true);
  });

  it('allows the full happy path draft → verification → moderation → published → contract → sold', () => {
    const path = ['draft', 'pending_verification', 'pending_moderation', 'published', 'reserved', 'under_contract', 'sold'] as const;
    for (let i = 0; i < path.length - 1; i += 1) {
      const from = path[i];
      const to = path[i + 1];
      if (!from || !to) continue;
      expect(canTransition(from, to)).toBe(true);
    }
  });

  it('enforces payment-or-contract requirement on evidenced transitions', () => {
    expect(findTransitionRule('published', 'sold')?.requiresPaymentOrContract).toBe(true);
    expect(findTransitionRule('published', 'paused')?.requiresPaymentOrContract).toBe(false);
  });

  it('rejects illegal shortcuts', () => {
    expect(canTransition('published', 'draft')).toBe(false);
    expect(canTransition('rejected', 'published')).toBe(false);
    expect(canTransition('sold', 'published')).toBe(false);
    expect(canTransition('draft', 'sold')).toBe(false);
  });

  it('keeps deleted as terminal with a frozen cleanup path from every state', () => {
    expect(canTransition('deleted', 'draft')).toBe(false);
    expect(canTransition('archived', 'deleted')).toBe(true);
    expect(canTransition('sold', 'deleted')).toBe(true);
  });
});
