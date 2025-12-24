# Database Setup

## 1. Initialize the database

Run this from your project root:

```bash
netlify db init --no-boilerplate
```

This will:
- Create a Neon Postgres database
- Set the `DATABASE_URL` environment variable in your Netlify environment
- Give you 7 days to "claim" the database (connect it to your Neon account for persistence)

## 2. Install dependencies

```bash
npm install
```

## 3. Apply the schema

After `netlify db init`, go to your Netlify dashboard:
1. Go to your site → Extensions → Neon
2. Click "Open Neon Console"
3. In Neon, go to "SQL Editor"
4. Copy the contents of `database/schema.sql` and run it

Alternatively, if you have `psql` installed:
```bash
# Get your connection string from Netlify dashboard or run:
netlify env:get DATABASE_URL

# Then connect and run schema:
psql "your-connection-string" -f database/schema.sql
```

## 4. Claim your database (important!)

Within 7 days, go to Netlify dashboard → Extensions → Neon → "Claim database"

This connects the database to your Neon account so it persists beyond the trial period.

## 5. Run the app

```bash
netlify dev
```

This runs both Astro and the Netlify functions with the database connection available.

## Schema Overview

- **plants** - Your plant collection with Trefle data + personal fields
- **journal_entries** - Dated journal entries per plant
- **stories** - Mosslight Nook storybook entries (stub for later)
- **story_characters** - Links stories to plants (stub for later)

See `database/schema.sql` for full details.
