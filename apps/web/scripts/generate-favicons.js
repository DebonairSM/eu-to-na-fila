#!/usr/bin/env node

/**
 * Generate PNG favicon and icon files from SVG
 * 
 * Usage:
 *   node scripts/generate-favicons.js
 * 
 * Requires: sharp (install with: npm install --save-dev sharp)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const publicDir = join(__dirname, '../public');
const svgPath = join(publicDir, 'favicon.svg');

async function generateIcons() {
  try {
    // Try to import sharp
    const sharp = (await import('sharp')).default;
    
    console.log('📸 Generating favicon PNGs from SVG...');
    
    // Read SVG
    const svgBuffer = readFileSync(svgPath);
    
    // Generate favicon.png (32x32) with transparent background
    const favicon32 = await sharp(svgBuffer)
      .resize(32, 32)
      .ensureAlpha()
      .png()
      .toBuffer();
    writeFileSync(join(publicDir, 'favicon.png'), favicon32);
    console.log('✅ Generated favicon.png (32x32)');
    
    // Generate icon-192.png with transparent background
    const icon192 = await sharp(svgBuffer)
      .resize(192, 192)
      .ensureAlpha()
      .png()
      .toBuffer();
    writeFileSync(join(publicDir, 'icon-192.png'), icon192);
    console.log('✅ Generated icon-192.png (192x192)');
    
    // Generate icon-512.png with transparent background
    const icon512 = await sharp(svgBuffer)
      .resize(512, 512)
      .ensureAlpha()
      .png()
      .toBuffer();
    writeFileSync(join(publicDir, 'icon-512.png'), icon512);
    console.log('✅ Generated icon-512.png (512x512)');
    
    console.log('\n✨ All icons generated successfully!');
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && error.message.includes('sharp')) {
      console.error('❌ Error: sharp not found');
      console.error('\nPlease install sharp first:');
      console.error('  npm install --save-dev sharp');
      console.error('  or');
      console.error('  pnpm add -D sharp');
      console.error('\nAlternatively, you can use ImageMagick:');
      console.error('  convert -background none -resize 32x32 public/favicon.svg public/favicon.png');
      console.error('  convert -background none -resize 192x192 public/favicon.svg public/icon-192.png');
      console.error('  convert -background none -resize 512x512 public/favicon.svg public/icon-512.png');
      process.exit(1);
    } else {
      console.error('❌ Error generating icons:', error.message);
      process.exit(1);
    }
  }
}

generateIcons();


