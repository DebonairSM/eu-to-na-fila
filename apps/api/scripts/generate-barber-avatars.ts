#!/usr/bin/env tsx

/**
 * Generate barber avatars using DiceBear
 * Creates 16 unique male-only avatar images and saves them to apps/web/public/avatars/
 */

import { createAvatar } from '@dicebear/core';
import { create, schema } from '@dicebear/avataaars';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = join(__dirname, '..', '..', '..');
const avatarsDir = join(rootDir, 'apps', 'web', 'public', 'avatars');

async function generateAvatars() {
  console.log('🎨 Generating barber avatars...');

  // Ensure avatars directory exists
  if (!existsSync(avatarsDir)) {
    await mkdir(avatarsDir, { recursive: true });
    console.log(`✅ Created directory: ${avatarsDir}`);
  }

  // Generate 16 unique avatars with random seeds
  // Using only male hairstyles to ensure all barbers are male
  const maleHairstyles = [
    'shavedSides',
    'shortCurly',
    'shortFlat',
    'shortRound',
    'shortWaved',
    'sides',
    'theCaesar',
    'theCaesarAndSidePart',
    'dreads',
    'dreads01',
    'dreads02',
    'fro',
    'froBand',
    'shaggy',
    'shaggyMullet',
    'hat',
    'turban',
    'winterHat1',
    'winterHat02',
    'winterHat03',
    'winterHat04',
  ];
  
  // Generate 16 avatars to have good variety
  const avatarCount = 16;
  const seeds = Array.from({ length: avatarCount }, (_, i) => `barber-${i + 1}`);
  
  for (let i = 0; i < avatarCount; i++) {
    const seed = seeds[i];
    // Use a different male hairstyle for each avatar, cycling through all available styles
    const topStyle = maleHairstyles[i % maleHairstyles.length];
    
    const avatar = createAvatar({ create, schema }, {
      seed,
      size: 256,
      // Restrict to male hairstyles only
      top: [topStyle],
    });

    const png = avatar.png();
    const filePath = join(avatarsDir, `${seed}.png`);
    
    // avatar.png() returns an object with toArrayBuffer() method in v7
    const arrayBuffer = await png.toArrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filePath, buffer);
    console.log(`✅ Generated: ${seed}.png`);
  }

  console.log('🎉 Avatar generation complete!');
  console.log(`📁 ${avatarCount} avatars saved to: ${avatarsDir}`);
}

generateAvatars()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error generating avatars:', err);
    process.exit(1);
  });

