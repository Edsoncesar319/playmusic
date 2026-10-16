import { neon } from '@neondatabase/serverless';

let sql;

export function getDb() {
    const databaseUrl = process.env.DATABASE_URL || process.env.Musickera_DATABASE_URL;
    if (!databaseUrl) {
        const error = new Error('DATABASE_URL não está configurada.');
        error.code = 'DATABASE_URL_MISSING';
        throw error;
    }

    sql ??= neon(databaseUrl);
    return sql;
}
