#!/usr/bin/env tsx

/**
 * Assign avatars to existing barbers
 * Assigns barber-1.png through barber-4.png to existing barbers in rotation
 */

import { db, schema } from '../src/db/index.js';
import { eq } from 'drizzle-orm';

async function assignAvatars() {
  console.log('🎨 Assigning avatars to existing barbers...');

  // Get all barbers
  const barbers = await db.query.barbers.findMany({
    orderBy: (barbers, { asc }) => [asc(barbers.id)],
  });

  if (barbers.length === 0) {
    console.log('⚠️  No barbers found in the database.');
    console.log('💡 Run "pnpm db:seed" to create barbers first.');
    process.exit(0);
  }

  console.log(`Found ${barbers.length} barber(s)`);

  // Assign avatars in rotation (barber-1.png through barber-4.png)
  const avatarUrls = [
    '/mineiro/avatars/barber-1.png',
    '/mineiro/avatars/barber-2.png',
    '/mineiro/avatars/barber-3.png',
    '/mineiro/avatars/barber-4.png',
  ];

  let assignedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < barbers.length; i++) {
    const barber = barbers[i];
    const avatarUrl = avatarUrls[i % avatarUrls.length];

    // Only update if barber doesn't already have an avatar
    if (!barber.avatarUrl) {
      await db
        .update(schema.barbers)
        .set({ 
          avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(schema.barbers.id, barber.id));

      console.log(`✅ Assigned ${avatarUrl} to ${barber.name} (ID: ${barber.id})`);
      assignedCount++;
    } else {
      console.log(`⏭️  Skipped ${barber.name} (ID: ${barber.id}) - already has avatar: ${barber.avatarUrl}`);
      skippedCount++;
    }
  }

  console.log('\n🎉 Avatar assignment complete!');
  console.log(`   - Assigned: ${assignedCount} barber(s)`);
  console.log(`   - Skipped: ${skippedCount} barber(s) (already had avatars)`);
}

assignAvatars()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error assigning avatars:', err);
    process.exit(1);
  });

