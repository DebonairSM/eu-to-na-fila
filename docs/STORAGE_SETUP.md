# Storage Setup Guide

This guide explains how file storage works for ad uploads in the Eu To Na Fila system.

## Overview

The system supports **Supabase Storage** (recommended for production) and **local file storage** (for development). Supabase Storage is configured by default and provides persistent, CDN-backed storage for ad files.

## Storage Options

### Supabase Storage (Recommended for Production)

**Benefits:**
- Persistent storage that survives deployments
- CDN-backed URLs for fast global delivery
- Public read access for kiosk display
- Automatic file management

**Setup:**

1. **Create Storage Bucket:**
   - The `company-ads` bucket is created automatically via database migration
   - Bucket is configured with public read access for kiosk display

2. **Configure Environment Variables:**
   - `SUPABASE_URL`: Your Supabase project URL (e.g., `https://<project-ref>.supabase.co`)
   - `SUPABASE_SERVICE_ROLE_KEY`: Service role key from Supabase dashboard (Settings > API)

3. **How It Works:**
   - Files are uploaded to Supabase Storage at: `companies/<company-id>/ads/<ad-id>.<ext>`
   - The database stores the Supabase public URL (CDN-backed)
   - Media endpoint redirects to Supabase URLs for optimal performance

### Local File Storage (Development Fallback)

If Supabase is not configured, the system falls back to local filesystem storage:

**How It Works:**
- Files are stored directly on the server in:
  ```
  apps/api/public/companies/<company-id>/ads/<ad-id>.<ext>
  ```
- Files are served by the Fastify static file server at:
  ```
  /companies/<company-id>/ads/<ad-id>.<ext>
  ```

**Limitations:**
- On cloud platforms like Render, the filesystem is **ephemeral**
- Files are lost when the service is redeployed, restarts, or container is recreated
- **Not recommended for production** - use Supabase Storage instead

### Local Development

Local storage works perfectly for development:
- Files persist between server restarts
- No additional setup required
- Easy to test and develop

## Testing

After uploading an ad:
1. **If using Supabase Storage:**
   - Check the Ad Management page - the URL should be a Supabase CDN URL
   - Verify the file is accessible via the public URL
   - Check that the ad appears in the kiosk mode rotation
2. **If using local storage:**
   - Check that the file exists in `apps/api/public/companies/<company-id>/ads/`
   - Verify the file is accessible via the URL shown in the Ad Management page
   - Check that the ad appears in the kiosk mode rotation

## Troubleshooting

### Files not appearing after upload (Supabase Storage)
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set correctly
- Check that the `company-ads` bucket exists in Supabase dashboard
- Verify bucket policies allow public read access
- Check server logs for upload errors

### Files not appearing after upload (Local Storage)
- Check that the `public/companies/` directory exists
- Verify file permissions allow the server to write files
- Check server logs for file write errors

### Files not accessible via URL (Supabase Storage)
- Verify the public URL in the database is a valid Supabase URL
- Check that the bucket has public read access enabled
- Verify the file exists in Supabase Storage dashboard

### Files not accessible via URL (Local Storage)
- Ensure static file serving is configured (should be automatic)
- Check that the file path in the database matches the actual file location
- Verify the file exists in the filesystem

### Files lost after redeploy (Local Storage on Render/Cloud)
- This is expected behavior on ephemeral filesystems
- **Solution:** Configure Supabase Storage for persistent storage
- Re-upload ads after each deployment if using local storage
