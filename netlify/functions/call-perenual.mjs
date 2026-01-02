import { validateSearchQuery } from '../utils/validation.mjs';
import { errors, successResponse } from '../utils/errors.mjs';
import { rateLimitByIP } from '../utils/rate-limit.mjs';

export default async (request, context) => {
    // Rate limit: 60 requests per minute per IP
    const rateLimit = await rateLimitByIP(request, 60);
    if (!rateLimit.allowed) {
        return errors.tooManyRequests();
    }

    const apiKey = process.env.VITE_PERENUAL_API;

    if (!apiKey) {
        return errors.serverError('Perenual API not configured');
    }

    const url = new URL(request.url);
    const rawQuery = url.searchParams.get('q');

    // Validate and sanitize the search query
    const query = validateSearchQuery(rawQuery) || '';

    const apiEndpoint = `https://perenual.com/api/v2/species-list?key=${apiKey}&q=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(apiEndpoint);
        const rawData = await response.json();

        // Normalize Perenual data to match Trefle structure
        const normalized = {
            data: rawData.data.map(plant => ({
                id: plant.id,
                source: 'perenual',
                slug: null,  // Perenual doesn't provide slugs
                scientific_name: Array.isArray(plant.scientific_name)
                    ? plant.scientific_name[0]
                    : plant.scientific_name,
                common_name: plant.common_name || null,
                family: plant.family || null,
                family_common_name: null,  // Perenual doesn't provide this
                genus: plant.genus || null,
                image_url: plant.default_image?.regular_url || plant.default_image?.original_url || null,
                year: null,  // Not in species-list response
                bibliography: null,  // Not in species-list response
                author: null,  // Not in species-list response
                synonyms: null,  // Not in species-list response
            }))
        };

        return successResponse(normalized);
    } catch (error) {
        return errors.serverError(error);
    }
};

export const config = {
    path: "/api/perenual",
};
