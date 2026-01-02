/**
 * Input validation utilities for API endpoints
 */

/**
 * Validate and parse an ID parameter
 * @param {string|null} id - The ID to validate
 * @returns {number|null} - Parsed positive integer or null if invalid
 */
export function validateId(id) {
    if (!id || typeof id !== 'string') {
        return null;
    }

    // Strict validation: must be only digits, no whitespace, decimals, or trailing chars
    if (!/^\d+$/.test(id)) {
        return null;
    }

    const parsed = parseInt(id, 10);

    if (isNaN(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

/**
 * Validate and sanitize a string input
 * @param {string|null|undefined} str - The string to validate
 * @param {number} maxLength - Maximum allowed length (default 255)
 * @returns {string|null} - Sanitized string or null if invalid/empty
 */
export function validateString(str, maxLength = 255) {
    if (str === null || str === undefined) {
        return null;
    }

    if (typeof str !== 'string') {
        return null;
    }

    // Trim whitespace
    const trimmed = str.trim();

    // Return null for empty strings
    if (trimmed.length === 0) {
        return null;
    }

    // Truncate if too long
    if (trimmed.length > maxLength) {
        return trimmed.substring(0, maxLength);
    }

    return trimmed;
}

/**
 * Validate and sanitize a search query parameter
 * @param {string|null} query - The search query
 * @param {number} maxLength - Maximum query length (default 100)
 * @returns {string} - Sanitized query or default value
 */
export function validateSearchQuery(query, maxLength = 100) {
    if (!query || typeof query !== 'string') {
        return '';
    }

    // Trim and limit length
    let sanitized = query.trim().substring(0, maxLength);

    // Remove potentially dangerous characters for URL params
    // Allow alphanumeric, spaces, hyphens, apostrophes (for plant names like "Bird's Nest")
    sanitized = sanitized.replace(/[^\w\s\-']/g, '');

    return sanitized;
}

/**
 * Validate and sanitize metadata object
 * @param {object|null|undefined} metadata - The metadata object
 * @param {number} maxSize - Maximum JSON string size in bytes (default 10KB)
 * @returns {object|null} - Sanitized metadata or null
 */
export function sanitizeMetadata(metadata, maxSize = 10240) {
    if (!metadata || typeof metadata !== 'object') {
        return null;
    }

    // Prevent arrays at top level (should be object)
    if (Array.isArray(metadata)) {
        return null;
    }

    try {
        const jsonString = JSON.stringify(metadata);

        // Check size limit
        if (jsonString.length > maxSize) {
            console.warn(`Metadata exceeds size limit: ${jsonString.length} > ${maxSize}`);
            return null;
        }

        // Re-parse to ensure it's valid JSON and strip any prototype pollution attempts
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Invalid metadata:', error.message);
        return null;
    }
}

/**
 * Validate required fields are present
 * @param {object} body - Request body
 * @param {string[]} requiredFields - Array of required field names
 * @returns {{valid: boolean, missing: string[]}} - Validation result
 */
export function validateRequired(body, requiredFields) {
    const missing = [];

    for (const field of requiredFields) {
        const value = body[field];
        if (value === undefined || value === null || value === '') {
            missing.push(field);
        }
    }

    return {
        valid: missing.length === 0,
        missing,
    };
}
