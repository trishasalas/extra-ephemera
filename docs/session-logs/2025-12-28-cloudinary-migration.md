# Session Log: Cloudinary Migration

**Date:** December 28, 2025
**Focus:** Migrating photo storage from Netlify Blobs to Cloudinary

## Overview

Replaced Netlify Blobs with Cloudinary for plant photo storage. The migration was motivated by wanting more control over image naming (using plant slugs) and leveraging Cloudinary's CDN and image transformation capabilities.

## What Changed

### Before (Netlify Blobs)
- Photos stored in Netlify Blobs store named `plant-photos`
- File naming: `plant-{plantId}-{timestamp}.{extension}`
- Required a separate serve endpoint (`/api/photos/*`) to retrieve images
- URLs looked like: `https://extra-ephemera.netlify.app/api/photos/plant-42-1703000000.jpg`

### After (Cloudinary)
- Photos uploaded directly to Cloudinary CDN
- File naming: `mosslight-nook/{slug}` (e.g., `mosslight-nook/monstera-deliciosa`)
- No serve endpoint needed - Cloudinary URLs work directly
- URLs look like: `https://res.cloudinary.com/{cloud}/image/upload/mosslight-nook/monstera-deliciosa.jpg`

## Implementation Details

### Upload Function (`netlify/functions/upload-photo.mjs`)

Completely rewrote the upload function to use Cloudinary SDK:

```javascript
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Naming priority for public_id:
// 1. Plant's slug field
// 2. Slugified common_name
// 3. Slugified scientific_name
// 4. Fallback to plant-{id}

const imageSlug = slug
    || generateSlug(commonName)
    || generateSlug(scientificName)
    || `plant-${plantId}`;

const publicId = `mosslight-nook/${imageSlug}`;

// Upload with overwrite enabled (same slug replaces old image)
const result = await cloudinary.uploader.upload(dataUrl, {
    public_id: publicId,
    overwrite: true,
    resource_type: 'image',
});
```

### Client-Side Changes (`src/js/plant-detail.ts`)

Updated the upload FormData to include naming information:

```typescript
const uploadFormData = new FormData();
uploadFormData.append('photo', photoFile);
uploadFormData.append('plantId', currentPlant.id.toString());
// Include naming info for Cloudinary public_id
if (currentPlant.slug) {
    uploadFormData.append('slug', currentPlant.slug);
}
if (currentPlant.common_name) {
    uploadFormData.append('commonName', currentPlant.common_name);
}
uploadFormData.append('scientificName', currentPlant.scientific_name);
```

Also updated `UploadPhotoResponse` interface to include `imageUrl` and `publicId`.

### Slug Generation Helper

Added a helper function to generate URL-safe slugs from plant names:

```javascript
function generateSlug(text) {
    if (!text) return null;
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}
```

## Files Modified

1. **`netlify/functions/upload-photo.mjs`** - Complete rewrite for Cloudinary
2. **`src/js/plant-detail.ts`** - Added slug/name params to upload, updated response interface
3. **`CLAUDE.md`** - Updated documentation for Cloudinary setup

## Files Deleted

1. **`netlify/functions/serve-photo.mjs`** - No longer needed (Cloudinary serves directly)

## Dependencies

- **Added:** `cloudinary` (was already installed, v2.8.0)
- **Removed:** `@netlify/blobs` (uninstalled)

## Environment Variables

New required variables:
```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## TypeScript Learning

Fixed type errors by learning about the **nullish coalescing operator** (`??`):

```typescript
// Before (with @ts-ignore)
slug: currentPlant.slug,  // Error: undefined not assignable to string | null

// After (proper fix)
slug: currentPlant.slug ?? null,  // Converts undefined to null
```

The `??` operator only triggers on `null` or `undefined`, unlike `||` which triggers on any falsy value.

## Testing Notes

To test the upload:
1. Ensure `CLOUDINARY_API_SECRET` is in `.env`
2. Run `netlify dev`
3. Navigate to any plant detail page
4. Click "Edit Plant"
5. Select a photo and save
6. Check Cloudinary dashboard for `mosslight-nook/` folder

## Future Considerations

- Could leverage Cloudinary transformations for thumbnails
- May want to add cleanup for old/orphaned images
- Consider storing `publicId` in database for easier management
