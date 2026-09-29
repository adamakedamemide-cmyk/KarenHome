#!/usr/bin/env node
/**
 * g4-benchmark.js — Gate 4 §20 backend performance measurement.
 * Measures real p50/p95/p99 against a RUNNING API over HTTP.
 * Scenarios: simple (liveness), search (FTS query), authenticated (JWT + DB).
 * Usage: node scripts/g4-benchmark.js [baseUrl] [requestsPerScenario]
 */
const http = require('node:http');

const BASE = process.argv[2] || 'http://127.0.0.1:3000';
const N = Number(process.argv[3] || '300');
const AUTH_TOKEN = process.env.G4_BENCH_TOKEN || '';

function request(path, token) {
  return new Promise((resolve, reject) => {
    const started = process.hrtime.bigint();
    const url = new URL(path, BASE);
    const req = http.get(url, { headers: token ? { authorization: `Bearer ${token}` } : {}, timeout: 10_000 }, (res) => {
      res.resume();
      res.on('end', () => {
        const ms = Number(process.hrtime.bigint() - started) / 1_000_000;
        resolve({ ms, status: res.statusCode });
      });
    });
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.on('error', reject);
  });
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

async function scenario(name, path, token, n) {
  // Warmup
  for (let i = 0; i < 20; i += 1) await request(path, token);
  const samples = [];
  let errors = 0; let badStatus = 0;
  for (let i = 0; i < n; i += 1) {
    try {
      const result = await request(path, token);
      if (result.status >= 500) badStatus += 1;
      samples.push(result.ms);
    } catch {
      errors += 1;
    }
  }
  samples.sort((a, b) => a - b);
  const p50 = percentile(samples, 50);
  const p95 = percentile(samples, 95);
  const p99 = percentile(samples, 99);
  const mean = samples.reduce((a, b) => a + b, 0) / Math.max(1, samples.length);
  const row = { scenario: name, n, mean: mean.toFixed(1), p50: p50.toFixed(1), p95: p95.toFixed(1), p99: p99.toFixed(1), errors, badStatus };
  console.log(JSON.stringify(row));
  return row;
}

(async () => {
  console.log(`benchmark against ${BASE}, n=${N} per scenario`);
  const simple = await scenario('simple_liveness', '/api/v1/health/live', '', N);
  const search = await scenario('search_fts', '/api/v1/search/listings?q=zebraplum&page=1&pageSize=24', '', N);
  let authed = null;
  if (AUTH_TOKEN) {
    authed = await scenario('authenticated_me', '/api/v1/auth/me', AUTH_TOKEN, N);
  } else {
    console.log(JSON.stringify({ scenario: 'authenticated_me', skipped: 'G4_BENCH_TOKEN not set' }));
  }
  const targets = { simple: 300, search: 500, authed: 400 };
  const verdicts = [
    { scenario: 'simple', p95: Number(simple.p95), target: targets.simple },
    { scenario: 'search', p95: Number(search.p95), target: targets.search },
    ...(authed ? [{ scenario: 'authed', p95: Number(authed.p95), target: targets.authed }] : []),
  ];
  for (const verdict of verdicts) {
    console.log(`verdict ${verdict.scenario}: p95=${verdict.p95}ms target=${verdict.target}ms → ${verdict.p95 < verdict.target ? 'WITHIN_TARGET' : 'OVER_TARGET'}`);
  }
})().catch((error) => { console.error(error); process.exit(1); });
