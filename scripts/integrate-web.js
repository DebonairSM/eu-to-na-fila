#!/usr/bin/env node

/**
 * integrate-web.js
 * 
 * Copies HTML mockups from mockups/ to apps/api/public/mineiro
 * Run this after building the web app and before building the API.
 */

import { cp, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = join(__dirname, '..');
const mockupsDir = join(rootDir, 'mockups');
const apiPublicDir = join(rootDir, 'apps/api/public/mineiro');

async function integrate() {
  console.log('🔄 Integrating HTML mockups into API...');

  // Check if mockups directory exists
  if (!existsSync(mockupsDir)) {
    console.error('❌ Error: mockups/ directory does not exist.');
    process.exit(1);
  }

  // Create public directory if it doesn't exist
  const publicDir = join(rootDir, 'apps/api/public');
  if (!existsSync(publicDir)) {
    await mkdir(publicDir, { recursive: true });
    console.log('✅ Created apps/api/public directory');
  }

  // Create mineiro directory if it doesn't exist
  if (!existsSync(apiPublicDir)) {
    await mkdir(apiPublicDir, { recursive: true });
  }

  // Copy HTML files and favicon, excluding archive folder and README
  try {
    const files = await readdir(mockupsDir);
    
    for (const file of files) {
      const sourcePath = join(mockupsDir, file);
      const destPath = join(apiPublicDir, file);
      
      // Skip archive folder and README
      if (file === 'archive' || file === 'README.md') {
        continue;
      }
      
      await cp(sourcePath, destPath, { recursive: true, force: true });
    }
    
    console.log('✅ Copied HTML mockups to apps/api/public/mineiro');
  } catch (error) {
    console.error('❌ Error copying files:', error);
    process.exit(1);
  }

  console.log('🎉 Integration complete!');
}

integrate().catch(console.error);

