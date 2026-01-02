import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @clerk/backend before importing auth module
vi.mock('@clerk/backend', () => ({
    verifyToken: vi.fn(),
}));

// Import after mocking
import { verifyAuth, unauthorizedResponse } from '../netlify/utils/auth.mjs';
import { verifyToken } from '@clerk/backend';

const mockVerifyToken = vi.mocked(verifyToken);

// Helper to create a mock Request
function createMockRequest(options: {
    authHeader?: string;
    cookies?: string;
} = {}): Request {
    const headers = new Headers();
    if (options.authHeader) {
        headers.set('Authorization', options.authHeader);
    }
    if (options.cookies) {
        headers.set('Cookie', options.cookies);
    }
    return {
        headers,
    } as unknown as Request;
}

describe('auth utilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Set up environment variable
        process.env.CLERK_SECRET_KEY = 'test-secret-key';
    });

    afterEach(() => {
        delete process.env.CLERK_SECRET_KEY;
    });

    describe('verifyAuth', () => {
        it('returns null when no auth header or cookies', async () => {
            const request = createMockRequest();
            const result = await verifyAuth(request);
            expect(result).toBeNull();
            expect(mockVerifyToken).not.toHaveBeenCalled();
        });

        it('extracts token from Bearer authorization header', async () => {
            mockVerifyToken.mockResolvedValue({ sub: 'user_123' } as any);
            const request = createMockRequest({
                authHeader: 'Bearer test-token-xyz',
            });

            const result = await verifyAuth(request);

            expect(result).toBe('user_123');
            expect(mockVerifyToken).toHaveBeenCalledWith('test-token-xyz', {
                secretKey: 'test-secret-key',
            });
        });

        it('extracts token from __session cookie', async () => {
            mockVerifyToken.mockResolvedValue({ sub: 'user_456' } as any);
            const request = createMockRequest({
                cookies: '__session=cookie-token-abc',
            });

            const result = await verifyAuth(request);

            expect(result).toBe('user_456');
            expect(mockVerifyToken).toHaveBeenCalledWith('cookie-token-abc', {
                secretKey: 'test-secret-key',
            });
        });

        it('prefers Authorization header over cookie', async () => {
            mockVerifyToken.mockResolvedValue({ sub: 'user_789' } as any);
            const request = createMockRequest({
                authHeader: 'Bearer header-token',
                cookies: '__session=cookie-token',
            });

            const result = await verifyAuth(request);

            expect(result).toBe('user_789');
            expect(mockVerifyToken).toHaveBeenCalledWith('header-token', {
                secretKey: 'test-secret-key',
            });
        });

        it('handles multiple cookies correctly', async () => {
            mockVerifyToken.mockResolvedValue({ sub: 'user_multi' } as any);
            const request = createMockRequest({
                cookies: 'other=value; __session=session-token; another=thing',
            });

            const result = await verifyAuth(request);

            expect(result).toBe('user_multi');
            expect(mockVerifyToken).toHaveBeenCalledWith('session-token', {
                secretKey: 'test-secret-key',
            });
        });

        it('handles cookies with = in value', async () => {
            mockVerifyToken.mockResolvedValue({ sub: 'user_special' } as any);
            const request = createMockRequest({
                cookies: '__session=token=with=equals',
            });

            const result = await verifyAuth(request);

            expect(result).toBe('user_special');
            expect(mockVerifyToken).toHaveBeenCalledWith('token=with=equals', {
                secretKey: 'test-secret-key',
            });
        });

        it('returns null when token verification fails', async () => {
            mockVerifyToken.mockRejectedValue(new Error('Invalid token'));
            const request = createMockRequest({
                authHeader: 'Bearer invalid-token',
            });

            const result = await verifyAuth(request);

            expect(result).toBeNull();
        });

        it('returns null for non-Bearer auth header', async () => {
            const request = createMockRequest({
                authHeader: 'Basic dXNlcjpwYXNz',
            });

            const result = await verifyAuth(request);

            expect(result).toBeNull();
            expect(mockVerifyToken).not.toHaveBeenCalled();
        });

        it('returns null when __session cookie not present', async () => {
            const request = createMockRequest({
                cookies: 'other=value; another=thing',
            });

            const result = await verifyAuth(request);

            expect(result).toBeNull();
            expect(mockVerifyToken).not.toHaveBeenCalled();
        });
    });

    describe('unauthorizedResponse', () => {
        it('returns 401 status', async () => {
            const response = unauthorizedResponse();
            expect(response.status).toBe(401);
        });

        it('returns JSON content type', async () => {
            const response = unauthorizedResponse();
            expect(response.headers.get('Content-Type')).toBe('application/json');
        });

        it('returns error message in body', async () => {
            const response = unauthorizedResponse();
            const body = await response.json();
            expect(body).toEqual({ error: 'Unauthorized' });
        });
    });
});
