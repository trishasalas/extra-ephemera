// Type definitions for plant detail page
interface PlantData {
    id: number;
    scientific_name: string;
    common_name?: string | null;
    family?: string | null;
    family_common_name?: string | null;
    genus?: string | null;
    image_url?: string | null;
    author?: string | null;
    bibliography?: string | null;
    year?: number | null;
    synonyms?: string[] | null;
    slug?: string | null;
    trefle_id?: number | null;
    metadata?: PlantMetadata | null;
    notes?: string | null;
    nickname?: string | null;
    location?: string | null;
    acquired_date?: string | null;
    status?: string | null;
    added_at: string;
    updated_at?: string | null;
}

interface PlantMetadata {
    patent?: {
        number?: string;
        url?: string;
        year_created?: number;
    };
    breeding?: {
        parentage?: string;
        breeder?: string;
    };
    awards?: string[];
    care?: {
        light?: string;
        water?: string;
        humidity?: string;
        soil?: string;
        pruning?: string;
        notes?: string;
    };
    source?: string;
    merged_from?: string[];
}

interface UpdatePlantPayload {
    id: number;
    scientific_name: string;
    common_name: string | null;
    genus: string | null;
    family: string | null;
    image_url: string | null;
    author: string | null;
    bibliography: string | null;
    year: number | null;
    slug: string | null;
    trefle_id: number | null;
    synonyms: string[] | null;
    metadata: PlantMetadata | null;
    notes: string | null;
    nickname: string | null;
    location: string | null;
    acquired_date: string | null;
    status: string | null;
}

interface UploadPhotoResponse {
    success: boolean;
    blobUrl: string;
    blobKey: string;
    error?: string;
}

interface GetPlantResponse {
    plant: PlantData;
    error?: string;
}

// Module state
let currentPlant: PlantData | null = null;

/**
 * Load plant data from API based on URL query parameter
 */
async function loadPlant(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    const loadingEl = document.getElementById('loading');
    const detailEl = document.getElementById('plant-detail');

    if (!loadingEl || !detailEl) return;

    if (!id) {
        loadingEl.textContent = 'No plant ID provided.';
        return;
    }

    try {
        const response = await fetch(`/api/plants/get?id=${id}`);
        const data: GetPlantResponse = await response.json();

        loadingEl.style.display = 'none';

        if (data.plant) {
            currentPlant = data.plant;
            displayPlant(data.plant);
        } else {
            detailEl.textContent = 'Plant not found.';
        }
    } catch (error) {
        console.error('Error loading plant:', error);
        loadingEl.textContent = 'Error loading plant.';
    }
}

/**
 * Display plant information in read-only view
 */
function displayPlant(plant: PlantData): void {
    const container = document.getElementById('plant-detail');
    if (!container) return;

    const displayName = plant.nickname || plant.common_name || plant.scientific_name;
    const metadata = plant.metadata || {};

    container.innerHTML = `
        <div class="plant-header">
            ${plant.image_url
                ? `<img src="${plant.image_url}" alt="${plant.scientific_name}" class="plant-image">`
                : ''
            }
            <div class="plant-title">
                <h1>${displayName}</h1>
                ${plant.nickname && plant.scientific_name !== plant.nickname
                    ? `<p class="scientific-name">${plant.scientific_name}</p>`
                    : ''
                }
                ${plant.common_name && plant.common_name !== displayName
                    ? `<p class="common-name">${plant.common_name}</p>`
                    : ''
                }
                <button id="edit-btn" class="edit-btn">Edit Plant</button>
            </div>
        </div>

        <div class="info-sections">
            <!-- Taxonomy -->
            <section class="info-section">
                <h2>Taxonomy</h2>
                <dl>
                    ${plant.family ? `<dt>Family</dt><dd>${plant.family}</dd>` : ''}
                    ${plant.genus ? `<dt>Genus</dt><dd>${plant.genus}</dd>` : ''}
                    ${plant.author ? `<dt>Author</dt><dd>${plant.author}</dd>` : ''}
                    ${plant.year ? `<dt>Year</dt><dd>${plant.year}</dd>` : ''}
                    ${plant.bibliography ? `<dt>Bibliography</dt><dd>${plant.bibliography}</dd>` : ''}
                </dl>
            </section>

            <!-- Your Plant -->
            ${plant.nickname || plant.location || plant.acquired_date || plant.status ? `
            <section class="info-section">
                <h2>Your Plant</h2>
                <dl>
                    ${plant.nickname ? `<dt>Nickname</dt><dd>${plant.nickname}</dd>` : ''}
                    ${plant.location ? `<dt>Location</dt><dd>${plant.location}</dd>` : ''}
                    ${plant.acquired_date ? `<dt>Acquired</dt><dd>${new Date(plant.acquired_date).toLocaleDateString()}</dd>` : ''}
                    ${plant.status ? `<dt>Status</dt><dd>${plant.status}</dd>` : ''}
                </dl>
            </section>
            ` : ''}

            <!-- Care -->
            ${metadata.care ? `
            <section class="info-section">
                <h2>Care</h2>
                <dl>
                    ${metadata.care.light ? `<dt>☀️ Light</dt><dd>${metadata.care.light}</dd>` : ''}
                    ${metadata.care.water ? `<dt>💧 Water</dt><dd>${metadata.care.water}</dd>` : ''}
                    ${metadata.care.pruning ? `<dt>✂️ Pruning</dt><dd>${metadata.care.pruning}</dd>` : ''}
                    ${metadata.care.humidity ? `<dt>☁️ Humidity</dt><dd>${metadata.care.humidity}</dd>` : ''}
                    ${metadata.care.soil ? `<dt>🪴Soil</dt><dd>${metadata.care.soil}</dd>` : ''}
                    ${metadata.care.notes ? `<dt>Notes</dt><dd>${metadata.care.notes}</dd>` : ''}
                </dl>
            </section>
            ` : ''}

            <!-- Notes -->
            ${plant.notes ? `
            <section class="info-section">
                <h2>Reference Notes</h2>
                <div class="notes-content">${plant.notes.replace(/\n/g, '<br>')}</div>
            </section>
            ` : ''}

            <!-- Synonyms -->
            ${plant.synonyms && plant.synonyms.length > 0 ? `
            <section class="info-section">
                <h2>Synonyms</h2>
                <p class="synonyms">${plant.synonyms.join(', ')}</p>
            </section>
            ` : ''}
        </div>

        <!-- Patent/Breeding -->
        ${metadata.patent || metadata.breeding || metadata.awards ? `
        <section class="info-section">
            <h2>Patent & Breeding</h2>
            <dl>
                ${metadata.patent?.number ? `<dt>Patent</dt><dd>${metadata.patent.url ? `<a href="${metadata.patent.url}" target="_blank">${metadata.patent.number}</a>` : metadata.patent.number}</dd>` : ''}
                ${metadata.patent?.year_created ? `<dt>Year Created</dt><dd>${metadata.patent.year_created}</dd>` : ''}
                ${metadata.breeding?.parentage ? `<dt>Parentage</dt><dd>${metadata.breeding.parentage}</dd>` : ''}
                ${metadata.breeding?.breeder ? `<dt>Breeder</dt><dd>${metadata.breeding.breeder}</dd>` : ''}
                ${metadata.awards ? `<dt>Awards</dt><dd>${metadata.awards.join(', ')}</dd>` : ''}
            </dl>
        </section>
        ` : ''}

        <!-- Welcome to the Nook! -->
        <div class="meta-info">
            <p>Added: ${new Date(plant.added_at).toLocaleDateString()}</p>
            ${plant.updated_at ? `<p>Updated: ${new Date(plant.updated_at).toLocaleDateString()}</p>` : ''}
            ${plant.trefle_id ? `<p>Trefle ID: ${plant.trefle_id}</p>` : ''}
        </div>
    `;

    const editBtn = document.getElementById('edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', showEditForm);
    }
}

/**
 * Show the edit form (replaces display view)
 */
function showEditForm(): void {
    const container = document.getElementById('plant-detail');
    if (!container || !currentPlant) return;

    const plant = currentPlant;
    const metadata = plant.metadata || {};

    container.innerHTML = `
        <form id="edit-form" class="edit-form">
            <h1>Edit Plant</h1>

            <div class="form-section">
                <h2>Plant Identity</h2>

                <div class="form-group">
                    <label for="scientific_name">Scientific Name *</label>
                    <input type="text" id="scientific_name" name="scientific_name" required
                        value="${plant.scientific_name || ''}">
                </div>

                <div class="form-group">
                    <label for="common_name">Common Name</label>
                    <input type="text" id="common_name" name="common_name"
                        value="${plant.common_name || ''}">
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="genus">Genus</label>
                        <input type="text" id="genus" name="genus"
                            value="${plant.genus || ''}">
                    </div>

                    <div class="form-group">
                        <label for="family">Family</label>
                        <input type="text" id="family" name="family"
                            value="${plant.family || ''}">
                    </div>
                </div>

            </div>

            <div class="form-section">
                <h2>Plant Image</h2>

                ${plant.image_url ? `
                    <div class="current-image-preview">
                        <img src="${plant.image_url}" alt="Current plant image" style="max-width: 300px; max-height: 300px; border-radius: 8px;">
                        <p class="image-source-note">Current image</p>
                    </div>
                ` : ''}

                <div class="form-group">
                    <label for="photo_upload">Upload New Photo</label>
                    <input
                        type="file"
                        id="photo_upload"
                        name="photo_upload"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    >
                    <small class="help-text">Upload your own photo (JPEG, PNG, WebP, or GIF, max 5MB). This will replace the current image.</small>
                </div>

                <div id="upload_preview" class="upload-preview" style="display: none;">
                    <img id="preview_image" alt="Upload preview" style="max-width: 300px; max-height: 300px; border-radius: 8px; margin-top: 0.5rem;">
                </div>

                <div id="upload_status" class="upload-status"></div>

                <div class="form-divider">
                    <span>OR</span>
                </div>

                <div class="form-group">
                    <label for="image_url">Image URL</label>
                    <input type="url" id="image_url" name="image_url"
                        value="${plant.image_url || ''}">
                    <small class="help-text">Enter an external image URL (e.g., from plant APIs)</small>
                </div>
            </div>

            <div class="form-section">
                <h2>Botanical Details</h2>

                <div class="form-row">
                    <div class="form-group">
                        <label for="author">Author</label>
                        <input type="text" id="author" name="author"
                            value="${plant.author || ''}">
                    </div>

                    <div class="form-group">
                        <label for="year">Year</label>
                        <input type="number" id="year" name="year"
                            value="${plant.year || ''}">
                    </div>
                </div>

                <div class="form-group">
                    <label for="bibliography">Bibliography</label>
                    <input type="text" id="bibliography" name="bibliography"
                        value="${plant.bibliography || ''}">
                </div>
            </div>

            <div class="form-section">
                <h2>Patent & Breeding Info</h2>

                <div class="form-row">
                    <div class="form-group">
                        <label for="patent_number">Patent Number</label>
                        <input type="text" id="patent_number" name="patent_number"
                            value="${metadata.patent?.number || ''}">
                    </div>

                    <div class="form-group">
                        <label for="year_created">Year Created</label>
                        <input type="number" id="year_created" name="year_created"
                            value="${metadata.patent?.year_created || ''}">
                    </div>
                </div>

                <div class="form-group">
                    <label for="patent_url">Patent URL</label>
                    <input type="url" id="patent_url" name="patent_url"
                        value="${metadata.patent?.url || ''}">
                </div>

                <div class="form-group">
                    <label for="parentage">Parentage</label>
                    <input type="text" id="parentage" name="parentage"
                        value="${metadata.breeding?.parentage || ''}">
                </div>

                <div class="form-group">
                    <label for="breeder">Breeder</label>
                    <input type="text" id="breeder" name="breeder"
                        value="${metadata.breeding?.breeder || ''}">
                </div>

                <div class="form-group">
                    <label for="awards">Awards</label>
                    <input type="text" id="awards" name="awards"
                        value="${metadata.awards?.join(', ') || ''}">
                </div>
            </div>

            <div class="form-section">
                <h2>Care Information</h2>

                <div class="form-row">
                    <div class="form-group">
                        <label for="care_light">Light</label>
                        <input type="text" id="care_light" name="care_light"
                            value="${metadata.care?.light || ''}">
                    </div>

                    <div class="form-group">
                        <label for="care_humidity">Humidity</label>
                        <input type="text" id="care_humidity" name="care_humidity"
                            value="${metadata.care?.humidity || ''}">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="care_water">Water</label>
                        <input type="text" id="care_water" name="care_water"
                            value="${metadata.care?.water || ''}">
                    </div>

                    <div class="form-group">
                        <label for="care_soil">Soil</label>
                        <input type="text" id="care_soil" name="care_soil"
                            value="${metadata.care?.soil || ''}">
                    </div>
                </div>

                <div class="form-group">
                    <label for="care_pruning">Pruning</label>
                    <input type="text" id="care_pruning" name="care_pruning"
                        value="${metadata.care?.pruning || ''}">
                </div>

                <div class="form-group">
                    <label for="care_notes">Care Notes</label>
                    <input type="text" id="care_notes" name="care_notes"
                        value="${metadata.care?.notes || ''}">
                </div>
            </div>

            <div class="form-section">
                <h2>Reference Notes</h2>

                <div class="form-group">
                    <textarea id="notes" name="notes" rows="6">${plant.notes || ''}</textarea>
                </div>
            </div>

            <div class="form-section">
                <h2>Your Plant</h2>

                <div class="form-group">
                    <label for="nickname">Nickname</label>
                    <input type="text" id="nickname" name="nickname"
                        value="${plant.nickname || ''}">
                </div>

                <div class="form-group">
                    <label for="location">Location</label>
                    <input type="text" id="location" name="location"
                        value="${plant.location || ''}">
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="acquired_date">Acquired Date</label>
                        <input type="date" id="acquired_date" name="acquired_date"
                            value="${plant.acquired_date ? plant.acquired_date.split('T')[0] : ''}">
                    </div>

                    <div class="form-group">
                        <label for="status">Status</label>
                        <input type="text" id="status" name="status" list="status-options"
                            value="${plant.status || ''}">
                        <datalist id="status-options">
                            <option value="thriving">
                            <option value="settling in">
                            <option value="struggling">
                            <option value="recovering">
                            <option value="dormant">
                            <option value="wishlist">
                            <option value="deceased">
                        </datalist>
                    </div>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="cancel-btn" id="cancel-btn">Cancel</button>
                <button type="submit" class="save-btn">Save Changes</button>
            </div>

            <div id="form-message" class="form-message"></div>
        </form>
    `;

    const cancelBtn = document.getElementById('cancel-btn');
    const editForm = document.getElementById('edit-form') as HTMLFormElement;

    if (cancelBtn && currentPlant) {
        cancelBtn.addEventListener('click', () => displayPlant(currentPlant!));
    }
    if (editForm) {
        editForm.addEventListener('submit', handleSave);
    }

    // Handle file input preview
    setupPhotoPreview();
}

/**
 * Setup photo upload preview functionality
 */
function setupPhotoPreview(): void {
    const photoInput = document.getElementById('photo_upload') as HTMLInputElement;
    const previewContainer = document.getElementById('upload_preview');
    const previewImage = document.getElementById('preview_image') as HTMLImageElement;

    if (!photoInput || !previewContainer || !previewImage) return;

    photoInput.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
            previewContainer.style.display = 'none';
            return;
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            alert('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.');
            photoInput.value = '';
            previewContainer.style.display = 'none';
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File too large. Maximum size is 5MB.');
            photoInput.value = '';
            previewContainer.style.display = 'none';
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = (event) => {
            previewImage.src = event.target?.result as string;
            previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);

        // Clear the URL input if file is selected
        const urlInput = document.getElementById('image_url') as HTMLInputElement;
        if (urlInput) {
            urlInput.value = '';
        }
    });
}

/**
 * Build metadata object from form data
 */
function buildMetadata(formData: FormData, currentMetadata: PlantMetadata | null): PlantMetadata | null {
    const metadata: PlantMetadata = {};

    // Patent information
    const patentNumber = formData.get('patent_number') as string | null;
    const patentUrl = formData.get('patent_url') as string | null;
    const yearCreatedStr = formData.get('year_created') as string | null;

    if (patentNumber || patentUrl || yearCreatedStr) {
        metadata.patent = {};
        if (patentNumber) metadata.patent.number = patentNumber;
        if (patentUrl) metadata.patent.url = patentUrl;
        if (yearCreatedStr) metadata.patent.year_created = parseInt(yearCreatedStr, 10);
    }

    // Breeding information
    const parentage = formData.get('parentage') as string | null;
    const breeder = formData.get('breeder') as string | null;

    if (parentage || breeder) {
        metadata.breeding = {};
        if (parentage) metadata.breeding.parentage = parentage;
        if (breeder) metadata.breeding.breeder = breeder;
    }

    // Awards
    const awardsStr = formData.get('awards') as string | null;
    if (awardsStr) {
        metadata.awards = awardsStr.split(',').map(a => a.trim()).filter(a => a);
    }

    // Care information
    const careLight = formData.get('care_light') as string | null;
    const careHumidity = formData.get('care_humidity') as string | null;
    const careWater = formData.get('care_water') as string | null;
    const careSoil = formData.get('care_soil') as string | null;
    const carePruning = formData.get('care_pruning') as string | null;
    const careNotes = formData.get('care_notes') as string | null;

    if (careLight || careHumidity || careWater || careSoil || carePruning || careNotes) {
        metadata.care = {};
        if (careLight) metadata.care.light = careLight;
        if (careHumidity) metadata.care.humidity = careHumidity;
        if (careWater) metadata.care.water = careWater;
        if (careSoil) metadata.care.soil = careSoil;
        if (carePruning) metadata.care.pruning = carePruning;
        if (careNotes) metadata.care.notes = careNotes;
    }

    // Preserve existing source data
    if (currentMetadata?.source) {
        metadata.source = currentMetadata.source;
    }
    if (currentMetadata?.merged_from) {
        metadata.merged_from = currentMetadata.merged_from;
    }

    // Return null if metadata is empty (excluding preserved fields)
    return Object.keys(metadata).length > 0 ? metadata : null;
}

/**
 * Handle form submission to update plant
 */
async function handleSave(e: Event): Promise<void> {
    e.preventDefault();

    if (!currentPlant) return;

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const message = document.getElementById('form-message');
    const saveBtn = form.querySelector('.save-btn') as HTMLButtonElement;
    const statusEl = document.getElementById('upload_status');

    if (!message || !saveBtn) return;

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    message.textContent = '';
    message.className = 'form-message';

    // Handle photo upload if file is selected
    let finalImageUrl = formData.get('image_url') as string | null;
    const photoFile = formData.get('photo_upload') as File | null;

    if (photoFile && photoFile.size > 0) {
        // Upload photo to Netlify Blobs
        if (statusEl) {
            statusEl.textContent = 'Uploading photo...';
            statusEl.className = 'upload-status uploading';
        }

        try {
            const uploadFormData = new FormData();
            uploadFormData.append('photo', photoFile);
            uploadFormData.append('plantId', currentPlant.id.toString());

            const uploadResponse = await fetch('/api/plants/upload-photo', {
                method: 'POST',
                body: uploadFormData
            });

            const uploadResult: UploadPhotoResponse = await uploadResponse.json();

            if (uploadResponse.ok && uploadResult.success) {
                finalImageUrl = uploadResult.blobUrl;
                if (statusEl) {
                    statusEl.textContent = 'Photo uploaded successfully!';
                    statusEl.className = 'upload-status success';
                }
            } else {
                throw new Error(uploadResult.error || 'Failed to upload photo');
            }
        } catch (uploadError) {
            console.error('Error uploading photo:', uploadError);
            message.textContent = `Photo upload failed: ${(uploadError as Error).message}`;
            message.classList.add('error');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
            if (statusEl) {
                statusEl.textContent = '';
            }
            return; // Don't proceed with plant update if upload fails
        }
    }

    // Build the update payload with proper types
    const yearStr = formData.get('year') as string | null;

    const payload: UpdatePlantPayload = {
        id: currentPlant.id,
        scientific_name: formData.get('scientific_name') as string,
        common_name: (formData.get('common_name') as string) || null,
        genus: (formData.get('genus') as string) || null,
        family: (formData.get('family') as string) || null,
        image_url: finalImageUrl,
        author: (formData.get('author') as string) || null,
        bibliography: (formData.get('bibliography') as string) || null,
        year: yearStr ? parseInt(yearStr, 10) : null,
        slug: currentPlant.slug,
        trefle_id: currentPlant.trefle_id,
        synonyms: currentPlant.synonyms,
        metadata: buildMetadata(formData, currentPlant.metadata),
        notes: (formData.get('notes') as string) || null,
        nickname: (formData.get('nickname') as string) || null,
        location: (formData.get('location') as string) || null,
        acquired_date: (formData.get('acquired_date') as string) || null,
        status: (formData.get('status') as string) || null,
    };

    try {
        const response = await fetch('/api/plants/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (response.ok) {
            // Reload plant data and show display view
            const refreshResponse = await fetch(`/api/plants/get?id=${currentPlant.id}`);
            const refreshData: GetPlantResponse = await refreshResponse.json();
            currentPlant = refreshData.plant;
            displayPlant(currentPlant);
        } else {
            message.textContent = `Error: ${result.error || 'Unknown error occurred'}`;
            message.classList.add('error');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    } catch (error) {
        console.error('Error saving:', error);
        message.textContent = `Error: ${(error as Error).message}`;
        message.classList.add('error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', loadPlant);
