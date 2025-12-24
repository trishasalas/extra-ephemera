import { getDb } from '../utils/db.mjs';

export default async (request, context) => {
    // Only allow POST
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await request.json();
        const sql = getDb();

        // Extract fields from the request body
        const {
            scientific_name,
            common_name,
            family,
            family_common_name,
            genus,
            image_url,
            author,
            bibliography,
            year,
            synonyms,
            slug,
            trefle_id,
            // Flexible metadata (patents, breeding, etc.)
            metadata,
            // Reference notes (freeform text)
            notes,
            // Personal fields (optional on initial add)
            nickname,
            location,
            acquired_date,
            status,
        } = body;

        // Validate required field
        if (!scientific_name) {
            return new Response(JSON.stringify({ error: 'scientific_name is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Insert the plant
        const result = await sql`
            INSERT INTO plants (
                scientific_name,
                common_name,
                family,
                family_common_name,
                genus,
                image_url,
                author,
                bibliography,
                year,
                synonyms,
                slug,
                trefle_id,
                metadata,
                notes,
                nickname,
                location,
                acquired_date,
                status
            ) VALUES (
                ${scientific_name},
                ${common_name || null},
                ${family || null},
                ${family_common_name || null},
                ${genus || null},
                ${image_url || null},
                ${author || null},
                ${bibliography || null},
                ${year || null},
                ${synonyms || null},
                ${slug || null},
                ${trefle_id || null},
                ${metadata ? JSON.stringify(metadata) : '{}'},
                ${notes || null},
                ${nickname || null},
                ${location || null},
                ${acquired_date || null},
                ${status || null}
            )
            RETURNING id, scientific_name, common_name, added_at
        `;

        return new Response(JSON.stringify({ 
            success: true, 
            plant: result[0] 
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error adding plant:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to add plant', 
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const config = {
    path: "/api/plants",
};
