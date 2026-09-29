# Static Review Checks — Gate 2

- [PASS] TypeScript source parse diagnostics: 0 across 50 `.ts` files
- [PASS] Gate 1 in-memory property repository is no longer wired in `PropertiesModule`
- [PASS] Listing controller no longer echoes request payload or fabricates publish state
- [PASS] Login DTO does not enforce registration password-complexity policy
- [PASS] Access JWT no longer contains global permission snapshot
- [PASS] Root scripts use pnpm filters, matching `packageManager`
- [PASS] Contracts package has build/typecheck configuration
- [PASS] Nest CLI build configuration is present
- [PASS] Outbox has worker claim state (`locked_at`, `locked_by`)
- [PASS] Published-listing child mutation invariant is rechecked by deferred trigger
- [PASS] Listing optimistic version column is introduced by errata
- [PASS] Refresh rotation uses row locking in one transaction and detects revoked-token reuse
- [PASS] Property ownership assignment serializes on the property row
- [NOT RUN] Live PostgreSQL/PostGIS integration; target daemon is not available in this environment
- [NOT RUN] Full dependency install/build; dependency installation previously timed out in this environment
