# Session Log: Security Hardening

**Date:** January 2, 2026
**Branch:** `feature/add-security` (merged to `main`)
**Focus:** Adding authentication, input validation, rate limiting, and safe error handling

## Overview

This session implemented comprehensive security measures for the Mosslight Nook Plant Catalog API endpoints. The work was split across two commits:

1. **Clerk Authentication** - Added user authentication for admin functionality
2. **Security Hardening** - Added input validation, rate limiting, and safe error handling

## Implementation Details

### 1. Clerk Authentication (`@clerk/astro`)

Integrated Clerk for user authentication across the application:

**Middleware Setup** (`src/middleware.ts`):
```typescript
import { clerkMiddleware } from '@clerk/astro/server';
export const onRequest = clerkMiddleware();
```

**Auth Utility for Netlify Functions** (`netlify/utils/auth.mjs`):
- Extracts Bearer token from Authorization header
- Verifies token using Clerk's `verifyToken()` API
- Returns `userId` on success, `null` on failure
- Provides `unauthorizedResponse()` helper for 401 responses

**Protected Endpoints:**
- `add-plant.mjs` - Requires authentication
- `update-plant.mjs` - Requires authentication
- `upload-photo.mjs` - Requires authentication

**UI Integration:**
- `SignedIn`, `SignedOut`, `SignInButton`, `UserButton` components in Nav
- Edit buttons and "Add to Collection" hidden for guests
- `/add` page redirects unauthenticated users

### 2. Input Validation (`netlify/utils/validation.mjs`)

Created a comprehensive validation utility with five functions:

| Function | Purpose | Returns |
|----------|---------|---------|
| `validateId(id)` | Validates numeric IDs (digits only, positive) | `number \| null` |
| `validateString(str, maxLength)` | Trims and truncates strings | `string \| null` |
| `validateSearchQuery(query)` | Sanitizes search input, removes dangerous chars | `string` |
| `sanitizeMetadata(obj, maxSize)` | Validates JSON, enforces 10KB limit | `object \| null` |
| `validateRequired(body, fields)` | Checks required fields exist | `{valid, missing}` |

**Key Security Measures:**
- Strict regex for IDs: `/^\d+$/` (prevents injection via "123abc")
- Dangerous character removal in search queries
- JSON re-parsing to prevent prototype pollution
- Size limits on metadata to prevent DoS

### 3. Rate Limiting (`netlify/utils/rate-limit.mjs`)

Implemented sliding window rate limiting using Netlify Blobs:

**Storage:** Uses `@netlify/blobs` store named `rate-limits`

**Algorithm:**
1. Get client IP or userId
2. Fetch existing request timestamps from blob
3. Filter to requests within 1-minute window
4. If count >= limit, return `allowed: false`
5. Otherwise, add current timestamp and save

**Rate Limits:**
- Public endpoints (search, get): 60 requests/minute per IP
- Authenticated endpoints (add, update, upload): 10 requests/minute per user

**Graceful Degradation:** If blob storage fails, allows the request (fail-open) but logs the error.

### 4. Safe Error Handling (`netlify/utils/errors.mjs`)

Created standardized error responses that prevent information leakage:

```javascript
export const errors = {
    badRequest: (message = 'Invalid request') => safeError(message, 400),
    unauthorized: () => safeError('Unauthorized', 401),
    notFound: (resource = 'Resource') => safeError(`${resource} not found`, 404),
    methodNotAllowed: () => safeError('Method not allowed', 405),
    tooManyRequests: () => safeError('Too many requests...', 429),
    serverError: (internalError = null) => safeError('An error occurred', 500, internalError),
};
```

**Key Feature:** `serverError()` logs the real error server-side for debugging while returning a generic message to clients.

### 5. Updated Netlify Functions

All 9 functions were refactored to use the security utilities:

| Function | Changes |
|----------|---------|
| `add-plant.mjs` | Auth required, input validation, rate limiting |
| `update-plant.mjs` | Auth required, ID validation, rate limiting |
| `upload-photo.mjs` | Auth required, file validation, rate limiting |
| `get-plant.mjs` | ID validation, safe errors |
| `get-plants.mjs` | Rate limiting, safe errors |
| `call-trefle.mjs` | Query validation, rate limiting |
| `call-perenual.mjs` | Query validation, rate limiting |
| `call-perenual-care.mjs` | ID validation, rate limiting |

### 6. Test Suite

Added Vitest test suite with 33 tests across two files:

**`tests/validation.test.ts`** (21 tests):
- `validateId`: Valid IDs, invalid formats, edge cases
- `validateString`: Trimming, truncation, null handling
- `validateSearchQuery`: Character sanitization
- `sanitizeMetadata`: Size limits, type validation
- `validateRequired`: Missing field detection

**`tests/auth.test.ts`** (12 tests):
- Token extraction from headers
- Token verification success/failure
- Unauthorized response formatting
- Edge cases (missing headers, malformed tokens)

## File Structure

```
netlify/
└── utils/
    ├── auth.mjs         # NEW: Clerk token verification
    ├── errors.mjs       # NEW: Safe error responses
    ├── rate-limit.mjs   # NEW: Netlify Blobs rate limiting
    └── validation.mjs   # NEW: Input validation

tests/
├── auth.test.ts         # NEW: Auth utility tests
└── validation.test.ts   # NEW: Validation tests

vitest.config.ts         # NEW: Vitest configuration

src/
├── middleware.ts        # NEW: Clerk middleware
└── components/Nav.astro # MODIFIED: Auth UI components

netlify.toml             # MODIFIED: Blobs configuration
package.json             # MODIFIED: Added dependencies
```

## Dependencies Added

```json
{
  "@clerk/astro": "^1.6.6",
  "@netlify/blobs": "^8.1.0",
  "vitest": "^4.0.16"
}
```

## Environment Variables

New variables required for production:
```env
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

## Testing

```bash
npm run test:run    # 33 tests passing
```

All tests verify security edge cases:
- Invalid ID formats (decimals, negative, letters)
- Oversized metadata payloads
- Missing required fields
- Token verification failures

## Commits

1. `8ac55ff` - feature: add Clerk authentication for admin functionality
2. `0132fdd` - feature: add security hardening with validation, rate limiting, and safe errors

## Files Modified

**New Files (8):**
- `netlify/utils/auth.mjs`
- `netlify/utils/errors.mjs`
- `netlify/utils/rate-limit.mjs`
- `netlify/utils/validation.mjs`
- `src/middleware.ts`
- `tests/auth.test.ts`
- `tests/validation.test.ts`
- `vitest.config.ts`

**Modified Files (19):**
- `netlify.toml`
- `netlify/functions/add-plant.mjs`
- `netlify/functions/call-perenual-care.mjs`
- `netlify/functions/call-perenual.mjs`
- `netlify/functions/call-trefle.mjs`
- `netlify/functions/get-plant.mjs`
- `netlify/functions/get-plants.mjs`
- `netlify/functions/update-plant.mjs`
- `netlify/functions/upload-photo.mjs`
- `package.json`
- `package-lock.json`
- `src/assets/style.css`
- `src/components/Nav.astro`
- `src/js/main.ts`
- `src/js/plant-detail.ts`
- `src/pages/add.astro`
- `src/pages/plant.astro`
- `src/pages/search.astro`
- `CLAUDE.md`
