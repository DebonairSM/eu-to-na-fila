#!/usr/bin/env node

/**
 * integrate-web.js
 * 
 * Copies the built React app from apps/web/dist to apps/api/public/mineiro
 * Run this after building the web app and before building the API.
 */

import { cp, mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = join(__dirname, '..');
const webDistDir = join(rootDir, 'apps/web/dist');
const webDistRootDir = join(webDistDir, 'root');
const apiPublicDir = join(rootDir, 'apps/api/public/mineiro');
const apiPublicRootDir = join(rootDir, 'apps/api/public/root');

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

  // Remove old files (HTML mockups) if they exist
  if (existsSync(apiPublicDir)) {
    try {
      await rm(apiPublicDir, { recursive: true, force: true });
      console.log('🧹 Cleaned old files from apps/api/public/mineiro');
    } catch (error) {
      console.warn('⚠️  Warning: Could not clean old files:', error);
    }
  }

  // Copy web dist to api public/mineiro
  try {
    await cp(webDistDir, apiPublicDir, { recursive: true, force: true });
    console.log('✅ Copied React app from apps/web/dist to apps/api/public/mineiro');
  } catch (error) {
    console.error('❌ Error copying files:', error);
    process.exit(1);
  }

  // Copy root build if it exists
  if (existsSync(webDistRootDir)) {
    // Remove old root files if they exist
    if (existsSync(apiPublicRootDir)) {
      try {
        await rm(apiPublicRootDir, { recursive: true, force: true });
        console.log('🧹 Cleaned old files from apps/api/public/root');
      } catch (error) {
        console.warn('⚠️  Warning: Could not clean old root files:', error);
      }
    }

    try {
      await cp(webDistRootDir, apiPublicRootDir, { recursive: true, force: true });
      console.log('✅ Copied root homepage from apps/web/dist/root to apps/api/public/root');
    } catch (error) {
      console.error('❌ Error copying root files:', error);
      process.exit(1);
    }
  } else {
    console.log('⚠️  Warning: Root build not found. Run "pnpm build:root" to build root homepage.');
  }

  console.log('🎉 Integration complete!');
}

integrate().catch(console.error);

