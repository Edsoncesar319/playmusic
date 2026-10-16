import { readFile } from 'node:fs/promises';
import { getDb } from '../lib/db.js';

const databaseUrl = process.env.DATABASE_URL || process.env.Musickera_DATABASE_URL;
if (!databaseUrl || databaseUrl.includes('[SENSITIVE]')) {
    throw new Error(
        'A URL secreta do Neon não está disponível para a CLI. Configure DATABASE_URL no projeto Vercel e tente novamente.'
    );
}

const sql = getDb();
const schema = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');
const statements = schema
    .split(';')
    .map(statement => statement.trim())
    .filter(statement => statement && !statement.startsWith('--'));

if (statements.length === 0) {
    throw new Error('database/schema.sql não contém instruções para aplicar.');
}

for (const statement of statements) {
    await sql.query(statement);
}

console.log(`Schema do Neon aplicado: ${statements.length} instruções idempotentes.`);
