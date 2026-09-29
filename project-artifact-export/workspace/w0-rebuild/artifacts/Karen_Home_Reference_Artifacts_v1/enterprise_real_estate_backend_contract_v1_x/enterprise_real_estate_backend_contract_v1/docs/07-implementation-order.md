# Backend Implementation Order

1. Platform/config/observability
2. Database adapter + transaction abstraction
3. Identity + authorization
4. Organizations
5. Geography
6. Properties + ownership
7. Media
8. Listings + publication lifecycle
9. Outbox + event bus
10. Search indexer + search API
11. Favorites + saved searches
12. Projects/developers
13. Leads/CRM + viewings
14. Messaging + notifications
15. Billing + payment provider abstraction + ledger
16. Verification + moderation
17. Legal/contracts
18. Rental/property management
19. Valuation
20. Reviews/content/SEO
21. Analytics/recommendations
22. Admin APIs
23. Mobile/public API hardening

Do not start AI, recommendations or advanced analytics before transactional event contracts are stable.
