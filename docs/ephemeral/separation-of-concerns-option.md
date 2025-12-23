# Separation of Concerns

I asked claude.ai about using variables...this is what he said:

Great question! Here's how to properly separate everything for clean organization:

## File Structure
```
plant-babies-v2/
├── index.html
├── src/
│   ├── main.js           (entry point - wires everything up)
│   ├── api/
│   │   ├── trefle.js     (Trefle API logic)
│   │   ├── gbif.js       (GBIF API logic)
│   │   └── config.js     (API keys, endpoints)
│   ├── components/
│   │   ├── PlantCard.js  (card creation/rendering)
│   │   ├── VarDump.js    (your debug display)
│   │   └── SearchForm.js (search UI)
│   └── utils/
│       ├── normalizer.js (normalize different API responses)
│       └── dom.js        (DOM helper functions)
```

## index.html (JUST structure)
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Plant Babies</title>
    <link rel="stylesheet" href="/src/style.css">
</head>
<body>
    <div id="app">
        <header>
            <h1>🌱 Plant Search</h1>
        </header>
        
        <div id="search-container"></div>
        <div id="var-dump"></div>
        <div id="results"></div>
    </div>
    
    <!-- Vite handles the module imports -->
    <script type="module" src="/src/main.js"></script>
</body>
</html>
```

## src/main.js (Entry point - wiring)
```javascript
import { SearchForm } from './components/SearchForm.js';
import { renderResults } from './components/PlantCard.js';
import { searchTrefle } from './api/trefle.js';
import { searchGBIF } from './api/gbif.js';
import { varDump } from './components/VarDump.js';

// Initialize the app
function init() {
    // Set up search form
    const searchContainer = document.getElementById('search-container');
    const searchForm = new SearchForm(searchContainer, handleSearch);
}

// Handle search from form
async function handleSearch(query, source) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '<div class="loading">Searching...</div>';
    
    try {
        let data;
        
        // Route to appropriate API
        switch(source) {
            case 'trefle':
                data = await searchTrefle(query);
                break;
            case 'gbif':
                data = await searchGBIF(query);
                break;
            case 'all':
                data = await searchAll(query);
                break;
        }
        
        // Debug dump
        varDump('API Response', data);
        
        // Render results
        renderResults(data, resultsContainer, source);
        
    } catch (error) {
        console.error('Search error:', error);
        resultsContainer.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
```

## src/api/trefle.js (API logic)
```javascript
import { API_CONFIG } from './config.js';

export async function searchTrefle(query) {
    const url = `/api/trefle/plants/search?token=${API_CONFIG.trefle.token}&q=${query}`;
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Trefle API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
}

export async function getPlantDetails(id) {
    // Get specific plant details
    const url = `/api/trefle/plants/${id}?token=${API_CONFIG.trefle.token}`;
    const response = await fetch(url);
    return response.json();
}
```

## src/api/config.js (Configuration)
```javascript
// Keep your API configuration separate
export const API_CONFIG = {
    trefle: {
        token: 'your-token-here',  // Move to .env later
        baseUrl: '/api/trefle'
    },
    gbif: {
        baseUrl: '/api/gbif',
        // no token needed
    }
};
```

## src/components/PlantCard.js (Component logic)
```javascript
export function createPlantCard(plant, source) {
    // Create variables like you prefer!
    const scientificName = plant.scientific_name;
    const commonName = plant.common_name || 'No common name';
    const family = plant.family;
    const imageUrl = plant.image_url;
    
    // Create element
    const card = document.createElement('div');
    card.className = `plant-card ${source}`;
    
    // Build structure
    const heading = document.createElement('h3');
    heading.textContent = scientificName;
    
    const common = document.createElement('p');
    common.textContent = commonName;
    
    card.appendChild(heading);
    card.appendChild(common);
    
    if (family) {
        const familyElement = document.createElement('p');
        familyElement.innerHTML = `<strong>Family:</strong> ${family}`;
        card.appendChild(familyElement);
    }
    
    if (imageUrl) {
        const image = document.createElement('img');
        image.src = imageUrl;
        image.alt = scientificName;
        card.appendChild(image);
    }
    
    // Add events
    heading.addEventListener('click', () => {
        showPlantDetails(plant, source);
    });
    
    return card;
}

export function renderResults(data, container, source) {
    // Clear container
    container.innerHTML = '';
    
    // Get the results array (different per API)
    const results = data.data || data.results || [];
    
    if (results.length === 0) {
        container.innerHTML = '<p>No results found</p>';
        return;
    }
    
    // Create and append cards
    results.forEach(plant => {
        const card = createPlantCard(plant, source);
        container.appendChild(card);
    });
}

function showPlantDetails(plant, source) {
    console.log('Show details:', plant, 'from', source);
    // Could open modal, expand card, etc.
}
```

## src/components/SearchForm.js
```javascript
export class SearchForm {
    constructor(container, onSearch) {
        this.container = container;
        this.onSearch = onSearch;
        this.render();
        this.attachEvents();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="search-form">
                <input type="text" 
                       id="search-input" 
                       placeholder="Search for a plant..." 
                       value="alocasia">
                <select id="api-source">
                    <option value="trefle">Trefle</option>
                    <option value="gbif">GBIF</option>
                    <option value="all">Search All</option>
                </select>
                <button id="search-btn">Search</button>
            </div>
        `;
    }
    
    attachEvents() {
        const button = this.container.querySelector('#search-btn');
        const input = this.container.querySelector('#search-input');
        const select = this.container.querySelector('#api-source');
        
        button.addEventListener('click', () => {
            this.handleSearch();
        });
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });
    }
    
    handleSearch() {
        const query = this.container.querySelector('#search-input').value;
        const source = this.container.querySelector('#api-source').value;
        
        if (query.trim()) {
            this.onSearch(query, source);
        }
    }
}
```

This structure gives you:
- **Clear separation** - HTML is just structure, JS handles all logic
- **PHP-style variables** - Create all the variables you want!
- **Testable functions** - Each piece can be tested independently
- **Easy debugging** - You can console.log at any step
- **Scalable** - Easy to add new APIs, new components

And Vite handles all the module imports automatically, so you don't need any build config. Just works!

Want me to show how to add the normalizer for merging multiple API results?


## Alright, here's the normalizer that brings all those different API shapes into one unified structure:

## src/utils/normalizer.js
```javascript
// Normalize different API responses to a common structure
export function normalizePlant(plant, source) {
    // Create variables for everything - PHP style!
    let normalized = {
        // Core identity
        id: null,
        scientific_name: null,
        common_names: [],  // Array because plants have multiple
        
        // Taxonomy
        family: null,
        genus: null,
        species: null,
        
        // Images
        images: [],  // Array of {url, type, source}
        
        // Metadata
        source: source,
        original_id: null,  // Keep track of source's ID
        confidence: 0,  // How complete is this data?
        raw_data: plant  // Keep original for debugging
    };
    
    // Route to specific normalizer
    switch(source) {
        case 'trefle':
            normalized = normalizeTrefle(plant, normalized);
            break;
        case 'gbif':
            normalized = normalizeGBIF(plant, normalized);
            break;
        case 'perenual':
            normalized = normalizePerenual(plant, normalized);
            break;
        case 'inaturalist':
            normalized = normalizeINaturalist(plant, normalized);
            break;
    }
    
    // Calculate data completeness
    normalized.confidence = calculateConfidence(normalized);
    
    return normalized;
}

function normalizeTrefle(plant, base) {
    // Extract Trefle's data structure
    const id = plant.id;
    const scientificName = plant.scientific_name;
    const commonName = plant.common_name;
    const family = plant.family;
    const genus = plant.genus;
    const imageUrl = plant.image_url;
    
    // Map to normalized structure
    base.id = `trefle-${id}`;
    base.original_id = id;
    base.scientific_name = scientificName;
    
    if (commonName) {
        base.common_names.push(commonName);
    }
    
    base.family = family;
    base.genus = genus;
    
    if (imageUrl) {
        base.images.push({
            url: imageUrl,
            type: 'primary',
            source: 'trefle'
        });
    }
    
    return base;
}

function normalizeGBIF(species, base) {
    // GBIF has different field names
    const key = species.key;
    const canonicalName = species.canonicalName;
    const scientificName = species.scientificName;
    const vernacularNames = species.vernacularNames || [];
    const family = species.family;
    const genus = species.genus;
    const species_name = species.species;
    
    // Map to normalized
    base.id = `gbif-${key}`;
    base.original_id = key;
    base.scientific_name = canonicalName || scientificName;
    
    // GBIF can have multiple common names
    vernacularNames.forEach(name => {
        const commonName = name.vernacularName;
        const language = name.language;
        
        if (language === 'en' || language === 'eng') {
            base.common_names.push(commonName);
        }
    });
    
    base.family = family;
    base.genus = genus;
    base.species = species_name;
    
    // GBIF usually doesn't have images in search results
    // But might have media array
    if (species.media && species.media.length > 0) {
        species.media.forEach(media => {
            base.images.push({
                url: media.identifier,
                type: media.type || 'unknown',
                source: 'gbif'
            });
        });
    }
    
    return base;
}

function normalizePerenual(plant, base) {
    const id = plant.id;
    const scientificNames = plant.scientific_name; // This is an array!
    const commonName = plant.common_name;
    const defaultImage = plant.default_image;
    
    base.id = `perenual-${id}`;
    base.original_id = id;
    
    // Perenual returns scientific_name as an array
    if (Array.isArray(scientificNames)) {
        base.scientific_name = scientificNames[0];
    } else {
        base.scientific_name = scientificNames;
    }
    
    if (commonName) {
        base.common_names.push(commonName);
    }
    
    // Perenual has multiple image sizes
    if (defaultImage) {
        if (defaultImage.medium_url) {
            base.images.push({
                url: defaultImage.medium_url,
                type: 'medium',
                source: 'perenual'
            });
        }
        if (defaultImage.thumbnail) {
            base.images.push({
                url: defaultImage.thumbnail,
                type: 'thumbnail',
                source: 'perenual'
            });
        }
    }
    
    return base;
}

function normalizeINaturalist(taxon, base) {
    const id = taxon.id;
    const name = taxon.name;
    const preferredCommonName = taxon.preferred_common_name;
    const englishCommonName = taxon.english_common_name;
    const defaultPhoto = taxon.default_photo;
    const rank = taxon.rank;
    
    base.id = `inat-${id}`;
    base.original_id = id;
    base.scientific_name = name;
    
    // iNaturalist might have multiple common name fields
    if (preferredCommonName) {
        base.common_names.push(preferredCommonName);
    }
    if (englishCommonName && englishCommonName !== preferredCommonName) {
        base.common_names.push(englishCommonName);
    }
    
    // Parse ancestry for family/genus if available
    if (taxon.ancestry) {
        // This is rough, you'd want to properly parse the ancestry string
        const ancestors = taxon.ancestry.split('/');
        // Would need more logic here to extract family/genus properly
    }
    
    if (defaultPhoto) {
        base.images.push({
            url: defaultPhoto.medium_url,
            type: 'observation',
            source: 'inaturalist'
        });
    }
    
    return base;
}

function calculateConfidence(normalized) {
    let score = 0;
    let maxScore = 0;
    
    // Check each field for completeness
    const checks = [
        { field: 'scientific_name', weight: 3 },
        { field: 'common_names', weight: 2, check: (v) => v.length > 0 },
        { field: 'family', weight: 2 },
        { field: 'genus', weight: 2 },
        { field: 'images', weight: 1, check: (v) => v.length > 0 }
    ];
    
    checks.forEach(check => {
        maxScore += check.weight;
        const value = normalized[check.field];
        
        if (check.check) {
            if (check.check(value)) score += check.weight;
        } else {
            if (value) score += check.weight;
        }
    });
    
    return Math.round((score / maxScore) * 100);
}
```

## src/utils/merger.js
```javascript
import { normalizePlant } from './normalizer.js';

// Merge results from multiple APIs
export async function mergeResults(allResults) {
    // Group plants by scientific name
    const plantMap = new Map();
    
    allResults.forEach(({ data, source }) => {
        const results = data.data || data.results || [];
        
        results.forEach(plant => {
            // Normalize each plant
            const normalized = normalizePlant(plant, source);
            const scientificName = normalized.scientific_name?.toLowerCase();
            
            if (!scientificName) return;
            
            if (!plantMap.has(scientificName)) {
                plantMap.set(scientificName, {
                    scientific_name: normalized.scientific_name,
                    sources: [],
                    merged_data: {
                        common_names: new Set(),
                        images: [],
                        family: null,
                        genus: null,
                        confidence_scores: {}
                    }
                });
            }
            
            const entry = plantMap.get(scientificName);
            entry.sources.push(source);
            entry.confidence_scores[source] = normalized.confidence;
            
            // Merge common names
            normalized.common_names.forEach(name => {
                entry.merged_data.common_names.add(name);
            });
            
            // Merge images (keep all, mark source)
            entry.merged_data.images.push(...normalized.images);
            
            // Prefer family/genus from higher confidence source
            if (normalized.family && (!entry.merged_data.family || 
                normalized.confidence > entry.confidence_scores[entry.merged_data.family_source])) {
                entry.merged_data.family = normalized.family;
                entry.merged_data.family_source = source;
            }
            
            if (normalized.genus && (!entry.merged_data.genus || 
                normalized.confidence > entry.confidence_scores[entry.merged_data.genus_source])) {
                entry.merged_data.genus = normalized.genus;
                entry.merged_data.genus_source = source;
            }
            
            // Keep the raw normalized data
            entry[source] = normalized;
        });
    });
    
    return plantMap;
}

// Create enriched plant record from merged data
export function createEnrichedPlant(mergedEntry) {
    const scientificName = mergedEntry.scientific_name;
    const sources = mergedEntry.sources;
    const commonNames = Array.from(mergedEntry.merged_data.common_names);
    const images = mergedEntry.merged_data.images;
    const family = mergedEntry.merged_data.family;
    const genus = mergedEntry.merged_data.genus;
    
    // Build the enriched record
    const enriched = {
        scientific_name: scientificName,
        common_names: commonNames,
        primary_common_name: commonNames[0] || null,
        
        taxonomy: {
            family: family,
            family_source: mergedEntry.merged_data.family_source,
            genus: genus,
            genus_source: mergedEntry.merged_data.genus_source
        },
        
        images: images,
        primary_image: images.find(img => img.type === 'primary') || images[0] || null,
        
        sources: sources,
        source_count: sources.length,
        confidence: calculateMergedConfidence(mergedEntry),
        
        // Keep source-specific data
        api_data: {}
    };
    
    // Add source-specific data
    sources.forEach(source => {
        if (mergedEntry[source]) {
            enriched.api_data[source] = mergedEntry[source];
        }
    });
    
    return enriched;
}

function calculateMergedConfidence(entry) {
    // Average confidence across all sources
    const scores = Object.values(entry.confidence_scores);
    const sum = scores.reduce((a, b) => a + b, 0);
    const average = sum / scores.length;
    
    // Boost for multiple sources agreeing
    const sourceBonus = (entry.sources.length - 1) * 10;
    
    return Math.min(100, Math.round(average + sourceBonus));
}
```

## Using it in main.js
```javascript
import { mergeResults, createEnrichedPlant } from './utils/merger.js';

async function searchAll(query) {
    const container = document.getElementById('results');
    
    // Fetch from all APIs in parallel
    const apiCalls = [
        searchTrefle(query).then(data => ({ data, source: 'trefle' })),
        searchGBIF(query).then(data => ({ data, source: 'gbif' }))
        // Add more as needed
    ];
    
    // Wait for all, but don't fail if one fails
    const results = await Promise.allSettled(apiCalls);
    
    // Extract successful results
    const successfulResults = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
    
    // Merge all results
    const mergedPlants = await mergeResults(successfulResults);
    
    // Display merged results
    container.innerHTML = '';
    
    for (const [scientificName, plantData] of mergedPlants) {
        const enrichedPlant = createEnrichedPlant(plantData);
        
        // Create a special card for merged data
        const card = createMergedPlantCard(enrichedPlant);
        container.appendChild(card);
    }
}

function createMergedPlantCard(plant) {
    const sources = plant.sources;
    const sourceCount = plant.source_count;
    const confidence = plant.confidence;
    const scientificName = plant.scientific_name;
    const commonNames = plant.common_names;
    const primaryImage = plant.primary_image;
    
    const card = document.createElement('div');
    card.className = 'merged-plant-card';
    
    card.innerHTML = `
        <div class="card-header">
            <h3>${scientificName}</h3>
            <div class="source-badges">
                ${sources.map(s => `<span class="badge ${s}">${s}</span>`).join('')}
            </div>
        </div>
        <div class="confidence-bar">
            <div class="confidence-fill" style="width: ${confidence}%"></div>
            <span>${confidence}% complete</span>
        </div>
        ${commonNames.length > 0 ? `
            <p class="common-names">
                Also known as: ${commonNames.join(', ')}
            </p>
        ` : ''}
        ${primaryImage ? `
            <img src="${primaryImage.url}" alt="${scientificName}">
            <small>Image from ${primaryImage.source}</small>
        ` : ''}
    `;
    
    return card;
}
```

Now you have:
- **Normalized data** from all APIs in one format
- **Merged results** that combine the best of each API
- **Confidence scoring** so you know how complete the data is
- **Source tracking** so you always know where data came from
- **De-duplication** by scientific name
- **PHP-style variables** everywhere for clarity!

The beautiful part is when GBIF has the taxonomy, iNaturalist has the photo, and Trefle has the care info - your merged card shows it all!
