import { v2 as cloudinary } from 'cloudinary';
import { verifyAuth, unauthorizedResponse } from '../utils/auth.mjs';
import { validateId, validateString } from '../utils/validation.mjs';
import { errors, successResponse } from '../utils/errors.mjs';
import { rateLimitByUser } from '../utils/rate-limit.mjs';

// Configure Cloudinary from environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Generate a URL-safe slug from text
 */
function generateSlug(text) {
    if (!text) return null;
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

export default async (request, context) => {
    // Only allow POST with multipart/form-data
    if (request.method !== 'POST') {
        return errors.methodNotAllowed();
    }

    // Require authentication
    const userId = await verifyAuth(request);
    if (!userId) {
        return unauthorizedResponse();
    }

    // Rate limit: 5 uploads per minute per user
    const rateLimit = await rateLimitByUser(userId, 5);
    if (!rateLimit.allowed) {
        return errors.tooManyRequests();
    }

    try {
        const formData = await request.formData();
        const file = formData.get('photo');
        const rawPlantId = formData.get('plantId');
        const slug = validateString(formData.get('slug'), 255);
        const commonName = validateString(formData.get('commonName'), 255);
        const scientificName = validateString(formData.get('scientificName'), 500);

        // Validate file
        if (!file || !(file instanceof File)) {
            return errors.badRequest('No file provided');
        }

        // Validate plant ID
        const plantId = validateId(rawPlantId);
        if (!plantId) {
            return errors.badRequest('Valid plant ID required');
        }

        // File type validation (images only)
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            return errors.badRequest('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.');
        }

        // File size validation (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return errors.badRequest('File too large. Maximum size is 5MB.');
        }

        // Determine the public_id for Cloudinary
        // Priority: slug > generated from commonName > generated from scientificName > plantId
        const imageSlug = slug
            || generateSlug(commonName)
            || generateSlug(scientificName)
            || `plant-${plantId}`;

        const publicId = `mosslight-nook/${imageSlug}`;

        // Convert File to base64 data URL for Cloudinary upload
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const dataUrl = `data:${file.type};base64,${base64}`;

        // Upload to Cloudinary with compression and resizing
        const result = await cloudinary.uploader.upload(dataUrl, {
            public_id: publicId,
            overwrite: true,  // Replace if same slug uploaded again
            resource_type: 'image',
            eager: [{
                width: 1280,
                crop: 'limit',      // Resize only if larger, maintain aspect ratio
                quality: 'auto:good',
                format: 'webp',
            }],
            eager_async: false,  // Wait for transformation to complete
        });

        // Use the eager-transformed WebP URL
        const optimizedUrl = result.eager?.[0]?.secure_url || result.secure_url;

        return successResponse({
            success: true,
            imageUrl: optimizedUrl,
            publicId: result.public_id,
            // Keep blobUrl for backwards compatibility with client code
            blobUrl: optimizedUrl,
        });

    } catch (error) {
        return errors.serverError(error);
    }
};

export const config = {
    path: "/api/plants/upload-photo",
};
