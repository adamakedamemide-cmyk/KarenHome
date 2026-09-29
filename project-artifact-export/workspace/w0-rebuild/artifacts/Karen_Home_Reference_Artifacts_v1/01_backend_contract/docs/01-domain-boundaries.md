# Domain Boundaries

## Identity
Owns users, credentials, sessions, email/phone verification state.
Does not know properties, listings, payments, or CRM rules.

## Authorization
Owns roles, permissions and policy evaluation. It answers whether an actor may perform an action on a resource.

## Organizations
Owns organizations, memberships, agency/developer profiles and organization-scoped roles.

## Geography
Owns country/region/city/district/neighborhood/street taxonomy and spatial primitives.

## Properties
Owns the physical real-estate asset, subtype details, ownership, location, amenities and property documents.
A property can exist without an active listing.

## Listings
Owns the market offer: transaction type, status, pricing, media, contact settings, promotions and publication lifecycle.
A listing references exactly one property.

## Search
Owns search indexes and ranking projections only. It never becomes the source of truth.

## Projects
Owns developers, projects, buildings, floors, units and unit price/payment plans. Project units can reference properties.

## CRM/Leads
Owns commercial lead lifecycle, tasks, activities, viewings and pipeline state for organizations.

## Messaging
Owns conversation/message delivery state. It may reference listings or leads but does not own their lifecycle.

## Billing
Owns products, orders, payments, refunds, invoices, subscriptions and ledger entries.

## Rental
Owns leases, rent schedules, rent payments and maintenance tickets. It may reference properties/users/organizations but does not duplicate ownership truth.

## Legal
Owns contract templates, contract instances, versions, parties and signatures.

## Verification
Owns verification cases and verification evidence; it does not directly mutate the verified subject's core lifecycle.

## Moderation
Owns reports, moderation cases/actions and review decisions.

## Valuation
Owns valuation cases/results/comparables. It reads approved transactional and market projections and writes valuation outputs.

## Notifications
Owns notification templates/preferences/deliveries; other modules publish events, not direct provider calls.

## Reviews
Owns review records and moderation state. Aggregated ratings are projections.

## Content/SEO
Owns editorial pages, structured SEO pages and redirects. It does not own listings or properties.

## Analytics
Consumes immutable events; it does not participate in transactional decisions.

## Recommendations
Consumes behavior/market features and produces recommendation projections.
