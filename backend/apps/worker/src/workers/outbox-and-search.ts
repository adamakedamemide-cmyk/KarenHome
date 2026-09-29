import { OutboxRepository, SearchIndexRepository, type JobRecord } from '@platform/db';
import { OS_LISTINGS_INDEX, OS_LISTINGS_INDEX_DEFINITION, toOsListingDoc } from '@platform/contracts';
import type { WorkerContext } from '../runner';

/**
 * OutboxWorker — the event backbone (§2 Events → Workers).
 * Leases integration events from audit.outbox_events (SKIP LOCKED) and routes
 * them to downstream queues:
 *   Listing*.v1            → search.index job (+ state upsert)
 *   ListingPublished.v1    → + notification dispatch to owner
 *   ListingDeleted/Removed → search.delete
 *   Subscription*.v1       → notification dispatch
 * Events are marked published only after successful routing (at-least-once).
 */
export async function handleOutboxJob(_job: JobRecord, ctx: WorkerContext): Promise<void> {
  const outbox = new OutboxRepository(ctx.db);
  const indexState = new SearchIndexRepository(ctx.db);
  const events = await outbox.leaseBatch(ctx.workerId, 100);
  ctx.log('outbox_leased', { count: events.length });

  for (const event of events) {
    const payload = event.payload as Record<string, unknown>;
    switch (event.eventType) {
      case 'ListingCreated.v1':
      case 'ListingSubmittedForModeration.v1':
      case 'ListingSubmittedForVerification.v1':
      case 'ListingPublished.v1':
      case 'ListingPaused.v1':
      case 'ListingReserved.v1':
      case 'ListingUnderContract.v1':
      case 'ListingSold.v1':
      case 'ListingRented.v1':
      case 'ListingExpired.v1':
      case 'ListingRejected.v1':
      case 'ListingArchived.v1':
      case 'ListingMediaAttached.v1': {
        await indexState.upsertPending(event.aggregateId, new Date());
        await ctx.jobs.enqueue({ queue: 'search', jobType: 'search.index', payload: { listingId: event.aggregateId } });
        if (event.eventType === 'ListingPublished.v1') {
          await ctx.jobs.enqueue({
            queue: 'notifications',
            jobType: 'notification.dispatch',
            payload: {
              userId: (payload as { actorUserId?: string }).actorUserId ?? null,
              notificationType: 'listing_published',
              titleFallback: 'Your listing is published',
              bodyFallback: 'Your listing passed moderation and is now live.',
              listingId: event.aggregateId,
            },
          });
        }
        break;
      }
      case 'ListingDeleted.v1': {
        await indexState.removePending(event.aggregateId);
        await ctx.jobs.enqueue({ queue: 'search', jobType: 'search.delete', payload: { listingId: event.aggregateId } });
        break;
      }
      case 'SubscriptionStarted.v1':
      case 'SubscriptionPlanChanged.v1': {
        await ctx.jobs.enqueue({
          queue: 'notifications',
          jobType: 'notification.dispatch',
          payload: {
            notificationType: 'subscription_changed',
            titleFallback: 'Subscription updated',
            bodyFallback: `Your subscription status changed: ${event.eventType}`,
            subscriptionId: event.aggregateId,
          },
        });
        break;
      }
      default:
        // Unknown events are still marked published — the catalog is append-only.
        break;
    }
    await outbox.markPublished(event.id, ctx.workerId);
  }
}

/**
 * SearchIndexerWorker (§11): pending → indexed with retry/dead-letter via the
 * job queue; RebuildSearchIndex is a chunked scan job. OpenSearch push happens
 * when OPENSEARCH_URL is configured AND reachable; the PG FTS doc store is
 * always authoritative (verified engine).
 *
 * GATE5-C fix: an OpenSearch push failure now FAILS the job (retryable with
 * backoff, DLQ after max_attempts) instead of being swallowed. The PG doc was
 * already marked indexed before the push attempt, so business correctness is
 * preserved while the OpenSearch update remains retryable — per the Gate 5
 * mandatory failure scenario.
 */
export async function handleSearchJob(job: JobRecord, ctx: WorkerContext): Promise<void> {
  const indexState = new SearchIndexRepository(ctx.db);
  const payload = job.payload as { listingId?: string; chunkSize?: number };

  if (job.jobType === 'search.index') {
    if (!payload.listingId) throw new Error('VALIDATION: listingId required');
    const doc = await indexState.buildDoc(payload.listingId);
    if (!doc) {
      await indexState.removePending(payload.listingId);
      return;
    }
    await indexState.markIndexed(payload.listingId, doc);
    await pushToOpenSearch(doc, ctx);
    return;
  }

  if (job.jobType === 'search.delete') {
    if (!payload.listingId) throw new Error('VALIDATION: listingId required');
    await indexState.removePending(payload.listingId);
    // GATE5-C fix: the OpenSearch copy must be deleted too — Gate 4 only
    // cleared the PG index state, leaving a stale OS document searchable.
    await deleteFromOpenSearch(payload.listingId, ctx);
    return;
  }

  if (job.jobType === 'search.rebuild') {
    const chunkSize = Math.min(1000, Math.max(50, payload.chunkSize ?? 500));
    let offset = 0;
    for (;;) {
      const ids = await indexState.listListingIdsNeedingIndex(chunkSize, offset);
      if (ids.length === 0) break;
      for (const listingId of ids) {
        await indexState.upsertPending(listingId, new Date());
        await ctx.jobs.enqueue({ queue: 'search', jobType: 'search.index', payload: { listingId } });
      }
      offset += ids.length;
      if (ids.length < chunkSize) break;
    }
    ctx.log('search_rebuild_enqueued', { total: offset });
    return;
  }

  throw new Error(`UNKNOWN_SEARCH_JOB: ${job.jobType}`);
}

async function deleteFromOpenSearch(listingId: string, ctx: WorkerContext): Promise<void> {
  const baseUrl = process.env.OPENSEARCH_URL ?? '';
  if (!baseUrl) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(`${baseUrl}/${OS_LISTINGS_INDEX}/_doc/${listingId}`, { method: 'DELETE', signal: controller.signal });
    // 404 is fine (already gone / never indexed); anything else is a retryable failure.
    if (!response.ok && response.status !== 404) throw new Error(`OPENSEARCH_${response.status}`);
  } catch (error) {
    ctx.log('opensearch_delete_failed', { listingId, error: error instanceof Error ? error.message : 'unknown' });
    throw error instanceof Error ? error : new Error('OPENSEARCH_DELETE_FAILED');
  } finally {
    clearTimeout(timer);
  }
}

async function pushToOpenSearch(doc: Record<string, unknown>, ctx: WorkerContext): Promise<void> {
  const baseUrl = process.env.OPENSEARCH_URL ?? '';
  if (!baseUrl) return;
  const source = toOsListingDoc(doc);
  if (!source) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    // Idempotent index bootstrap (GATE5-C): creation + strict mapping once.
    const head = await fetch(`${baseUrl}/${OS_LISTINGS_INDEX}`, { method: 'HEAD', signal: controller.signal });
    if (!head.ok) {
      const created = await fetch(`${baseUrl}/${OS_LISTINGS_INDEX}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(OS_LISTINGS_INDEX_DEFINITION),
        signal: controller.signal,
      });
      if (!created.ok) throw new Error(`OPENSEARCH_${created.status}: index bootstrap failed`);
    }
    const response = await fetch(`${baseUrl}/${OS_LISTINGS_INDEX}/_doc/${source.listing_id}?refresh=false`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(source),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`OPENSEARCH_${response.status}`);
  } catch (error) {
    ctx.log('opensearch_push_failed', { listingId: source.listing_id, error: error instanceof Error ? error.message : 'unknown' });
    // Rethrow → job fails → retried with backoff → DLQ after max attempts.
    // PG store remains authoritative and correct; the OpenSearch update stays
    // retryable (Gate 5 mandatory failure scenario).
    throw new Error(`OPENSEARCH_PUSH_FAILED: ${error instanceof Error ? error.message : 'unknown'}`);
  } finally {
    clearTimeout(timer);
  }
}
