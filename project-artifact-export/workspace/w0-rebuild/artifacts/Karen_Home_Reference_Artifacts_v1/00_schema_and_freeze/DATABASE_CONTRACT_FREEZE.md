# Database Contract Freeze v1.0

## Scope
This package freezes the PostgreSQL/PostGIS data contract for the Enterprise Real Estate Platform before backend controller/service implementation.

## Canonical rules
1. PostgreSQL is the transactional source of truth.
2. `Property` is the physical asset; `Listing` is a market offer over that asset.
3. Search indexes are projections and may be rebuilt from transactional data/events.
4. Money is represented as numeric amount + ISO-like 3-letter currency code; never store formatted money strings.
5. Files live in object storage; PostgreSQL stores metadata and object keys.
6. Business-critical integrity must be enforced by FK/CHECK/UNIQUE/EXCLUDE/constraint-trigger where practical.
7. Financial ledger entries must balance at commit.
8. Active/sold/rented properties must have total ownership shares of exactly 100%.
9. Active leases for the same property may not overlap.
10. Listing price history, project unit price history, and appointment intervals may not overlap under their respective constraints.

## Migration order
The migrations are intentionally sequential from 0001 through 0023. Do not reorder them.

## Freeze gate
Before coding the main backend, run the migrations against a clean PostgreSQL 16+ / PostGIS 3.4+ instance, then execute `tests/sql/contract_invariants.sql`.

## Known boundaries
Some cross-row business rules remain intentionally in service-layer/domain logic rather than database triggers, especially polymorphic review targets, search ranking, recommendation scores, and provider-specific payment semantics.

## Deployment recommendation
Use a migration runner that records applied version numbers in its own migration table or migration framework. Production migrations must be immutable after release; corrections should ship as new migrations.
