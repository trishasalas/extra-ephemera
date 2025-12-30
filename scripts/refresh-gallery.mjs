#!/usr/bin/env node
/**
 * Fetches gallery images from Cloudinary and caches metadata locally.
 * Run with: npm run refresh-gallery
 */

import { config } from 'dotenv';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env file
config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '../src/data/gallery.json');

const CLOUD_NAME = process.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.PUBLIC_CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const FOLDER = 'gallery';
const MAX_RESULTS = 100;

async function fetchGalleryImages() {
    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
        console.error('Missing Cloudinary credentials in .env');
        console.error('Required: PUBLIC_CLOUDINARY_CLOUD_NAME, PUBLIC_CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
        process.exit(1);
    }

    console.log(`Fetching images from Cloudinary folder: ${FOLDER}`);

    const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
    let allResources = [];
    let nextCursor = null;

    // Paginate through all results
    do {
        const url = new URL(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/by_asset_folder`);
        url.searchParams.set('asset_folder', FOLDER);
        url.searchParams.set('max_results', MAX_RESULTS.toString());
        if (nextCursor) {
            url.searchParams.set('next_cursor', nextCursor);
        }

        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': `Basic ${auth}`,
            }
        });

        if (!response.ok) {
            console.error(`API error: ${response.status} ${response.statusText}`);
            process.exit(1);
        }

        const data = await response.json();
        allResources = [...allResources, ...data.resources];
        nextCursor = data.next_cursor;

        console.log(`  Fetched ${data.resources.length} images (total: ${allResources.length})`);
    } while (nextCursor);

    // Extract only the fields we need
    const images = allResources.map(img => ({
        asset_id: img.asset_id,
        public_id: img.public_id,
        format: img.format,
        width: img.width,
        height: img.height,
        display_name: img.display_name || '',
        created_at: img.created_at,
    }));

    // Sort by created_at descending (newest first)
    images.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const output = {
        folder: FOLDER,
        updated_at: new Date().toISOString(),
        count: images.length,
        images,
    };

    writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
    console.log(`\nSaved ${images.length} images to ${OUTPUT_PATH}`);
}

fetchGalleryImages().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
