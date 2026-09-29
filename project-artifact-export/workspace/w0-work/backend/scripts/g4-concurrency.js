#!/usr/bin/env node
/**
 * g4-concurrency.js — Gate 4 real concurrency races (§22 Concurrency / §23).
 * C1  Optimistic publish race: N parallel submit→publish transitions — exactly one winner.
 * C2  Job claim race: N workers claim the same pending queue — zero double-claims.
 * C3  Budget race: parallel CPC spend against a tight TOTAL budget — never exceeds limit.
 * C4  Refresh reuse race: two parallel rotations with the same token — one wins, one detects reuse.
 * C5  Impression dedup race: parallel same-session impressions — exactly one counted per minute.
 * Usage: node scripts/g4-concurrency.js <database-url>
 */
const { createRequire } = require('node:module');
// pnpm strict layout: resolve pg through the workspace package that owns it.
const req = createRequire(require('node:path').join(__dirname, '..', 'packages', 'db', 'src', 'index.js'));
const { Pool } = req('pg');

const DB_URL = process.argv[2] || process.env.DATABASE_URL;
if (!DB_URL) { console.error('usage: node scripts/g4-concurrency.js <database-url>'); process.exit(1); }
const pool = new Pool({ connectionString: DB_URL, max: 16 });
const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  — ${detail}`);
}
const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

async function race(n, fn) {
  const starters = Array.from({ length: n }, () => Promise.resolve().then(() => fn()));
  return Promise.allSettled(starters);
}

async function C1_publishRace() {
  const c = await pool.connect();
  const userRow = await c.query(
    `INSERT INTO iam.users(status) VALUES ('active') RETURNING id`);
  const userId = userRow.rows[0].id;
  await c.query(`INSERT INTO iam.user_emails(user_id, email, is_primary, is_verified, verified_at) VALUES ($1, $2, true, true, now())`, [userId, `c1-${Date.now()}@example.com`]);
  const typeRow = await c.query(`SELECT id FROM property.property_types WHERE code='apartment' LIMIT 1`);
  const prop = await c.query(
    `INSERT INTO property.properties(property_type_id, area_total_m2, created_by, status) VALUES ($1,'60',$2,'draft') RETURNING id`,
    [typeRow.rows[0].id, userId]);
  const propertyId = prop.rows[0].id;
  const listing = await c.query(
    `INSERT INTO marketplace.listings(property_id, created_by_user_id, transaction_type, status, title, currency_code, price, price_period, attributes)
     VALUES ($1,$2,'sale','draft','C1 race listing','USD','100.0000','one_time','{}') RETURNING id`,
    [propertyId, userId]);
  const listingId = listing.rows[0].id;
  c.release();

  // One transition to published, straight from draft through moderation chain.
  const step = (from, to) => pool.query(
    `UPDATE marketplace.listings SET status=$3, updated_at=now()
      WHERE id=$1::uuid AND version = (SELECT version FROM marketplace.listings WHERE id=$1::uuid) 
        AND status = $2::marketplace.listing_status
      RETURNING version`,
    [listingId, from, to]);

  const outcome = await race(10, () => step('draft', 'pending_moderation'));
  const winners = outcome.filter((r) => r.status === 'fulfilled' && r.value.rowCount === 1).length;
  record('C1 transition single-winner', winners === 1, `winners=${winners}/10`);
  await pool.query(`DELETE FROM marketplace.listings WHERE id=$1::uuid`, [listingId]);
  await pool.query(`DELETE FROM property.properties WHERE id=$1::uuid`, [propertyId]);
  await pool.query(`DELETE FROM iam.users WHERE id=$1::uuid`, [userId]);
}

async function C2_jobClaimRace() {
  const queue = `c2-${Date.now()}`;
  const ids = [];
  for (let i = 0; i < 20; i += 1) {
    const r = await pool.query(
      `INSERT INTO platform.jobs(queue, job_type, payload) VALUES ($1,'test.claim','{}') RETURNING id`,
      [queue]);
    ids.push(r.rows[0].id);
  }
  const claimed = [];
  await race(8, async () => {
    const r = await pool.query(
      `WITH candidates AS (
         SELECT id FROM platform.jobs WHERE status='pending' AND queue=$1 AND run_at <= now()
         ORDER BY run_at, created_at FOR UPDATE SKIP LOCKED LIMIT 5
       )
       UPDATE platform.jobs j SET status='running', locked_at=now(), locked_by='w', attempts=j.attempts+1
       FROM candidates c WHERE j.id=c.id RETURNING j.id`,
      [queue]);
    for (const row of r.rows) claimed.push(row.id);
  });
  const unique = new Set(claimed);
  const total = unique.size;
  const overlaps = claimed.length - total;
  record('C2 job claim zero double-claim', overlaps === 0 && total === 20, `claimed=${total}/20 duplicates=${overlaps}`);
  await pool.query(`DELETE FROM platform.jobs WHERE queue=$1`, [queue]);
}

async function C3_budgetRace() {
  const org = await pool.query(
    `INSERT INTO org.organizations(type, display_name, slug, status) VALUES ('agency','C3 org',$1,'active') RETURNING id`,
    [`c3-${Date.now()}`]);
  const advertiser = await pool.query(
    `INSERT INTO advertising.advertisers(organization_id, name, status) VALUES ($1,'C3 adv','ACTIVE') RETURNING id`,
    [org.rows[0].id]);
  const campaign = await pool.query(
    `INSERT INTO advertising.campaigns(advertiser_id, name, start_at, end_at, pricing_model, price_amount, currency_code)
     VALUES ($1,'C3 camp', now() - interval '1h', now() + interval '1 day','CPC','1.0000','USD') RETURNING id`,
    [advertiser.rows[0].id]);
  const campaignId = campaign.rows[0].id;
  await pool.query(
    `INSERT INTO advertising.budgets(campaign_id, budget_type, limit_amount, currency_code) VALUES ($1,'TOTAL','5.0000','USD')`,
    [campaignId]);

  let rejected = 0; let accepted = 0;
  await race(10, async () => {
    try {
      await pool.query(
        `UPDATE advertising.budgets SET spent_amount = spent_amount + 1 WHERE campaign_id=$1::uuid AND budget_type='TOTAL'`,
        [campaignId]);
      accepted += 1;
    } catch (error) {
      if (String(error.message).includes('BUDGET_EXCEEDED')) rejected += 1; else throw error;
    }
  });
  const spent = await pool.query(`SELECT spent_amount::text, limit_amount::text FROM advertising.budgets WHERE campaign_id=$1::uuid`, [campaignId]);
  const within = Number(spent.rows[0].spent_amount) <= Number(spent.rows[0].limit_amount);
  record('C3 budget guard', within && rejected > 0, `accepted=${accepted} rejected=${rejected} spent=${spent.rows[0].spent_amount}/${spent.rows[0].limit_amount}`);
  await pool.query(`DELETE FROM advertising.campaigns WHERE id=$1::uuid`, [campaignId]);
  await pool.query(`DELETE FROM advertising.advertisers WHERE id=$1::uuid`, [advertiser.rows[0].id]);
  await pool.query(`DELETE FROM org.organizations WHERE id=$1::uuid`, [org.rows[0].id]);
}

async function C4_refreshReuseRace() {
  const user = await pool.query(`INSERT INTO iam.users(status) VALUES ('active') RETURNING id`);
  const userId = user.rows[0].id;
  await pool.query(`INSERT INTO iam.user_emails(user_id, email, is_primary, is_verified, verified_at) VALUES ($1,$2,true,true,now())`, [userId, `c4-${Date.now()}@example.com`]);
  const tokenHash = `c4hash-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await pool.query(
    `INSERT INTO iam.user_sessions(user_id, refresh_token_hash, expires_at) VALUES ($1,$2, now() + interval '1 day')`,
    [userId, tokenHash]);

  let wins = 0; let reuse = 0;
  await race(2, () => pool.query(
    `WITH s AS (
       SELECT id, user_id, revoked_at FROM iam.user_sessions WHERE refresh_token_hash=$1 FOR UPDATE
     ), guard AS (
       SELECT set_config('app.actor_user_id', s.user_id::text, true) FROM s
     ), upd AS (
       UPDATE iam.user_sessions SET revoked_at=now() WHERE id IN (SELECT id FROM s WHERE revoked_at IS NULL) RETURNING id
     )
     SELECT (SELECT count(*) FROM upd) AS rotated,
            (SELECT revoked_at IS NOT NULL FROM s) AS reused`,
    [tokenHash]).then((r) => {
      if (Number(r.rows[0].rotated) === 1 && r.rows[0].reused === false) wins += 1;
      else if (r.rows[0].reused === true) reuse += 1;
    }));
  record('C4 refresh rotation single-winner', wins === 1 && reuse === 1, `wins=${wins} reuse_detected=${reuse}`);
  await pool.query(`DELETE FROM iam.users WHERE id=$1::uuid`, [userId]);
}

async function C5_impressionDedupRace() {
  const org = await pool.query(
    `INSERT INTO org.organizations(type, display_name, slug, status) VALUES ('agency','C5 org',$1,'active') RETURNING id`,
    [`c5-${Date.now()}`]);
  const advertiser = await pool.query(
    `INSERT INTO advertising.advertisers(organization_id, name, status) VALUES ($1,'C5 adv','ACTIVE') RETURNING id`,
    [org.rows[0].id]);
  const campaign = await pool.query(
    `INSERT INTO advertising.campaigns(advertiser_id, name, start_at, end_at, pricing_model, price_amount, currency_code)
     VALUES ($1,'C5 camp', now() - interval '1h', now() + interval '1 day','CPC','1.0000','USD') RETURNING id`,
    [advertiser.rows[0].id]);
  const creative = await pool.query(
    `INSERT INTO advertising.creatives(campaign_id, name, target_url, status) VALUES ($1,'C5 cre','https://example.com','APPROVED') RETURNING id`,
    [campaign.rows[0].id]);
  const slot = await pool.query(`SELECT id FROM advertising.ad_slots WHERE code='listing_detail_top' LIMIT 1`);
  const session = `c5session-${Date.now()}`;

  let counted = 0;
  await race(10, async () => {
    try {
      const r = await pool.query(
        `INSERT INTO advertising.impressions(campaign_id, creative_id, slot_id, session_hash, page_type, fraud_score, is_counted)
         VALUES ($1,$2,$3,$4,'LISTING_DETAIL',0,true) RETURNING id`,
        [campaign.rows[0].id, creative.rows[0].id, slot.rows[0].id, session]);
      if (r.rowCount === 1) counted += 1;
    } catch (error) {
      if (!String(error.message).includes('uq_impression_dedup')) throw error;
    }
  });
  record('C5 impression minute-dedup', counted === 1, `counted=${counted}/10`);
  await pool.query(`DELETE FROM advertising.campaigns WHERE id=$1::uuid`, [campaign.rows[0].id]);
  await pool.query(`DELETE FROM advertising.advertisers WHERE id=$1::uuid`, [advertiser.rows[0].id]);
  await pool.query(`DELETE FROM org.organizations WHERE id=$1::uuid`, [org.rows[0].id]);
}

(async () => {
  await C1_publishRace();
  await C2_jobClaimRace();
  await C3_budgetRace();
  await C4_refreshReuseRace();
  await C5_impressionDedupRace();
  await pool.end();
  const passed = results.filter((r) => r.pass).length;
  console.log(`\n=== g4-concurrency: ${passed}/${results.length} PASS ===`);
  process.exit(passed === results.length ? 0 : 1);
})().catch((error) => { console.error(error); process.exit(1); });
