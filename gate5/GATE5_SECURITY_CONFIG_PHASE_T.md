# GATE 5 — Phase T: Production Configuration Audit (G5R-CONF-001)

Method: code-path inspection + **real production-mode boot test** (the strongest possible check in this environment: the API was actually booted with `NODE_ENV=production` during the Phase R benchmark — with and without required keys).

## 1. Checks

| Check | Result | Evidence |
|---|---|---|
| No dev secret in production path | ✅ | `JWT_SECRET` min-43 enforced always; `MFA_ENCRYPTION_KEY` **fail-fast required when NODE_ENV=production** — boot without it crashes (observed live: `MFA_ENCRYPTION_KEY (>=43 chars) is required when NODE_ENV=production`) |
| No dev MFA fallback | ✅ | Gate 4.1 removed the dev key path; Gate 5 re-verified by real boot attempt + code (`iam-hardening.service.ts:44`) |
| No debug mode in production | ✅ | SAST FS-01 `debug:\s*true` → 0 hits across source |
| No test provider in production path | 🟡 registered | Console transports (email/sms/push) activate **by absence of credentials**, not by NODE_ENV — in production without SMTP/Twilio config the worker logs instead of sending (behavior identical to dev). Honest registration: acceptable while channels are UNVERIFIED_EXTERNAL/NOT_IMPLEMENTED; must become config-validation fail-fast before launch (registered in NEXT_GATE) |
| No insecure CORS | ✅ | `app.enableCors({ origin: false, credentials: false })` — browser origins denied by default; wildcard never configured (SAST FS-02: 0 hits) |
| No wildcard production origin | ✅ | same as above |
| No verbose production errors | ✅ | Global exception filter maps errors to `{code, message(key), requestId}`; docs gated: `docsEnabled = nodeEnv !== 'production' \|\| ENABLE_API_DOCS==='true'` (Swagger off in prod by default) |
| Environment matrix | 🟡 registered | Repo carries `docker-compose.postgres.yml` (dev, REDACTED password) + `.env.example` (placeholders only). No staging/production compose/manifest exists yet — deployment configuration itself is a NEXT-GATE deliverable (no false claims: none committed) |

## 2. Configuration surface (audited `app-config.ts` — every getter bounds-checked)

Typed getters with min/max validation for: DB pool, TTLs (access 60–3600s, refresh 1h–365d), port, media size (1KB–100MB), backoff (1–300s base / 60–86400s max), agreement version — invalid values **throw**, they are never silently clamped. OAuth credentials: null-coalescing (provider unconfigured → typed 503, never a fake login). `OPENSEARCH_URL` absence → verified PG FTS fallback (not a crash, by design, health-reported).

## 3. Verdict

No dev secret, dev MFA fallback, debug mode, insecure CORS, wildcard origin, or verbose production error path exists in the production configuration surface. Two forward items registered (test-provider fail-fast; staging/prod deploy manifests) — both pre-frontend work, both in `GATE5_NEXT_GATE.md`.
