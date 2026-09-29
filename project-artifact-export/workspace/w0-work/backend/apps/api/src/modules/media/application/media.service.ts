import { createHash, randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { Injectable } from '@nestjs/common';
import { JobRepository, MediaRepository, type MediaAssetRecord } from '@platform/db';
import { AppConfig } from '../../../common/config/app-config';

/** Reusable file signature probes (magic bytes) — MIME sniffing (§10). */
export type SniffedMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf' | 'unknown';

export function sniffMime(head: Buffer): SniffedMime {
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  if (head.length >= 8 && head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) return 'image/png';
  if (head.length >= 12 && head.subarray(0, 4).toString('ascii') === 'RIFF' && head.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (head.length >= 4 && head.subarray(0, 4).toString('ascii') === '%PDF') return 'application/pdf';
  return 'unknown';
}

export const ALLOWED_MIME: ReadonlySet<SniffedMime> = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

export interface StorageAdapter {
  readonly name: string;
  resolve(objectKey: string): string;
  exists(objectKey: string): Promise<boolean>;
  delete(objectKey: string): Promise<void>;
}

/** Local filesystem adapter (verified). Object storage adapters are a swap point. */
export class LocalStorageAdapter implements StorageAdapter {
  readonly name = 'local-fs';
  constructor(private readonly baseDir: string) {}
  resolve(objectKey: string): string {
    const normalized = path.normalize(objectKey).replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.baseDir, normalized);
  }
  async exists(objectKey: string): Promise<boolean> {
    try {
      await stat(this.resolve(objectKey));
      return true;
    } catch {
      return false;
    }
  }
  async delete(objectKey: string): Promise<void> {
    await rm(this.resolve(objectKey), { force: true });
  }
}

/**
 * Gate 4 §10 — Media upload intake. Heavy transformation lives in the
 * MediaWorker pipeline (§10 stages); this service enforces intake integrity:
 * size cap, magic-byte MIME validation, temp storage, sha256 dedup and
 * job hand-off. Long-term original retention is policy-gated (default off).
 */
@Injectable()
export class MediaService {
  readonly storage: LocalStorageAdapter;

  constructor(
    private readonly media: MediaRepository,
    private readonly jobs: JobRepository,
    private readonly config: AppConfig,
  ) {
    this.storage = new LocalStorageAdapter(this.config.mediaStorageDir);
  }

  async intake(input: { buffer: Buffer; declaredMime: string; createdBy: string }): Promise<{ assetId: string; duplicateOf: string | null; sniffedMime: SniffedMime }> {
    if (input.buffer.length > this.config.mediaMaxBytes) {
      throw Object.assign(new Error('MEDIA_TOO_LARGE'), { code: 'MEDIA_TOO_LARGE' });
    }
    const sniffed = sniffMime(input.buffer.subarray(0, 16));
    if (!ALLOWED_MIME.has(sniffed)) {
      throw Object.assign(new Error('MEDIA_UNSUPPORTED_TYPE'), { code: 'MEDIA_UNSUPPORTED_TYPE' });
    }

    await mkdir(this.config.mediaTmpDir, { recursive: true });
    await mkdir(this.config.mediaStorageDir, { recursive: true });

    const sha256 = createHash('sha256').update(input.buffer).digest('hex');
    const tmpKey = `${randomUUID()}.upload`;
    const tmpPath = path.join(this.config.mediaTmpDir, tmpKey);
    await pipeline(Readable.from(input.buffer), createWriteStream(tmpPath));

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

  async getAsset(assetId: string): Promise<MediaAssetRecord | null> {
    return this.media.getAsset(assetId);
  }

  async readVariant(assetId: string, width: number): Promise<{ filePath: string } | null> {
    const asset = await this.media.getAsset(assetId);
    if (!asset || asset.status !== 'ready') return null;
    const variants = await this.media.listVariants(assetId);
    const variant = variants.find((candidate) => candidate.width === width);
    if (!variant) return null;
    const filePath = this.storage.resolve(variant.objectKey);
    if (!await this.storage.exists(variant.objectKey)) return null;
    return { filePath };
  }

  async readHead(filePath: string): Promise<Buffer> {
    const handle = await readFile(filePath);
    return handle.subarray(0, 64);
  }
}
