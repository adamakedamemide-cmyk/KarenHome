# Application Command / Query Catalog

## Identity
Commands: RegisterUser, VerifyPhone, VerifyEmail, CreateSession, RevokeSession, EnableMfa
Queries: GetCurrentUser, ListUserSessions

## Organizations
Commands: CreateOrganization, InviteMember, ChangeMemberRole, RemoveMember, CreateAgencyProfile, CreateDeveloperProfile
Queries: GetOrganization, ListOrganizationMembers, ListOrganizationListings

## Properties
Commands: CreateProperty, UpdateProperty, AssignOwner, ReplaceOwners, AttachAmenity, AttachDocument, SetLocation
Queries: GetProperty, GetPropertyOwnership, GetPropertyHistory

## Listings
Commands: CreateListing, UpdateListing, PublishListing, PauseListing, ArchiveListing, MarkSold, MarkRented, ChangePrice, AttachListingMedia, PromoteListing
Queries: GetListing, ListMyListings, GetListingPriceHistory, GetSimilarListings

## Search
Commands: ReindexListing, RebuildListingIndex
Queries: SearchListings, SearchListingsOnMap, GetSearchFacets

## Favorites/Saved Search
Commands: AddFavorite, RemoveFavorite, CreateSavedSearch, UpdateSavedSearch, DeleteSavedSearch
Queries: ListFavorites, ListSavedSearches, TestSavedSearch

## Projects
Commands: CreateProject, AddBuilding, AddFloor, AddUnit, ChangeUnitStatus, SetUnitPrice, CreatePaymentPlan
Queries: GetProject, ListProjectUnits, GetProjectAvailability

## CRM
Commands: CreateLead, ChangeLeadStatus, AddLeadActivity, CreateTask, ScheduleViewing, ConfirmViewing, CompleteViewing
Queries: GetLead, ListLeads, ListActivities, ListViewings

## Billing
Commands: CreateOrder, StartPayment, HandlePaymentWebhook, RequestRefund, CreateSubscription, CancelSubscription
Queries: GetOrder, GetPayment, GetInvoice, GetLedgerAccount

## Verification/Moderation
Commands: StartVerification, SubmitEvidence, ResolveVerification, ReportEntity, OpenModerationCase, ResolveModerationCase
Queries: GetVerificationCase, ListModerationQueue

## Legal/Rental
Commands: CreateContract, GenerateContractVersion, RequestSignature, SignContract, CreateLease, ActivateLease, GenerateRentSchedule, RecordRentPayment, OpenMaintenanceTicket
Queries: GetContract, GetLease, GetRentSchedule, ListMaintenanceTickets

## Valuation
Commands: RequestValuation, ComputeValuation, ExpireValuation
Queries: GetValuation, ListComparables
