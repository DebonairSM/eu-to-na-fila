import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as schema from '../../db/schema.js';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let testPool: pg.Pool | null = null;
let testDb: ReturnType<typeof drizzle> | null = null;

/**
 * Get or create test database connection
 */
export async function getTestDb() {
  if (testDb) {
    return testDb;
  }

  // Use test database URL from env, or default to a test database
  const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL?.replace(/\/[^/]+$/, '/eutonafila_test') || 'postgresql://localhost:5432/eutonafila_test';

  testPool = new Pool({
    connectionString: testDbUrl,
  });

  testDb = drizzle(testPool, { schema });

  // Run migrations
  const migrationsFolder = join(__dirname, '../../../drizzle');
  await migrate(testDb, { migrationsFolder });

  return testDb;
}

/**
 * Clean up test database
 */
export async function cleanupTestDb() {
  if (testDb) {
    // Truncate all tables in reverse order of dependencies
    await testDb.execute(`
      TRUNCATE TABLE audit_log, tickets, barbers, services, shops RESTART IDENTITY CASCADE;
    `);
  }
}

/**
 * Close test database connection
 */
export async function closeTestDb() {
  if (testPool) {
    await testPool.end();
    testPool = null;
    testDb = null;
  }
}

/**
 * Reset database to clean state
 */
export async function resetTestDb() {
  await cleanupTestDb();
}

