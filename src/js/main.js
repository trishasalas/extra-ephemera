async function searchPlants(query = 'alocasia') {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '<p>Searching...</p>';

    try {
        const response = await fetch(`/api/trefle?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        console.log('Trefle response:', data);

        if (data.data && data.data.length > 0) {
            displayResults(data.data);
        } else {
            resultsContainer.innerHTML = '<p>No results found</p>';
        }
    } catch (error) {
        console.error('Search error:', error);
        resultsContainer.innerHTML = `<p>Error: ${error.message}</p>`;
    }
}

function displayResults(plants) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    plants.forEach(plant => {
        const card = createPlantCard(plant);
        resultsContainer.appendChild(card);
    });
}

function createPlantCard(plant) {
    const scientificName = plant.scientific_name;
    const commonName = plant.common_name || 'No common name';
    const family = plant.family;
    const genus = plant.genus;
    const imageUrl = plant.image_url;
    const trefleId = plant.id;
    const slug = plant.slug;

    const card = document.createElement('div');
    card.className = 'plant-card';

    card.innerHTML = `
        ${imageUrl ? `<img src="${imageUrl}" alt="${scientificName}">` : '<div class="no-image">No image</div>'}
        <div class="card-content">
            <h3>${scientificName}</h3>
            <p class="common-name">${commonName}</p>
            <p class="taxonomy"><strong>Family:</strong> ${family || 'Unknown'}</p>
            <p class="taxonomy"><strong>Genus:</strong> ${genus || 'Unknown'}</p>
            <button class="add-btn" data-trefle-id="${trefleId}">Add to Collection</button>
        </div>
    `;

    // Wire up the add button
    const addBtn = card.querySelector('.add-btn');
    addBtn.addEventListener('click', () => {
        addToCollection(plant, addBtn);
    });

    return card;
}

async function addToCollection(plant, button) {
    // Disable button immediately to prevent double-clicks
    button.disabled = true;
    button.textContent = 'Adding...';

    // Prepare the payload
    const payload = {
        trefle_id: plant.id,
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
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query) {
            searchPlants(query);
        }
    });

    // Do an initial search
    searchPlants('alocasia');
});
