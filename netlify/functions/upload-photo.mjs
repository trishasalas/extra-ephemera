import { getStore } from '@netlify/blobs';

export default async (request, context) => {
    // Only allow POST with multipart/form-data
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('photo');
        const plantId = formData.get('plantId');

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

        // Initialize blob store with strong consistency
        const photoStore = getStore({
            name: 'plant-photos',
            consistency: 'strong'
        });

        // Generate unique key: plant-{id}-{timestamp}.{extension}
        const timestamp = Date.now();
        const extension = file.name.split('.').pop() || 'jpg';
        const blobKey = `plant-${plantId}-${timestamp}.${extension}`;

        // Upload to blob store
        await photoStore.set(blobKey, file, {
            metadata: {
                plantId: plantId,
                originalName: file.name,
                contentType: file.type,
                uploadedAt: new Date().toISOString()
            }
        });

        // Generate URL that points to our serve function
        // Works both locally (netlify dev) and in production
        const origin = new URL(request.url).origin;
        const blobUrl = `${origin}/api/photos/${blobKey}`;

        return new Response(JSON.stringify({
            success: true,
            blobUrl: blobUrl,
            blobKey: blobKey
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
