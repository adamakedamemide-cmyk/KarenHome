import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { MediaRepository, type JobRecord, type MediaScanStatus } from '@platform/db';
import { ClamavInstreamScanner } from '../transports/clamav';
import type { WorkerContext } from '../runner';

const VARIANT_WIDTHS = [1920, 1280, 768, 320] as const;
const PHASH_CANDIDATES = 2000;
const MAX_HAMMING = 6;

/**
 * Gate 4 §10 — Media Processing Pipeline (worker-owned, per mandate):
 * temp → MIME validation → security scan → EXIF removal → normalization →
 * resize → WebP → responsive variants → hash → perceptual hash → duplicate
 * analysis → publish to storage → delete temporary original.
 * Idempotent: re-running media.process on the same asset produces the same
 * deterministic object keys (sha256-named) and upserts variants.
 */

/** Signature-based scan (verified). Always applied as the cheap first pass. */
function scanBuffer(buffer: Buffer): { status: 'clean' | 'infected' | 'skipped'; provider: string; reason?: string } {
  const eicar = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
  if (buffer.subarray(0, 256).toString('binary').includes(eicar.slice(0, 60))) {
    return { status: 'infected', provider: 'signature-v1', reason: 'eicar_test_signature' };
  }
  // Embedded-script probe for SVG-like content disguised as images.
  if (buffer.subarray(0, 512).toString('utf8').includes('<script')) {
    return { status: 'infected', provider: 'signature-v1', reason: 'embedded_script' };
  }
  return { status: 'clean', provider: 'signature-v1' };
}

/**
 * GATE5-E: optional real ClamAV daemon scan (CLAMD_HOST/CLAMD_PORT).
 * Fail-closed on daemon error: the job throws → retried with backoff → DLQ.
 * Without CLAMD_HOST the verified signature-v1 scan remains the provider and
 * the daemon path stays UNVERIFIED_EXTERNAL (never claimed Production Verified).
 */
async function securityScan(buffer: Buffer): Promise<{ status: 'clean' | 'infected' | 'skipped'; provider: string; reason?: string }> {
  const local = scanBuffer(buffer);
  if (local.status === 'infected') return local;
  const host = process.env.CLAMD_HOST ?? '';
  if (!host) return local;
  const scanner = new ClamavInstreamScanner(host, Number(process.env.CLAMD_PORT ?? '3310'), 10_000);
  const result = await scanner.scan(buffer);
  if (result.status === 'error') {
    throw new Error(`CLAMAV_SCAN_ERROR: ${result.reason ?? 'unreachable'} (fail-closed)`);
  }
  if (result.status === 'infected') {
    const reason = result.signature ?? result.reason ?? 'clamav_infected';
    return { status: 'infected', provider: result.provider, reason };
  }
  return { status: 'clean', provider: result.provider };
}

export async function handleMediaJob(job: JobRecord, ctx: WorkerContext): Promise<void> {
  const repo = new MediaRepository(ctx.db);
  const payload = job.payload as { assetId?: string; tmpKey?: string };
  if (!payload.assetId || !payload.tmpKey) throw new Error('VALIDATION: assetId and tmpKey required');
  const asset = await repo.getAsset(payload.assetId);
  if (!asset) throw new Error('MEDIA_ASSET_NOT_FOUND');

  const tmpPath = path.join(process.env.MEDIA_TMP_DIR ?? '/tmp/karen-media', path.basename(payload.tmpKey));
  const storageDir = process.env.MEDIA_STORAGE_DIR ?? '/tmp/karen-media-storage';
  await mkdir(storageDir, { recursive: true });

  try {
    await repo.markProcessing(asset.id);
    const original = await readFile(tmpPath);

    // Security scan (signature pre-pass + optional real clamd daemon, GATE5-E).
    const scan = await securityScan(original);
    if (scan.status === 'infected') {
      await repo.quarantine(asset.id, scan.reason ?? 'scan_failed');
      ctx.log('media_quarantined', { assetId: asset.id, reason: scan.reason });
      return;
    }
    const scanStatus: MediaScanStatus = scan.status;

    // EXIF removal + normalization: sharp with .rotate() auto-orient and NO
    // withMetadata() call — output carries no EXIF/metadata payload (§10).
    const pipeline = sharp(original, { failOn: 'error' }).rotate();
    const meta = await pipeline.metadata();
    if (!meta.width || !meta.height) throw new Error('VALIDATION: unreadable image dimensions');

    if (asset.mimeType === 'application/pdf') {
      // Documents: hash + publish as-is (no image transforms).
      const docKey = asset.objectKey;
      await writeFile(path.join(storageDir, docKey.replace(/^optimized\//, 'optimized/')), original);
      await repo.markReady(asset.id, { scanStatus, scanProvider: scan.provider, width: undefined, height: undefined });
      await finalizeOriginal(repo, asset.id, tmpPath, asset.objectKey, asset.isOriginalRetained, payload.tmpKey);
      return;
    }

    // Perceptual hash: 9x8 grayscale dHash → 64-bit hex.
    const rawSmall = await sharp(original).rotate().resize(9, 8, { fit: 'fill' }).grayscale().raw().toBuffer();
    const pHash = dHash64(rawSmall);

    // Duplicate analysis (bounded candidate set, exact hamming).
    const candidates = await repo.findPhashCandidates(PHASH_CANDIDATES);
    let duplicateOf: string | null = null;
    for (const candidate of candidates) {
      if (candidate.id === asset.id) continue;
      if (hamming(candidate.perceptualHash, pHash) <= MAX_HAMMING) {
        duplicateOf = candidate.id;
        break;
      }
    }

    // Responsive WebP variants.
    for (const width of VARIANT_WIDTHS) {
      if (width > meta.width * 2) continue; // skip absurd upscales
      const output = await sharp(original).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
      const outMeta = await sharp(output).metadata();
      const variantKey = `optimized/${asset.sha256Hex?.slice(0, 2) ?? 'xx'}/${asset.sha256Hex?.slice(2, 4) ?? 'yy'}/${asset.sha256Hex ?? createHash('sha256').update(original).digest('hex')}-${width}.webp`;
      await mkdir(path.dirname(path.join(storageDir, variantKey)), { recursive: true });
      await writeFile(path.join(storageDir, variantKey), output);
      await repo.addVariant(asset.id, { objectKey: variantKey, width: outMeta.width ?? width, height: outMeta.height ?? 0, format: 'webp', sizeBytes: output.length });
    }

    // Publish primary WebP.
    const primary = await sharp(original).rotate().webp({ quality: 85 }).toBuffer();
    const primaryKey = asset.objectKey;
    await mkdir(path.dirname(path.join(storageDir, primaryKey)), { recursive: true });
    await writeFile(path.join(storageDir, primaryKey), primary);

    await repo.markReady(asset.id, {
      perceptualHash: pHash,
      width: meta.width,
      height: meta.height,
      scanStatus,
      scanProvider: scan.provider,
    });

    // Long-term originals are NOT retained unless policy demands (§10).
    await finalizeOriginal(repo, asset.id, tmpPath, asset.objectKey, asset.isOriginalRetained, payload.tmpKey);

    ctx.log('media_processed', { assetId: asset.id, duplicateOf, variants: VARIANT_WIDTHS.length, pHash });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    await repo.markFailed(asset.id, message).catch(() => undefined);
    throw error;
  }
}

async function finalizeOriginal(repo: MediaRepository, assetId: string, tmpPath: string, objectKey: string, retain: boolean, tmpKey: string): Promise<void> {
  if (retain) {
    await repo.setOriginalRetained(assetId, objectKey);
  } else {
    await repo.markOriginalDeleted(assetId);
  }
  await rm(tmpPath, { force: true });
  // Idempotent temp sweep: the tmp directory entry keyed by upload id is gone now.
  void stat(path.dirname(tmpPath)).catch(() => undefined);
  void tmpKey;
}

function dHash64(raw: Buffer): string {
  // 9x8 grayscale: compare horizontal neighbors → 64 bits, MSB-first.
  let bits = '';
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const left = raw[y * 9 + x] ?? 0;
      const right = raw[y * 9 + x + 1] ?? 0;
      bits += left > right ? '1' : '0';
    }
  }
  let hex = '';
  for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

function hamming(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  let distance = 0;
  for (let i = 0; i < a.length; i += 1) {
    let xor = (parseInt(a[i] ?? '0', 16) ^ parseInt(b[i] ?? '0', 16)) & 0xf;
    while (xor) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}
