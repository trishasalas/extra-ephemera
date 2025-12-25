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
├── layouts/         # Page layouts (Layout.astro with nav)
├── pages/           # Route pages (index, collection, add, plant)
└── js/              # Client-side JavaScript utilities

netlify/
├── functions/       # Serverless API endpoints (.mjs files)
│   ├── add-plant.mjs        # POST /api/plants
│   ├── get-plants.mjs       # GET /api/plants/list
│   ├── get-plant.mjs        # GET /api/plants/:id
│   ├── update-plant.mjs     # PUT /api/plants/:id
│   └── call-trefle.mjs      # GET /api/trefle?q=...
└── utils/
    └── db.mjs       # Database connection helper (uses DATABASE_URL env var)

database/
├── schema.sql       # Complete Postgres schema with triggers
└── README.md        # Database setup instructions
```

### Database Schema

Four main tables (see `database/schema.sql` for full schema):

1. **plants** - Main plant records with:
   - Trefle API fields (scientific_name, common_name, family, genus, image_url, etc.)
   - Trefle metadata (author, bibliography, year, synonyms, trefle_id, slug)
   - Personal fields (nickname, location, acquired_date, status)
   - Flexible JSONB metadata field for arbitrary data
   - Auto-updating timestamps via triggers

2. **journal_entries** - Dated journal entries per plant (CASCADE on delete)

3. **stories** - Storybook entries (future feature stub)

4. **story_characters** - Links stories to plants (future feature stub)

### API Integration

**Trefle Plant API** (primary plant search):
- Token stored in `.env` as `VITE_TREFLE_API`
- Proxied through `/api/trefle` Netlify function to hide API key
- Used for searching plants on homepage

**PlantNet API** (secondary, for identification):
- Token stored in `.env` as `PLANTNET_API`
- Not currently integrated in UI

**Database Connection**:
- `DATABASE_URL` env var automatically set by Netlify DB
- Connection via `@neondatabase/serverless` (HTTP-based, not TCP)
- Helper function in `netlify/utils/db.mjs`

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

## Current Features

1. **Search Plants** (`/` - index.astro): Search Trefle API and add plants to collection
2. **View Collection** (`/collection` - collection.astro): Display all plants from database
3. **Add Cultivar Manually** (`/add` - add.astro): Form for manual plant entry
4. **Plant Detail Page** (`/plant` - plant.astro): Individual plant details and editing

## Database Setup Process

First-time setup requires:
1. Run `netlify db init --no-boilerplate` to create Neon database
2. Apply schema from `database/schema.sql` via Neon Console SQL Editor or psql
3. Claim database in Netlify dashboard within 7 days for persistence
4. Use `netlify dev` (not `npm run dev`) to run with database access

See `database/README.md` for detailed instructions.

## Important Notes

- The project started as an Astro basics template and has been customized
- Plant data structure accommodates both API data and personal metadata
- Stories/characters tables are stubs for future "Mosslight Nook" storytelling feature
- CSS is centralized in `src/assets/style.css` (previously was inline)
- Client-side TypeScript in `src/js/main.ts` handles search and "add to collection" flow
- Template-based DOM manipulation is preferred over `innerHTML` for dynamic content
