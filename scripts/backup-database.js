#!/usr/bin/env node

/**
 * Database Backup Script
 * 
 * Creates compressed backups of the SQLite database and optionally uploads to cloud storage.
 * Run daily via cron: 0 3 * * * node scripts/backup-database.js
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const DB_PATH = process.env.DATA_PATH || join(__dirname, '../data/eutonafila.sqlite');
const BACKUP_DIR = process.env.BACKUP_DIR || join(__dirname, '../backups');
const KEEP_DAYS = parseInt(process.env.BACKUP_KEEP_DAYS || '30', 10);
const CLOUD_BACKUP = process.env.CLOUD_BACKUP_ENABLED === 'true';

// Cloud storage configuration (if enabled)
const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION || 'us-east-1';

/**
 * Create backup directory if it doesn't exist
 */
function ensureBackupDir() {
  try {
    mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`✅ Backup directory ready: ${BACKUP_DIR}`);
  } catch (error) {
    console.error('❌ Failed to create backup directory:', error);
    process.exit(1);
  }
}

/**
 * Create a compressed backup of the database
 */
async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const backupFilename = `eutonafila-${timestamp}.sqlite.gz`;
  const backupPath = join(BACKUP_DIR, backupFilename);

  try {
    console.log(`📦 Creating backup: ${backupFilename}`);
    
    // Read database file
    const source = createReadStream(DB_PATH);
    const gzip = createGzip();
    const destination = createWriteStream(backupPath);

    // Compress and write
    await pipeline(source, gzip, destination);

    const stats = statSync(backupPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`✅ Backup created: ${backupFilename} (${sizeMB} MB)`);
    return backupPath;
  } catch (error) {
    console.error('❌ Backup creation failed:', error);
    throw error;
  }
}

/**
 * Upload backup to S3 (optional)
 */
async function uploadToS3(backupPath) {
  if (!CLOUD_BACKUP || !S3_BUCKET) {
    console.log('⏭️  Cloud backup disabled (set CLOUD_BACKUP_ENABLED=true and S3_BUCKET)');
    return;
  }

  try {
    // Import AWS SDK dynamically
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    
    console.log(`☁️  Uploading to S3 bucket: ${S3_BUCKET}`);
    
    const client = new S3Client({ region: S3_REGION });
    const fileContent = readFileSync(backupPath);
    const key = `backups/${new Date().getFullYear()}/${backupPath.split('/').pop()}`;
    
    await client.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: fileContent,
      ContentType: 'application/gzip',
      ServerSideEncryption: 'AES256',
    }));
    
    console.log(`✅ Backup uploaded to S3: ${key}`);
  } catch (error) {
    console.error('❌ S3 upload failed:', error);
    console.error('   Backup is still available locally at:', backupPath);
  }
}

/**
 * Clean up old backups
 */
function cleanupOldBackups() {
  try {
    const files = readdirSync(BACKUP_DIR);
    const now = Date.now();
    const maxAge = KEEP_DAYS * 24 * 60 * 60 * 1000;
    
    let deletedCount = 0;
    
    for (const file of files) {
      if (!file.endsWith('.sqlite.gz')) continue;
      
      const filePath = join(BACKUP_DIR, file);
      const stats = statSync(filePath);
      const age = now - stats.mtimeMs;
      
      if (age > maxAge) {
        unlinkSync(filePath);
        deletedCount++;
        console.log(`🗑️  Deleted old backup: ${file}`);
      }
    }
    
    if (deletedCount === 0) {
      console.log(`✅ No old backups to clean (keeping ${KEEP_DAYS} days)`);
    } else {
      console.log(`✅ Cleaned up ${deletedCount} old backup(s)`);
    }
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

/**
 * Send notification (optional)
 */
async function sendNotification(success, message) {
  const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL;
  
  if (!NOTIFICATION_EMAIL) {
    return;
  }

  // This would integrate with your email service
  // For now, just log it
  console.log(`📧 Would send notification to ${NOTIFICATION_EMAIL}: ${message}`);
}

/**
 * Main backup function
 */
async function main() {
  const startTime = Date.now();
  
  console.log('═══════════════════════════════════════');
  console.log('  Database Backup Script');
  console.log(`  Started at: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════');
  
  try {
    // Ensure backup directory exists
    ensureBackupDir();
    
    // Create backup
    const backupPath = await createBackup();
    
    // Upload to cloud storage
    await uploadToS3(backupPath);
    
    // Clean up old backups
    cleanupOldBackups();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const message = `Backup completed successfully in ${duration}s`;
    
    console.log('═══════════════════════════════════════');
    console.log(`✅ ${message}`);
    console.log('═══════════════════════════════════════');
    
    await sendNotification(true, message);
    
    process.exit(0);
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const message = `Backup failed after ${duration}s: ${error.message}`;
    
    console.log('═══════════════════════════════════════');
    console.error(`❌ ${message}`);
    console.log('═══════════════════════════════════════');
    
    await sendNotification(false, message);
    
    process.exit(1);
  }
}

// Run backup
main();

