import { getDb } from '../utils/db.mjs';
import { validateId } from '../utils/validation.mjs';
import { errors, successResponse } from '../utils/errors.mjs';

export default async (request, context) => {
    const url = new URL(request.url);
    const rawId = url.searchParams.get('id');

    // Validate ID is a positive integer
    const id = validateId(rawId);
    if (!id) {
        return errors.badRequest('Valid plant ID required');
    }

    try {
        const sql = getDb();

        const result = await sql`
            SELECT *
            FROM plants
            WHERE id = ${id}
        `;

        if (result.length === 0) {
            return errors.notFound('Plant');
        }

        return successResponse({ plant: result[0] });

    } catch (error) {
        return errors.serverError(error);
    }
};

export const config = {
    path: "/api/plants/get",
};
