import './dns-config.js';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { env } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

const db = drizzle(pool);

// Use absolute path to migrations folder
const migrationsFolder = join(__dirname, '..', 'drizzle');

console.log('Running migrations...');
console.log(`Migrations folder: ${migrationsFolder}`);
await migrate(db, { migrationsFolder });
console.log('Migrations complete!');

await pool.end();
