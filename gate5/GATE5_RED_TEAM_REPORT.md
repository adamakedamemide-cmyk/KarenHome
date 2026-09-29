# GATE 5 — Red Team Report (G5R-RT-001)

Perspective: independent adversary attempting authentication bypass, cross-tenant access, data poisoning and abuse of the external-integration surface. All claims below are backed by executed tests on fresh infrastructure (`karen_g5_fresh`, live OpenSearch), suites `g4-e2e-redteam` (E0–E8), `g41-governance` (T1–T4), `g5-*` (new).

## 1. Attack vectors probed and results

| Vector | Technique | Result |
|---|---|---|
| Login CSRF | Forge/omit OAuth `state` at callback | **BLOCKED (fixed this gate)** — signed+expiring state mandatory; provider never called on rejection (g5-oauth-state: missing/malformed/tampered/expired all rejected) |
| State replay | Reuse captured state after 10 min | BLOCKED — expiry check (fake-timer test) |
| Cross-tenant listing manipulation | IDOR on publish/transition endpoints | BLOCKED — E4 (stranger cannot publish another's listing) |
| Cross-org administration | Serve/modify ads across orgs | BLOCKED — T2 org isolation; platform.admin override is explicit and audited |
| Commission history tampering | Change rule retroactively → alter past payouts | BLOCKED — T3: old calculations byte-identical after new rule version; reversal path emits negative calc (−50.0000) |
| Double billing | Replay click events inside dedup window | BLOCKED — T4 anti-double-billing (partial unique index) |
| SQL/FTS injection | Hostile search strings | BLOCKED — E6 parameterization |
| Malicious uploads | Oversized, wrong MIME, fake MIME, embedded `<script>`, EICAR body | BLOCKED at intake (size cap, magic-byte sniffing) and at worker (signature-v1 quarantine; real clamd adapter fail-closed when configured) |
| Subscription bypass | Entitlement consumption without active subscription | BLOCKED — E8 |
| Credential stuffing / OTP brute | Auth rate bucket | BLOCKED — E0 (bucket opens after 10 hits) |
| Token replay | Reuse rotated refresh token | BLOCKED — E2 rotation + replay detection |
| Search index poisoning | Push failures leaving invisible drift | **FIXED this gate** — push failures now fail the job (retry→DLQ), lag observable via `/search/health` indexLag |
| Stale data exposure | Deleted listing still searchable in OpenSearch | **FIXED this gate** — delete propagates to the OS copy (S4: 404 verified) |
| Geo-field spoofing | WKT in geo_point to break index/queries | **FIXED this gate** — strict mapping + canonical transform (S3 geo query verified) |
| Provider timeouts as DoS lever | Unbounded upstream fetch hang | **FIXED this gate** — all vendor fetches bounded (10s) |
| AV verdict spoofing via unavailable daemon | Daemon down → pass-through | BLOCKED by design — fail-closed (`CLAMAV_SCAN_ERROR` → job retry → DLQ); never fail-open |

## 2. Honest exposure remaining

- Channels that are UNVERIFIED_EXTERNAL/NOT_IMPLEMENTED (SMTP/Twilio/FCM live, S3, messaging, CRM…) have **no runtime surface to attack in this deployment state**; when implemented, the same red-team suites must be extended (registered in NEXT_GATE as mandatory acceptance criteria).
- The platform-admin override (T2) is a single-point trust decision — requires production-grade admin account governance before launch (registered).
- No WAF/anti-bot layer at edge in scope of this backend gate (CAPTCHA vendor was a registered Gate 4 gap, unchanged).
