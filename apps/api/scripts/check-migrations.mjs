import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import dotenv from 'dotenv';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../../.env') });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const r = await client.query(
    'SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at'
  );
  console.table(r.rows);

  const cols = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'shops' ORDER BY ordinal_position
  `);
  console.log('\nshops columns:', cols.rows.map((c) => c.column_name).join(', '));

  const hasProjects = await client.query(
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects')"
  );
  console.log('\nprojects table exists:', hasProjects.rows[0].exists);
} finally {
  await client.end();
}
