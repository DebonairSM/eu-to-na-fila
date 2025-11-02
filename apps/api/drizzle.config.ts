import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'turso',
  dbCredentials: {
    url: `file:${process.env.DATA_PATH || './data/eutonafila.sqlite'}`,
  },
} satisfies Config;

