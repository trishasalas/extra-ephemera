import { getDb } from '../utils/db.mjs';

export default async (request, context) => {
    if (request.method !== 'PUT' && request.method !== 'PATCH') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await request.json();
        const sql = getDb();

        const {
            id,
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
            status,
        } = body;

        if (!id) {
            return new Response(JSON.stringify({ error: 'Plant ID required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (!scientific_name) {
            return new Response(JSON.stringify({ error: 'scientific_name is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const result = await sql`
            UPDATE plants SET
                scientific_name = ${scientific_name},
                common_name = ${common_name || null},
                family = ${family || null},
                family_common_name = ${family_common_name || null},
                genus = ${genus || null},
                image_url = ${image_url || null},
                author = ${author || null},
                bibliography = ${bibliography || null},
                year = ${year || null},
                synonyms = ${synonyms || null},
                slug = ${slug || null},
                trefle_id = ${trefle_id || null},
                metadata = ${metadata ? JSON.stringify(metadata) : '{}'},
                notes = ${notes || null},
                nickname = ${nickname || null},
                location = ${location || null},
                acquired_date = ${acquired_date || null},
                status = ${status || null},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING id, scientific_name, common_name, updated_at
        `;

        if (result.length === 0) {
            return new Response(JSON.stringify({ error: 'Plant not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ 
            success: true, 
            plant: result[0] 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error updating plant:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to update plant', 
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const config = {
    path: "/api/plants/update",
};
