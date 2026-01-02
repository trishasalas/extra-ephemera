import { getDb } from '../utils/db.mjs';
import { verifyAuth, unauthorizedResponse } from '../utils/auth.mjs';
import { validateString, validateRequired, sanitizeMetadata } from '../utils/validation.mjs';
import { errors, successResponse } from '../utils/errors.mjs';
import { rateLimitByUser } from '../utils/rate-limit.mjs';

export default async (request, context) => {
    // Only allow POST
    if (request.method !== 'POST') {
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

        // Validate required field
        const requiredError = validateRequired(body, ['scientific_name']);
        if (requiredError) {
            return errors.badRequest(requiredError);
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
                ${common_name},
                ${family},
                ${family_common_name},
                ${genus},
                ${image_url},
                ${author},
                ${bibliography},
                ${year},
                ${synonyms},
                ${slug},
                ${trefle_id},
                ${metadata ? JSON.stringify(metadata) : '{}'},
                ${notes},
                ${nickname},
                ${location},
                ${acquired_date},
                ${status}
            )
            RETURNING id, scientific_name, common_name, added_at
        `;

        return successResponse({ success: true, plant: result[0] }, 201);

    } catch (error) {
        return errors.serverError(error);
    }
};

export const config = {
    path: "/api/plants",
};
