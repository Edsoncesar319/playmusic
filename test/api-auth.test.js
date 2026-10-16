import test from 'node:test';
import assert from 'node:assert/strict';
import musicHandler from '../api/music.js';
import trackHandler from '../api/music/[trackId].js';
import uploadHandler from '../api/upload.js';
import accountHandler from '../api/auth/me.js';
import registerHandler from '../api/auth/register.js';
import healthHandler from '../api/health.js';

function mockResponse() {
    return {
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
}

test('library and account endpoints reject unauthenticated requests', async () => {
    const musicResponse = mockResponse();
    await musicHandler({ method: 'GET', headers: {} }, musicResponse);
    assert.equal(musicResponse.statusCode, 401);
    assert.equal(musicResponse.headers['Cache-Control'], 'no-store');

    const accountResponse = mockResponse();
    await accountHandler({ method: 'GET', headers: {} }, accountResponse);
    assert.equal(accountResponse.statusCode, 401);
});

test('write endpoints reject requests without a matching same-origin header', async () => {
    const uploadResponse = mockResponse();
    await uploadHandler({ method: 'POST', headers: {} }, uploadResponse);
    assert.equal(uploadResponse.statusCode, 403);

    const registerResponse = mockResponse();
    await registerHandler({ method: 'POST', headers: {}, body: {} }, registerResponse);
    assert.equal(registerResponse.statusCode, 403);
});

test('Vercel health endpoint reports the configured storage provider', () => {
    const response = mockResponse();
    healthHandler({ method: 'GET', headers: {} }, response);
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, { status: 'ok', storage: 'vercel' });
});

test('track endpoint validates methods and identifiers before accessing Blob', async () => {
    const methodResponse = mockResponse();
    await trackHandler({ method: 'GET', headers: {}, query: {} }, methodResponse);
    assert.equal(methodResponse.statusCode, 405);
    assert.equal(methodResponse.headers.Allow, 'PATCH, DELETE');

    const idResponse = mockResponse();
    await trackHandler({ method: 'DELETE', headers: {}, query: { trackId: 'not-a-uuid' } }, idResponse);
    assert.equal(idResponse.statusCode, 400);

    const authResponse = mockResponse();
    await trackHandler({
        method: 'DELETE',
        headers: {},
        query: { trackId: '8f14e45f-ea1a-4c81-a4c5-3c2a3db1e3f4' },
    }, authResponse);
    assert.equal(authResponse.statusCode, 401);
});
