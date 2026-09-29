# GATE 5 — BASELINE (Phase A: Evidence Independence)

Gate: **GATE 5 — External Integrations, Supply-Chain Security, Domain Closure & Production Hardening**
Baseline frozen: 2026-09-30 (Asia/Tehran session)
Authoritative workspace: `https://github.com/adamakedamemide-cmyk/KarenHome` @ `main`

## 1. Purpose

Per Gate 5 Phase A mandate, this file freezes the exact starting state of the
repository **before any Gate 5 modification**, so that every Gate 5 finding can
be attributed independently of Gate 4.1 evidence. All Gate 5 verification runs
are executed fresh against this baseline; no Gate 4.1 result is re-used as
proof without re-execution.

## 2. Frozen Baseline Identity

| Item | Value |
|---|---|
| Baseline HEAD | `64378178ae861e9a80325804492e9c16253f8533` |
| Baseline tree hash | `8555663efac8bc5bfa70385e88900e68b029b043` |
| Tag at baseline | `gate4-1-final` |
| Remote sync state | `origin/main` == local HEAD (verified via `git ls-remote`) |
| Working tree | clean (no uncommitted modifications at baseline freeze) |
| Prior gate status | GATE 4.1 = PASS (reported; re-verified independently inside Gate 5 where mandated) |

## 3. Gate 4.1 Reported Evidence (registered by owner, to be independently re-checked)

```text
GATE 4.1 = PASS
HEAD = 64378178ae861e9a80325804492e9c16253f8533
PUSH = SUCCESS
Jest = 64/64
Concurrency = 8/8
Typecheck = 0
Lint = 0
Build = 0
Schema REMOVED = 0
```

Gate 5 treats the above as *reported*, not as evidence. Every claim relevant to
a Gate 5 phase is re-executed during Gate 5 (fresh DB, fresh benchmark, fresh
audit runs) and is labelled with its own run ID.

## 4. Baseline Artifact Hashes (SHA-256)

| Artifact | SHA-256 |
|---|---|
| `Karen_Home_Artifacts_Gate4_1_R1.zip` (Gate 4.1 bundle) | `3f6dac7139fd13d087acaa56ff3916f53e6a0d8176f14ad8996a443c962f4886` |
| `PROJECT_STATE_SUMMARY.md` | `b77b28de2cd0d6b64baf8f9d13eee8fd91e5b63df2713e907b4dfdda726d0e63` |
| `backend/apps/api/openapi.json` | `70b329c2b22ec039cef69d8d9377bba0a5bf9b7e097fe60c4103bdf8192d7ad2` |
| `backend/pnpm-lock.yaml` | `74b48a3340a5cfb1c2267d0ca63057c8d4110a5d10dfd8263c69cc21d29d8b3e` |
| `.github/workflows/ci.yml` | `2b02e65735fcb44f3b629347611713ed002214a8d7698e8bfe84f2626fb93d41` |

Full per-file checksums of the Gate 4.1 bundle contents are inside the bundle
(`SHA256SUMS`); the bundle hash above is the trust anchor for this baseline.

## 5. Baseline Source Scope

- Backend source files (ts/sql/json/yaml/mjs, excluding `node_modules` and
  `dist/`): **161 files** under `backend/`.
- Migrations chain: base + errata 0024–0026 + migrations 0027–0036 +
  `seed_reference.sql` (applied via `backend/scripts/apply-all-migrations.sh`).
- Runtime environment at baseline (independently probed, honestly registered):
  - PostgreSQL **16.10** running locally (micromamba env `karen`), reachable on `127.0.0.1:5432`.
  - Node **v24.21.0**, pnpm **10.15.0**, Java **OpenJDK 21.0.12**.
  - **Docker: NOT available** in this environment.
  - Outbound network: available (npm registry, GitHub, artifact hosts reachable).

## 6. External Live-Verification Capability Statement (pre-registered before results)

Because Gate 5 requires honest classification, the following was decided
*before* any integration test result existed:

1. Where a real vendor daemon can be brought up in this environment (local
   S3-compatible object store, local ClamAV scanner, local OpenSearch node),
   Gate 5 attempts a **local live** verification and labels it
   `LOCAL_VERIFIED` — never `LIVE_VERIFIED`, because no real vendor cloud
   endpoint/credential is involved.
2. Where the real external vendor (AWS S3, SMTP relay, Twilio, FCM, Google,
   Facebook, OpenSearch Service) would be required and no real credential
   exists, the ceiling is `UNVERIFIED_EXTERNAL` even if every contract test
   passes.
3. `CONTRACT_VERIFIED` is used where the adapter is exercised through its
   contract/interface with a test double at the port boundary.

This statement is committed **before** the Gate 5 integration evidence files,
which is auditable via git history order.

## 7. Evidence Independence Declaration

- Gate 5 runs are identified with run IDs `G5R-*` and stored under `gate5/`.
- Databases created by Gate 5 are new (`karen_g5_*`) — Gate 4.1 databases
  (`karen_g41_*`) are never re-used for Gate 5 proof.
- The Gate 5 artifact bundle will be built at the end with its own manifest and
  SHA-256 chain, independent of the Gate 4.1 bundle.
