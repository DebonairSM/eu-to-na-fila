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

  // Show statistics
  const activeBarbers = barbers.filter(b => b.isActive);
  const inactiveBarbers = barbers.filter(b => !b.isActive);
  
  console.log(`\n📊 Barber Statistics:`);
  console.log(`   - Total barbers: ${barbers.length}`);
  console.log(`   - Active: ${activeBarbers.length}`);
  console.log(`   - Inactive: ${inactiveBarbers.length}`);

  // Assign avatars in rotation (barber-1.png through barber-4.png)
  const avatarUrls = [
    '/mineiro/avatars/barber-1.png',
    '/mineiro/avatars/barber-2.png',
    '/mineiro/avatars/barber-3.png',
    '/mineiro/avatars/barber-4.png',
  ];

  let assignedCount = 0;
  let overwrittenCount = 0;

  console.log(`\n🔄 Assigning avatars to all ${barbers.length} barber(s)...\n`);

  for (let i = 0; i < barbers.length; i++) {
    const barber = barbers[i];
    const avatarUrl = avatarUrls[i % avatarUrls.length];
    const hadAvatar = !!barber.avatarUrl;

    // Update all barbers, overwriting existing avatars
    await db
      .update(schema.barbers)
      .set({ 
        avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(schema.barbers.id, barber.id));

    if (hadAvatar) {
      console.log(`🔄 Overwrote avatar for ${barber.name} (ID: ${barber.id}) - was: ${barber.avatarUrl}`);
      overwrittenCount++;
    } else {
      console.log(`✅ Assigned ${avatarUrl} to ${barber.name} (ID: ${barber.id})`);
      assignedCount++;
    }
  }

  console.log('\n🎉 Avatar assignment complete!');
  console.log(`   - Newly assigned: ${assignedCount} barber(s)`);
  console.log(`   - Overwritten: ${overwrittenCount} barber(s)`);
  console.log(`   - Total updated: ${assignedCount + overwrittenCount} barber(s)`);
}

assignAvatars()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error assigning avatars:', err);
    process.exit(1);
  });

