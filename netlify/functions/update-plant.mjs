import { getDb } from '../utils/db.mjs';
import { verifyAuth, unauthorizedResponse } from '../utils/auth.mjs';
import { validateId, validateString, validateRequired, sanitizeMetadata } from '../utils/validation.mjs';
import { errors, successResponse } from '../utils/errors.mjs';
import { rateLimitByUser } from '../utils/rate-limit.mjs';

export default async (request, context) => {
    if (request.method !== 'PUT' && request.method !== 'PATCH') {
        return errors.methodNotAllowed();
    }

    // Require authentication
    const userId = await verifyAuth(request);
    if (!userId) {
        return unauthorizedResponse();
    }

    // Rate limit: 10 requests per minute per user
    const rateLimit = await rateLimitByUser(userId, 10);
    if (!rateLimit.allowed) {
        return errors.tooManyRequests();
    }

    try {
        const body = await request.json();

        // Validate required fields
        const requiredError = validateRequired(body, ['id', 'scientific_name']);
        if (requiredError) {
            return errors.badRequest(requiredError);
        }

        // Validate ID is a positive integer
        const id = validateId(String(body.id));
        if (!id) {
            return errors.badRequest('Valid plant ID required');
        }

        const sql = getDb();

        // Validate and sanitize string fields
        const scientific_name = validateString(body.scientific_name, 500);
        const common_name = validateString(body.common_name, 255);
        const family = validateString(body.family, 255);
        const family_common_name = validateString(body.family_common_name, 255);
        const genus = validateString(body.genus, 255);
        const image_url = validateString(body.image_url, 2048);
        const author = validateString(body.author, 255);
        const bibliography = validateString(body.bibliography, 1000);
        const year = body.year ? parseInt(body.year, 10) : null;
        const synonyms = validateString(body.synonyms, 2000);
        const slug = validateString(body.slug, 255);
        const trefle_id = body.trefle_id ? parseInt(body.trefle_id, 10) : null;
        const notes = validateString(body.notes, 5000);
        const nickname = validateString(body.nickname, 255);
        const location = validateString(body.location, 255);
        const acquired_date = validateString(body.acquired_date, 20);
        const status = validateString(body.status, 50);

        // Sanitize metadata (JSONB field)
        const metadata = sanitizeMetadata(body.metadata);

        const result = await sql`
            UPDATE plants SET
                scientific_name = ${scientific_name},
                common_name = ${common_name},
                family = ${family},
                family_common_name = ${family_common_name},
                genus = ${genus},
                image_url = ${image_url},
                author = ${author},
                bibliography = ${bibliography},
                year = ${year},
                synonyms = ${synonyms},
                slug = ${slug},
                trefle_id = ${trefle_id},
                metadata = ${metadata ? JSON.stringify(metadata) : '{}'},
                notes = ${notes},
                nickname = ${nickname},
                location = ${location},
                acquired_date = ${acquired_date},
                status = ${status},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING id, scientific_name, common_name, updated_at
        `;

        if (result.length === 0) {
            return errors.notFound('Plant');
        }

        return successResponse({ success: true, plant: result[0] });

    } catch (error) {
        return errors.serverError(error);
    }
};

export const config = {
    path: "/api/plants/update",
};
