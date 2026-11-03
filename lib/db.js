import { neon } from '@neondatabase/serverless';

let sql;
let activeDatabaseUrl;

export function getDb() {
    const databaseUrl = process.env.DATABASE_URL || process.env.Musickera_DATABASE_URL;
    if (!databaseUrl) {
        const error = new Error('DATABASE_URL não está configurada.');
        error.code = 'DATABASE_URL_MISSING';
        throw error;
    }

    if (!sql || activeDatabaseUrl !== databaseUrl) {
        sql = neon(databaseUrl);
        activeDatabaseUrl = databaseUrl;
    }

    return sql;
}
