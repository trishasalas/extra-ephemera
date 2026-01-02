import { getStore } from '@netlify/blobs';

/**
 * Rate limiting utility using Netlify Blobs
 * Tracks request counts per key with sliding window
 */

const WINDOW_MS = 60 * 1000; // 1 minute window

/**
 * Get client IP from request headers
 * @param {Request} request
 * @returns {string} - Client IP or fallback
 */
export function getClientIP(request) {
    // Netlify sets this header
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        // Take the first IP (original client)
        return forwarded.split(',')[0].trim();
    }
    // Fallback
    return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Check rate limit for a key
 * @param {string} key - Unique identifier (IP or userId)
 * @param {number} maxRequests - Max requests per window
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: number}>}
 */
export async function checkRateLimit(key, maxRequests = 60) {
    try {
        const store = getStore('rate-limits');
        const now = Date.now();
        const windowStart = now - WINDOW_MS;

        // Get current record
        const existing = await store.get(key, { type: 'json' });

        let requests = [];
        if (existing && Array.isArray(existing.requests)) {
            // Filter to requests within the window
            requests = existing.requests.filter(timestamp => timestamp > windowStart);
        }

        // Check if over limit
        if (requests.length >= maxRequests) {
            const oldestRequest = Math.min(...requests);
            const resetAt = oldestRequest + WINDOW_MS;
            return {
                allowed: false,
                remaining: 0,
                resetAt,
            };
        }

        // Add current request
        requests.push(now);

        // Store updated record (TTL of 2 minutes to auto-cleanup)
        await store.setJSON(key, { requests }, {
            metadata: { createdAt: now },
        });

        return {
            allowed: true,
            remaining: maxRequests - requests.length,
            resetAt: now + WINDOW_MS,
        };
    } catch (error) {
        // If rate limiting fails, allow the request but log error
        console.error('Rate limit check failed:', error.message);
        return {
            allowed: true,
            remaining: -1, // Unknown
            resetAt: 0,
        };
    }
}

/**
 * Create a rate limiter for public endpoints (by IP)
 * @param {Request} request
 * @param {number} maxRequests - Default 60 per minute
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: number}>}
 */
export async function rateLimitByIP(request, maxRequests = 60) {
    const ip = getClientIP(request);
    const key = `ip:${ip}`;
    return checkRateLimit(key, maxRequests);
}

/**
 * Create a rate limiter for authenticated endpoints (by userId)
 * @param {string} userId
 * @param {number} maxRequests - Default 10 per minute for writes
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: number}>}
 */
export async function rateLimitByUser(userId, maxRequests = 10) {
    const key = `user:${userId}`;
    return checkRateLimit(key, maxRequests);
}
