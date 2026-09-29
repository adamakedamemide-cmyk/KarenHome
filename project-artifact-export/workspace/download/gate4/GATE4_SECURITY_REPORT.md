# GATE4_SECURITY_REPORT (§16/§23/§27)

## Anti-Bot Foundation (§16)

| Signal | Implementation | Status |
|---|---|---|
| IP velocity | `iam.login_attempts` telemetry → failures/15min thresholds (10 elevate, 20 → temp block 15min via `platform.blocks`) | **IV** (unit + J-suite DB path) |
| Account velocity | email-keyed failure counts available (`countRecentEmailFailures`); wired into login telemetry | **IV (surface)** |
| OTP abuse | hashed OTP, 5-attempt cap, 10-min TTL, resend dedup keys | **IV** |
| Login attempts | recorded success/failure with ip/UA on every login | **IV** |
| Registration attempts | anti-bot precheck on register | **IV** |
| Disposable email | static provider (15 domains) + provider interface | **IV** (E5-adjacent unit + register path) |
| Credential stuffing | velocity thresholds + temp blocks + risk events (`platform.risk_events`) | **IV (foundation)** |
| Risk score | weighted signals, 0..1, persisted per event; ad impression burst scoring | **IV** |
| Progressive challenge | `ChallengeProvider` abstraction + NoopChallengeProvider; CHALLENGE_REQUIRED contract | **IV (abstraction)**; real CAPTCHA NOT IMPLEMENTED (registered) |
| Temporary block | `platform.blocks` + SQL `platform.is_blocked()` enforced in login/register precheck | **IV** (G16/G17 SQL checks) |
| Provider abstraction | CAPTCHA/velocity stores behind interfaces; Redis store seam registered | **IV (seam)** |

## Platform hardening (§17/§18/§19/§21)

- Rate limiting: token-bucket policies (auth 10/min·IP, search 60/min·IP, default 120/min·IP) enforced as fastify preHandler; unit-verified bucket behavior (E0). In-memory store + Redis swap seam — single-node honest note.
- Code-based error model everywhere (`DomainError` + catalog; localized en/ru; stable `{error:{code,message,details?,requestId}}` shape).
- Observability: request-id/trace-id propagation (headers echoed), structured access logs, HTTP/db/search duration histograms, `/api/v1/metrics` Prometheus exposition.
- DB access: parameterized casts everywhere; bounded queries (page clamps, LIMIT caps); pagination; optimistic concurrency (listing version) + row locks only where required; **EXPLAIN ANALYZE on key queries** (0.05–0.15 ms in sandbox — see performance report).
- Secrets: JWT_SECRET/MFA_ENCRYPTION_KEY minimum lengths enforced at boot; MFA secrets encrypted (AES-256-GCM) and tamper-checked (unit).
- Transport guards: HTTP error bodies never echo stack traces; global 500 → INTERNAL_ERROR.

## Red-team summary

See `GATE4_RED_TEAM_REPORT.md` — 15 scenarios: 12 blocked with regression coverage, 2 N/A (no webhooks), 1 partial (media job-level). **No unresolved bypasses.**

## Honest residual risks (§27)

1. Single-node rate-limit store (Redis adapter seam ready) — horizontal deployments must switch stores.
2. Challenge provider is noop → progressive challenge currently logs/limits but does not present CAPTCHA.
3. SMS/email transports unverified against live vendors.
4. OAuth state not persisted server-side (client-echo only).
