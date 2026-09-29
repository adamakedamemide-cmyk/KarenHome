"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaRepository = void 0;
/**
 * Media pipeline persistence (frozen marketplace.media_assets + 0032 pipeline
 * columns). The worker advances status pending → processing → ready/failed/
 * quarantined and registers optimized WebP variants. Long-term original user
 * uploads are NOT retained unless policy sets is_original_retained.
 */
class MediaRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async createAsset(input, executor = this.db) {
        if (input.sha256Hex) {
            const dup = await executor.query(`SELECT id FROM marketplace.media_assets WHERE sha256_hex = $1 LIMIT 1`, [input.sha256Hex]);
            const existingId = dup.rows[0]?.id;
            if (existingId) {
                const inserted = await executor.query(`INSERT INTO marketplace.media_assets(storage_provider, bucket, object_key, mime_type, size_bytes, sha256_hex, status, duplicate_of, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, 'ready', $7::uuid, $8)
           RETURNING id`, [input.storageProvider, input.bucket ?? 'karen-local', input.objectKey, input.mimeType, input.sizeBytes, input.sha256Hex, existingId, input.createdBy]);
                const id = inserted.rows[0]?.id;
                if (!id)
                    throw new Error('MEDIA_ASSET_CREATE_FAILED');
                return { id, duplicateOf: existingId };
            }
        }
        const r = await executor.query(`INSERT INTO marketplace.media_assets(storage_provider, bucket, object_key, mime_type, size_bytes, width, height, sha256_hex, original_object_key, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`, [input.storageProvider, input.bucket ?? 'karen-local', input.objectKey, input.mimeType, input.sizeBytes, input.width ?? null, input.height ?? null, input.sha256Hex ?? null, input.originalObjectKey ?? null, input.createdBy]);
        const id = r.rows[0]?.id;
        if (!id)
            throw new Error('MEDIA_ASSET_CREATE_FAILED');
        return { id, duplicateOf: null };
    }
    async getAsset(assetId) {
        const r = await this.db.query(`SELECT id, storage_provider, bucket, object_key, mime_type, size_bytes, width, height, sha256_hex, perceptual_hash,
              status, scan_status, original_object_key, is_original_retained, duplicate_of, processing_error, created_by, created_at
       FROM marketplace.media_assets WHERE id = $1::uuid`, [assetId]);
        const row = r.rows[0];
        if (!row)
            return null;
        return {
            id: row.id, storageProvider: row.storage_provider, bucket: row.bucket, objectKey: row.object_key,
            mimeType: row.mime_type, sizeBytes: row.size_bytes, width: row.width, height: row.height,
            sha256Hex: row.sha256_hex, perceptualHash: row.perceptual_hash, status: row.status, scanStatus: row.scan_status,
            originalObjectKey: row.original_object_key, isOriginalRetained: row.is_original_retained,
            duplicateOf: row.duplicate_of, processingError: row.processing_error, createdBy: row.created_by, createdAt: row.created_at,
        };
    }
    async markProcessing(assetId) {
        await this.db.query(`UPDATE marketplace.media_assets SET status = 'processing', processing_error = NULL WHERE id = $1::uuid`, [assetId]);
    }
    async markReady(assetId, input) {
        await this.db.query(`UPDATE marketplace.media_assets
       SET status = 'ready',
           perceptual_hash = COALESCE($2, perceptual_hash),
           width = COALESCE($3, width),
           height = COALESCE($4, height),
           scan_status = COALESCE($5, scan_status),
           scan_provider = COALESCE($6, scan_provider),
           processing_error = NULL
       WHERE id = $1::uuid`, [assetId, input.perceptualHash ?? null, input.width ?? null, input.height ?? null, input.scanStatus ?? null, input.scanProvider ?? null]);
    }
    async markFailed(assetId, error) {
        await this.db.query(`UPDATE marketplace.media_assets SET status = 'failed', processing_error = $2 WHERE id = $1::uuid`, [assetId, error.slice(0, 1000)]);
    }
    async quarantine(assetId, reason) {
        await this.db.query(`UPDATE marketplace.media_assets SET status = 'quarantined', scan_status = 'infected', processing_error = $2 WHERE id = $1::uuid`, [assetId, reason.slice(0, 1000)]);
    }
    async addVariant(assetId, input, executor = this.db) {
        await executor.query(`INSERT INTO marketplace.media_variants(media_asset_id, object_key, width, height, format, size_bytes)
       VALUES ($1::uuid, $2, $3, $4, $5, $6)
       ON CONFLICT (media_asset_id, width, height, format) DO UPDATE SET object_key = EXCLUDED.object_key, size_bytes = EXCLUDED.size_bytes`, [assetId, input.objectKey, input.width, input.height, input.format, input.sizeBytes]);
    }
    async listVariants(assetId) {
        const r = await this.db.query(`SELECT id, media_asset_id, object_key, width, height, format, size_bytes
       FROM marketplace.media_variants WHERE media_asset_id = $1::uuid ORDER BY width DESC`, [assetId]);
        return r.rows.map((row) => ({ id: row.id, mediaAssetId: row.media_asset_id, objectKey: row.object_key, width: row.width, height: row.height, format: row.format, sizeBytes: row.size_bytes }));
    }
    /** Bounded candidate set for perceptual duplicate analysis (exact hamming in app). */
    async findPhashCandidates(limit = 2000) {
        const r = await this.db.query(`SELECT id, perceptual_hash FROM marketplace.media_assets
       WHERE perceptual_hash IS NOT NULL AND status = 'ready'
       ORDER BY created_at DESC LIMIT $1`, [limit]);
        return r.rows.map((row) => ({ id: row.id, perceptualHash: row.perceptual_hash }));
    }
    async markOriginalDeleted(assetId) {
        await this.db.query(`UPDATE marketplace.media_assets SET original_object_key = NULL, is_original_retained = false WHERE id = $1::uuid`, [assetId]);
    }
    async setOriginalRetained(assetId, objectKey) {
        await this.db.query(`UPDATE marketplace.media_assets SET original_object_key = $2, is_original_retained = true WHERE id = $1::uuid`, [assetId, objectKey]);
    }
}
exports.MediaRepository = MediaRepository;
