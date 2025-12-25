export default async (request, context) => {
    const apiKey = process.env.VITE_PERENUAL_API;
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';

    if (!apiKey) {
        return new Response(
            JSON.stringify({ error: 'VITE_PERENUAL_API key not configured' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const apiEndpoint = `https://perenual.com/api/v2/species-list?key=${apiKey}&q=${query}`;

    try {
        const response = await fetch(apiEndpoint);
        const rawData = await response.json();

        // Normalize Perenual data to match Trefle structure
        const normalized = {
            data: rawData.data.map(plant => ({
                id: plant.id,
                source: 'perenual',
                slug: null,  // Perenual doesn't provide slugs
                scientific_name: Array.isArray(plant.scientific_name)
                    ? plant.scientific_name[0]
                    : plant.scientific_name,
                common_name: plant.common_name || null,
                family: plant.family || null,
                family_common_name: null,  // Perenual doesn't provide this
                genus: plant.genus || null,
                image_url: plant.default_image?.regular_url || plant.default_image?.original_url || null,
                year: null,  // Not in species-list response
                bibliography: null,  // Not in species-list response
                author: null,  // Not in species-list response
                synonyms: null,  // Not in species-list response
            }))
        };

        return new Response(JSON.stringify(normalized), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Perenual API error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to fetch from Perenual' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};

export const config = {
    path: "/api/perenual",
};
