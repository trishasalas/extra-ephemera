# Schema

See `database/schema.sql` for the actual Postgres schema.

---

## Plants Table

### Display Fields
- scientific_name 
- common_name (hide if no data)
- family 
- family_common_name (hide if no data)
- genus 
- image_url

### Disclosure Component (expandable)
- added_at
- author
- bibliography
- year
- synonyms

### For data retrieval
- slug
- trefle_id

### Personal Fields (text, hide if empty)
- nickname
- location 
- acquired_date
- status (freeform, UI suggests options)

---

## Journal Entries Table

- plant_id (links to plants)
- entry_date
- content

---

## GBIF Fields (TBD)

Waiting for Trisha to explore GBIF API and decide what's interesting.

---

## Stories Table (stub)

- title
- content
- created_at

---

## Story Characters (stub)

Join table linking stories to plants:
- story_id
- plant_id
- character_name (optional, if story uses a different name)
