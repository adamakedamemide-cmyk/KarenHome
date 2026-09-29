import type { ListingStatus } from '@platform/db';

const allowed: Record<ListingStatus, readonly ListingStatus[]> = {
  draft: ['pending_moderation', 'deleted'],
  pending_moderation: ['published', 'rejected', 'draft', 'deleted'],
  published: ['paused', 'sold', 'rented', 'expired', 'archived', 'deleted'],
  paused: ['published', 'archived', 'deleted'],
  rejected: ['draft', 'deleted'],
  expired: ['draft', 'archived', 'deleted'],
  sold: ['archived', 'deleted'],
  rented: ['archived', 'deleted'],
  archived: ['deleted'],
  deleted: [],
};

export function canTransition(from: ListingStatus, to: ListingStatus): boolean {
  return allowed[from].includes(to);
}

export function assertTransition(from: ListingStatus, to: ListingStatus): void {
  if (!canTransition(from, to)) throw new Error('LISTING_STATE_CONFLICT');
}
