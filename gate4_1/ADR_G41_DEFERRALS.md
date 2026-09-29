# ADR Records — Gate 4.1 Deferrals (G41-01 .. G41-05)

Generated: 2026-09-29 · Status: ACCEPTED (deferred with target gates) · Supersedes: none

## ADR-G41-01 — Messaging domain deferred
- **Context**: `messaging.conversations/members/messages/message_media` exist in the frozen base schema; zero API code. Phase M forbids mock-filling.
- **Decision**: defer full messaging (threading, moderation hooks, attachments policy) to Gate 5+. Notification in-app channel (already implemented) is the interim user-touch surface.
- **Consequences**: no buyer-seller chat before Gate 5; schema remains reserved; no schema changes needed now.

## ADR-G41-02 — CRM depth deferred
- **Context**: `crm.leads/lead_activities/tasks/viewings` frozen; permissions `lead.read/lead.update` seeded; no module.
- **Decision**: defer lead pipeline + viewing scheduling to Gate 5; align with org/agent role model (0030 engine ready).
- **Consequences**: agents manage leads outside the platform until then; no mock endpoints.

## ADR-G41-03 — Contracts lifecycle deferred
- **Context**: only `legal.user_agreement_acceptances` implemented (real, E3-tested). `legal.contracts/contract_parties/contract_versions/contract_signatures` frozen with zero API.
- **Decision**: defer contract authoring/versioning/signature workflow to Gate 5+; requires jurisdiction/e-signature decision (HUMAN-DEPENDENT).
- **Consequences**: agreement acceptance continues to gate listing publication; contract lifecycle stays schema-only.

## ADR-G41-04 — Projects (new-development) domain deferred
- **Context**: `project.projects/buildings/floors/units/unit_prices/payment_plans` + `project_translations` (0029) frozen; no API.
- **Decision**: defer developer-project catalog (units, price lists, payment plans) to Gate 5; requires product decision on project/listing relationship.
- **Consequences**: listing-centric model remains the only publication path.

## ADR-G41-05 — Valuation domain deferred
- **Context**: `valuation.cases/results/comparables` frozen; no module.
- **Decision**: defer to Gate 6+; requires valuation methodology + data-source decisions (HUMAN-DEPENDENT).
- **Consequences**: no AVM endpoints; schema reserved.

## Rental & Moderation workflow
Grouped with the deferrals above: rental stays read-only evidence in publication policy; moderation case CRUD/workflow targets the same Gate as ADR-G41-02 (agent/operator tooling wave).
