# Enterprise Real Estate Platform — PostgreSQL Schema v1 Review

## Canonical decision

PostgreSQL is the transactional source of truth. The canonical schema is SQL-first. ORM mappings must follow the database contract; ORM migrations must not silently replace PostgreSQL constraints.

## Recommended runtime

- PostgreSQL 16+ (17+ is also suitable)
- PostGIS 3.4+
- `pgcrypto`
- `citext`
- `btree_gist`
- UUIDs: application-generated UUIDv7 preferred; DB default is `gen_random_uuid()` as a safety fallback

## PostgreSQL schemas / bounded contexts

| Schema | Responsibility |
|---|---|
| `platform` | currencies, exchange rates, feature flags, settings, idempotency |
| `iam` | users, credentials, sessions, roles, permissions |
| `org` | agencies, developers, memberships |
| `geo` | country/city/district/neighborhood/street hierarchy and geospatial boundaries |
| `property` | the physical asset and ownership |
| `marketplace` | listings, prices, media, favorites, saved searches, promotions |
| `project` | developer projects, buildings, floors, units, payment plans |
| `crm` | leads, activities, tasks, viewings |
| `messaging` | conversations and messages |
| `billing` | products, prices, orders, payments, refunds, subscriptions, ledger |
| `verification` | identity/property/document verification |
| `moderation` | reports, moderation cases, actions |
| `content` | CMS and SEO pages/redirects |
| `legal` | contracts, versions, signatures |
| `rental` | leases, rent schedules/payments, maintenance |
| `valuation` | valuation cases, results, comparable properties |
| `notification` | notification templates, preferences, deliveries |
| `review` | reputation/reviews |
| `audit` | immutable-ish audit trail and transactional outbox |

## Critical invariants enforced at DB level

1. A `property` is different from a `listing`.
2. A cadastral number is unique when present.
3. Only one primary location exists per property.
4. Only one cover media item exists per property/listing.
5. Listing price history cannot overlap itself in time.
6. Project units cannot point to a building from another project.
7. Project floors cannot be attached to a different building.
8. Agent viewing slots cannot overlap for the same assigned agent.
9. Active/pending leases cannot overlap on the same property.
10. Ownership shares cannot exceed 100%; active/sold/rented properties must total 100% at transaction commit.
11. Double-entry ledger transactions must balance debit = credit.
12. Monetary values use `numeric(20,4)`, never floating point.
13. Currency is stored separately from the amount.
14. Idempotency keys are unique within a scope.
15. Payment provider references are unique when provided.
16. Soft deletion is explicit and not used as a substitute for audit history.
17. Lifecycle states are constrained with enums where state changes are finite.
18. Frequently expanding taxonomies (property types, amenities, promotion types when product changes are expected) are table-driven rather than enum-driven.

## Deliberate design choices

### Property vs Listing

`property.properties` represents the physical asset. `marketplace.listings` represents a market offer. One property can have multiple historical or concurrent market offers of different transaction types.

### Money

Use integer minor units only if every business rule can tolerate currency-specific scaling. For this platform, `numeric(20,4)` is chosen because real-estate prices, installment plans, fees, and valuation outputs may require more than two decimal places in some currencies or calculation contexts.

### Search

OpenSearch is a read model. PostgreSQL remains canonical. Listing/property writes emit outbox events; an indexer updates search documents asynchronously.

### Geo

Public address visibility is controlled using `location_visibility`. Exact property coordinates should not automatically be exposed to anonymous users.

### Polymorphic references

`moderation`, `audit`, and `review` contain target-type/target-id pairs because they must support many entity classes. These are intentional integrity trade-offs. Core transactional relationships use real foreign keys.

### Audit and outbox

Both live in PostgreSQL. Business writes and their corresponding outbox record must be committed atomically. Consumers must be idempotent.

## Migration order

Production migrations should be split rather than run as a single 1,700-line file.

Recommended sequence:

1. `0001_extensions_schemas.sql`
2. `0002_platform.sql`
3. `0003_iam.sql`
4. `0004_org.sql`
5. `0005_geo.sql`
6. `0006_property.sql`
7. `0007_media.sql`
8. `0008_marketplace.sql`
9. `0009_project.sql`
10. `0010_crm.sql`
11. `0011_messaging.sql`
12. `0012_billing.sql`
13. `0013_verification.sql`
14. `0014_moderation.sql`
15. `0015_legal.sql`
16. `0016_rental.sql`
17. `0017_valuation.sql`
18. `0018_notification.sql`
19. `0019_review.sql`
20. `0020_content.sql`
21. `0021_audit_outbox.sql`
22. `0022_indexes.sql`
23. `0023_triggers_constraints.sql`
24. `0090_seed_reference_data.sql`

The supplied SQL file is a canonical baseline/reference migration. Splitting it is recommended before production deployment so that rollback, review, and release management remain controlled.

## ORM rule

Recommended: SQL-first + Drizzle/Kysely-style typed mapping.

Do not allow an ORM to silently remove or weaken:

- PostGIS types
- exclusion constraints
- partial unique indexes
- deferred constraint triggers
- composite foreign keys
- JSONB indexes
- ledger invariants
- ownership-share invariants

For Prisma, PostgreSQL-specific constraints should remain in explicit SQL migrations and be represented in the Prisma model only where Prisma can faithfully model them.

## Next validation gate before backend implementation

Before coding controllers/services, run the following against a real staging PostgreSQL/PostGIS instance:

- apply all migrations from an empty database
- apply the migrations a second time in a disposable database snapshot using the migration runner
- insert valid and invalid ownership combinations
- insert overlapping listing price intervals
- insert overlapping leases
- insert cross-project unit/building combinations
- insert cross-agent overlapping viewings
- insert an unbalanced ledger transaction
- exercise payment idempotency
- test soft delete and FK behavior
- run `EXPLAIN (ANALYZE, BUFFERS)` on the principal marketplace search queries
- verify GiST indexes for property/location/lease/viewing ranges
- verify OpenSearch projection consistency from the outbox

Only after this database gate passes should the Backend API contract be frozen.
