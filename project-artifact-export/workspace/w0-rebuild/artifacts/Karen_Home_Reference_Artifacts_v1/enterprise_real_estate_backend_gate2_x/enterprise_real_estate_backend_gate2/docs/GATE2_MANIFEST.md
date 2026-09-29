# Gate 2 Manifest

## Added implementation files
- `packages/db/src/property-repository.ts`
- `packages/db/src/listing-repository.ts`
- `packages/db/src/outbox-repository.ts`
- `packages/db/src/audit-repository.ts`
- `apps/api/src/modules/listings/domain/listing-state.machine.ts`
- `apps/api/src/modules/listings/application/listing.service.ts`
- `apps/api/src/modules/listings/presentation/dto/*`
- `apps/api/src/modules/properties/application/assign-owner.handler.ts`
- `apps/api/src/modules/properties/presentation/dto/assign-owner.dto.ts`
- `apps/api/src/modules/authorization/authorization.module.ts`

## Reworked files
- IAM token model, IAM service and repository
- API bootstrap/config/error handling
- Property controller/application/module
- Listing controller/module
- Database module
- root scripts/package coordination

## Validation assets
- listing state machine unit tests
- integration test harness
- schema critical invariant verifier
- PostgreSQL/PostGIS compose file

## Explicit status
Static TypeScript parsing and cross-file contract inspection are performed here; full semantic build requires installed project dependencies; this environment does not contain the target PostgreSQL/PostGIS daemon, so live DB integration is not claimed here.

- `database/errata/0026_outbox_claiming.sql` adds worker claim state for safe multi-worker polling.
