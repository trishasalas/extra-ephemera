/**
 * Error handling utilities for API endpoints
 * Prevents leaking internal error details to clients
 */

/**
 * Create a safe error response that doesn't leak internal details
 * @param {string} publicMessage - Message safe to show to users
 * @param {number} status - HTTP status code (default 500)
 * @param {Error|string} internalError - Optional error to log server-side
 * @returns {Response} - JSON response with generic error message
 */
export function safeError(publicMessage, status = 500, internalError = null) {
    // Log the real error server-side for debugging
    if (internalError) {
        const errorMessage = internalError instanceof Error
            ? internalError.message
            : internalError;
        console.error(`[API Error] ${publicMessage}:`, errorMessage);
    }

    return new Response(JSON.stringify({
        error: publicMessage,
    }), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

/**
 * Standard error responses for common scenarios
 */
export const errors = {
    badRequest: (message = 'Invalid request') => safeError(message, 400),
    unauthorized: () => safeError('Unauthorized', 401),
    notFound: (resource = 'Resource') => safeError(`${resource} not found`, 404),
    methodNotAllowed: () => safeError('Method not allowed', 405),
    tooManyRequests: () => safeError('Too many requests. Please try again later.', 429),
    serverError: (internalError = null) => safeError('An error occurred', 500, internalError),
};

/**
 * Create a success response
 * @param {object} data - Response data
 * @param {number} status - HTTP status code (default 200)
 * @returns {Response} - JSON response
 */
export function successResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
