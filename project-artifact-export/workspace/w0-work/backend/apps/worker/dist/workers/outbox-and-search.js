"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleOutboxJob = handleOutboxJob;
exports.handleSearchJob = handleSearchJob;
const db_1 = require("@platform/db");
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
async function handleOutboxJob(_job, ctx) {
    const outbox = new db_1.OutboxRepository(ctx.db);
    const indexState = new db_1.SearchIndexRepository(ctx.db);
    const events = await outbox.leaseBatch(ctx.workerId, 100);
    ctx.log('outbox_leased', { count: events.length });
    for (const event of events) {
        const payload = event.payload;
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
                            userId: payload.actorUserId ?? null,
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
 */
async function handleSearchJob(job, ctx) {
    const indexState = new db_1.SearchIndexRepository(ctx.db);
    const payload = job.payload;
    if (job.jobType === 'search.index') {
        if (!payload.listingId)
            throw new Error('VALIDATION: listingId required');
        const doc = await indexState.buildDoc(payload.listingId);
        if (!doc) {
            await indexState.removePending(payload.listingId);
            return;
        }
        await indexState.markIndexed(payload.listingId, doc);
        await pushToOpenSearch(doc).catch((error) => {
            ctx.log('opensearch_push_failed', { listingId: payload.listingId, error: error instanceof Error ? error.message : 'unknown' });
            // PG store stays authoritative; OpenSearch lag is observable via logs/metrics.
        });
        return;
    }
    if (job.jobType === 'search.delete') {
        if (!payload.listingId)
            throw new Error('VALIDATION: listingId required');
        await indexState.removePending(payload.listingId);
        return;
    }
    if (job.jobType === 'search.rebuild') {
        const chunkSize = Math.min(1000, Math.max(50, payload.chunkSize ?? 500));
        let offset = 0;
        for (;;) {
            const ids = await indexState.listListingIdsNeedingIndex(chunkSize, offset);
            if (ids.length === 0)
                break;
            for (const listingId of ids) {
                await indexState.upsertPending(listingId, new Date());
                await ctx.jobs.enqueue({ queue: 'search', jobType: 'search.index', payload: { listingId } });
            }
            offset += ids.length;
            if (ids.length < chunkSize)
                break;
        }
        ctx.log('search_rebuild_enqueued', { total: offset });
        return;
    }
    throw new Error(`UNKNOWN_SEARCH_JOB: ${job.jobType}`);
}
async function pushToOpenSearch(doc) {
    const baseUrl = process.env.OPENSEARCH_URL ?? '';
    if (!baseUrl)
        return;
    const listingId = String(doc.listingId ?? '');
    if (!listingId)
        return;
    const response = await fetch(`${baseUrl}/listings-v1/_doc/${listingId}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...doc, location_point: doc.locationPointWkt ?? undefined }),
    });
    if (!response.ok)
        throw new Error(`OPENSEARCH_${response.status}`);
}
