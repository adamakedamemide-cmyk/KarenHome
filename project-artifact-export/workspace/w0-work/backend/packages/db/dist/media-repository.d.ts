import { PostgresDatabase, type QueryExecutor } from './postgres-database';
export interface MediaAssetRecord {
    id: string;
    storageProvider: string;
    bucket: string | null;
    objectKey: string;
    mimeType: string;
    sizeBytes: number;
    width: number | null;
    height: number | null;
    sha256Hex: string | null;
    perceptualHash: string | null;
    status: 'pending' | 'processing' | 'ready' | 'failed' | 'quarantined';
    scanStatus: 'pending' | 'clean' | 'infected' | 'skipped';
    originalObjectKey: string | null;
    isOriginalRetained: boolean;
    duplicateOf: string | null;
    processingError: string | null;
    createdBy: string | null;
    createdAt: Date;
}
export type MediaAssetStatus = MediaAssetRecord['status'];
export type MediaScanStatus = MediaAssetRecord['scanStatus'];
export interface MediaVariantRecord {
    id: string;
    mediaAssetId: string;
    objectKey: string;
    width: number;
    height: number;
    format: string;
    sizeBytes: number;
}
/**
 * Media pipeline persistence (frozen marketplace.media_assets + 0032 pipeline
 * columns). The worker advances status pending → processing → ready/failed/
 * quarantined and registers optimized WebP variants. Long-term original user
 * uploads are NOT retained unless policy sets is_original_retained.
 */
export declare class MediaRepository {
    private readonly db;
    constructor(db: PostgresDatabase);
    createAsset(input: {
        storageProvider: string;
        bucket?: string | null;
        objectKey: string;
        mimeType: string;
        sizeBytes: number;
        width?: number | null;
        height?: number | null;
        sha256Hex?: string | null;
        originalObjectKey?: string | null;
        createdBy: string;
    }, executor?: QueryExecutor): Promise<{
        id: string;
        duplicateOf: string | null;
    }>;
    getAsset(assetId: string): Promise<MediaAssetRecord | null>;
    markProcessing(assetId: string): Promise<void>;
    markReady(assetId: string, input: {
        perceptualHash?: string | undefined;
        width?: number | undefined;
        height?: number | undefined;
        scanStatus?: MediaAssetRecord['scanStatus'] | undefined;
        scanProvider?: string | undefined;
    }): Promise<void>;
    markFailed(assetId: string, error: string): Promise<void>;
    quarantine(assetId: string, reason: string): Promise<void>;
    addVariant(assetId: string, input: {
        objectKey: string;
        width: number;
        height: number;
        format: string;
        sizeBytes: number;
    }, executor?: QueryExecutor): Promise<void>;
    listVariants(assetId: string): Promise<MediaVariantRecord[]>;
    /** Bounded candidate set for perceptual duplicate analysis (exact hamming in app). */
    findPhashCandidates(limit?: number): Promise<Array<{
        id: string;
        perceptualHash: string;
    }>>;
    markOriginalDeleted(assetId: string): Promise<void>;
    setOriginalRetained(assetId: string, objectKey: string): Promise<void>;
}
