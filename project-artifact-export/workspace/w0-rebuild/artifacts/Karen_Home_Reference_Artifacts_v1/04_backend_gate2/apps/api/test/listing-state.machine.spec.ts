import { describe, expect, it } from '@jest/globals';
import { canTransition, assertTransition } from '../src/modules/listings/domain/listing-state.machine';

describe('listing state machine', () => {
  it('allows draft submission for moderation', () => expect(canTransition('draft', 'pending_moderation')).toBe(true));
  it('allows moderation approval to publication', () => expect(canTransition('pending_moderation', 'published')).toBe(true));
  it('rejects direct draft publication', () => expect(canTransition('draft', 'published')).toBe(false));
  it('rejects resurrection of deleted listings', () => expect(() => assertTransition('deleted', 'draft')).toThrow('LISTING_STATE_CONFLICT'));
  it('allows a published listing to become sold', () => expect(canTransition('published', 'sold')).toBe(true));
});
