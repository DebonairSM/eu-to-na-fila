#!/usr/bin/env node

/**
 * integrate-web.js
 * 
 * Copies the built web app from apps/web/dist to apps/api/public/mineiro
 * Run this after building the web app and before building the API.
 */

import { cp, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = join(__dirname, '..');
const webDistDir = join(rootDir, 'apps/web/dist');
const apiPublicDir = join(rootDir, 'apps/api/public/mineiro');

async function integrate() {
  console.log('🔄 Integrating web app into API...');

  // Check if web dist exists
  if (!existsSync(webDistDir)) {
    console.error('❌ Error: apps/web/dist does not exist. Run "pnpm build:web" first.');
    process.exit(1);
  }

  // Create public directory if it doesn't exist
  const publicDir = join(rootDir, 'apps/api/public');
  if (!existsSync(publicDir)) {
    await mkdir(publicDir, { recursive: true });
    console.log('✅ Created apps/api/public directory');
  }

  // Copy web dist to api public/mineiro
  try {
    await cp(webDistDir, apiPublicDir, { recursive: true, force: true });
    console.log('✅ Copied apps/web/dist to apps/api/public/mineiro');
  } catch (error) {
    console.error('❌ Error copying files:', error);
    process.exit(1);
  }

  console.log('🎉 Integration complete!');
}

integrate().catch(console.error);

