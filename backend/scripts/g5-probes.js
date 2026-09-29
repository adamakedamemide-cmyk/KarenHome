#!/usr/bin/env node
/** g5-probes.js — GATE 5 Phase R supplementary probes: DB, OpenSearch, queue, media pipeline. */
const { createRequire } = require('node:module');
const path = require('node:path');
const { execSync } = require('node:child_process');
const dbRequire = createRequire(path.join(__dirname, '..', 'packages', 'db', 'package.json'));
const workerRequire = createRequire(path.join(__dirname, '..', 'apps', 'worker', 'package.json'));

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))];
}
const stats = (samples) => ({ p50: Number(percentile(samples, 50).toFixed(3)), p95: Number(percentile(samples, 95).toFixed(3)), p99: Number(percentile(samples, 99).toFixed(3)) });

async function dbLatency() {
  const { Client } = dbRequire('pg');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const samples = [];
  for (let i = 0; i < 300; i += 1) {
    const t = process.hrtime.bigint();
    await client.query('SELECT id FROM marketplace.listings WHERE deleted_at IS NULL ORDER BY published_at DESC NULLS LAST LIMIT 10');
    samples.push(Number(process.hrtime.bigint() - t) / 1e6);
  }
  await client.end();
  return stats(samples);
}

async function osLatency() {
  const base = process.env.OPENSEARCH_URL;
  if (!base) return null;
  const samples = [];
  for (let i = 0; i < 200; i += 1) {
    const t = process.hrtime.bigint();
    const res = await fetch(`${base}/listings-v1/_search`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: { match_all: {} }, size: 10 }) });
    await res.json();
    samples.push(Number(process.hrtime.bigint() - t) / 1e6);
  }
  return stats(samples);
}

async function queueLatency() {
  const { JobRepository, PostgresDatabase } = workerRequire('@platform/db/dist/index.js');
  const db = new PostgresDatabase({ connectionString: process.env.DATABASE_URL, max: 3 });
  const jobs = new JobRepository(db);
  const queue = `g5probe-${Date.now()}`;
  const samples = [];
  for (let i = 0; i < 50; i += 1) {
    const t = process.hrtime.bigint();
    const id = await jobs.enqueue({ queue, jobType: 'probe.job', payload: { i } });
    const batch = await jobs.claimBatch('g5-probe', queue, 1);
    if (batch[0] && batch[0].id === id) {
      samples.push(Number(process.hrtime.bigint() - t) / 1e6);
      await jobs.complete(id, 'g5-probe');
    }
  }
  await db.close();
  return stats(samples);
}

async function mediaPipeline() {
  const { MediaRepository, JobRepository, PostgresDatabase } = workerRequire('@platform/db/dist/index.js');
  const sharp = workerRequire('sharp');
  const { handleMediaJob } = require(path.join(__dirname, '..', 'apps', 'worker', 'dist', 'workers', 'media.worker.js'));
  const fs = require('node:fs');
  const tmpDir = '/tmp/karen-media'; const storageDir = '/tmp/karen-media-storage';
  fs.mkdirSync(tmpDir, { recursive: true });
  const db = new PostgresDatabase({ connectionString: process.env.DATABASE_URL, max: 3 });
  const media = new MediaRepository(db);
  const jobs = new JobRepository(db);
  // deterministic 400x600 test image (no EXIF)
  const png = await sharp({ create: { width: 400, height: 600, channels: 3, background: { r: 120, g: 40, b: 90 } } }).png().toBuffer();
  const samples = [];
  for (let i = 0; i < 3; i += 1) {
    const tmpKey = `g5probe-${Date.now()}-${i}.upload`;
    fs.writeFileSync(path.join(tmpDir, tmpKey), png);
    const asset = await media.createAsset({
      storageProvider: 'local-fs', bucket: null, objectKey: `optimized/g5/probe-${Date.now()}-${i}.webp`,
      mimeType: 'image/png', sizeBytes: png.length, createdBy: '04413fb6-1d8e-4086-b61f-f39be842fb10',
    });
    await jobs.enqueue({ queue: 'media-probe', jobType: 'media.process', payload: { assetId: asset.id, tmpKey } });
    const t = process.hrtime.bigint();
    await handleMediaJob({ id: 'probe', jobType: 'media.process', payload: { assetId: asset.id, tmpKey }, attempts: 1 }, {
      db, jobs, workerId: 'g5-probe', backoffBaseSeconds: 1, backoffMaxSeconds: 60, log: () => undefined,
    });
    samples.push(Number(process.hrtime.bigint() - t) / 1e6);
    const after = await media.getAsset(asset.id);
    if (after.status !== 'ready') throw new Error(`MEDIA_PROBE_FAILED: ${after.status}`);
  }
  await db.close();
  return stats(samples);
}

function apiResources() {
  const pid = process.env.G5_API_PID;
  if (!pid) return null;
  try {
    const out = execSync(`ps -o %cpu=,rss= -p ${pid}`, { encoding: 'utf8' }).trim().split(/\s+/);
    return { cpuPercent: Number(out[0]), rssMB: Math.round(Number(out[1]) / 1024) };
  } catch { return null; }
}

(async () => {
  const result = {
    at: new Date().toISOString(),
    dbQuery: await dbLatency(),
    osSearch: await osLatency(),
    queueEnqueueClaim: await queueLatency(),
    mediaPipeline: await mediaPipeline(),
    apiProcess: apiResources(),
  };
  process.stdout.write(JSON.stringify(result, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
