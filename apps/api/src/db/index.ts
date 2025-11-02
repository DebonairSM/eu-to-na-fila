import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { env } from '../env.js';
import * as schema from './schema.js';
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

export const db = drizzle(client, { 
  schema,
});
export { schema };

