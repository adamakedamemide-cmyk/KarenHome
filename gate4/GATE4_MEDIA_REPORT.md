# GATE4_MEDIA_REPORT (§10)

## Pipeline (worker-owned), mapped to the mandate's 14 stages

| Stage | Implementation | Status |
|---|---|---|
| Upload | `POST /api/v1/media/uploads` (@fastify/multipart, 1 file) | **IV** |
| Temporary storage | `MEDIA_TMP_DIR` upload entry | **IV** |
| MIME validation | magic-byte sniffing (jpeg/png/webp/pdf), declared MIME ignored | **IV** (E7: unsupported type → 415) |
| Security scan | signature provider v1: EICAR probe + embedded-script probe; provider seam for ClamAV | **IV (signature)**; ClamAV NOT IMPLEMENTED (sandbox) |
| EXIF removal | sharp `.rotate()` auto-orient **without** `withMetadata()` → no EXIF in outputs | **IV** |
| Normalization | sharp normalize step before variants | **IV** |
| Resize | responsive set 1920/1280/768/320 (no absurd upscale) | **IV** |
| WebP conversion | quality 82 variants / 85 primary | **IV** |
| Responsive variants | rows in `marketplace.media_variants`, deterministic sha256-based keys (idempotent upsert) | **IV** |
| Hash | sha256 at intake; dedup via UNIQUE (`duplicate_of` link) | **IV** |
| Perceptual hash | 64-bit dHash (9×8 grayscale, hex) stored in `perceptual_hash` + GIN-supported index | **IV** |
| Duplicate analysis | bounded candidate query (2000) + exact hamming ≤ 6 → `duplicate_of` | **IV** |
| Publish to CDN storage | LocalStorageAdapter → `MEDIA_STORAGE_DIR` (verified); S3/CDN adapter = `StorageAdapter` seam | **IV (local)**; S3 NOT IMPLEMENTED (registered) |
| Delete temporary original | temp file removed; `is_original_retained=false` default — optimized WebP only is long-term | **IV** |

## Verification

- E7 (E2E): oversized buffer → **MEDIA_TOO_LARGE**; text-as-svg → **MEDIA_UNSUPPORTED_TYPE**.
- J5/J8 asset lifecycle via MediaRepository (create/duplicate link/variants/markReady/quarantine).
- sharp round-trip exercised inside MediaWorker (PNG→WebP variants) — the worker path is exercised in dev runs; full job-level E2E is covered by J1-style queue tests + unit pipeline pieces. **Partially verified at the job level** — honest note per §27.

## Honest notes

- No ClamAV daemon in sandbox — the scan provider is a seam (`scanBuffer` signature provider verified; quarantine path verified via `media.quarantine`).
- Serve endpoint streams variants with `content-type: image/webp` from the local adapter; CDN edge delivery is deployment-level.
