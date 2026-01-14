# Storage Setup Guide

This guide explains how to configure object storage for ad uploads in the Eu To Na Fila system.

## Overview

The system uses S3-compatible object storage to store ad images and videos. Supported providers:
- **AWS S3** - Amazon Web Services Simple Storage Service
- **Cloudflare R2** - Cloudflare's S3-compatible object storage
- **MinIO** - Self-hosted S3-compatible storage

## Configuration

All storage configuration is done via environment variables in `.env`:

```bash
STORAGE_PROVIDER=s3              # 's3', 'r2', or 'minio'
STORAGE_ENDPOINT=                # Required for R2/MinIO, optional for S3
STORAGE_REGION=us-east-1         # AWS region or R2 region
STORAGE_BUCKET=eutonafila-ads    # Bucket name
STORAGE_ACCESS_KEY_ID=...        # Access key
STORAGE_SECRET_ACCESS_KEY=...    # Secret key
STORAGE_PUBLIC_BASE_URL=...      # Public URL for accessing files
```

## Setup Options

### Option 1: AWS S3

1. **Create an S3 bucket:**
   - Go to AWS Console > S3
   - Create a new bucket (e.g., `eutonafila-ads`)
   - Choose a region (e.g., `us-east-1`)

2. **Configure bucket permissions:**
   - Enable public read access for the bucket (or use CloudFront CDN)
   - Or keep private and use CloudFront with signed URLs

3. **Create IAM user:**
   - Go to IAM > Users > Create user
   - Attach policy: `AmazonS3FullAccess` (or create custom policy for your bucket only)
   - Create access key and save credentials

4. **Set environment variables:**
   ```bash
   STORAGE_PROVIDER=s3
   STORAGE_REGION=us-east-1
   STORAGE_BUCKET=eutonafila-ads
   STORAGE_ACCESS_KEY_ID=AKIA...
   STORAGE_SECRET_ACCESS_KEY=...
   STORAGE_PUBLIC_BASE_URL=https://eutonafila-ads.s3.us-east-1.amazonaws.com
   ```

### Option 2: Cloudflare R2

1. **Create R2 bucket:**
   - Go to Cloudflare Dashboard > R2
   - Create a new bucket (e.g., `eutonafila-ads`)

2. **Create API token:**
   - Go to R2 > Manage R2 API Tokens
   - Create token with read/write permissions
   - Save the credentials

3. **Configure public access (optional):**
   - Enable public access or use a custom domain
   - Note the public URL

4. **Set environment variables:**
   ```bash
   STORAGE_PROVIDER=r2
   STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   STORAGE_REGION=auto
   STORAGE_BUCKET=eutonafila-ads
   STORAGE_ACCESS_KEY_ID=...
   STORAGE_SECRET_ACCESS_KEY=...
   STORAGE_PUBLIC_BASE_URL=https://<your-domain>.r2.dev
   ```

### Option 3: MinIO (Local Development)

1. **Install MinIO:**
   ```bash
   # Using Docker
   docker run -d \
     -p 9000:9000 \
     -p 9001:9001 \
     -e "MINIO_ROOT_USER=minioadmin" \
     -e "MINIO_ROOT_PASSWORD=minioadmin" \
     minio/minio server /data --console-address ":9001"
   ```

2. **Create bucket:**
   - Access MinIO Console at http://localhost:9001
   - Login with `minioadmin` / `minioadmin`
   - Create a bucket (e.g., `eutonafila-ads`)

3. **Create access key:**
   - Go to Access Keys > Create Access Key
   - Save the credentials

4. **Set environment variables:**
   ```bash
   STORAGE_PROVIDER=minio
   STORAGE_ENDPOINT=http://localhost:9000
   STORAGE_REGION=us-east-1
   STORAGE_BUCKET=eutonafila-ads
   STORAGE_ACCESS_KEY_ID=...
   STORAGE_SECRET_ACCESS_KEY=...
   STORAGE_PUBLIC_BASE_URL=http://localhost:9000/eutonafila-ads
   ```

## Testing Configuration

After configuring storage, test the setup:

1. **Start the API server:**
   ```bash
   cd apps/api
   pnpm dev
   ```

2. **Try uploading an ad:**
   - Log in as company admin
   - Go to Ad Management page
   - Upload an image
   - Check that the file appears in your storage bucket

## Production Considerations

### Security
- Never commit `.env` files to version control
- Use IAM roles/policies with least privilege
- Consider using CloudFront or CDN for public access
- Enable bucket versioning for backup

### Performance
- Use CloudFront (AWS) or CDN for faster delivery
- Enable compression for images/videos
- Consider image optimization before upload

### Cost Optimization
- Use lifecycle policies to archive old ads
- Enable intelligent tiering (AWS S3)
- Monitor storage usage and costs

## Troubleshooting

### "Access Denied" errors
- Check IAM user permissions
- Verify bucket policy allows read/write
- Ensure access keys are correct

### "Bucket not found" errors
- Verify bucket name matches exactly
- Check region is correct
- Ensure bucket exists in the specified region

### Files not publicly accessible
- Check bucket public access settings
- Verify `STORAGE_PUBLIC_BASE_URL` is correct
- For private buckets, use CloudFront with signed URLs
