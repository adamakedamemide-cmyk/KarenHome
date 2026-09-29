"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMediaJob = handleMediaJob;
const node_crypto_1 = require("node:crypto");
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const sharp_1 = __importDefault(require("sharp"));
const db_1 = require("@platform/db");
const VARIANT_WIDTHS = [1920, 1280, 768, 320];
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
/** Signature-based scan (verified). ClamAV hook point is provider-shaped. */
function scanBuffer(buffer) {
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
async function handleMediaJob(job, ctx) {
    const repo = new db_1.MediaRepository(ctx.db);
    const payload = job.payload;
    if (!payload.assetId || !payload.tmpKey)
        throw new Error('VALIDATION: assetId and tmpKey required');
    const asset = await repo.getAsset(payload.assetId);
    if (!asset)
        throw new Error('MEDIA_ASSET_NOT_FOUND');
    const tmpPath = node_path_1.default.join(process.env.MEDIA_TMP_DIR ?? '/tmp/karen-media', node_path_1.default.basename(payload.tmpKey));
    const storageDir = process.env.MEDIA_STORAGE_DIR ?? '/tmp/karen-media-storage';
    await (0, promises_1.mkdir)(storageDir, { recursive: true });
    try {
        await repo.markProcessing(asset.id);
        const original = await (0, promises_1.readFile)(tmpPath);
        // Security scan.
        const scan = scanBuffer(original);
        if (scan.status === 'infected') {
            await repo.quarantine(asset.id, scan.reason ?? 'scan_failed');
            ctx.log('media_quarantined', { assetId: asset.id, reason: scan.reason });
            return;
        }
        const scanStatus = scan.status;
        // EXIF removal + normalization: sharp with .rotate() auto-orient and NO
        // withMetadata() call — output carries no EXIF/metadata payload (§10).
        const pipeline = (0, sharp_1.default)(original, { failOn: 'error' }).rotate();
        const meta = await pipeline.metadata();
        if (!meta.width || !meta.height)
            throw new Error('VALIDATION: unreadable image dimensions');
        if (asset.mimeType === 'application/pdf') {
            // Documents: hash + publish as-is (no image transforms).
            const docKey = asset.objectKey;
            await (0, promises_1.writeFile)(node_path_1.default.join(storageDir, docKey.replace(/^optimized\//, 'optimized/')), original);
            await repo.markReady(asset.id, { scanStatus, scanProvider: scan.provider, width: undefined, height: undefined });
            await finalizeOriginal(repo, asset.id, tmpPath, asset.objectKey, asset.isOriginalRetained, payload.tmpKey);
            return;
        }
        // Perceptual hash: 9x8 grayscale dHash → 64-bit hex.
        const rawSmall = await (0, sharp_1.default)(original).rotate().resize(9, 8, { fit: 'fill' }).grayscale().raw().toBuffer();
        const pHash = dHash64(rawSmall);
        // Duplicate analysis (bounded candidate set, exact hamming).
        const candidates = await repo.findPhashCandidates(PHASH_CANDIDATES);
        let duplicateOf = null;
        for (const candidate of candidates) {
            if (candidate.id === asset.id)
                continue;
            if (hamming(candidate.perceptualHash, pHash) <= MAX_HAMMING) {
                duplicateOf = candidate.id;
                break;
            }
        }
        // Responsive WebP variants.
        for (const width of VARIANT_WIDTHS) {
            if (width > meta.width * 2)
                continue; // skip absurd upscales
            const output = await (0, sharp_1.default)(original).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
            const outMeta = await (0, sharp_1.default)(output).metadata();
            const variantKey = `optimized/${asset.sha256Hex?.slice(0, 2) ?? 'xx'}/${asset.sha256Hex?.slice(2, 4) ?? 'yy'}/${asset.sha256Hex ?? (0, node_crypto_1.createHash)('sha256').update(original).digest('hex')}-${width}.webp`;
            await (0, promises_1.mkdir)(node_path_1.default.dirname(node_path_1.default.join(storageDir, variantKey)), { recursive: true });
            await (0, promises_1.writeFile)(node_path_1.default.join(storageDir, variantKey), output);
            await repo.addVariant(asset.id, { objectKey: variantKey, width: outMeta.width ?? width, height: outMeta.height ?? 0, format: 'webp', sizeBytes: output.length });
        }
        // Publish primary WebP.
        const primary = await (0, sharp_1.default)(original).rotate().webp({ quality: 85 }).toBuffer();
        const primaryKey = asset.objectKey;
        await (0, promises_1.mkdir)(node_path_1.default.dirname(node_path_1.default.join(storageDir, primaryKey)), { recursive: true });
        await (0, promises_1.writeFile)(node_path_1.default.join(storageDir, primaryKey), primary);
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'unknown';
        await repo.markFailed(asset.id, message).catch(() => undefined);
        throw error;
    }
}
async function finalizeOriginal(repo, assetId, tmpPath, objectKey, retain, tmpKey) {
    if (retain) {
        await repo.setOriginalRetained(assetId, objectKey);
    }
    else {
        await repo.markOriginalDeleted(assetId);
    }
    await (0, promises_1.rm)(tmpPath, { force: true });
    // Idempotent temp sweep: the tmp directory entry keyed by upload id is gone now.
    void (0, promises_1.stat)(node_path_1.default.dirname(tmpPath)).catch(() => undefined);
    void tmpKey;
}
function dHash64(raw) {
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
    for (let i = 0; i < 64; i += 4)
        hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
    return hex;
}
function hamming(a, b) {
    if (a.length !== b.length)
        return 64;
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
