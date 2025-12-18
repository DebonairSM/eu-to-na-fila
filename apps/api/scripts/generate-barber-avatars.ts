#!/usr/bin/env tsx

/**
 * Generate barber avatars using DiceBear
 * Creates 4 random avatar images and saves them to apps/web/public/avatars/
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

  // Generate 4 unique avatars with random seeds
  const seeds = ['barber-1', 'barber-2', 'barber-3', 'barber-4'];
  
  for (let i = 0; i < 4; i++) {
    const seed = seeds[i];
    const avatar = createAvatar({ create, schema }, {
      seed,
      size: 256,
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
  console.log(`📁 Avatars saved to: ${avatarsDir}`);
}

generateAvatars()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error generating avatars:', err);
    process.exit(1);
  });

