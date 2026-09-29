# Domain/Event Catalog

## Rules
- Domain events describe committed business facts.
- Integration events are emitted through the outbox after the transaction commits logically.
- Event payloads are versioned (`eventType` + `eventVersion`).
- Consumers must be idempotent.

## Core events
`UserRegistered.v1`
`UserPhoneVerified.v1`
`OrganizationCreated.v1`
`OrganizationMemberAdded.v1`
`PropertyCreated.v1`
`PropertyUpdated.v1`
`PropertyOwnershipChanged.v1`
`ListingCreated.v1`
`ListingPublished.v1`
`ListingPaused.v1`
`ListingArchived.v1`
`ListingSold.v1`
`ListingRented.v1`
`ListingPriceChanged.v1`
`ListingMediaAttached.v1`
`FavoriteAdded.v1`
`SavedSearchMatched.v1`
`ProjectCreated.v1`
`ProjectUnitStatusChanged.v1`
`LeadCreated.v1`
`LeadStatusChanged.v1`
`ViewingScheduled.v1`
`ViewingCompleted.v1`
`PaymentInitiated.v1`
`PaymentSucceeded.v1`
`PaymentFailed.v1`
`RefundCompleted.v1`
`SubscriptionActivated.v1`
`VerificationCompleted.v1`
`ModerationCaseResolved.v1`
`ContractCreated.v1`
`ContractSigned.v1`
`LeaseActivated.v1`
`RentPaymentRecorded.v1`
`MaintenanceTicketCreated.v1`
`ValuationCompleted.v1`
`ReviewPublished.v1`

## Important consumers
- Search indexer: ListingCreated/Updated/Published/Archived/PriceChanged.
- Notifications: selected user-facing events.
- Analytics: all business events.
- Recommendation engine: views, favorites, searches and lead events.
- Fraud engine: account/listing/payment/verification events.
