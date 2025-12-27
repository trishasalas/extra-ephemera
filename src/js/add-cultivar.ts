// Type definitions for cultivar form data
interface CultivarMetadata {
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
        humidity?: string;
        water?: string;
        soil?: string;
        notes?: string;
    };
}

interface CultivarPayload {
    scientific_name: string;
    common_name: string | null;
    genus: string | null;
    family: string | null;
    metadata: CultivarMetadata | null;
    notes: string | null;
    nickname: string | null;
    location: string | null;
    acquired_date: string | null;
    status: string | null;
}

interface AddPlantResponse {
    plant: {
        id: number;
        scientific_name: string;
        [key: string]: any;
    };
    error?: string;
}

/**
 * Build metadata object from form data
 */
function buildMetadata(formData: FormData): CultivarMetadata | null {
    const metadata: CultivarMetadata = {};

    // Patent information
    const patentNumber = formData.get('patent_number') as string | null;
    const patentUrl = formData.get('patent_url') as string | null;
    const yearCreated = formData.get('year_created') as string | null;

    if (patentNumber || patentUrl || yearCreated) {
        metadata.patent = {};
        if (patentNumber) metadata.patent.number = patentNumber;
        if (patentUrl) metadata.patent.url = patentUrl;
        if (yearCreated) metadata.patent.year_created = parseInt(yearCreated, 10);
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
    const awards = formData.get('awards') as string | null;
    if (awards) {
        metadata.awards = [awards]; // Array for multiple awards in the future
    }

    // Care information
    const careLight = formData.get('care_light') as string | null;
    const careHumidity = formData.get('care_humidity') as string | null;
    const careWater = formData.get('care_water') as string | null;
    const careSoil = formData.get('care_soil') as string | null;
    const careNotes = formData.get('care_notes') as string | null;

    if (careLight || careHumidity || careWater || careSoil || careNotes) {
        metadata.care = {};
        if (careLight) metadata.care.light = careLight;
        if (careHumidity) metadata.care.humidity = careHumidity;
        if (careWater) metadata.care.water = careWater;
        if (careSoil) metadata.care.soil = careSoil;
        if (careNotes) metadata.care.notes = careNotes;
    }

    // Return null if metadata is empty
    return Object.keys(metadata).length > 0 ? metadata : null;
}

/**
 * Submit cultivar form to API
 */
async function handleCultivarSubmit(e: Event): Promise<void> {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const submitBtn = form.querySelector('.submit-btn') as HTMLButtonElement;
    const message = document.getElementById('form-message') as HTMLElement;

    if (!submitBtn || !message) return;

    // Update UI to show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';
    message.textContent = '';
    message.className = 'form-message';

    const formData = new FormData(form);

    // Build the payload with proper types
    const payload: CultivarPayload = {
        scientific_name: formData.get('scientific_name') as string,
        common_name: (formData.get('common_name') as string) || null,
        genus: (formData.get('genus') as string) || null,
        family: (formData.get('family') as string) || null,
        metadata: buildMetadata(formData),
        notes: (formData.get('notes') as string) || null,
        nickname: (formData.get('nickname') as string) || null,
        location: (formData.get('location') as string) || null,
        acquired_date: (formData.get('acquired_date') as string) || null,
        status: (formData.get('status') as string) || null,
    };

    console.log('Adding cultivar:', payload);

    try {
        const response = await fetch('/api/plants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const result: AddPlantResponse = await response.json();

        if (response.ok && result.plant) {
            message.textContent = `✓ Added ${result.plant.scientific_name} to your collection!`;
            message.classList.add('success');
            form.reset();
        } else {
            message.textContent = `Error: ${result.error || 'Unknown error occurred'}`;
            message.classList.add('error');
        }
    } catch (error) {
        console.error('Error adding cultivar:', error);
        message.textContent = `Error: ${(error as Error).message}`;
        message.classList.add('error');
    }

    // Reset button state
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add to Collection';
}

/**
 * Initialize the cultivar form
 */
function initCultivarForm(): void {
    const form = document.getElementById('cultivar-form') as HTMLFormElement;

    if (!form) {
        console.warn('Cultivar form not found');
        return;
    }

    form.addEventListener('submit', handleCultivarSubmit);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initCultivarForm);
