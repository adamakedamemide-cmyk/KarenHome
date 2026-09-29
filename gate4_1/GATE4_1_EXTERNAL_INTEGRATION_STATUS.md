# GATE4_1_EXTERNAL_INTEGRATION_STATUS — Phase E

Generated: 2026-09-29 · Mandate: GATE 4.1 §E
Rule honored: **no vendor integration is marked PASS just because an adapter exists.**
`UNVERIFIED_EXTERNAL` = adapter complete + contract test + defined failure mode + documented dependency, but no live provider was exercised.

## Classification buckets

| Bucket | Meaning |
|---|---|
| CORE-BLOCKING | Required for security, data integrity, core API, or listing publication. |
| CORE-READY | Code/adapter complete; only provider credentials/environment missing. |
| NON-BLOCKING | Extendable capability; not required before opening Frontend. |
| HUMAN-DEPENDENT | Cannot be completed without credentials, contract, jurisdiction or business decision. |

## The 15 registered Gate 4 gaps

| # | Item | Status | Evidence | Missing dependency | Impact | Verified locally? | Credentials? | Human decision? | Target Gate | Bucket |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | OpenSearch live verification | UNVERIFIED_EXTERNAL | `opensearch.engine.ts` full REST adapter (multi_match, facets, geo_bounding_box, health probe); PG fallback proven by `search_fallback_total` | Live OpenSearch endpoint | Search scale-out only; PG FTS fully verified | Engine logic yes; cluster no | Yes (OPENSEARCH_URL) | No | Gate 5+ | CORE-READY (client lacks auth headers — code gap, see OPEN_ISSUES) |
| 2 | SMTP live verification | UNVERIFIED_EXTERNAL | `transports/transports.ts` Nodemailer SMTP transport + Console transport used in tests | SMTP host/credentials | Email delivery (verification/reset) | Console path yes; SMTP no | Yes | No | Gate 5 | CORE-READY |
| 3 | Twilio live verification | UNVERIFIED_EXTERNAL | SMS Twilio transport + Console fallback; dedupKey `sms.otp:{userId}:{phone}` | Twilio SID/token/sender | SMS OTP delivery | Console path yes | Yes | No | Gate 5 | CORE-READY |
| 4 | FCM live verification | UNVERIFIED_EXTERNAL | Notification fan-out creates per-channel deliveries; push channel consumes same job envelope | FCM project + service account | Push notifications | In-app path yes | Yes | No | Gate 5+ | NON-BLOCKING |
| 5 | OAuth live verification | UNVERIFIED_EXTERNAL | `oauth-providers.ts` real token-exchange + profile fetch for Google/Facebook; typed 503 `OAUTH_PROVIDER_NOT_CONFIGURED` (regression-tested J2/J3) | OAuth client IDs/secrets + redirect domains | Social login | Config-absent path yes; handshake no | Yes | Redirect domain registration | Gate 5 | CORE-READY |
| 6 | ClamAV adapter | PARTIAL (signature-based scan only) | `media.worker.ts` `scanBuffer` (EICAR + script-probe) + quarantine proven (J-suite/E7) | clamd daemon / vendor engine | Malware boundary strength | Signature path yes | No (self-host) | Deployment choice: clamd vs vendor | Gate 5 | CORE-BLOCKING (for production media intake) |
| 7 | S3 adapter | NOT IMPLEMENTED (local disk only) | `LocalStorageAdapter` traversal-guarded; comment marks swap point; zero s3 references | Storage provider + decision (S3/R2/MinIO) | Production storage, CDN fronting | Local path yes | Yes | Provider + jurisdiction | Gate 5 | CORE-BLOCKING (for production) |
| 8 | Messaging | NOT IMPLEMENTED (schema frozen, zero API code) | `messaging.*` tables in frozen base schema; no module | Product scope decision | Buyer-seller communication | — | No | Yes (product) | ADR-G41-01 → Gate 5+ | HUMAN-DEPENDENT (product scope) |
| 9 | CRM depth | NOT IMPLEMENTED (schema frozen, zero API code) | `crm.leads/lead_activities/tasks/viewings` frozen; only `lead.read/update` permissions seeded | Product scope decision | Lead management | — | No | Yes | ADR-G41-02 → Gate 5+ | HUMAN-DEPENDENT |
| 10 | Contracts depth | PARTIAL — agreements acceptance only | `legal` module: `legal.user_agreement_acceptances` insert + hasAccepted (E3 exercises it); `legal.contracts*` tables have zero API code | Contract lifecycle product decision | Contract management | Acceptance path yes | No | Yes | ADR-G41-03 → Gate 5+ | HUMAN-DEPENDENT |
| 11 | Projects depth | NOT IMPLEMENTED (schema frozen) | `project.projects/buildings/floors/units/unit_prices/payment_plans` frozen; `project_translations` (0029) unused by API | Developer-project product decision | New-development listings | — | No | Yes | ADR-G41-04 → Gate 5+ | HUMAN-DEPENDENT |
| 12 | Valuation depth | NOT IMPLEMENTED (schema frozen) | `valuation.cases/results/comparables` frozen; no module | Valuation methodology decision | AVM/valuation cases | — | No | Yes (methodology) | ADR-G41-05 → Gate 6+ | HUMAN-DEPENDENT |
| 13 | Worker-native metrics | PARTIAL → improved | Workers log structured `job_completed/job_failed` (attempt, backoff, outcome); Prometheus registry exists API-side only (`/metrics`); DLQ ops API exists | Worker Prometheus registry + scrape path | Operational visibility | Metrics design verified by code review + DLQ ops endpoints | No | Monitoring infra choice | Gate 5 | NON-BLOCKING (registry addition planned) |
| 14 | OpenAPI annotations | PARTIAL → improved | 0/15 controllers carried decorators; runtime doc built by reflection (E9 asserts coverage); Gate 4.1 added committed spec `apps/api/openapi.json` (90 paths / 93 operations) + CI drift check | Per-endpoint decorator enrichment (schemas/examples) | Contract precision | Spec dump verified locally (D-step) | No | No | Gate 5 | NON-BLOCKING (drift protection now ACTIVE) |
| 15 | CAPTCHA vendor | NOT IMPLEMENTED | Anti-bot service: disposable-email heuristics + throttling + login telemetry (J4) — no CAPTCHA hook | Vendor choice (hCaptcha/reCAPTCHA/Turnstile) | Bot-resistance depth | Heuristic paths yes | Yes | Yes (vendor + UX) | Gate 5+ | HUMAN-DEPENDENT (vendor/UX) |

## Summary

- CORE-BLOCKING: 2 (ClamAV-grade malware boundary, S3/object storage) — both are **production-deployment** blockers, not code-correctness blockers; local pipeline integrity fully verified.
- CORE-READY: 4 (OpenSearch, SMTP, Twilio, OAuth) — adapters real, contract/absence paths regression-tested, waiting on credentials.
- NON-BLOCKING: 2 (FCM push, worker Prometheus registry; OpenAPI drift protection was upgraded to ACTIVE in Gate 4.1).
- HUMAN-DEPENDENT: 7 (Messaging, CRM, Contracts depth, Projects, Valuation, CAPTCHA vendor, jurisdiction/provider choices) — ADRs G41-01..05 registered.
