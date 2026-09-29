# ADRs — Gate 5

## ADR-G5-01: S3/Object-Storage adapter deferred to Gate 6 (pre-frontend)
**Context:** `StorageAdapter` port exists; only `LocalStorageAdapter` implemented. MinIO official distribution is discontinued (410 Gone) and no vendor credentials exist. **Decision:** implement the S3 adapter (SigV4, presigned upload/download, bounded timeouts, retry via job queue, failure-mode tests) as a mandatory Gate 6 acceptance criterion, tested against any S3-compatible endpoint the owner provides. **Consequence:** production deployment must not point media at S3 until then; local-fs remains the verified engine. Not a data-integrity/security break: no code claims S3 support.

## ADR-G5-02: FCM push adapter deferred (Gate 4 comment overstated)
**Context:** Gate 4's transports header claimed a "Fcm HTTP adapter" that does not exist (only Console transport). **Decision:** register the overstatement, correct the record, implement FCM HTTP v1 (service-account OAuth2, idempotent send, delivery-state mapping) before any mobile/notification production use. **Consequence:** push channel remains dev-console verified; preferences/fan-out infrastructure is ready.

## ADR-G5-03: CI postgres placeholder password accepted
**Context:** `.github/workflows/ci.yml` uses `POSTGRES_PASSWORD: ci-placeholder-password` for its ephemeral service container. **Decision:** ACCEPTED_RISK (LOW) — credential is CI-ephemeral, never deployed, grants nothing outside the throwaway runner DB. Optional hardening: per-run random. **Consequence:** none for production.

## ADR-G5-04: Five domains remain schema-complete/NOT_IMPLEMENTED after Gate 5
**Context:** Messaging, CRM, Projects, Valuation, Rental have full schemas + invariants but no application layer (grep-verified, no false claims). Gate 5's mandate was independent verification, not feature completion. **Decision:** do not build them inside Gate 5; sequence them in Gate 6+ (server-first, tests + authz mandatory from the first commit) while the frontend remains locked. **Consequence:** Gate 5 reports them as registered gaps with zero runtime surface.

## ADR-G5-05: OAuth state = signed-expiring (stateless) CSRF mitigation
**Context:** callback previously ignored state (G5-F-03). Server-side state store would add a table + cleanup for a currently-UNVERIFIED_EXTERNAL flow. **Decision:** HMAC-signed nonce+expiry state, mandatory validation, timing-safe compare; session-binding can be layered at the gateway when a browser frontend exists. **Consequence:** login-CSRF defeated without schema change; 10-minute TTL bounds replay.
