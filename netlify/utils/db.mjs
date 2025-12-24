import { neon } from '@neondatabase/serverless';

/**
 * Get a database connection
 * Uses DATABASE_URL env var set by Netlify DB
 */
export function getDb() {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is not set');
    }
    
    return neon(databaseUrl);
}
