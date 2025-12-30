# Session Log: Gallery Page with Cloudinary Assets

**Date:** December 30, 2025
**Focus:** Building a gallery page to display images from Cloudinary, troubleshooting astro-cloudinary loader issues

## Overview

Added a gallery page to display images stored in Cloudinary's `gallery` folder. Initially attempted to use `astro-cloudinary`'s `cldAssetsLoader` content collection loader, but encountered persistent "Not Found" errors. Ultimately bypassed the loader and implemented a cached JSON approach that fetches metadata on-demand and reads from local cache during builds.

## What Didn't Work: cldAssetsLoader

### The Problem

The `astro-cloudinary` package provides a `cldAssetsLoader` for Astro's content collections that should fetch images from Cloudinary at build time. Despite having correct credentials and folder names, it consistently returned "Not Found" errors.

### Troubleshooting Steps

1. **Wrong folder name** - Initially configured as `homegallery`, but actual Cloudinary folder was `gallery`
2. **Folder mode mismatch** - Tried adding `folderMode: 'dynamic'` since Cloudinary account uses dynamic folders (asset_folder as metadata, not in public_id)
3. **Direct API testing** - Verified credentials worked via curl:
   ```bash
   curl "https://API_KEY:API_SECRET@api.cloudinary.com/v1_1/CLOUD/resources/by_asset_folder?asset_folder=gallery"
   # Returned 66 images successfully
   ```
4. **Environment variable verification** - Confirmed all required vars were set:
   - `PUBLIC_CLOUDINARY_CLOUD_NAME`
   - `PUBLIC_CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

### Root Cause (Suspected)

The `cldAssetsLoader` uses `import.meta.env` to read environment variables during content collection sync. It appears these variables aren't being populated correctly during the Astro sync phase, even though they're properly set in `.env`. The loader first calls `/config?settings=true` which likely fails with undefined cloud name, cascading to "Not Found" errors.

### Lesson Learned

The astro-cloudinary content loader has environment variable loading issues during content sync. Direct API fetches in Astro frontmatter work fine, as do Netlify functions.

## What Worked: Cached JSON Approach

### Solution Architecture

1. **Refresh script** (`scripts/refresh-gallery.mjs`) - Fetches from Cloudinary API and saves metadata to JSON
2. **Local cache** (`src/data/gallery.json`) - Stores image metadata (no actual images)
3. **Gallery page** - Reads from local JSON, uses `CldImage` for optimized delivery

### Benefits

- Zero API calls during builds
- Build time reduced from 228ms to 82ms for gallery page
- Images still served from Cloudinary CDN with automatic optimization
- Manual refresh gives full control over when API calls happen

## Implementation Details

### Refresh Script

```javascript
// scripts/refresh-gallery.mjs
import { config } from 'dotenv';
import { writeFileSync } from 'fs';

config(); // Load .env

const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD}/resources/by_asset_folder?asset_folder=gallery`,
    { headers: { 'Authorization': `Basic ${auth}` } }
);

const data = await response.json();
// Save only needed fields to reduce file size
const images = data.resources.map(img => ({
    asset_id: img.asset_id,
    public_id: img.public_id,
    format: img.format,
    width: img.width,
    height: img.height,
    display_name: img.display_name,
    created_at: img.created_at,
}));

writeFileSync('src/data/gallery.json', JSON.stringify({ images, ... }));
```

### Gallery Page

```astro
---
import { CldImage } from 'astro-cloudinary';
import galleryData from '../data/gallery.json';

const gallery_images = galleryData.images;
---

{gallery_images.map((img) => (
    <CldImage
        src={img.public_id}
        width={img.width}
        height={img.height}
        alt={img.display_name || ''}
        sizes="25vw"
    />
))}
```

## Files Created

1. **`scripts/refresh-gallery.mjs`** - Fetches and caches Cloudinary metadata
2. **`src/data/gallery.json`** - Cached metadata (66 images)
3. **`src/pages/gallery.astro`** - Gallery page with responsive grid
4. **`docs/session-logs/2025-12-30-gallery-cloudinary-loader.md`** - This file

## Files Modified

1. **`src/content/config.ts`** - Removed non-working cldAssetsLoader collection
2. **`package.json`** - Added `refresh-gallery` script

## Usage

```bash
# Fetch latest images from Cloudinary (run when you add new photos)
npm run refresh-gallery

# Build uses cached JSON (zero API calls)
npm run build
```

## Cloudinary Folder Modes

Cloudinary has two folder modes:

1. **Fixed** (legacy) - Folder is part of `public_id` (e.g., `gallery/image.jpg`)
2. **Dynamic** - Folder is metadata only via `asset_folder`, `public_id` is flat (e.g., `image.jpg`)

This account uses **dynamic** mode. The correct API endpoint for dynamic folders is:
```
/resources/by_asset_folder?asset_folder=gallery
```

Not:
```
/resources/image?prefix=gallery  # This is for fixed mode
```

## Future Considerations

- Could add a GitHub Action to auto-refresh gallery on Cloudinary webhook
- May want pagination UI if gallery grows large
- Consider adding image lightbox/modal for full-size viewing
