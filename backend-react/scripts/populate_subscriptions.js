import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  console.log('--- Ensuring Subscription Plans in PostgreSQL ---');
  await pool.query(`
    INSERT INTO subscription_plans (id, name, price, billing_cycle, max_users, max_departments, features)
    VALUES 
      ('a0000000-0000-0000-0000-000000000001', 'Enterprise Municipal Plan', 150000.00, 'YEARLY', 100, 15, '["3_WAY_RECONCILIATION", "AMC_RATE_CARD_ENGINE", "ESCALATION_MONITOR", "EXECUTIVE_TELEMETRY"]'::jsonb),
      ('a0000000-0000-0000-0000-000000000002', 'Professional Municipal Plan', 80000.00, 'YEARLY', 50, 8, '["AMC_RATE_CARD_ENGINE", "ESCALATION_MONITOR"]'::jsonb),
      ('a0000000-0000-0000-0000-000000000003', 'Starter Municipal Plan', 35000.00, 'YEARLY', 20, 4, '["AMC_RATE_CARD_ENGINE"]'::jsonb)
    ON CONFLICT (id) DO NOTHING;
  `);

  console.log('--- Checking Active Townships ---');
  const townships = await pool.query('SELECT id, name, status, subscription_plan_id FROM townships');
  console.log(`Found ${townships.rows.length} townships:`);

  for (const t of townships.rows) {
    console.log(`- ${t.name} (${t.id})`);
    const existing = await pool.query('SELECT * FROM township_subscriptions WHERE township_id = $1', [t.id]);
    if (existing.rows.length === 0) {
      const planId = t.subscription_plan_id || 'a0000000-0000-0000-0000-000000000001';
      await pool.query(`
        INSERT INTO township_subscriptions (township_id, plan_id, start_date, end_date, status)
        VALUES ($1, $2, NOW() - INTERVAL '30 days', NOW() + INTERVAL '335 days', 'ACTIVE')
      `, [t.id, planId]);
      console.log(`  ✔ Created active subscription for ${t.name}`);
    } else {
      console.log(`  Subscription already exists for ${t.name}`);
    }
  }

  const finalCount = await pool.query('SELECT count(*) FROM township_subscriptions WHERE status = $1', ['ACTIVE']);
  console.log(`--- Active Subscriptions Count in PostgreSQL: ${finalCount.rows[0].count} ---`);

  await pool.end();
}

run().catch((err) => {
  console.error('Error running script:', err);
  process.exit(1);
});
