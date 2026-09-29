"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = exports.LocalStorageAdapter = exports.ALLOWED_MIME = void 0;
exports.sniffMime = sniffMime;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const promises_2 = require("node:stream/promises");
const node_stream_1 = require("node:stream");
const common_1 = require("@nestjs/common");
const db_1 = require("@platform/db");
const app_config_1 = require("../../../common/config/app-config");
function sniffMime(head) {
    if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff)
        return 'image/jpeg';
    if (head.length >= 8 && head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47)
        return 'image/png';
    if (head.length >= 12 && head.subarray(0, 4).toString('ascii') === 'RIFF' && head.subarray(8, 12).toString('ascii') === 'WEBP')
        return 'image/webp';
    if (head.length >= 4 && head.subarray(0, 4).toString('ascii') === '%PDF')
        return 'application/pdf';
    return 'unknown';
}
exports.ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
/** Local filesystem adapter (verified). Object storage adapters are a swap point. */
class LocalStorageAdapter {
    baseDir;
    name = 'local-fs';
    constructor(baseDir) {
        this.baseDir = baseDir;
    }
    resolve(objectKey) {
        const normalized = node_path_1.default.normalize(objectKey).replace(/^(\.\.(\/|\\|$))+/, '');
        return node_path_1.default.join(this.baseDir, normalized);
    }
    async exists(objectKey) {
        try {
            await (0, promises_1.stat)(this.resolve(objectKey));
            return true;
        }
        catch {
            return false;
        }
    }
    async delete(objectKey) {
        await (0, promises_1.rm)(this.resolve(objectKey), { force: true });
    }
}
exports.LocalStorageAdapter = LocalStorageAdapter;
/**
 * Gate 4 §10 — Media upload intake. Heavy transformation lives in the
 * MediaWorker pipeline (§10 stages); this service enforces intake integrity:
 * size cap, magic-byte MIME validation, temp storage, sha256 dedup and
 * job hand-off. Long-term original retention is policy-gated (default off).
 */
let MediaService = class MediaService {
    media;
    jobs;
    config;
    storage;
    constructor(media, jobs, config) {
        this.media = media;
        this.jobs = jobs;
        this.config = config;
        this.storage = new LocalStorageAdapter(this.config.mediaStorageDir);
    }
    async intake(input) {
        if (input.buffer.length > this.config.mediaMaxBytes) {
            throw Object.assign(new Error('MEDIA_TOO_LARGE'), { code: 'MEDIA_TOO_LARGE' });
        }
        const sniffed = sniffMime(input.buffer.subarray(0, 16));
        if (!exports.ALLOWED_MIME.has(sniffed)) {
            throw Object.assign(new Error('MEDIA_UNSUPPORTED_TYPE'), { code: 'MEDIA_UNSUPPORTED_TYPE' });
        }
        await (0, promises_1.mkdir)(this.config.mediaTmpDir, { recursive: true });
        await (0, promises_1.mkdir)(this.config.mediaStorageDir, { recursive: true });
        const sha256 = (0, node_crypto_1.createHash)('sha256').update(input.buffer).digest('hex');
        const tmpKey = `${(0, node_crypto_1.randomUUID)()}.upload`;
        const tmpPath = node_path_1.default.join(this.config.mediaTmpDir, tmpKey);
        await (0, promises_2.pipeline)(node_stream_1.Readable.from(input.buffer), (0, node_fs_1.createWriteStream)(tmpPath));
        const objectKey = `optimized/${sha256.slice(0, 2)}/${sha256.slice(2, 4)}/${sha256}.webp`;
        const created = await this.media.createAsset({
            storageProvider: this.storage.name,
            bucket: null,
            objectKey,
            mimeType: sniffed,
            sizeBytes: input.buffer.length,
            sha256Hex: sha256,
            originalObjectKey: tmpKey,
            createdBy: input.createdBy,
        });
        await this.jobs.enqueue({
            queue: 'media',
            jobType: 'media.process',
            payload: { assetId: created.id, tmpKey, declaredMime: input.declaredMime, sniffedMime: sniffed },
            dedupKey: `media.process:${created.id}`,
            maxAttempts: 5,
        });
        return { assetId: created.id, duplicateOf: created.duplicateOf, sniffedMime: sniffed };
    }
    async getAsset(assetId) {
        return this.media.getAsset(assetId);
    }
    async readVariant(assetId, width) {
        const asset = await this.media.getAsset(assetId);
        if (!asset || asset.status !== 'ready')
            return null;
        const variants = await this.media.listVariants(assetId);
        const variant = variants.find((candidate) => candidate.width === width);
        if (!variant)
            return null;
        const filePath = this.storage.resolve(variant.objectKey);
        if (!await this.storage.exists(variant.objectKey))
            return null;
        return { filePath };
    }
    async readHead(filePath) {
        const handle = await (0, promises_1.readFile)(filePath);
        return handle.subarray(0, 64);
    }
};
exports.MediaService = MediaService;
exports.MediaService = MediaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [db_1.MediaRepository,
        db_1.JobRepository,
        app_config_1.AppConfig])
], MediaService);
