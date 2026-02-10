#!/usr/bin/env tsx

/**
 * Permanently delete projects by name. This is what the Projects page lists.
 * - If the project has a shop: runs full shop delete (cascade + ad files + project).
 * - If the project has no shop (orphan): just deletes the project row.
 *
 * Usage:
 *   pnpm --filter api exec tsx scripts/delete-projects-by-name.ts
 *   pnpm --filter api exec tsx scripts/delete-projects-by-name.ts "Garry's Shop" "Barbearia Premium"
 */

import { join } from 'path';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { db, schema } from '../src/db/index.js';
import { eq, and } from 'drizzle-orm';
import { getPublicPath } from '../src/lib/paths.js';
import { deleteAdFile } from '../src/lib/storage.js';
import { env } from '../src/env.js';

const DEFAULT_NAMES = ["Garry's Shop", "Barbearia Premium"];
const namesToDelete = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_NAMES;
const searchTerms = namesToDelete.map((n) => n.trim().toLowerCase().replace(/'/g, ''));

async function main() {
  const allProjects = await db.query.projects.findMany({
    columns: { id: true, name: true },
  });
  const projectsToDelete = allProjects.filter((p) => {
    const nameNorm = (p.name || '').trim().toLowerCase().replace(/'/g, '');
    return searchTerms.some((term) => nameNorm.includes(term) || nameNorm === term);
  });

  if (projectsToDelete.length === 0) {
    console.log('No projects found matching:', namesToDelete.join(', '));
    console.log('Existing projects:', allProjects.map((p) => p.name).join(', '));
    process.exit(0);
  }

  const publicPath = getPublicPath();

  for (const project of projectsToDelete) {
    const projectId = project.id;
    const shop = await db.query.shops.findFirst({
      where: eq(schema.shops.projectId, projectId),
      columns: { id: true, name: true, companyId: true },
    });

    if (shop) {
      const shopId = shop.id;
      const companyId = shop.companyId;
      if (companyId != null) {
        const shopAds = await db.query.companyAds.findMany({
          where: and(
            eq(schema.companyAds.companyId, companyId),
            eq(schema.companyAds.shopId, shopId)
          ),
        });
        for (const ad of shopAds) {
          try {
            if (ad.publicUrl) {
              if (ad.publicUrl.startsWith('http://') || ad.publicUrl.startsWith('https://')) {
                if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && ad.mimeType) {
                  await deleteAdFile(ad.companyId, ad.id, ad.mimeType);
                }
              } else {
                const urlParts = ad.publicUrl.split('/');
                const filename = urlParts[urlParts.length - 1];
                const filePath = join(publicPath, 'companies', String(companyId), 'ads', filename);
                if (existsSync(filePath)) await unlink(filePath);
              }
            }
          } catch {
            // ignore
          }
        }
      }
      await db.transaction(async (tx) => {
        await tx.delete(schema.auditLog).where(eq(schema.auditLog.shopId, shopId));
        await tx.delete(schema.tickets).where(eq(schema.tickets.shopId, shopId));
        await tx.delete(schema.barberServiceWeekdayStats).where(eq(schema.barberServiceWeekdayStats.shopId, shopId));
        await tx.delete(schema.services).where(eq(schema.services.shopId, shopId));
        await tx.delete(schema.barbers).where(eq(schema.barbers.shopId, shopId));
        await tx.delete(schema.companyAds).where(eq(schema.companyAds.shopId, shopId));
        await tx.delete(schema.shops).where(eq(schema.shops.id, shopId));
        await tx.delete(schema.projects).where(eq(schema.projects.id, projectId));
      });
      console.log('Deleted shop and project:', shop.name, '(project id=' + projectId + ')');
    } else {
      await db.delete(schema.projects).where(eq(schema.projects.id, projectId));
      console.log('Deleted orphan project:', project.name, '(id=' + projectId + ')');
    }
  }

  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
