#!/usr/bin/env tsx

/**
 * One-off script: Permanently delete shops by name.
 * Uses the same full hard delete as the API (all related rows + project + ad files).
 *
 * Usage:
 *   pnpm --filter api exec tsx scripts/delete-shops-by-name.ts
 *   pnpm --filter api exec tsx scripts/delete-shops-by-name.ts "Garry's" "Barbearia Premium"
 *
 * Names are matched case-insensitively (trimmed). With no args, deletes "Garry's" and "Barbearia Premium".
 */

import { join } from 'path';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { db, schema } from '../src/db/index.js';
import { eq, and } from 'drizzle-orm';
import { getPublicPath } from '../src/lib/paths.js';
import { deleteAdFile } from '../src/lib/storage.js';
import { env } from '../src/env.js';

const DEFAULT_NAMES = ["Garry's", "Barbearia Premium"];
const namesToDelete = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_NAMES;
const searchTerms = namesToDelete.map((n) => n.trim().toLowerCase().replace(/'/g, ''));

async function main() {
  const allShops = await db.query.shops.findMany({
    columns: { id: true, name: true, projectId: true, companyId: true },
  });
  const shops = allShops.filter((s) => {
    const nameNorm = (s.name || '').trim().toLowerCase().replace(/'/g, '');
    return searchTerms.some((term) => nameNorm.includes(term) || nameNorm === term);
  });

  if (shops.length === 0) {
    console.log('No shops found matching (case-insensitive):', namesToDelete.join(', '));
    if (allShops.length > 0) {
      console.log('Existing shop names:', allShops.map((s) => s.name).join(', '));
    }
    process.exit(0);
  }

  console.log('Found shops to delete:', shops.map((s) => `${s.name} (id=${s.id})`).join(', '));

  const publicPath = getPublicPath();

  for (const shop of shops) {
    const shopId = shop.id;
    const projectId = shop.projectId;
    const companyId = shop.companyId;

    if (companyId == null) {
      console.warn(`Shop "${shop.name}" (id=${shopId}) has no companyId; skipping ad file cleanup.`);
    } else {
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
                console.log('  Deleted ad file from Supabase:', ad.id);
              }
            } else {
              const urlParts = ad.publicUrl.split('/');
              const filename = urlParts[urlParts.length - 1];
              const filePath = join(publicPath, 'companies', String(companyId), 'ads', filename);
              if (existsSync(filePath)) {
                await unlink(filePath);
                console.log('  Deleted ad file from filesystem:', filePath);
              }
            }
          }
        } catch (err) {
          console.warn('  Error deleting ad file:', ad.id, err);
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

    console.log('Deleted shop:', shop.name, '(id=' + shopId + ')');
  }

  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
