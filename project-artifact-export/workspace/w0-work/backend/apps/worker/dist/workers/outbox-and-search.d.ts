import { type JobRecord } from '@platform/db';
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
export declare function handleOutboxJob(_job: JobRecord, ctx: WorkerContext): Promise<void>;
/**
 * SearchIndexerWorker (§11): pending → indexed with retry/dead-letter via the
 * job queue; RebuildSearchIndex is a chunked scan job. OpenSearch push happens
 * when OPENSEARCH_URL is configured AND reachable; the PG FTS doc store is
 * always authoritative (verified engine).
 */
export declare function handleSearchJob(job: JobRecord, ctx: WorkerContext): Promise<void>;
