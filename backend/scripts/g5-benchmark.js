#!/usr/bin/env node
/**
 * g5-benchmark.js — GATE 5 Phase R: real concurrent load benchmark (G5R-PERF-001).
 * Concurrency sweep 10/50/100/250/500 against a RUNNING API.
 * Metrics per level & scenario: RPS, p50/p95/p99, error rate + API process CPU/RAM.
 * Extra probes: direct DB query latency, OpenSearch search latency.
 * Usage: node scripts/g5-benchmark.js [baseUrl] [requestsPerLevel]
 */
const http = require('node:http');
const { execSync } = require('node:child_process');
const { createRequire } = require('node:module');
const path = require('node:path');
// pnpm layout: pg resolves inside apps/api, not the repo root.
const apiRequire = createRequire(path.join(__dirname, '..', 'packages', 'db', 'package.json'));

const BASE = process.argv[2] || 'http://127.0.0.1:3000';
const N = Number(process.argv[3] || '400');
const AUTH_TOKEN = process.env.G5_BENCH_TOKEN || '';
const API_PID = process.env.G5_API_PID || '';

function request(path, token) {
  return new Promise((resolve, reject) => {
    const started = process.hrtime.bigint();
    const url = new URL(path, BASE);
    const req = http.get(url, { headers: token ? { authorization: `Bearer ${token}` } : {}, timeout: 15_000 }, (res) => {
      res.resume();
      res.on('end', () => resolve({ ms: Number(process.hrtime.bigint() - started) / 1e6, status: res.statusCode }));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))];
}

function apiResources() {
  if (!API_PID) return null;
  try {
    const stat = execSync(`ps -o %cpu=,rss= -p ${API_PID}`, { encoding: 'utf8' }).trim().split(/\s+/);
    return { cpuPercent: Number(stat[0]), rssMB: Math.round(Number(stat[1]) / 1024) };
  } catch {
    return null;
  }
}

async function concurrentScenario(name, path, token, level, n) {
  for (let i = 0; i < 30; i += 1) await request(path, token); // warmup
  const samples = [];
  let errors = 0;
  let badStatus = 0;
  const startedAt = Date.now();
  const resStart = apiResources();
  let done = 0;
  async function worker() {
    for (;;) {
      const index = done += 1;
      if (index > n) return;
      try {
        const r = await request(path, token);
        if (r.status >= 500) badStatus += 1;
        samples.push(r.ms);
      } catch {
        errors += 1;
      }
    }
  }
  await Promise.all(Array.from({ length: level }, () => worker()));
  const wallMs = Date.now() - startedAt;
  samples.sort((a, b) => a - b);
  const resEnd = apiResources();
  const rps = samples.length / (wallMs / 1000);
  const cpuDelta = resStart && resEnd ? Math.max(0, resEnd.cpuPercent - resStart.cpuPercent) : null;
  return {
    level, requests: n, ok: samples.length, errors, badStatus,
    rps: Number(rps.toFixed(1)),
    p50: Number(percentile(samples, 50).toFixed(2)),
    p95: Number(percentile(samples, 95).toFixed(2)),
    p99: Number(percentile(samples, 99).toFixed(2)),
    errorRate: Number(((errors + badStatus) / n * 100).toFixed(3)),
    apiCpuPercent: resEnd ? resEnd.cpuPercent : null,
    cpuDelta: cpuDelta,
    apiRssMB: resEnd ? resEnd.rssMB : null,
  };
}

async function directDbLatency() {
  const { Client } = apiRequire('pg');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const samples = [];
  for (let i = 0; i < 300; i += 1) {
    const t = process.hrtime.bigint();
    await client.query('SELECT id FROM marketplace.listings WHERE deleted_at IS NULL ORDER BY published_at DESC NULLS LAST LIMIT 10');
    samples.push(Number(process.hrtime.bigint() - t) / 1e6);
  }
  await client.end();
  samples.sort((a, b) => a - b);
  return { p50: Number(percentile(samples, 50).toFixed(3)), p95: Number(percentile(samples, 95).toFixed(3)), p99: Number(percentile(samples, 99).toFixed(3)) };
}

async function osSearchLatency() {
  const base = process.env.OPENSEARCH_URL;
  if (!base) return null;
  const samples = [];
  for (let i = 0; i < 200; i += 1) {
    const t = process.hrtime.bigint();
    const res = await fetch(`${base}/listings-v1/_search`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: { match_all: {} }, size: 10 }) });
    await res.json();
    samples.push(Number(process.hrtime.bigint() - t) / 1e6);
  }
  samples.sort((a, b) => a - b);
  return { p50: Number(percentile(samples, 50).toFixed(3)), p95: Number(percentile(samples, 95).toFixed(3)), p99: Number(percentile(samples, 99).toFixed(3)) };
}

(async () => {
  const levels = [10, 50, 100, 250, 500];
  const scenarios = [
    { name: 'liveness (no auth, no db)', path: '/api/v1/health', token: '' },
    { name: 'search (PG FTS query)', path: '/api/v1/listings?q=apartment&pageSize=10', token: '' },
    { name: 'authenticated (JWT+DB)', path: '/api/v1/auth/me', token: AUTH_TOKEN },
  ];
  const results = {};
  for (const scenario of scenarios) {
    results[scenario.name] = [];
    for (const level of levels) {
      const r = await concurrentScenario(scenario.name, scenario.path, scenario.token, level, N);
      results[scenario.name].push(r);
      console.error(`${scenario.name} @C=${level}: ${JSON.stringify(r)}`);
    }
  }
  const db = await directDbLatency();
  console.error('DB_DIRECT:', JSON.stringify(db));
  const os = await osSearchLatency();
  console.error('OS_SEARCH:', JSON.stringify(os));
  process.stdout.write(JSON.stringify({ generatedAt: new Date().toISOString(), levels, requestsPerLevel: N, scenarios: results, dbDirect: db, osSearch: os }, null, 1));
})().catch((error) => { console.error(error); process.exit(1); });
