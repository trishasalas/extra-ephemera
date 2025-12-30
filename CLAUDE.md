# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Extra Ephemera is "The Mosslight Nook Plant Catalog" - an Astro-based web application for managing a personal plant collection. It integrates with the Trefle plant API for searching plants and stores user's collection in a Neon Postgres database hosted on Netlify.

## Key Commands

```bash
# Development
npm run dev                    # Start Astro dev server at localhost:4321
netlify dev                    # Run with Netlify functions + database access (preferred for full-stack dev)

# Build & Preview
npm run build                  # Build for production to ./dist/
npm run preview                # Preview production build locally

# Gallery Management
npm run refresh-gallery        # Fetch gallery images from Cloudinary and cache locally

# Database Setup (first time only)
netlify db init --no-boilerplate   # Initialize Neon Postgres database
# Then apply schema: psql "connection-string" -f database/schema.sql
```

## Architecture

### Tech Stack
- **Frontend**: Astro 5.x with minimal JavaScript (vanilla JS, no framework)
- **Backend**: Netlify Functions (.mjs files using ES modules)
- **Database**: Neon Postgres via `@neondatabase/serverless`
- **Deployment**: Netlify (SSG + serverless functions)

### Directory Structure

```
src/
├── assets/          # CSS and static assets (style.css lives here)
├── components/      # Astro components
├── data/            # Cached data files (gallery.json)
├── layouts/         # Page layouts (Layout.astro with nav)
├── pages/           # Route pages (index, collection, add, plant, gallery)
└── js/              # Client-side JavaScript utilities

scripts/
└── refresh-gallery.mjs  # Fetches gallery images from Cloudinary API

netlify/
├── functions/       # Serverless API endpoints (.mjs files)
│   ├── add-plant.mjs           # POST /api/plants
│   ├── get-plants.mjs          # GET /api/plants/list
│   ├── get-plant.mjs           # GET /api/plants/:id
│   ├── update-plant.mjs        # PUT /api/plants/:id
│   ├── upload-photo.mjs        # POST /api/plants/upload-photo
│   ├── call-trefle.mjs         # GET /api/trefle?q=...
│   ├── call-perenual.mjs       # GET /api/perenual?q=...
│   └── call-perenual-care.mjs  # GET /api/perenual-care?species_id=...
└── utils/
    └── db.mjs       # Database connection helper (uses DATABASE_URL env var)

database/
├── schema.sql       # Complete Postgres schema with triggers
└── README.md        # Database setup instructions
```

### Database Schema

Four main tables (see `database/schema.sql` for full schema):

1. **plants** - Main plant records with:
   - API fields (scientific_name, common_name, family, genus, image_url, etc.)
   - Trefle metadata (author, bibliography, year, synonyms, trefle_id, slug)
   - Perenual tracking (perenual_id) - optional, for merged plants
   - Personal fields (nickname, location, acquired_date, status)
   - Flexible JSONB metadata field for arbitrary data including:
     - `source`: API source ('trefle', 'perenual', or merged)
     - `merged_from`: Array of sources for merged plants
     - `care`: Care information (water, light, pruning, humidity, soil, notes)
     - `patent`, `breeding`, `awards`: Cultivar-specific metadata
   - Auto-updating timestamps via triggers

2. **journal_entries** - Dated journal entries per plant (CASCADE on delete)

3. **stories** - Storybook entries (future feature stub)

4. **story_characters** - Links stories to plants (future feature stub)

### API Integration

**Trefle Plant API** (botanical accuracy):
- Token stored in `.env` as `VITE_TREFLE_API`
- Proxied through `/api/trefle` Netlify function to hide API key
- Used for searching plants and academic metadata
- Free tier available

**Perenual Plant API** (care guide data):
- Token stored in `.env` as `VITE_PERENUAL_API`
- Proxied through two Netlify functions:
  - `/api/perenual` - Species search endpoint
  - `/api/perenual-care` - Care guide endpoint (note: uses `/api/species-care-guide-list`, not `/api/v2/...`)
- Premium subscription: $50/month for 10,000 requests/day
- Provides watering, sunlight, pruning, and hardiness zone data
- Data normalized to match Trefle structure in backend

**PlantNet API** (for plant identification):
- Token stored in `.env` as `PLANTNET_API`
- Not currently integrated in UI

**Database Connection**:
- `DATABASE_URL` env var automatically set by Netlify DB
- Connection via `@neondatabase/serverless` (HTTP-based, not TCP)
- Helper function in `netlify/utils/db.mjs`

**Cloudinary** (photo uploads):
- Credentials stored in `.env` as `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Package: `cloudinary` (v2) for image upload and CDN delivery
- Proxied through `/api/plants/upload-photo` Netlify function
- Folder structure: `mosslight-nook/{slug}` for organized storage
- Naming priority: `slug` → slugified `common_name` → slugified `scientific_name` → `plant-{id}`
- Validates file types (JPEG, PNG, WebP, GIF) and size (5MB max)
- Images served directly from Cloudinary CDN (no serve endpoint needed)

### Function-Based Code Style

This codebase prefers **simple functions over classes**:
- All modules use function-based exports (no ES6 classes)
- TypeScript is used incrementally for type safety (interfaces, type annotations)
- Named exports for clarity
- Descriptive variable names (PHP-style preference)

### TypeScript Usage

TypeScript is enabled in Astro `<script>` tags and `.ts` files:
- Use `interface` to define data shapes (e.g., `Plant`, `TreflePlant`)
- Add type annotations to function parameters and return types
- Always check for `null` when using `getElementById` (returns `HTMLElement | null`)
- Astro compiles TypeScript away at build time, outputting vanilla JS

## Development Patterns

### Netlify Functions
- Use `.mjs` extension for ES modules
- Export default async function: `export default async (request, context) => {}`
- Export config object for custom paths: `export const config = { path: "/api/..." }`
- Always handle errors with try/catch and return JSON responses
- Use `getDb()` from `netlify/utils/db.mjs` for database access

### Astro Pages
- Use `.astro` files in `src/pages/` (file-based routing)
- Inline `<script>` tags are fine for page-specific JavaScript
- Shared JavaScript goes in `src/js/` (use `.ts` extension for TypeScript)
- Global styles in `src/assets/style.css`, imported in Layout.astro
- Use `Layout.astro` for consistent page structure with navigation

### DOM Manipulation Pattern

**Use `<template>` tags for repeating dynamic elements** (established sitewide pattern):

1. Define HTML structure in a `<template>` tag with ID
2. Clone the template: `template.content.cloneNode(true)`
3. Query and populate elements using `querySelector`
4. Set content with `textContent` (safe) or properties like `img.src`
5. Remove optional elements with `.remove()` when not needed

**Example** (see `collection.astro` or `index.astro`):
```html
<template id="plant-card-template">
    <div class="plant-card">
        <img class="card-image" alt="">
        <h3><a href="#" class="card-link"></a></h3>
    </div>
</template>

<script>
function createCard(data) {
    const template = document.getElementById('plant-card-template') as HTMLTemplateElement;
    const card = template.content.cloneNode(true) as DocumentFragment;

    const link = card.querySelector('.card-link') as HTMLAnchorElement;
    link.href = `/plant?id=${data.id}`;
    link.textContent = data.name;

    return card.querySelector('.plant-card') as HTMLElement;
}
</script>
```

**Benefits**:
- No XSS vulnerabilities (using `textContent` instead of `innerHTML`)
- Type-safe DOM queries
- Clean separation of markup and logic
- Better performance than HTML string parsing

**When NOT to use templates**:
- Simple text messages (use `textContent` directly)
- Complex single-view renders with many conditionals (innerHTML is acceptable for controlled data)

### Database Queries
- Use tagged template literals with the `sql` function from `@neondatabase/serverless`
- Example: `` sql`SELECT * FROM plants WHERE id = ${id}` ``
- JSONB fields need JSON.stringify/parse: `${metadata ? JSON.stringify(metadata) : '{}'}`
- Timestamps auto-update via database triggers (don't set manually)

### Environment Variables
- Never commit `.env` file (it's gitignored)
- Frontend vars must be prefixed with `VITE_` to be accessible in browser
- Backend-only vars (like DATABASE_URL) don't need prefix
- Netlify CLI automatically injects DATABASE_URL when using `netlify dev`

**Required environment variables:**
```env
VITE_TREFLE_API=your-trefle-token
VITE_PERENUAL_API=sk-your-perenual-key
DATABASE_URL=postgresql://... (auto-injected by Netlify)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
# PUBLIC_ prefixed versions for astro-cloudinary components (CldImage, etc.)
PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
PUBLIC_CLOUDINARY_API_KEY=your-api-key
PLANTNET_API=your-plantnet-key (optional, not currently used)
```

### API Comparison & Smart Merge

**Comparison Modal Pattern:**
The comparison feature uses native `<dialog>` element for accessibility:
- Wire up close buttons in `openComparisonModal()` (not in display functions)
- Handle loading, error, and success states separately
- Use template cloning for comparison rows

**Smart Merge Algorithm:**
When merging plants from different APIs:
1. Prefer non-null values over null
2. For text fields with both values, prefer longer/richer content
3. Merge synonym arrays and deduplicate
4. Store both API IDs (trefle_id, perenual_id) for tracking
5. Map care guide data to unified `metadata.care` structure

**Care Data Normalization:**
Perenual care guide data is mapped to existing care fields:
- `care_guide.watering` → `metadata.care.water`
- `care_guide.sunlight[]` → `metadata.care.light` (array joined to string)
- `care_guide.pruning` → `metadata.care.pruning`

This ensures one source of truth for all care information.

### File Upload Pattern

**Photo Upload with Cloudinary:**
The plant detail page supports uploading custom photos stored in Cloudinary:
- **Two-endpoint approach**: Upload endpoint separate from update endpoint
- **Upload-before-update**: Photo uploads first, then plant record updates with Cloudinary URL
- **Client-side preview**: FileReader shows preview before upload
- **Validation**: File type and size validated both client-side (UX) and server-side (security)
- **Status messages**: Color-coded feedback (uploading=blue, success=green, error=red)
- **Error handling**: Upload failures abort plant update to ensure data consistency
- **Slug-based naming**: Images named by plant slug for easy identification in Cloudinary dashboard

**Implementation Flow:**
1. User selects file → Client validates → Shows preview (FileReader)
2. User clicks "Save Changes" → Creates FormData with photo + plantId + slug/commonName/scientificName
3. POSTs to `/api/plants/upload-photo` → Uploads to Cloudinary
4. Gets Cloudinary URL from response → Uses as `finalImageUrl`
5. Updates plant via `/api/plants/update` → Stores Cloudinary URL in `image_url` field
6. Displays success message → Page refreshes with new image

**Cloudinary Upload Setup:**
```javascript
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Generate slug-based public_id
const imageSlug = slug || generateSlug(commonName) || generateSlug(scientificName) || `plant-${plantId}`;
const publicId = `mosslight-nook/${imageSlug}`;

// Convert file to base64 data URL
const base64 = Buffer.from(arrayBuffer).toString('base64');
const dataUrl = `data:${file.type};base64,${base64}`;

// Upload to Cloudinary
const result = await cloudinary.uploader.upload(dataUrl, {
    public_id: publicId,
    overwrite: true,  // Replace if same slug uploaded again
    resource_type: 'image',
});

// Return Cloudinary CDN URL
return { success: true, imageUrl: result.secure_url };
```

### Cached Data Pattern (Gallery)

**Why not use astro-cloudinary's cldAssetsLoader?**

The `astro-cloudinary` package provides a `cldAssetsLoader` for Astro content collections, but it has environment variable loading issues during content sync. Even with correct credentials, it returns "Not Found" errors because `import.meta.env` variables aren't populated during the sync phase.

**Solution: Cached JSON approach**

Instead of using the content loader, gallery images use a manual caching approach:

1. **Refresh script** (`scripts/refresh-gallery.mjs`):
   - Fetches from Cloudinary API using `process.env` (works reliably)
   - Saves metadata to `src/data/gallery.json`
   - Run manually: `npm run refresh-gallery`

2. **Gallery page** reads from local JSON:
   ```astro
   ---
   import galleryData from '../data/gallery.json';
   const images = galleryData.images;
   ---
   ```

3. **CldImage** still handles optimized delivery from Cloudinary CDN

**Benefits:**
- Zero API calls during builds
- Full control over when API calls happen
- Images still get Cloudinary's automatic optimization
- Build times reduced significantly

**Cloudinary Folder Modes:**
This account uses **dynamic** folder mode where `asset_folder` is metadata, not part of `public_id`. The correct API endpoint is `/resources/by_asset_folder?asset_folder=gallery`.

## Current Features

1. **Search Plants** (`/` - index.astro):
   - Search Trefle or Perenual APIs (radio button selector)
   - Add plants to collection directly
   - **Compare APIs**: Click "Compare with [API]" on any result to:
     - Find matching plant in the other API
     - View side-by-side comparison with differences highlighted
     - Auto-fetch care guide data from Perenual
     - Smart merge data from both sources
     - Preview merged result before saving
     - Track both trefle_id and perenual_id

2. **View Collection** (`/collection` - collection.astro):
   - Display all plants from database in grid layout
   - Show care info icons (💧 water, ☀️ light) when available
   - Click plant to view details

3. **Add Cultivar Manually** (`/add` - add.astro):
   - Form for manual plant entry
   - Useful for cultivars not in APIs

4. **Plant Detail Page** (`/plant` - plant.astro):
   - Individual plant details with all metadata
   - Care section with icons (☀️ Light, 💧 Water, ✂️ Pruning)
   - Edit mode for updating plant information
   - Care data automatically populated from Perenual when available
   - **Photo Upload**: Upload custom plant photos from device
     - File selection with live preview using FileReader
     - Client + server validation (type, size)
     - Upload to Cloudinary with slug-based naming
     - Replaces image_url field completely
     - Fallback to URL input for external images

5. **Gallery** (`/gallery` - gallery.astro):
   - Displays images from Cloudinary `gallery` folder
   - Uses cached JSON metadata (no API calls during build)
   - Images served via Cloudinary CDN with `CldImage` optimization
   - Run `npm run refresh-gallery` to update cache when adding photos

## Database Setup Process

First-time setup requires:
1. Run `netlify db init --no-boilerplate` to create Neon database
2. Apply schema from `database/schema.sql` via Neon Console SQL Editor or psql
3. Claim database in Netlify dashboard within 7 days for persistence
4. Use `netlify dev` (not `npm run dev`) to run with database access

See `database/README.md` for detailed instructions.

## Session Logs & Documentation

**Session logs are created after every significant commit** to document the development process for future reference and writing.

### Location and Format
- **Directory**: `docs/session-logs/`
- **Naming**: `YYYY-MM-DD-feature-name.md` (e.g., `2025-12-27-stories-feature.md`)
- **Format**: Markdown files with structured documentation

### When to Create Session Logs
Create a session log after commits that include:
- New features or major functionality
- Significant refactoring or code reorganization
- Bug fixes with notable troubleshooting
- Architecture changes or pattern updates
- Database schema modifications
- Integration of new APIs or services

### Session Log Structure
Each session log should include:

1. **Header** - Date and focus area
2. **Overview** - Brief summary of what was accomplished
3. **Implementation Details** - Key code changes with examples
4. **File Structure** - Directories and files created/modified
5. **Troubleshooting Journey** - Errors encountered and how they were resolved
6. **Testing** - Verification steps and results
7. **Files Modified** - Complete list of affected files

### Purpose
Session logs serve multiple purposes:
- **Learning Reference** - Document the problem-solving process, not just the solution
- **Project History** - Track evolution of features and architecture decisions
- **Writing Material** - Provide detailed notes for blog posts, documentation, or case studies
- **Onboarding** - Help future contributors understand why decisions were made

### Example Session Log Topics
- `2025-12-27-typescript-refactoring.md` - Extracting inline JS to typed modules
- `2025-12-27-blob-storage-fixes.md` - Configuring Netlify Blobs for local dev
- `2025-12-27-stories-feature.md` - Implementing Astro content collections
- `2025-12-30-gallery-cloudinary-loader.md` - Gallery page with cached Cloudinary metadata

## Important Notes

- The project started as an Astro basics template and has been customized
- Plant data structure accommodates both API data and personal metadata
- Stories/characters tables are stubs for future "Mosslight Nook" storytelling feature
- CSS is centralized in `src/assets/style.css` (previously was inline)
- Client-side TypeScript in `src/js/main.ts` handles search and "add to collection" flow
- Template-based DOM manipulation is preferred over `innerHTML` for dynamic content
