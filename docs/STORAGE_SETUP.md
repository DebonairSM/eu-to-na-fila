# Storage Setup Guide

This guide explains how file storage works for ad uploads in the Eu To Na Fila system.

## Overview

The system uses **local file storage** by default. No configuration is required - it works out of the box.

## How It Works

Files are stored directly on the server in:
```
apps/api/public/companies/<company-id>/ads/<ad-id>.<ext>
```

Files are served directly by the Fastify static file server at:
```
/companies/<company-id>/ads/<ad-id>.<ext>
```

## File Structure

When you upload an ad:
1. File is saved to `public/companies/<company-id>/ads/<ad-id>.<ext>`
2. The database stores the relative path: `/companies/<company-id>/ads/<ad-id>.<ext>`
3. Files are served statically by the web server

## Limitations

### Cloud Deployments (Render, Heroku, etc.)

**Important:** On cloud platforms like Render, the filesystem is **ephemeral**. This means:
- Files are lost when the service is redeployed
- Files are lost if the service restarts
- Files are lost if the container is recreated

**Solutions:**
- For production, you may need to re-upload ads after each redeploy
- Consider using a persistent volume (if your platform supports it)
- For true persistence, you would need to implement cloud storage (not currently implemented)

### Local Development

Local storage works perfectly for development:
- Files persist between server restarts
- No additional setup required
- Easy to test and develop

## Testing

After uploading an ad:
1. Check that the file exists in `apps/api/public/companies/<company-id>/ads/`
2. Verify the file is accessible via the URL shown in the Ad Management page
3. Check that the ad appears in the kiosk mode rotation

## Troubleshooting

### Files not appearing after upload
- Check that the `public/companies/` directory exists
- Verify file permissions allow the server to write files
- Check server logs for file write errors

### Files not accessible via URL
- Ensure static file serving is configured (should be automatic)
- Check that the file path in the database matches the actual file location
- Verify the file exists in the filesystem

### Files lost after redeploy (Render/Cloud)
- This is expected behavior on ephemeral filesystems
- Re-upload ads after each deployment
- Consider implementing cloud storage for production use
