import { getStore } from '@netlify/blobs';

export default async (request, context) => {
    // Extract the blob key from the URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    // Path will be /api/photos/{blobKey}
    const blobKey = pathParts[pathParts.length - 1];

    if (!blobKey) {
        return new Response('Photo key required', { status: 400 });
    }

    try {
        const photoStore = getStore({
            name: 'plant-photos',
            consistency: 'strong'
        });

        // Get the blob with metadata
        const blob = await photoStore.getWithMetadata(blobKey, { type: 'blob' });

        if (!blob || !blob.data) {
            return new Response('Photo not found', { status: 404 });
        }

        // Get content type from metadata, fallback to octet-stream
        const contentType = blob.metadata?.contentType || 'application/octet-stream';

        // Return the image with appropriate headers
        return new Response(blob.data, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });

    } catch (error) {
        console.error('Error serving photo:', error);
        return new Response('Error retrieving photo', { status: 500 });
    }
};

export const config = {
    // Wildcard path to catch any photo key
    path: "/api/photos/*",
};
