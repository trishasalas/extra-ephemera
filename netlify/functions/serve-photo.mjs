import { getStore } from '@netlify/blobs';

export default async (request, context) => {
    // Extract the blob key from the URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    // Path will be /api/photos/{blobKey}
    const blobKey = pathParts[pathParts.length - 1];
    console.log(blobKey)

    if (!blobKey) {
        return new Response('Photo key required', { status: 400 });
    }

    try {
        const photoStore = getStore('plant-photos');

        console.log(`Attempting to retrieve blob: ${blobKey}`);

        // Get the blob with metadata as arrayBuffer
        const blobData = await photoStore.getWithMetadata(blobKey, { type: 'arrayBuffer' });

        if (!blobData || !blobData.data) {
            console.log(`Blob not found: ${blobKey}`);
            return new Response('Photo not found', { status: 404 });
        }

        console.log(`Successfully retrieved blob: ${blobKey}, content-type: ${blobData.metadata?.contentType}`);

        // Get content type from metadata, fallback to jpeg
        const contentType = blobData.metadata?.contentType || 'image/jpeg';

        // Return the image with appropriate headers
        return new Response(blobData.data, {
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
