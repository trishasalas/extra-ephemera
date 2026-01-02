import { validateId } from '../utils/validation.mjs';
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
    const rawSpeciesId = url.searchParams.get('species_id');

    // Validate species_id is a positive integer
    const speciesId = validateId(rawSpeciesId);
    if (!speciesId) {
        return errors.badRequest('Valid species_id required');
    }

    // Note: Care guide endpoint doesn't use /v2 path
    const apiEndpoint = `https://perenual.com/api/species-care-guide-list?species_id=${speciesId}&page=1&key=${apiKey}`;

    try {
        const response = await fetch(apiEndpoint);
        const data = await response.json();

        if (!response.ok) {
            return errors.serverError('Failed to fetch care guide');
        }

        return successResponse(data);
    } catch (error) {
        return errors.serverError(error);
    }
};

export const config = {
    path: "/api/perenual-care",
};
