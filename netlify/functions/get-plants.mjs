import { getDb } from '../utils/db.mjs';

export default async (request, context) => {
    try {
        const sql = getDb();

        const plants = await sql`
            SELECT
                id,
                scientific_name,
                common_name,
                family,
                family_common_name,
                genus,
                image_url,
                nickname,
                location,
                status,
                metadata,
                added_at
            FROM plants
            ORDER BY added_at DESC
        `;

        return new Response(JSON.stringify({ plants }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error fetching plants:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to fetch plants', 
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const config = {
    path: "/api/plants/list",
};
