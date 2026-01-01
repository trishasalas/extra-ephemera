import { v2 as cloudinary } from 'cloudinary';
import { verifyAuth, unauthorizedResponse } from '../utils/auth.mjs';

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
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Require authentication
    const userId = await verifyAuth(request);
    if (!userId) {
        return unauthorizedResponse();
    }

    try {
        const formData = await request.formData();
        const file = formData.get('photo');
        const plantId = formData.get('plantId');
        const slug = formData.get('slug');
        const commonName = formData.get('commonName');
        const scientificName = formData.get('scientificName');

        // Validation
        if (!file || !(file instanceof File)) {
            return new Response(JSON.stringify({ error: 'No file provided' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (!plantId) {
            return new Response(JSON.stringify({ error: 'Plant ID required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // File type validation (images only)
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            return new Response(JSON.stringify({
                error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // File size validation (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return new Response(JSON.stringify({
                error: 'File too large. Maximum size is 5MB.'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
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
        console.log(`Uploading to Cloudinary with public_id: ${publicId}`);
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
        const optimizedBytes = result.eager?.[0]?.bytes || result.bytes;

        console.log(`Successfully uploaded to Cloudinary: ${optimizedUrl}`);
        console.log(`Original size: ${(file.size / 1024).toFixed(1)}KB, Cloudinary size: ${(optimizedBytes / 1024).toFixed(1)}KB`);

        return new Response(JSON.stringify({
            success: true,
            imageUrl: optimizedUrl,
            publicId: result.public_id,
            // Keep blobUrl for backwards compatibility with client code
            blobUrl: optimizedUrl,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error uploading photo:', error);
        return new Response(JSON.stringify({
            error: 'Failed to upload photo',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const config = {
    path: "/api/plants/upload-photo",
};
