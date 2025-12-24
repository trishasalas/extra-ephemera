-- Extra Ephemera Database Schema
-- Mosslight Nook Plant Catalog

-- ============================================
-- PLANTS
-- ============================================
CREATE TABLE IF NOT EXISTS plants (
    id SERIAL PRIMARY KEY,
    
    -- Trefle Display Fields
    scientific_name VARCHAR(255) NOT NULL,
    common_name VARCHAR(255),
    family VARCHAR(255),
    family_common_name VARCHAR(255),
    genus VARCHAR(255),
    image_url TEXT,
    
    -- Trefle Disclosure Fields
    author VARCHAR(255),
    bibliography TEXT,
    year INTEGER,
    synonyms TEXT[], -- Postgres array
    
    -- Trefle IDs (for data retrieval)
    slug VARCHAR(255),
    trefle_id INTEGER,
    
    -- Flexible metadata (patents, breeding, awards, GBIF extras, etc.)
    metadata JSONB DEFAULT '{}',
    
    -- Reference notes (freeform text for hybrid info, nomenclature, sources)
    notes TEXT,
    
    -- Personal Fields
    nickname VARCHAR(255),
    location VARCHAR(255),
    acquired_date DATE,
    status VARCHAR(100), -- freeform, UI suggests options
    
    -- Metadata
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for common lookups
CREATE INDEX IF NOT EXISTS idx_plants_scientific_name ON plants(scientific_name);
CREATE INDEX IF NOT EXISTS idx_plants_genus ON plants(genus);
CREATE INDEX IF NOT EXISTS idx_plants_trefle_id ON plants(trefle_id);

-- ============================================
-- JOURNAL ENTRIES
-- ============================================
CREATE TABLE IF NOT EXISTS journal_entries (
    id SERIAL PRIMARY KEY,
    plant_id INTEGER NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_plant_id ON journal_entries(plant_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_date ON journal_entries(entry_date);

-- ============================================
-- STORIES (Mosslight Nook Storybook - stub)
-- ============================================
CREATE TABLE IF NOT EXISTS stories (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STORY CHARACTERS (join table - stub)
-- Links stories to plants
-- ============================================
CREATE TABLE IF NOT EXISTS story_characters (
    story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    plant_id INTEGER NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    character_name VARCHAR(255), -- in case the story uses a different name
    PRIMARY KEY (story_id, plant_id)
);

-- ============================================
-- UPDATED_AT TRIGGER
-- Auto-update updated_at on row changes
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_plants_updated_at
    BEFORE UPDATE ON plants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journal_entries_updated_at
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stories_updated_at
    BEFORE UPDATE ON stories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
