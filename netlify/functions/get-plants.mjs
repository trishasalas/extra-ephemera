import { getDb } from '../utils/db.mjs';
import { errors, successResponse } from '../utils/errors.mjs';

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

        return successResponse({ plants });

    } catch (error) {
        return errors.serverError(error);
    }
};

export const config = {
    path: "/api/plants/list",
};
