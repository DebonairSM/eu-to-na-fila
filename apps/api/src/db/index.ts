import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../env.js';
import * as schema from './schema.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_POOL_MAX ?? 5,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

// Prevent unhandled pool errors (e.g. connection loss) from crashing the process
pool.on('error', (err: Error) => {
  console.error('[db] Pool error:', err?.message ?? String(err));
});

export const db = drizzle(pool, { schema });
export { schema };
export { pool }; // Export pool for raw SQL queries in tests
