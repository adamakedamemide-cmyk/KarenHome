# GATE4_NOTIFICATION_REPORT (§13)

## Implemented

- **Central service:** `NotificationService` (API) + `NotificationWorker` (worker) — event-driven: API/outbox enqueue `notification.dispatch`; worker materializes the in-app row and fans out per channel.
- **Channels:** `in_app` (always on, inbox row), `email`, `sms`, `push` — deliveries persisted in `notification.deliveries` (status/attempts/last_error/provider_reference).
- **Preference engine:** per-user `user_preferences` (type × channel) + **organization preferences** (0032, type × channel, AND-composed) + **quiet hours** (0032 per-user window incl. overnight ranges with IANA timezone, evaluated at dispatch via `Intl.DateTimeFormat`). Disabled channels are recorded as disabled, not silently dropped.
- **Template resolution:** `notification.templates` per (code, locale, channel) with locale fallback chain (§9); fallback title/body supplied by the caller keeps the payload localization-ready without hard-coded UI copy.
- **Transactional flows:** registration → `email.verification` (deduped per user); password reset → `email.password_reset`; OTP → `sms.otp` (6-digit, hashed at rest, 10-min TTL, attempt-capped).
- **Event wiring:** ListingPublished → owner notification (outbox worker); Subscription lifecycle events → notification jobs.

## Transports

| Channel | Verified | Implemented (unverified live) |
|---|---|---|
| in_app | IV (rows + listUnread/markRead API) | — |
| email | Console transport (structured JSON) | SMTP via nodemailer (`SMTP_URL`) |
| sms | Console transport | Twilio REST (`TWILIO_*`) |
| push | Console transport | vendor FCM/APNs NOT IMPLEMENTED (registered) |

## Verification

- J10 (real PG): preferences gate (explicit false / default true / org override composition), quiet hours persisted as HH:MI with timezone, notification + deliveries rows created.
- E2E E2: registration produced a deduped email.verification job; verification→activation path consumes it.
- Worker-side dispatch logic covered by unit-level flow checks + queue semantics (J1/C2).

## Honest notes

- Template rendering is token-substitution level (`{{}}` not implemented — bodies arrive pre-rendered from callers); a template engine is a Gate 5 candidate.
- Digest/batching and per-channel retry policies beyond the shared job backoff are not implemented.
