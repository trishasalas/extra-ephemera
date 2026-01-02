import { validateSearchQuery } from '../utils/validation.mjs';
import { errors, successResponse } from '../utils/errors.mjs';
import { rateLimitByIP } from '../utils/rate-limit.mjs';

export default async (request, context) => {
    // Rate limit: 60 requests per minute per IP
    const rateLimit = await rateLimitByIP(request, 60);
    if (!rateLimit.allowed) {
        return errors.tooManyRequests();
    }

    const apiToken = process.env.VITE_TREFLE_API;

    if (!apiToken) {
        return errors.serverError('Trefle API not configured');
    }

    const url = new URL(request.url);
    const rawQuery = url.searchParams.get('q');

    // Validate and sanitize the search query
    const query = validateSearchQuery(rawQuery) || 'alocasia';

    const apiEndpoint = `https://trefle.io/api/v1/plants/search?token=${apiToken}&q=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(apiEndpoint);
        const data = await response.json();

        return successResponse(data);
    } catch (error) {
        return errors.serverError(error);
    }
};

export const config = {
    path: "/api/trefle",
};
