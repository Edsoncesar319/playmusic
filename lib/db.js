import { neon } from '@neondatabase/serverless';

let sql;

export function getDb() {
    if (!process.env.DATABASE_URL) {
        const error = new Error('DATABASE_URL não está configurada.');
        error.code = 'DATABASE_URL_MISSING';
        throw error;
    }

    sql ??= neon(process.env.DATABASE_URL);
    return sql;
}
