#!/usr/bin/env tsx

/**
 * List all projects (and their shops) from the database.
 * Uses the same DATABASE_URL as the API. Run this to see what the Projects page will show.
 *
 * Usage: pnpm --filter api exec tsx scripts/list-projects.ts
 */

import { db, schema } from '../src/db/index.js';
import { asc } from 'drizzle-orm';

async function main() {
  const projects = await db
    .select({
      id: schema.projects.id,
      slug: schema.projects.slug,
      name: schema.projects.name,
      path: schema.projects.path,
    })
    .from(schema.projects)
    .orderBy(asc(schema.projects.name));

  console.log('Projects in DB (what GET /api/projects returns):');
  if (projects.length === 0) {
    console.log('  (none)');
  } else {
    for (const p of projects) {
      console.log(`  id=${p.id}  name="${p.name}"  slug=${p.slug}  path=${p.path}`);
    }
  }
  console.log('');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
