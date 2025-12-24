import { getDb } from '../utils/db.mjs';

export default async (request, context) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
        return new Response(JSON.stringify({ error: 'Plant ID required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const sql = getDb();

        const result = await sql`
            SELECT *
            FROM plants
            WHERE id = ${id}
        `;

        if (result.length === 0) {
            return new Response(JSON.stringify({ error: 'Plant not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ plant: result[0] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error fetching plant:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to fetch plant', 
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const config = {
    path: "/api/plants/get",
};
