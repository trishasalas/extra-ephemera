# Session Log: Netlify Blobs Storage Fixes
**Date:** 2025-12-27
**Focus:** Fix blob storage to work correctly in both local dev and production

## Problem Statement
Blobs uploaded during local development (`netlify dev`) were being stored locally in `.netlify/blobs-serve/` and not syncing to production. Blobs weren't appearing in the Netlify UI and couldn't be accessed from the production site.

## Root Cause
The default behavior of `netlify dev` is to use local blob storage for development. Without proper configuration, blobs uploaded locally remain local and don't persist to the production Netlify Blobs store.

## Changes Made

### 1. Configure Production Blobs for Local Dev
**File:** `netlify.toml`

**Before:**
```toml
[dev]
  # Uncomment the next line to use production blobs during local dev
  # blobsContext = "deploy"
```

**After:**
```toml
[dev]
  # Use production blobs during local dev (requires `netlify link` and authenticated session)
  # This ensures blobs uploaded locally go to production storage
  blobsContext = "deploy"
```

**Impact:** Local uploads now write directly to production blob storage instead of local filesystem.

### 2. Fix File Upload Handling
**File:** `netlify/functions/upload-photo.mjs`

**Changes:**
- Convert `File` object to `ArrayBuffer` before storing in blobs
- Simplified blob store initialization (removed unnecessary options)
- Added console logging for debugging
- Fixed URL generation to always use production URL

**Code:**
```javascript
// Convert File to ArrayBuffer for blob store
const arrayBuffer = await file.arrayBuffer();

// Upload to blob store
await photoStore.set(blobKey, arrayBuffer, {
    metadata: { /* ... */ }
});

// Always use production URL
const productionUrl = process.env.URL || 'https://extra-ephemera.netlify.app';
const blobUrl = `${productionUrl}/api/photos/${blobKey}`;
```

### 3. Fix Blob Retrieval
**File:** `netlify/functions/serve-photo.mjs`

**Changes:**
- Use `arrayBuffer` type when retrieving blobs (not `blob`)
- Simplified blob store initialization
- Added console logging for debugging

**Code:**
```javascript
const photoStore = getStore('plant-photos');
const blobData = await photoStore.getWithMetadata(blobKey, { type: 'arrayBuffer' });
```

### 4. Preserve Netlify Functions
**File:** `astro.config.mjs`

**Issue:** Astro was in `output: 'server'` mode which bundled everything into a single SSR function, removing individual Netlify functions.

**Before:**
```javascript
export default defineConfig({
    output: 'server',
    adapter: netlify(),
});
```

**After:**
```javascript
export default defineConfig({
    output: 'static',
    adapter: netlify(),
});
```

**Impact:** Individual Netlify functions are now preserved and work correctly.

## How It Works Now

### Local Development (`netlify dev`):
1. User uploads photo via web form
2. Browser sends to `http://localhost:8888/api/plants/upload-photo`
3. Function converts File → ArrayBuffer
4. Blob is stored in **production** Netlify Blobs (via `blobsContext = "deploy"`)
5. Function returns production URL: `https://extra-ephemera.netlify.app/api/photos/plant-X.jpg`
6. URL is saved to database
7. Image is immediately accessible from production URL

### Production:
1. User uploads photo via web form
2. Browser sends to `https://extra-ephemera.netlify.app/api/plants/upload-photo`
3. Function converts File → ArrayBuffer
4. Blob is stored in production Netlify Blobs
5. Function returns production URL
6. URL is saved to database
7. Image is served via `/api/photos/*` endpoint

## Key Learnings

1. **`blobsContext` setting is critical:** Without it, local and production have separate blob stores
2. **File type conversion:** Netlify Blobs expects `ArrayBuffer`, not raw `File` objects
3. **URL generation:** Must always generate production URLs, not localhost URLs, for database persistence
4. **Astro output mode:** `server` mode interferes with individual Netlify functions

## Testing
- ✅ Blobs now appear in Netlify UI
- ✅ Local uploads persist to production
- ✅ Production uploads work correctly
- ✅ Image URLs are always production URLs
- ✅ Blobs are retrievable from `/api/photos/*` endpoint

## Files Modified
- `netlify.toml` - Added `blobsContext = "deploy"`
- `netlify/functions/upload-photo.mjs` - File → ArrayBuffer conversion, URL fixes, logging
- `netlify/functions/serve-photo.mjs` - ArrayBuffer retrieval, logging
- `astro.config.mjs` - Changed to `output: 'static'`
