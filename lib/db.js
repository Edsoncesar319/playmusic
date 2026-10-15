import { neon } from '@neondatabase/serverless';

let sql;

export function getDb() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL não está configurada.');
    }

    sql ??= neon(process.env.DATABASE_URL);
    return sql;
}
