# GATE 5 — Phase K: Messaging Audit

Status: **NOT_IMPLEMENTED** (schema-complete only). No false claims registered.

## File-by-file reality
- Database: `messaging.conversations`, `messaging.conversation_members`, `messaging.messages`, `messaging.message_reads` (4 tables, migration-verified, invariant-tested at SQL level).
- Entity/Repository: none in `packages/db/src` (no messaging-repository.ts).
- Service/Command/Query: none in `apps/api/src/modules` (no messaging module).
- API: no paths in `openapi.json`. Events/Workers: none. Authorization: none. Tests: none.

## Mandated scenarios (Phase K)
Owner↔Buyer, Agent↔Lead, organization isolation, IDOR, unauthorized message access, rate limit, moderation boundary — **NOT_EXECUTABLE**: there is no implementation to attack or test. Registering the absence honestly; schema is ready for a future gate with IDOR/IDN-isolation tests to be written alongside the service (mandatory acceptance criteria in GATE5_NEXT_GATE.md).

## Guard against false status
No controller/DTO/DTO-schema exists for messaging anywhere (grep-verified). The domain cannot be reached by any client.
