# Enterprise Real Estate Platform — Backend Contract v1.0

This package translates Database Contract Freeze v1.0 into the backend application contract.

## Architectural stance
- Modular Monolith first; event-driven boundaries from day one.
- PostgreSQL is the transactional source of truth.
- OpenSearch is a rebuildable projection.
- Redis is cache/coordination, never authoritative business state.
- Object storage holds binary media; PostgreSQL stores metadata and references.
- REST `/api/v1` is the canonical public application API; WebSocket is reserved for realtime features.
- Domain modules own business rules; controllers only authenticate/authorize/validate/map requests.

## Modules
identity, authorization, organizations, geography, properties, listings, search, media,
favorites, saved-searches, agents, projects, leads, crm, messaging, notifications,
payments, subscriptions, promotions, contracts, verification, moderation, valuation,
rental, reviews, content, seo, analytics, recommendations, admin.

## Freeze rules
1. No direct cross-module repository access.
2. Cross-module writes use application services/commands; asynchronous side effects use domain events/outbox.
3. Every mutating HTTP endpoint is authenticated unless explicitly marked public.
4. Every mutating endpoint is idempotent where a retry can create financial or duplicate business effects.
5. API responses use stable envelopes and machine-readable error codes.
6. Pagination for large collections is cursor-based.
7. Public identifiers are opaque; internal UUIDs are never used as user-facing identifiers by default.
