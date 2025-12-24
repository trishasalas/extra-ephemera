export default async (request, context) => {
    const apiToken = process.env.VITE_TREFLE_API;
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || 'alocasia';
    
    const apiEndpoint = `https://trefle.io/api/v1/plants/search?token=${apiToken}&q=${query}`;

    try {
        const response = await fetch(apiEndpoint);
        const data = await response.json();

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch from Trefle' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
};

export const config = {
    path: "/api/trefle",
};
