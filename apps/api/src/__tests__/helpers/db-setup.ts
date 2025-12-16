import { db, pool } from '../../db/index.js';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let migrationsRun = false;

/**
 * Initialize test database and run migrations if needed
 */
export async function getTestDb() {
  // Run migrations once
  if (!migrationsRun) {
    const migrationsFolder = join(__dirname, '../../../drizzle');
    const migrationDb = drizzle(pool);
    try {
      await migrate(migrationDb, { migrationsFolder });
      migrationsRun = true;
    } catch (error) {
      console.warn('Migration warning:', error instanceof Error ? error.message : String(error));
    }
  }
  return db;
}

/**
 * Clean up test database
 */
export async function cleanupTestDb() {
  try {
    // Use TRUNCATE CASCADE to handle foreign keys and reset sequences
    // This is more efficient and handles all dependencies
    await pool.query(`
      TRUNCATE TABLE 
        audit_log, 
        tickets, 
        barbers, 
        services, 
        shops 
      RESTART IDENTITY CASCADE;
    `);
  } catch (error) {
    // If TRUNCATE fails, try DELETE as fallback
    try {
      await pool.query('DELETE FROM audit_log');
      await pool.query('DELETE FROM tickets');
      await pool.query('DELETE FROM barbers');
      await pool.query('DELETE FROM services');
      await pool.query('DELETE FROM shops');
    } catch (deleteError) {
      // Ignore - tables might not exist
    }
  }
}

/**
 * Close test database connection
 */
export async function closeTestDb() {
  // Connection is managed by the main db module, no need to close here
}

/**
 * Reset database to clean state
 */
export async function resetTestDb() {
  await cleanupTestDb();
}

