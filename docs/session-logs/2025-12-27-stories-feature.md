# Session Log: Stories Feature Implementation
**Date:** 2025-12-27
**Focus:** Add narrative storytelling capability to plant catalog

## Overview
Implemented a complete Astro content collection for "The Mosslight Nook Stories" - a narrative feature allowing storytelling about plants, their keepers, and the magic that grows between them.

## Feature Description
Stories are markdown files that can include:
- Plant-related narratives and lore
- Origin stories and plant histories
- Cautionary tales and drama
- Multi-author collaboration support
- Plant character connections via slugs
- Tagging and categorization

## Implementation

### 1. Content Collection Configuration
**File:** `src/content.config.ts` (created)

```typescript
import { glob } from "astro/loaders";
import { defineCollection, z } from 'astro:content';

const stories = defineCollection({
    loader: glob({ pattern: "**/[^_]*.md", base: "./src/stories" }),
    schema: ({ image }) => z.object({
        title: z.string(),
        authors: z.array(z.string()),
        date: z.date(),
        plants: z.array(z.string()).optional(), // slugs, empty for lore/intro
        tags: z.array(z.string()).optional(),
        featured_image: image().optional(),
        excerpt: z.string().optional(), // for listing page
    }),
});

export const collections = { stories };
```

**Key Points:**
- Uses Content Layer API with `glob` loader
- Pattern `**/[^_]*.md` excludes files starting with `_` (templates)
- No `type` property (mutually exclusive with `loader`)
- Supports optional featured images via Astro's image helper
- Plant connections via slug array for future relationship tracking

### 2. Individual Story Pages
**File:** `src/pages/stories/[...slug].astro` (created)

```astro
---
import { getCollection, render } from 'astro:content';
import MarkdownPostLayout from '../../layouts/MarkdownPostLayout.astro';

export async function getStaticPaths() {
    const posts = await getCollection('stories');
    return posts.map(post => ({
        params: { slug: post.id }, props: { post },
    }));
}

const { post } = Astro.props;
const { Content } = await render(post);
---
<MarkdownPostLayout frontmatter={post.data}>
    <Content />
</MarkdownPostLayout>
```

**Features:**
- Dynamic routing with `[...slug]` catch-all
- Generates static pages for all stories
- Uses `getStaticPaths()` for build-time generation
- Renders markdown content with proper frontmatter

### 3. Story Layout
**File:** `src/layouts/MarkdownPostLayout.astro` (created)

**Key Features:**
- Displays story metadata (title, date, authors, excerpt)
- Conditionally shows featured image if available
- Renders markdown content in `.story-content` wrapper
- Shows tags with links to `/tags/{tag}` (future filter feature)
- Uses main `Layout.astro` for consistent site navigation

**Template Structure:**
```astro
<Layout pageTitle={frontmatter.title}>
  <div class="story-meta">
    <p class="date">{frontmatter.date.toLocaleDateString()}</p>
    {frontmatter.authors && ...}
    {frontmatter.excerpt && ...}
  </div>

  {frontmatter.featured_image && ...}

  <div class="story-content">
    <slot />
  </div>

  {frontmatter.tags && ...}
</Layout>
```

### 4. Stories Listing Page
**File:** `src/pages/stories/index.astro` (created)

**Purpose:** Browse all stories at `/stories`

**Features:**
- Fetches all stories from collection
- Sorts by date (newest first)
- Card-based layout with hover effects
- Shows title (linked), excerpt, date, authors, and tags
- Responsive design matching plant catalog aesthetic

**Tagline:** "Tales of plants, their keepers, and the magic that grows between them."

**Code Highlights:**
```astro
const allStories = await getCollection('stories');
const stories = allStories.sort((a, b) =>
    b.data.date.valueOf() - a.data.date.valueOf()
);
```

### 5. Story Templates and Examples
**Files Created:**
- `src/stories/_template.md` - Template for new stories (excluded via `_` prefix)
- `src/stories/the-mosslight-nook/index.md` - Origin story

**Template Frontmatter:**
```yaml
---
title: ""
authors: []  # ["Trisha"], ["Nova"], ["Nova", "Trisha"]
date: 2025-12-27
plants: []  # slugs, omit for lore/intro pieces
tags: []  # drama, pests, origin-story, cautionary-tale, etc.
# featured_image: ./image.jpg  # optional - uncomment when ready
excerpt: ""  # for listing page
---
```

### 6. Navigation Integration
**File:** `src/layouts/Layout.astro` (modified)

Added "Stories" link to main navigation between "Collection" and "Search":

```astro
<nav class="main-nav">
    <a href="/" class="nav-logo">🌱 Extra Ephemera</a>
    <ul class="nav-links">
        <li><a href="/collection">Collection</a></li>
        <li><a href="/stories">Stories</a></li>  ← NEW
        <li><a href="/">Search</a></li>
        <li><a href="/add">Add Cultivar</a></li>
    </ul>
</nav>
```

## Troubleshooting Journey

### Issue 1: Content Layer API Error
**Error:** `Collections that use the Content Layer API must have a loader defined and no type set`

**Cause:** Original config had both `loader` and `type: 'content'`

**Fix:** Removed `type` property - it's mutually exclusive with `loader`

### Issue 2: Frontmatter Field Mismatch
**Error:** Schema expected `date` but markdown had `date_created`

**Fix:** Updated all markdown files to use `date` field consistently

### Issue 3: Layout Tutorial Fields
**Error:** MarkdownPostLayout used tutorial fields (`pubDate`, `description`, `author`, `image`)

**Fix:** Completely rewrote layout to match actual schema:
- `pubDate` → `date`
- `description` → `excerpt`
- `author` → `authors` (array)
- `image` → `featured_image`

### Issue 4: Missing Featured Image
**Error:** `Could not find requested image ./image.jpg`

**Fix:** Commented out `featured_image` in markdown files with helpful note for later

### Issue 5: Empty index.md
**Problem:** `src/stories/index.md` had no frontmatter, didn't fit schema

**Fix:** Deleted file - intro story should follow same format as all others

## File Structure
```
src/
├── content.config.ts          # Collection definition
├── layouts/
│   └── MarkdownPostLayout.astro  # Story template
├── pages/
│   └── stories/
│       ├── index.astro        # Stories listing (/stories)
│       └── [...slug].astro    # Individual stories (/stories/*)
└── stories/
    ├── _template.md           # Story template (excluded)
    └── the-mosslight-nook/
        └── index.md           # First story
```

## Routes Generated
- `/stories` - Stories listing page
- `/stories/the-mosslight-nook` - Individual story

## Future Enhancements
- Tag filtering pages at `/tags/{tag}`
- Plant-story relationship queries
- Featured image support when images are added
- Story series/chapters support
- Author pages
- RSS feed for stories

## Files Created/Modified
**Created:**
- `src/content.config.ts`
- `src/layouts/MarkdownPostLayout.astro`
- `src/pages/stories/index.astro`
- `src/pages/stories/[...slug].astro`
- `src/stories/_template.md`
- `src/stories/the-mosslight-nook/index.md`

**Modified:**
- `src/layouts/Layout.astro` - Added Stories nav link

## Testing
- ✅ Build completes successfully
- ✅ Stories listing page renders at `/stories`
- ✅ Individual story pages generate correctly
- ✅ Navigation link works
- ✅ Markdown content renders properly
- ✅ Frontmatter displays correctly
- ✅ No TypeScript errors

## Success Metrics
- Clean content collection setup
- Properly typed schema with Zod
- Responsive listing page
- SEO-friendly individual pages
- Extensible for future features
