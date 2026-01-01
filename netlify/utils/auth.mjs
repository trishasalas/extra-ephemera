import { verifyToken } from '@clerk/backend';

/**
 * Parse cookies from header string
 * Handles cookies with = in their values
 */
function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;

    cookieHeader.split('; ').forEach(cookie => {
        const eqIndex = cookie.indexOf('=');
        if (eqIndex > 0) {
            const name = cookie.substring(0, eqIndex);
            const value = cookie.substring(eqIndex + 1);
            cookies[name] = value;
        }
    });
    return cookies;
}

/**
 * Verify authentication from request
 * Returns userId if authenticated, null otherwise
 */
export async function verifyAuth(request) {
    try {
        // Get token from Authorization header or cookie
        const authHeader = request.headers.get('Authorization');
        const cookieHeader = request.headers.get('Cookie');

        let sessionToken = null;

        // Check Authorization header first (Bearer token)
        if (authHeader?.startsWith('Bearer ')) {
            sessionToken = authHeader.substring(7);
        }

        // Fall back to __session cookie (Clerk's default)
        if (!sessionToken && cookieHeader) {
            const cookies = parseCookies(cookieHeader);
            sessionToken = cookies['__session'];
        }

        if (!sessionToken) {
            return null;
        }

        // Verify the session token with Clerk
        const payload = await verifyToken(sessionToken, {
            secretKey: process.env.CLERK_SECRET_KEY,
        });
        return payload.sub;
    } catch (error) {
        console.error('Auth verification failed:', error.message);
        return null;
    }
}

/**
 * Helper to return 401 Unauthorized response
 */
export function unauthorizedResponse() {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
    });
}
