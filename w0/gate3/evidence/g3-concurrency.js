/**
 * g3-concurrency.js — Gate 3-DB concurrency verification (REAL, two connections)
 * C1: budget delta-increment race → row-lock serialization + guard → exactly
 *     one writer succeeds; spent never exceeds limit.
 * C2: outbox dual-worker claim (FOR UPDATE SKIP LOCKED) → disjoint claims,
 *     zero duplicates.
 * C3: listing state transition race → optimistic single-winner, no double
 *     transition.
 * Usage: node g3-concurrency.js <database>
 */
const { Client } = require('/home/z/my-project/w0-work/backend/node_modules/.pnpm/pg@8.23.0/node_modules/pg/lib/index.js');

const db = process.argv[2] || 'karen_g3_fresh';
const results = [];
function report(id, pass, detail) {
  results.push({ id, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${id}${detail ? ' — ' + detail : ''}`);
}
async function conn() {
  const c = new Client({ host: '127.0.0.1', port: 5432, user: 'postgres', database: db });
  await c.connect();
  return c;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function testBudgetRace() {
  const a = await conn(), b = await conn();
  try {
    const { rows: [org] } = await a.query(
      `INSERT INTO org.organizations (type, status, display_name, slug)
       VALUES ('agency','active','C1 Org','c1-org-'||md5(random()::text)) RETURNING id`);
    const { rows: [adv] } = await a.query(
      `INSERT INTO advertising.advertisers (organization_id, name, status)
       VALUES ($1,'C1 Advertiser','ACTIVE') RETURNING id`, [org.id]);
    const { rows: [camp] } = await a.query(
      `INSERT INTO advertising.campaigns (advertiser_id, name, status) VALUES ($1,'C1','DRAFT') RETURNING id`, [adv.id]);
    const { rows: [bud] } = await a.query(
      `INSERT INTO advertising.budgets (campaign_id, budget_type, limit_amount, currency_code, spent_amount)
       VALUES ($1,'TOTAL',1000,'USD',0) RETURNING id`, [camp.id]);

    let aOK = false, bErr = null;
    const t1 = (async () => {
      await a.query('BEGIN');
      await a.query(`UPDATE advertising.budgets SET spent_amount = spent_amount + 800 WHERE id=$1`, [bud.id]);
      await sleep(400); // hold row lock while T2 attempts
      await a.query('COMMIT'); aOK = true;
    })();
    await sleep(100);
    const t2 = (async () => {
      await b.query('BEGIN');
      try {
        await b.query(`UPDATE advertising.budgets SET spent_amount = spent_amount + 400 WHERE id=$1`, [bud.id]);
        await b.query('COMMIT');
      } catch (e) { await b.query('ROLLBACK'); bErr = e; }
    })();
    await Promise.all([t1, t2]);
    const { rows: [final] } = await a.query(`SELECT spent_amount FROM advertising.budgets WHERE id=$1`, [bud.id]);
    const spent = Number(final.spent_amount);
    report('C1_budget_race',
      aOK === true && bErr !== null && bErr.message.includes('BUDGET_EXCEEDED') && spent === 800,
      `writer1=${aOK}, writer2_rejected=${bErr ? bErr.message.split('\n')[0] : 'none'}, spent=${spent}`);
  } finally { await a.end().catch(()=>{}); await b.end().catch(()=>{}); }
}

async function testOutboxClaim() {
  const a = await conn(), b = await conn();
  try {
    for (let i = 0; i < 10; i++) {
      await a.query(`INSERT INTO audit.outbox_events (aggregate_type, aggregate_id, event_type, payload)
                     VALUES ('g3_conc', gen_random_uuid(), 'G3Conc.v1', '{"i":$1}'::jsonb)`.replace('$1', String(i)));
    }
    const claim = (c) => c.query('BEGIN').then(() =>
      c.query(`SELECT id FROM audit.outbox_events
                WHERE aggregate_type='g3_conc' AND published_at IS NULL AND locked_by IS NULL
                ORDER BY occurred_at LIMIT 5 FOR UPDATE SKIP LOCKED`)
        .then(async (r) => {
          await c.query(`UPDATE audit.outbox_events SET locked_by=$1, locked_at=now() WHERE id = ANY($2)`, ['worker-'+(c===a?'A':'B'), r.rows.map(x=>x.id)]);
          return r.rows.map((x) => x.id);
        }));
    const [ca, cb] = await Promise.all([claim(a), claim(b)]);
    const setA = new Set(ca), setB = new Set(cb);
    const overlap = ca.filter((x) => setB.has(x));
    await a.query('ROLLBACK'); await b.query('ROLLBACK'); // release, keep DB clean
    report('C2_outbox_claim',
      overlap.length === 0 && ca.length === 5 && cb.length === 5,
      `claimed A=${ca.length}, B=${cb.length}, overlap=${overlap.length}`);
  } finally { await a.end().catch(()=>{}); await b.end().catch(()=>{}); }
}

async function testTransitionRace() {
  const a = await conn(), b = await conn();
  try {
    const { rows: [fx] } = await a.query(`
      WITH u AS (INSERT INTO iam.users (status) VALUES ('active') RETURNING id)
      INSERT INTO property.properties (property_type_id, created_by)
        SELECT pt.id, u.id FROM property.property_types pt, u
        WHERE pt.code = (SELECT code FROM property.property_types ORDER BY 1 LIMIT 1)
      RETURNING id`);
    const { rows: [l] } = await a.query(
      `INSERT INTO marketplace.listings (property_id, transaction_type, title, currency_code, price, status)
       VALUES ($1,'sale','C3 race','USD',10,'draft') RETURNING id`, [fx.id]);
    await a.query(
      `INSERT INTO marketplace.listing_prices (listing_id, price, currency_code, price_period, valid_from)
       VALUES ($1,10,'USD','one_time',now())`, [l.id]);
    await a.query(
      `INSERT INTO marketplace.media_assets (storage_provider, bucket, object_key, mime_type, size_bytes, sha256_hex)
       VALUES ('local','g3',gen_random_uuid()::text,'image/jpeg',100,md5(random()::text)||md5(random()::text))`);
    const { rows: [m] } = await a.query(
      `SELECT id FROM marketplace.media_assets ORDER BY created_at DESC LIMIT 1`);
    await a.query(
      `INSERT INTO marketplace.listing_media (listing_id, media_asset_id, media_type, is_cover, sort_order)
       VALUES ($1,$2,'photo',true,0)`, [l.id, m.id]);
    await a.query(`UPDATE marketplace.listings SET status='pending_moderation' WHERE id=$1`, [l.id]);
    await a.query(`UPDATE marketplace.listings SET status='published' WHERE id=$1`, [l.id]);
    const claim = (c) => c.query(
      `UPDATE marketplace.listings SET status='sold' WHERE id=$1 AND status='published' RETURNING id`, [l.id])
      .then((r) => r.rowCount);
    await Promise.all([claim(a), claim(b)]).then(([ra, rb]) => {
      report('C3_transition_race', ra + rb === 1, `winners=${ra + rb} (exactly one)`);
    });
  } finally { await a.end().catch(()=>{}); await b.end().catch(()=>{}); }
}

(async () => {
  await testBudgetRace();
  await testOutboxClaim();
  await testTransitionRace();
  const fails = results.filter((r) => !r.pass);
  console.log(`\nconcurrency summary: ${results.length - fails.length}/${results.length} PASS`);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error('HARNESS_ERROR', e); process.exit(2); });
