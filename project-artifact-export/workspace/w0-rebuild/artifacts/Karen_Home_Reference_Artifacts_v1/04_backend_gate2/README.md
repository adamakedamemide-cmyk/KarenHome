# Enterprise Real Estate Platform — Backend Gate 2

Gate 2 is the first core-domain implementation after the Gate 1 deep audit.

Implemented:
- PostgreSQL-backed Property repository
- Ownership assignment with locking and audit
- PostgreSQL-backed Listing repository
- Listing lifecycle/state machine
- optimistic `marketplace.listings.version` concurrency
- organization-scoped permission lookup foundation
- access token identity claims without global permission snapshots
- atomic refresh rotation + revoked-token reuse response
- transactional Outbox persistence + worker claiming
- structured API errors
- live/readiness health endpoints
- schema errata and critical invariant verification

The bundle contains the frozen base schema under `database/base/`; apply it, then errata 0024–0026.
See `docs/DEEP_AUDIT_GATE1_FILE_BY_FILE.md` before changing any Gate 2 module.
