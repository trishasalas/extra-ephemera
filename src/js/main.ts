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
    perenual_id?: number;
    trefle_id?: number;
    metadata?: any;
    care_guide?: {
        watering?: string;
        sunlight?: string[];
        pruning?: string;
        hardiness?: {
            min?: string;
            max?: string;
        };
    };
}

interface ComparisonResult {
    original: PlantSearchResult;
    matched: PlantSearchResult | null;
    merged: PlantSearchResult;
    differences: Set<keyof PlantSearchResult>;
}

async function searchPlants(query: string = '', apiSource: 'trefle' | 'perenual' = 'trefle') {
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

    // Wire up the compare button
    const compareBtn = card.querySelector('.compare-btn') as HTMLButtonElement;
    const currentSource = plant.source || 'trefle';
    const otherSource = currentSource === 'trefle' ? 'perenual' : 'trefle';
    compareBtn.textContent = `Compare`;

    compareBtn.addEventListener('click', () => {
        openComparisonModal(plant, otherSource);
    });

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

    // Prepare the payload - handle both Trefle and Perenual sources, including merged plants
    const payload = {
        // Handle merged plants with both IDs
        ...(plant.perenual_id && { perenual_id: plant.perenual_id }),
        ...(plant.trefle_id && { trefle_id: plant.trefle_id }),
        ...(plant.source === 'perenual' && !plant.perenual_id && { perenual_id: plant.id }),
        ...(plant.source === 'trefle' && !plant.trefle_id && { trefle_id: plant.id }),

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

        // Store source and map care_guide to care fields
        metadata: {
            ...(plant.metadata || { source: plant.source }),
            ...(plant.care_guide && {
                care: {
                    water: plant.care_guide.watering || null,
                    light: plant.care_guide.sunlight ? plant.care_guide.sunlight.join(', ') : null,
                    pruning: plant.care_guide.pruning || null
                }
            })
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

async function fetchPerenualCareGuide(speciesId: number | string): Promise<any> {
    try {
        const response = await fetch(`/api/perenual-care?species_id=${speciesId}`);

        // Check for rate limiting
        if (response.status === 429) {
            console.warn('Rate limit exceeded for Perenual API - care guide unavailable');
            return null;
        }

        const data = await response.json();

        // Check for error responses
        if (data.error || data.message) {
            console.warn('Perenual care guide error:', data.error || data.message);
            return null;
        }

        if (!data.data || data.data.length === 0) {
            console.log('No care guide data found for species:', speciesId);
            return null;
        }

        // Extract care guide information
        const careData = data.data[0];
        console.log('Care data received:', careData);

        // Parse the sections
        const sections = careData.section || [];

        return {
            watering: sections.find((s: any) => s.type === 'watering')?.description || null,
            sunlight: sections.find((s: any) => s.type === 'sunlight')?.description?.split(',').map((s: string) => s.trim()) || null,
            pruning: sections.find((s: any) => s.type === 'pruning')?.description || null,
            hardiness: {
                min: sections.find((s: any) => s.type === 'hardiness')?.description?.match(/(\d+[a-z]?)/i)?.[0] || null,
                max: sections.find((s: any) => s.type === 'hardiness')?.description?.match(/to (\d+[a-z]?)/i)?.[1] || null,
            }
        };
    } catch (error) {
        console.error('Failed to fetch care guide:', error);
        return null;
    }
}

async function searchOtherApi(scientificName: string, apiSource: 'trefle' | 'perenual'): Promise<PlantSearchResult | null> {
    const endpoint = apiSource === 'trefle' ? '/api/trefle' : '/api/perenual';
    const response = await fetch(`${endpoint}?q=${encodeURIComponent(scientificName)}`);
    const data = await response.json();

    if (!data.data || data.data.length === 0) return null;

    // Find best match
    const exactMatch = data.data.find((p: PlantSearchResult) =>
        p.scientific_name.toLowerCase() === scientificName.toLowerCase()
    );
    let matchedPlant = exactMatch;

    if (!matchedPlant) {
        const genusName = scientificName.split(' ')[0].toLowerCase();
        const genusMatch = data.data.find((p: PlantSearchResult) =>
            p.scientific_name.toLowerCase().startsWith(genusName)
        );
        matchedPlant = genusMatch || data.data[0];
    }

    // If it's Perenual, fetch care guide data
    if (matchedPlant && apiSource === 'perenual') {
        const careGuide = await fetchPerenualCareGuide(matchedPlant.id);
        if (careGuide) {
            matchedPlant.care_guide = careGuide;
        }
    }

    return matchedPlant;
}

function smartMergePlants(plant1: PlantSearchResult, plant2: PlantSearchResult): ComparisonResult {
    const merged: any = { ...plant1 };
    const differences = new Set<keyof PlantSearchResult>();

    const textFields: (keyof PlantSearchResult)[] = [
        'scientific_name', 'common_name', 'family', 'family_common_name',
        'genus', 'bibliography', 'author'
    ];

    textFields.forEach(field => {
        const val1 = plant1[field];
        const val2 = plant2[field];

        if (val1 !== val2) differences.add(field);

        // Prefer non-null
        if (!val1 && val2) {
            merged[field] = val2;
        } else if (val1 && val2) {
            // Prefer longer text
            merged[field] = String(val2).length > String(val1).length ? val2 : val1;
        }
    });

    // Image: prefer whichever has one
    if (plant1.image_url !== plant2.image_url) {
        differences.add('image_url');
        merged.image_url = plant2.image_url || plant1.image_url;
    }

    // Synonyms: merge arrays
    if (plant1.synonyms || plant2.synonyms) {
        const combined = [...new Set([...(plant1.synonyms || []), ...(plant2.synonyms || [])])];
        merged.synonyms = combined.length > 0 ? combined : null;
        if (JSON.stringify(plant1.synonyms) !== JSON.stringify(plant2.synonyms)) {
            differences.add('synonyms');
        }
    }

    // Care guide: prefer non-null
    if (plant1.care_guide || plant2.care_guide) {
        merged.care_guide = plant2.care_guide || plant1.care_guide;
        if (JSON.stringify(plant1.care_guide) !== JSON.stringify(plant2.care_guide)) {
            differences.add('care_guide');
        }
    }

    // Store both IDs
    merged.trefle_id = plant1.source === 'trefle' ? plant1.id : plant2.source === 'trefle' ? plant2.id : null;
    merged.perenual_id = plant1.source === 'perenual' ? plant1.id : plant2.source === 'perenual' ? plant2.id : null;
    merged.metadata = { merged_from: [plant1.source, plant2.source] };

    return { original: plant1, matched: plant2, merged, differences };
}

async function openComparisonModal(originalPlant: PlantSearchResult, targetApi: 'trefle' | 'perenual') {
    const modal = document.getElementById('comparison-modal') as HTMLDialogElement;
    if (!modal) return;

    // Wire up close/cancel buttons once when modal opens
    modal.querySelectorAll('.cancel-btn, .modal-close').forEach(btn => {
        (btn as HTMLButtonElement).onclick = () => modal.close();
    });

    showModalLoading(modal, targetApi);
    modal.showModal();

    try {
        const matchedPlant = await searchOtherApi(originalPlant.scientific_name, targetApi);

        if (!matchedPlant) {
            showModalError(modal, `No matching plant found in ${targetApi}`);
            return;
        }

        const comparisonResult = smartMergePlants(originalPlant, matchedPlant);
        displayComparison(modal, comparisonResult);

    } catch (error) {
        showModalError(modal, `Failed to search ${targetApi}: ${(error as Error).message}`);
    }
}

function displayComparison(modal: HTMLDialogElement, result: ComparisonResult) {
    const loading = modal.querySelector('.comparison-loading') as HTMLElement;
    const content = modal.querySelector('.comparison-content') as HTMLElement;
    loading.style.display = 'none';
    content.style.display = 'block';

    // Update headers
    const col1 = modal.querySelector('.source-col-1') as HTMLElement;
    const col2 = modal.querySelector('.source-col-2') as HTMLElement;
    col1.textContent = result.original.source?.toUpperCase() || 'SOURCE 1';
    col2.textContent = result.matched?.source?.toUpperCase() || 'SOURCE 2';

    // Populate table
    const tbody = modal.querySelector('#comparison-rows') as HTMLElement;
    tbody.innerHTML = '';

    const fields: (keyof PlantSearchResult)[] = [
        'scientific_name', 'common_name', 'family', 'genus', 'image_url', 'author', 'bibliography'
    ];

    fields.forEach(field => {
        const row = createComparisonRow(
            field,
            result.original[field],
            result.matched?.[field],
            result.merged[field],
            result.differences.has(field)
        );
        tbody.appendChild(row);
    });

    // Add care guide rows if either plant has care data
    if (result.original.care_guide || result.matched?.care_guide) {
        // Watering
        const wateringRow = createComparisonRow(
            'care_guide' as keyof PlantSearchResult,
            result.original.care_guide?.watering,
            result.matched?.care_guide?.watering,
            result.merged.care_guide?.watering,
            result.differences.has('care_guide'),
            'Watering'
        );
        tbody.appendChild(wateringRow);

        // Sunlight
        const sunlightRow = createComparisonRow(
            'care_guide' as keyof PlantSearchResult,
            result.original.care_guide?.sunlight,
            result.matched?.care_guide?.sunlight,
            result.merged.care_guide?.sunlight,
            result.differences.has('care_guide'),
            'Sunlight'
        );
        tbody.appendChild(sunlightRow);

        // Pruning
        const pruningRow = createComparisonRow(
            'care_guide' as keyof PlantSearchResult,
            result.original.care_guide?.pruning,
            result.matched?.care_guide?.pruning,
            result.merged.care_guide?.pruning,
            result.differences.has('care_guide'),
            'Pruning'
        );
        tbody.appendChild(pruningRow);

        // Hardiness
        const hardinessValue1 = result.original.care_guide?.hardiness?.min && result.original.care_guide?.hardiness?.max
            ? `${result.original.care_guide.hardiness.min} - ${result.original.care_guide.hardiness.max}`
            : null;
        const hardinessValue2 = result.matched?.care_guide?.hardiness?.min && result.matched?.care_guide?.hardiness?.max
            ? `${result.matched.care_guide.hardiness.min} - ${result.matched.care_guide.hardiness.max}`
            : null;
        const mergedHardinessValue = result.merged.care_guide?.hardiness?.min && result.merged.care_guide?.hardiness?.max
            ? `${result.merged.care_guide.hardiness.min} - ${result.merged.care_guide.hardiness.max}`
            : null;

        const hardinessRow = createComparisonRow(
            'care_guide' as keyof PlantSearchResult,
            hardinessValue1,
            hardinessValue2,
            mergedHardinessValue,
            result.differences.has('care_guide'),
            'Hardiness Zones'
        );
        tbody.appendChild(hardinessRow);
    }

    // Preview
    displayPreview(modal, result.merged);

    // Wire save button
    const saveBtn = modal.querySelector('.save-merged-btn') as HTMLButtonElement;
    saveBtn.onclick = () => {
        addToCollection(result.merged, saveBtn);
        modal.close();
    };
}

function createComparisonRow(fieldName: keyof PlantSearchResult, val1: any, val2: any, merged: any, isDifferent: boolean, customLabel?: string): HTMLElement {
    const template = document.getElementById('comparison-row-template') as HTMLTemplateElement;
    const row = template.content.cloneNode(true) as DocumentFragment;
    const tr = row.querySelector('tr') as HTMLElement;

    if (isDifferent) tr.classList.add('different');

    const fieldLabel = row.querySelector('.field-name') as HTMLElement;
    fieldLabel.textContent = customLabel || String(fieldName).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const val1El = row.querySelector('.value-1') as HTMLElement;
    const val2El = row.querySelector('.value-2') as HTMLElement;
    const mergedEl = row.querySelector('.merged-value') as HTMLElement;

    const format = (v: any) => {
        if (v === null || v === undefined) return '—';
        if (Array.isArray(v)) return v.join(', ') || '—';
        if (fieldName === 'image_url') return v ? '✓ Yes' : '—';
        return String(v);
    };

    val1El.textContent = format(val1);
    val2El.textContent = format(val2);
    mergedEl.textContent = format(merged);

    return tr;
}

function displayPreview(modal: HTMLDialogElement, merged: PlantSearchResult) {
    const preview = modal.querySelector('.preview-card') as HTMLElement;
    preview.innerHTML = `
        ${merged.image_url
            ? `<img src="${merged.image_url}" alt="${merged.scientific_name}" style="width:100px;height:100px;object-fit:cover;border-radius:6px;">`
            : '<div style="width:100px;height:100px;background:#e0e0e0;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#888;">No image</div>'}
        <div>
            <h4 style="margin:0 0 0.5rem;font-style:italic;">${merged.scientific_name}</h4>
            <p style="margin:0;color:#666;">${merged.common_name || 'No common name'}</p>
        </div>
    `;
    preview.style.display = 'flex';
    preview.style.gap = '1rem';
    preview.style.padding = '1rem';
    preview.style.background = '#f5f7f5';
    preview.style.borderRadius = '8px';
}

function showModalLoading(modal: HTMLDialogElement, apiName: string) {
    const loading = modal.querySelector('.comparison-loading') as HTMLElement;
    const content = modal.querySelector('.comparison-content') as HTMLElement;
    const error = modal.querySelector('.comparison-error') as HTMLElement;

    loading.style.display = 'block';
    content.style.display = 'none';
    error.style.display = 'none';

    loading.querySelector('p')!.textContent = `Searching ${apiName}...`;
}

function showModalError(modal: HTMLDialogElement, message: string) {
    const loading = modal.querySelector('.comparison-loading') as HTMLElement;
    const content = modal.querySelector('.comparison-content') as HTMLElement;
    const error = modal.querySelector('.comparison-error') as HTMLElement;

    loading.style.display = 'none';
    content.style.display = 'none';
    error.style.display = 'block';

    error.querySelector('.error-message')!.textContent = message;
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
