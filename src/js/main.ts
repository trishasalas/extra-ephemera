interface PlantSearchResult {
    id: number | string;
    source?: 'trefle' | 'perenual';
    slug: string | null;
    scientific_name: string;
    common_name?: string | null;
    family?: string | null;
    family_common_name?: string | null;
    genus?: string | null;
    image_url?: string | null;
    year?: number | null;
    bibliography?: string | null;
    author?: string | null;
    synonyms?: string[] | null;
}

async function searchPlants(query: string = 'alocasia', apiSource: 'trefle' | 'perenual' = 'trefle') {
    const resultsContainer = document.getElementById('results');
    if (!resultsContainer) return;

    resultsContainer.textContent = 'Searching...';

    const endpoint = apiSource === 'trefle' ? '/api/trefle' : '/api/perenual';

    try {
        const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        console.log(`${apiSource} response:`, data);

        if (data.data && data.data.length > 0) {
            displayResults(data.data);
        } else {
            resultsContainer.textContent = 'No results found';
        }
    } catch (error) {
        console.error('Search error:', error);
        resultsContainer.textContent = `Error: ${(error as Error).message}`;
    }
}

function displayResults(plants: PlantSearchResult[]) {
    const resultsContainer = document.getElementById('results');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = '';

    plants.forEach(plant => {
        const card = createPlantCard(plant);
        resultsContainer.appendChild(card);
    });
}

function createPlantCard(plant: PlantSearchResult): HTMLElement {
    // Get the template and verify it exists
    const template = document.getElementById('search-result-template') as HTMLTemplateElement;
    if (!template) throw new Error('Template not found');

    // Clone the template content
    const card = template.content.cloneNode(true) as DocumentFragment;

    // Get the card element we'll return (we control the template, so we know it exists)
    const cardEl = card.querySelector('.plant-card') as HTMLElement;

    // Handle image - Type assertions are safe here because we control the template HTML
    const img = card.querySelector('.card-image') as HTMLImageElement;
    const noImage = card.querySelector('.no-image') as HTMLElement;
    if (plant.image_url) {
        img.src = plant.image_url;
        img.alt = plant.scientific_name;
        noImage.remove();
    } else {
        img.remove();
    }

    // Set plant info - These elements always exist in our template
    const scientificNameEl = card.querySelector('.scientific-name') as HTMLElement;
    scientificNameEl.textContent = plant.scientific_name;

    const commonNameEl = card.querySelector('.common-name') as HTMLElement;
    commonNameEl.textContent = plant.common_name || 'No common name';

    // Handle optional family field
    const familyEl = card.querySelector('.family') as HTMLElement;
    const familyValue = card.querySelector('.family-value') as HTMLElement;
    if (plant.family) {
        familyValue.textContent = plant.family;
    } else {
        familyEl.remove();
    }

    // Handle optional genus field
    const genusEl = card.querySelector('.genus') as HTMLElement;
    const genusValue = card.querySelector('.genus-value') as HTMLElement;
    if (plant.genus) {
        genusValue.textContent = plant.genus;
    } else {
        genusEl.remove();
    }

    // Wire up the add button
    const addBtn = card.querySelector('.add-btn') as HTMLButtonElement;
    addBtn.addEventListener('click', () => {
        addToCollection(plant, addBtn);
    });

    return cardEl;
}

async function addToCollection(plant: PlantSearchResult, button: HTMLButtonElement) {
    // Disable button immediately to prevent double-clicks
    button.disabled = true;
    button.textContent = 'Adding...';

    // Prepare the payload - handle both Trefle and Perenual sources
    const payload = {
        // Use source-specific ID field name for tracking
        ...(plant.source === 'perenual' && { perenual_id: plant.id }),
        ...(plant.source === 'trefle' && { trefle_id: plant.id }),

        slug: plant.slug,
        scientific_name: plant.scientific_name,
        common_name: plant.common_name,
        family: plant.family,
        family_common_name: plant.family_common_name,
        genus: plant.genus,
        image_url: plant.image_url,
        year: plant.year,
        bibliography: plant.bibliography,
        author: plant.author,
        synonyms: plant.synonyms || [],

        // Store source in metadata for tracking
        metadata: {
            source: plant.source
        }
    };

    console.log('Adding to collection:', payload);

    try {
        const response = await fetch('/api/plants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (response.ok) {
            console.log('Plant added successfully:', result);
            button.textContent = 'Added ✓';
            button.classList.add('added');
        } else {
            console.error('Failed to add plant:', result);
            button.textContent = 'Error - Retry?';
            button.disabled = false;
        }
    } catch (error) {
        console.error('Network error:', error);
        button.textContent = 'Error - Retry?';
        button.disabled = false;
    }
}

// Wire up the search form
document.addEventListener('DOMContentLoaded', () => {
    // Type assertion: We know these elements exist in index.astro
    // HTMLFormElement gives us access to form-specific properties
    const searchForm = document.getElementById('search-form') as HTMLFormElement;

    // HTMLInputElement gives us access to .value property
    const searchInput = document.getElementById('search-input') as HTMLInputElement;

    // Get radio buttons for API selection
    const trefleRadio = document.getElementById('api-trefle') as HTMLInputElement;
    const perenualRadio = document.getElementById('api-perenual') as HTMLInputElement;

    // Null check: Early return if elements don't exist (defensive programming)
    if (!searchForm || !searchInput || !trefleRadio || !perenualRadio) return;

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Now TypeScript knows searchInput.value is a string (not potentially null)
        const query = searchInput.value.trim();
        const apiSource = trefleRadio.checked ? 'trefle' : 'perenual';

        if (query) {
            searchPlants(query, apiSource);
        }
    });

    // Do an initial search with Trefle
    searchPlants('alocasia', 'trefle');
});
