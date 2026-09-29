# Backend Contract Gate

## Compile-time gates
- TypeScript strict mode enabled.
- No `any` in domain/application modules except explicitly annotated adapters.
- Public DTOs cannot import ORM entities.
- Controllers cannot import infrastructure repositories directly.

## Runtime gates
- Authentication/authorization executed before handler.
- Request ID present on every response.
- Domain errors mapped to stable API codes.
- Mutations emit audit records where required.
- Integration side effects use outbox, not direct provider calls in transaction handlers.
- Payment/refund/order mutations require Idempotency-Key.
- Listing publication checks DB invariants and domain publication policy.
- Search reads only from OpenSearch/projection; writes never bypass PostgreSQL.

## Consistency gates
- Every create/update command is wrapped in a transaction when it changes multiple source-of-truth tables.
- Cross-module references are validated through application services or immutable event contracts.
- Consumers are idempotent and safe to replay.
- Indexing is eventually consistent and rebuildable.
