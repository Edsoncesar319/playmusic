import test from 'node:test';
import assert from 'node:assert/strict';
import {
    hashPassword,
    isValidDisplayName,
    isValidPassword,
    normalizeEmail,
    verifyPassword,
} from '../lib/auth.js';
import { getDb } from '../lib/db.js';
import { decodeBlobFileName, encodeBlobFileName, isValidUploadPath } from '../lib/blob-path.js';
import { isSameOrigin, readJsonBody, sendServerError } from '../lib/http.js';

test('normalizes and validates account emails', () => {
    assert.equal(normalizeEmail('  Person@Example.com '), 'person@example.com');
    assert.equal(normalizeEmail('not-an-email'), null);
    assert.equal(normalizeEmail('a'.repeat(250) + '@example.com'), null);
});

test('validates display names and password bounds', () => {
    assert.equal(isValidDisplayName('  Ana  '), true);
    assert.equal(isValidDisplayName('   '), false);
    assert.equal(isValidDisplayName('a'.repeat(81)), false);
    assert.equal(isValidPassword('long-enough-pass'), true);
    assert.equal(isValidPassword('short'), false);
    assert.equal(isValidPassword('á'.repeat(65)), false);
});

test('hashes passwords and verifies only the matching password', async () => {
    const password = 'a-long-test-password';
    const passwordHash = await hashPassword(password);

    assert.notEqual(passwordHash, password);
    assert.equal(await verifyPassword(password, passwordHash), true);
    assert.equal(await verifyPassword('a-different-password', passwordHash), false);
    assert.equal(await verifyPassword(password, 'invalid-hash'), false);
});

test('accepts only same-origin write requests and plain JSON objects', () => {
    assert.equal(isSameOrigin({
        headers: { origin: 'https://music.example', host: 'music.example' }
    }), true);
    assert.equal(isSameOrigin({
        headers: { origin: 'https://attacker.example', host: 'music.example' }
    }), false);
    assert.equal(isSameOrigin({ headers: { host: 'music.example' } }), false);
    assert.deepEqual(readJsonBody({ body: '{"name":"Ana"}' }), { name: 'Ana' });
    assert.equal(readJsonBody({ body: '[]' }), null);
    assert.equal(readJsonBody({ body: 'invalid' }), null);
});

test('reports missing database configuration as a service-unavailable response', () => {
    const response = {
        headers: {},
        statusCode: 200,
        body: null,
        setHeader(name, value) {
            this.headers[name] = value;
        },
        status(statusCode) {
            this.statusCode = statusCode;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
    };
    const error = new Error('DATABASE_URL não está configurada.');
    error.code = 'DATABASE_URL_MISSING';
    const originalConsoleError = console.error;
    console.error = () => {};

    try {
        sendServerError(response, error, 'Database unavailable:', 'Unexpected server error.');
    } finally {
        console.error = originalConsoleError;
    }

    assert.equal(response.statusCode, 503);
    assert.match(response.body.error, /DATABASE_URL/);
    assert.equal(response.headers['Cache-Control'], 'no-store');
});

test('accepts the Neon integration database URL when DATABASE_URL is not defined', () => {
    const databaseUrl = process.env.DATABASE_URL;
    const neonIntegrationUrl = process.env.Musickera_DATABASE_URL;
    process.env.DATABASE_URL = '';
    process.env.Musickera_DATABASE_URL = 'postgresql://user:password@localhost/database';

    try {
        assert.equal(typeof getDb(), 'function');
    } finally {
        if (databaseUrl === undefined) delete process.env.DATABASE_URL;
        else process.env.DATABASE_URL = databaseUrl;
        if (neonIntegrationUrl === undefined) delete process.env.Musickera_DATABASE_URL;
        else process.env.Musickera_DATABASE_URL = neonIntegrationUrl;
    }
});

test('encodes accented Blob filenames while preserving their displayed names', () => {
    const fileName = 'Ainda Amo Você 1.mp3';
    const encodedFileName = encodeBlobFileName(fileName);
    const pathname = `music/01f66aa7-f458-42fa-bd5a-b1be7fdf0fb9/${encodedFileName}`;

    assert.match(encodedFileName, /^[\x00-\x7F]+$/);
    assert.equal(decodeBlobFileName(pathname), fileName);
    assert.equal(isValidUploadPath(pathname), true);
    assert.equal(isValidUploadPath(pathname.replace('%20', '%2F')), false);
    assert.equal(isValidUploadPath('music/not-a-track-id/song.mp3'), false);
});
