# GATE4_IAM_REPORT (§15)

## Hardening coverage

| Capability | Status | Detail |
|---|---|---|
| Registration | **IV** | argon2id (64MiB/t3), user pending; anti-bot precheck (disposable email → 422); email verification job enqueued (dedup per user) |
| Email verification | **IV** | sha256-at-rest token, single-consumption (DB row-locked), 24h TTL, 60s resend throttle, activation flips pending→active |
| Phone verification | **IV** | E.164 validation, 6-digit OTP hashed, 5-attempt cap, 10-min TTL, mismatch increments attempts |
| Login | **IV** | uniform failure messages (anti-enumeration), login_attempts telemetry (email/IP velocity feed), anti-bot precheck (block → 429) |
| Refresh rotation | **IV** (Gate 2 core, Gate 4 hardened tests) | sha256-at-rest, rotation on refresh, **reuse detection → revoke ALL sessions + audit row** (E2E E2) |
| Replay detection | **IV** | E2E E2 + C4 race: parallel reuse → exactly one winner, one reuse-detected |
| Logout / logout-all | **IV** | single-session revoke + logout-all with count; session listing API |
| Password change | **IV** | requires current password; revokes all sessions atomically |
| Password reset | **IV** | anti-enumeration response; single-use token; all sessions revoked |
| MFA foundation (TOTP) | **IV** | RFC 6238 implemented (±1 window, timing-safe compare); secret AES-256-GCM encrypted at rest (scrypt key from `MFA_ENCRYPTION_KEY`); enroll→activate→challenge login (`mfa_challenge` JWT 5-min)→disable; unique partial index enforces one active factor |
| Google OAuth | **IE** | full OIDC code exchange + profile + link-or-provision; UNVERIFIED against live Google (no client creds in sandbox) |
| Facebook OAuth | **IE** | Graph v21.0 flow implemented; UNVERIFIED live |
| OAuth account linking | **IV (DB)** | `iam.oauth_accounts` UNIQUE(provider, provider_user_id); link by verified email or provision new active user |

## Permission engine upgrade (critical)

`IamRepository.listPermissionCodesForUser` now resolves through **`iam.effective_permissions` (0030)**: organization roles ∪ personal-scope grants ∪ listing assignments (org-less scope). This made moderator actions, translations, commission and billing gates work in both organization and personal scopes — verified by E2E E4/E5.

## Verification evidence

- E2 (E2E): register→pending→login blocked→verify→login→refresh rotation→replay→all sessions revoked.
- J2..J5 (integration, real PG): email token consume-once + activation; OTP mismatch/attempts/success; password reset consumes + revokes sessions; MFA enroll/activate/disable lifecycle; OAuth link/find.
- MFA unit: TOTP window correctness, tamper detection of encrypted envelope, disposable-email provider.

## Honest notes

- MFA enrollment required before challenge flow is enforced; recovery codes are NOT implemented (registered).
- WebAuthn/passkey credentials are schema-modeled (frozen + 0024 constraints) but NOT implemented.
- OAuth state parameter is generated; server-side state store validation is a Gate 5 hardening candidate.
