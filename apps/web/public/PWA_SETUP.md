# PWA Icon Setup

The PWA manifest currently has no icons configured to avoid errors during development. For production deployment, you should add proper icons.

## Icon Files Needed for Production

1. **icon-192.png** (192x192 pixels)
   - Standard PWA icon for Android
   - Place in: `apps/web/public/icon-192.png`

2. **icon-512.png** (512x512 pixels)
   - High-res PWA icon for Android
   - Place in: `apps/web/public/icon-512.png`

## How to Create Icons

### Option 1: Use Existing favicon.svg

```bash
# Install imagemagick or use an online converter
# Convert favicon.svg to PNG at required sizes

# 192x192
convert -background none -resize 192x192 favicon.svg icon-192.png

# 512x512
convert -background none -resize 512x512 favicon.svg icon-512.png
```

### Option 2: Use Online Tool

1. Go to https://realfavicongenerator.net/
2. Upload your logo/icon
3. Download the generated PWA icons
4. Rename to `icon-192.png` and `icon-512.png`

### Option 3: Design Tool

Use Figma/Photoshop/Sketch:
- Create artboard 512x512
- Design icon with barbershop theme
- Export at 192x192 and 512x512
- Ensure icon works on both light and dark backgrounds

## Icon Design Guidelines

- **Simple and recognizable** - Must be clear even at small sizes
- **Brand colors** - Use barbershop theme (#8B4513 brown)
- **Contrast** - Works on both light and dark backgrounds
- **No text** - Icons shouldn't rely on text
- **Safe zone** - Keep important elements in center 80%

## Testing

After adding icons:

1. Run `pnpm build:web && pnpm integrate:web`
2. Start server: `pnpm start`
3. Open in Chrome on tablet
4. Menu > "Add to Home Screen"
5. Verify icon appears correctly

## Optional: Screenshots

For better PWA install experience, add screenshots:

- `apps/web/public/screenshot-queue.png` (1280x720)
- Shows main queue interface
- Used in app install dialog

## Adding Icons to Manifest

Once you've created the icon files, update `apps/web/public/manifest.json`:

```json
"icons": [
  {
    "src": "/projects/mineiro/icon-192.png",
    "sizes": "192x192",
    "type": "image/png",
    "purpose": "any maskable"
  },
  {
    "src": "/projects/mineiro/icon-512.png",
    "sizes": "512x512",
    "type": "image/png",
    "purpose": "any maskable"
  }
]
```

## Verification

Check manifest is valid:
1. Open DevTools > Application > Manifest
2. Verify all icons load
3. Check for manifest errors

