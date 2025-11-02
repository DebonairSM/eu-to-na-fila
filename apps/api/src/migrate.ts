import { migrate } from 'drizzle-orm/libsql/migrator';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { env } from './env.js';
import { dirname } from 'path';
import { mkdirSync, existsSync } from 'fs';

// Ensure data directory exists
const dataDir = dirname(env.DATA_PATH);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const client = createClient({
  url: `file:${env.DATA_PATH}`,
});

const db = drizzle(client);

console.log('Running migrations...');
await migrate(db, { migrationsFolder: './drizzle' });
console.log('Migrations complete!');

client.close();

