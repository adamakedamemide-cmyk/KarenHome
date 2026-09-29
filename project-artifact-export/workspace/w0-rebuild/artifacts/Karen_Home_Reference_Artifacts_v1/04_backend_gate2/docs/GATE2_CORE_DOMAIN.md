# Gate 2 — Core Domain Implementation

## Scope
This gate closes the first critical correctness gaps found in Gate 1 and implements the first real transactional path:

User → authenticated actor → Property → Ownership → Listing → Moderation submission → Publication state transition → Outbox.

## Non-goals
- OpenSearch implementation
- Payment provider integration
- Email/phone verification delivery
- Mobile clients
- AI/recommendations

## Required database order
1. Apply the original frozen contract v1.
2. Apply `database/errata/0024_backend_critical_hardening.sql`.
3. Apply `database/errata/0025_additional_indexes.sql`.
4. Run `database/verify/critical-invariants.sql`.

## Concurrency rule
Any aggregate mutation that changes lifecycle state must use `expectedVersion` and a row lock inside one transaction.

## Event rule
If a mutation changes business state, its outbox event must be inserted in the same transaction as the state change.

## Authorization rule
A permission code is never sufficient by itself for organization-owned resources. The request must carry organization scope and the current user must be an active member.

## Security posture
Draft/non-published listing GETs are not exposed anonymously in Gate 2. Public published-only read is a subsequent search/public-read gate after an optional-auth guard and query policy are implemented.
