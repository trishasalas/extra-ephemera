export default async (request, context) => {
    const apiKey = process.env.VITE_PERENUAL_API;
    const url = new URL(request.url);
    const speciesId = url.searchParams.get('species_id');

    if (!apiKey) {
        return new Response(
            JSON.stringify({ error: 'VITE_PERENUAL_API key not configured' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }

    if (!speciesId) {
        return new Response(
            JSON.stringify({ error: 'species_id parameter required' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    // Note: Care guide endpoint doesn't use /v2 path
    const apiEndpoint = `https://perenual.com/api/species-care-guide-list?species_id=${speciesId}&page=1&key=${apiKey}`;

    try {
        console.log('Fetching care guide from:', apiEndpoint.replace(apiKey, 'HIDDEN'));
        const response = await fetch(apiEndpoint);
        const data = await response.json();

        console.log('Perenual care guide response status:', response.status);
        console.log('Perenual care guide data:', JSON.stringify(data, null, 2));

        // Return data even if it's an error so frontend can see it
        return new Response(JSON.stringify(data), {
            status: response.ok ? 200 : response.status,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Perenual Care Guide API error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to fetch care guide from Perenual', details: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};

export const config = {
    path: "/api/perenual-care",
};
