# GATE4_1_MEDIA_REPORT — Phase K

Generated: 2026-09-29 · Evidence: pipeline code inventory + E7 + quarantine paths + fresh suites.

## Pipeline stages — real implementation check

| Stage | Status | Evidence |
|---|---|---|
| Upload | REAL — multipart stream with hard size cap | `media.service.ts` (`MEDIA_TOO_LARGE`), E7 |
| MIME inspection | REAL — magic-byte sniff (jpeg/png/webp/pdf) + allow-list; declared type not trusted | `sniffMime` |
| File validation | REAL — dimension readability check; PDF passthrough branch | worker stage 1 |
| Malware boundary | PARTIAL — signature scan (EICAR + `<script>`-in-image probe) → quarantine (`scan_status='infected'`, status `quarantined`); **ClamAV daemon NOT integrated** (named hook point) | `scanBuffer`; OPEN_ISSUES #6 / Phase E #6 |
| EXIF removal | REAL — sharp `.rotate()` without `withMetadata()` → no EXIF survives | worker stage 4 |
| Normalization/Resize | REAL — 4 WebP variants 1920/1280/768/320 q82, upscale guard | worker stages 5 |
| WebP primary | REAL — q85 primary | worker stage 6 |
| Hash | REAL — sha256 deterministic storage keys + intake dedup | media.service |
| Perceptual hash | REAL — 9×8 grayscale dHash → 64-bit hex | `dHash64` |
| Duplicate detection | REAL — bounded candidate set (2000) + Hamming ≤ 6 → `duplicateOf` | worker stage 8 |
| Temporary cleanup | REAL — CleanupWorker purges `MEDIA_TMP_DIR` > 24 h; stale-job requeue | cleanup.worker |
| CDN | NOT IMPLEMENTED — deferred to storage provider decision (S3/R2) | Phase E #7 |
| Storage | LOCAL DISK ONLY (`LocalStorageAdapter`, traversal-guarded); S3 adapter not even stubbed | Phase E #7 |

## Original-upload retention (mandated check)
- **Original user uploads do NOT linger in production storage unintentionally**: `finalizeOriginal` retains-by-policy or `markOriginalDeleted` + tmp deletion after variant generation; temp files additionally swept by CleanupWorker. Retention policy is explicit code, not accident. For production, the S3/object-storage decision must carry the same policy (registered in ADR target for Gate 5).

## Verdict
Media pipeline = **PASS for the local contract** (integrity, quarantine, dedup, EXIF, variants all real and exercised); production malware engine + object storage remain honest deployment gaps (CORE-BLOCKING for production only — see Phase E).
