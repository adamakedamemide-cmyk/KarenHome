# GATE 5 — External Integrations Audit (Phases B, C, D, E, F, G)

Run ID: **G5R-EXT-001** · Method: file-by-file code audit + real environment execution where possible
Classification pre-declaration: `gate5/GATE5_BASELINE.md §6` (committed before results).

## 1. Status Legend

`LOCAL_VERIFIED` = exercised against a real local daemon/service in this environment ·
`CONTRACT_VERIFIED` = adapter exercised through its port with a contract test ·
`LIVE_VERIFIED` = real vendor cloud with real credentials (none — no credentials exist) ·
`UNVERIFIED_EXTERNAL` = needs real vendor credentials/infrastructure ·
`NOT_IMPLEMENTED` = no adapter exists (honest; Gate 4 comment claiming an FCM adapter was overstated) ·
`BLOCKED` = environment impossible.

## 2. Environment Capability (real, probed)

| Capability | State |
|---|---|
| PostgreSQL | **16.10 live** (127.0.0.1:5432) — fresh `karen_g5_fresh`, 15/15 migrations, 0 errors |
| OpenSearch | **2.19.3 live single-node** (127.0.0.1:9200, cluster green) — downloaded & booted during Gate 5 |
| Docker | NOT available (no containers possible) |
| MinIO | **Not obtainable** — official distribution returns 410 Gone (community archived); sudo unavailable for alternatives |
| ClamAV daemon | Not installable in this environment (no sudo, no micromamba binary) — **wire-protocol adapter verified via contract test** instead |
| Real vendor credentials (AWS S3, SMTP relay, Twilio, FCM, Google, Facebook) | **None exist** (by design, none in repo — verified by secret scan) |

## 3. Per-Integration Matrix (15 mandated criteria × 8 integrations)

Legend: ✅ present+verified · 🟡 present (partial) · ❌ absent · N/A not applicable

### 3.1 OpenSearch — Status: **LOCAL_VERIFIED** (real 2.19.3 daemon)

| Criterion | Finding |
|---|---|
| Adapter exists | ✅ `OpenSearchEngine` (REST DSL over fetch, port: `SearchEngine`) |
| Contract exists | ✅ `search-engine.port.ts` + shared doc schema (`search-os-doc.ts`, strict mapping) |
| Configuration exists | ✅ `OPENSEARCH_URL` (config-gated; unset → verified PG FTS fallback) |
| Credential validation | N/A (local node, no auth; production credential handling = UNVERIFIED_EXTERNAL) |
| Timeout | ✅ 5s requests / 1.5s health (AbortController) |
| Retry | ✅ job-level: push failure now **fails the job** → exponential backoff → DLQ |
| Circuit breaker / failure policy | ✅ health-gated engine selection with 30s cache + fallback to PG FTS + `search_fallback_total` metric |
| Idempotency | ✅ doc PUT by deterministic listing id; index bootstrap idempotent (HEAD→PUT) |
| Observability | ✅ `search_opensearch_healthy` gauge, `search_requests_total{engine}`, `search_index_docs_total`, `search_duration_ms` |
| Health check | ✅ `/search/health` reports engine + OS health + **indexLag (pending/failed/indexed/oldestPendingSeconds)** |
| Integration test | ✅ **real**: S1–S5 against live OpenSearch 2.19.3 (see §4) |
| Contract test | ✅ doc transform + index-definition unit tests (g5-os-doc.spec) |
| Live verification | **LOCAL_VERIFIED** (local daemon; not OpenSearch Service cloud) |
| Production readiness | Adapter-level ready; cloud credentials/infra = UNVERIFIED_EXTERNAL |
| Index creation/mapping/analyzer/geo | ✅ **GATE5 FIX**: `ensureIndex()` — strict mapping (`dynamic:strict`), standard analyzer, keyword facets, double price, `geo_point location_point`, date published_at. **Gate 4 had NO index creation/mapping at all.** |

### 3.2 S3 / Object Storage — Status: **NOT_IMPLEMENTED** (port exists, adapter does not)

| Criterion | Finding |
|---|---|
| Adapter exists | ❌ Only `LocalStorageAdapter` (`local-fs`, verified). `StorageAdapter` port = swap point |
| Contract | 🟡 port interface exists (resolve/exists/delete) — no S3 implementation to test |
| Configuration | 🟡 storage dirs configured; no S3 bucket/region/keys config |
| Credential validation | ❌ (none needed for local-fs) |
| Timeout/Retry/Circuit breaker | ❌ N/A without adapter |
| Idempotency | ✅ media pipeline is idempotent (sha256-named keys) — verified at worker level |
| Observability | ✅ media job logs + repository state machine |
| Health check | N/A |
| Integration test | ❌ MinIO unobtainable (410 Gone) AND no adapter — both registered honestly |
| Production readiness | ❌ **Deployment prerequisite on S3 — registered as top NEXT-GATE item (ADR-G5-01)** |

### 3.3 ClamAV — Status: **CONTRACT_VERIFIED** (adapter) / **UNVERIFIED_EXTERNAL** (daemon)

| Criterion | Finding |
|---|---|
| Adapter exists | ✅ **GATE5 NEW**: `ClamavInstreamScanner` — real clamd INSTREAM wire protocol (zINSTREAM\0, 4-byte BE framing, verdict parsing) |
| Contract exists | ✅ contract tests with a protocol-exact mock daemon: PING/PONG, clean verdict, EICAR infected verdict with signature, silent-daemon timeout, daemon-down error |
| Configuration | ✅ `CLAMD_HOST`/`CLAMD_PORT` (opt-in; unset → verified signature-v1 first pass) |
| Credential validation | N/A (daemon on private network) |
| Timeout | ✅ 10s scan timeout (CLAMAV_TIMEOUT) |
| Retry | ✅ fail-closed: scan error throws → job retried with backoff → DLQ |
| Circuit breaker / failure policy | ✅ fail-closed registered; verdicts never guessed (`status:'error'` is distinct) |
| Idempotency | ✅ scan is pure; media job idempotent |
| Observability | ✅ `media_quarantined` log + `scan_provider` persisted on asset |
| Health check | 🟡 `ping()`/`version()` probes exist (no scheduled job — registered) |
| Integration test | ✅ 5 contract tests (mock clamd over real TCP loopback) |
| Live verification | **UNVERIFIED_EXTERNAL** — no real daemon available in this environment; NOT claimed Production Verified (per mandate) |
| Quarantine | ✅ existing quarantine path (`repo.quarantine` + reason) exercised by signature-v1 |

### 3.4 SMTP / Email — Status: **CONTRACT_VERIFIED** (transport) / **UNVERIFIED_EXTERNAL** (provider)

Timeout ✅ (nodemailer connection timeouts + job-level backoff) · Retry ✅ (job queue) · Idempotency ✅ (dedupKey = job id, provider_reference persisted) · Error mapping ✅ (nodemailer errors → job failure message → DLQ) · Delivery state ✅ (`notification_deliveries` sent/persisted) · Webhook ❌ (no inbound provider webhook endpoint — registered) · Rate limit 🟡 (job batch sizing only) · Observability ✅ (job_runs + delivery rows). Live SMTP relay = UNVERIFIED_EXTERNAL (no credentials).

### 3.5 Twilio / SMS — Status: **CONTRACT_VERIFIED** (transport) / **UNVERIFIED_EXTERNAL** (provider)

Adapter ✅ (`TwilioSmsTransport`, HTTP REST, Basic auth) · **Timeout ✅ — GATE5 FIX: was an unbounded fetch, now 10s AbortSignal** · Retry ✅ (job queue) · Idempotency ✅ (dedupKey) · Error mapping ✅ (`TWILIO_{status}` → retry/backoff) · Delivery state ✅ · Webhook ❌ (registered) · Rate limit 🟡 · Observability ✅. Live send = UNVERIFIED_EXTERNAL (no credentials).

### 3.6 FCM / Push — Status: **NOT_IMPLEMENTED** (honest correction)

❌ **No FCM adapter exists.** Gate 4's `transports.ts` header comment claimed "Twilio/Fcm HTTP adapters" — the file contains only `ConsolePushTransport`. Gate 5 registers this as an **overstated claim, corrected**: push = console transport (verified dev default) + notification fan-out/preferences (verified). FCM HTTP v1 adapter (OAuth2 service account + endpoints) = NOT_IMPLEMENTED → NEXT-GATE item (ADR-G5-02).

### 3.7 Google OAuth — Status: **CONTRACT_VERIFIED** (adapter + state machine) / **UNVERIFIED_EXTERNAL** (live)

Endpoints ✅ (authorization URL + token exchange + userinfo) · **State/CSRF ✅ — GATE5 FIX (G5-F-03, was broken: state generated but never verified)**: HMAC-signed + 10-min expiry + mandatory at callback, rejection before any provider call, timing-safe compare · Nonce 🟡 (not used — OIDC implicit-only mitigation not needed for code flow; registered) · ID-token validation 🟡 (userinfo endpoint used instead of JWT validation — acceptable for code flow, registered) · Issuer/Audience validation 🟡 (fixed endpoints = implicit issuer; audience = credential binding) · Account linking ✅ (provider identity → user) · Email collision ✅ (match by email → link; else provision) · Provider failure ✅ (502 mapping, 10s timeouts) · Tests ✅ 5 new (g5-oauth-state.spec) · Live = UNVERIFIED_EXTERNAL (no credentials; none in repo ✓).

### 3.8 Facebook OAuth — Status: **CONTRACT_VERIFIED** (same fixes) / **UNVERIFIED_EXTERNAL** (live)

Same matrix as Google with `graph.facebook.com/v21.0` endpoints; state fix applies identically; profile shape differs (`id` vs `sub`). Live = UNVERIFIED_EXTERNAL.

## 4. Phase C — OpenSearch Mandatory Scenarios (REAL execution, live daemon)

Evidence: `gate5/evidence/G5R-TEST-RUN.txt`, suite `g5-search.integration.spec.ts` — **5/5 PASS against real OpenSearch 2.19.3 + fresh PostgreSQL 16.10**:

| Scenario | Result | Detail |
|---|---|---|
| Create Listing → PG commit → Outbox → Indexer → OpenSearch → **Search returns Listing** | ✅ S1 | hit found via multi_match; facets count transaction_type=sale ≥1 |
| Update / Price change propagates | ✅ S2 | price 100000 → 424242 visible in OS after chain re-run (re-publication semantics registered) |
| Geo query on geo_point | ✅ S3 | `geo_bounding_box` Tehran bbox returns the listing (WKT → `lat,lon` transform) |
| Delete propagates | ✅ S4 | OS doc 404 after ListingDeleted.v1 chain — **GATE5 FIX: delete previously never touched the OS copy** |
| OpenSearch unavailable → business transaction MUST stay correct; event remains retryable | ✅ S5 | push failure now **rejects the job** (was silently swallowed — GATE5 FIX); PG authoritative (`buildDoc` intact); PG FTS still serves search; job re-claimable |

## 5. Registered Findings (External Integrations)

| ID | Severity | Finding | Disposition |
|---|---|---|---|
| G5-F-01 | HIGH (would have broken live search) | Worker→OS push used camelCase docs while search queried snake_case fields; WKT pushed to geo_point; no index creation/mapping existed | **FIXED**: shared `search-os-doc.ts` + `ensureIndex()` + strict mapping + transforms; verified live |
| G5-F-02 | HIGH (data-loss window) | OS push failures swallowed → job completed → event NOT retryable (violated mandate) | **FIXED**: rethrow → retry/backoff → DLQ; verified by S5 |
| G5-F-03 | HIGH (security) | OAuth state generated but never verified — login CSRF possible | **FIXED**: signed expiring state, mandatory + tested |
| G5-F-04 | MEDIUM | `search.delete` left stale OS documents searchable | **FIXED**: deleteDoc with 404 tolerance; verified by S4 |
| G5-F-05 | MEDIUM | Stale comment claimed FCM adapter exists | **CORRECTED**: registered NOT_IMPLEMENTED (ADR-G5-02) |
| G5-F-06 | LOW | Twilio/OAuth fetches unbounded | **FIXED**: 10s timeouts |

## 6. Phase D — S3 scenarios vs reality

Upload ✅ (intake: size cap, magic-byte MIME sniffing, sha256 dedup, temp→pipeline) · Worker validation/processing/WebP/variants/metadata ✅ (media worker, verified in Gate 4, unchanged) · Presigned URL ❌ (no S3) · Oversized ✅ (cap enforced) · Wrong/fake MIME ✅ (sniffing overrides declaration) · Malformed image ✅ (sharp `failOn:'error'` → job failed) · Duplicate ✅ (sha256 + pHash dedup) · Interrupted/partial upload, unauthorized object access, expired signed URL ❌ **N/A — impossible without S3 adapter** (registered, not hidden).
