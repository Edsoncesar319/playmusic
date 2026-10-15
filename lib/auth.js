import {
    createHash,
    randomBytes,
    scrypt as scryptCallback,
    timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { getDb } from './db.js';

const scrypt = promisify(scryptCallback);
const COOKIE_NAME = '__Host-musickera_session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;
const PASSWORD_BYTES_MAX = 128;

function sessionCookie(value, maxAge) {
    return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function getSessionToken(request) {
    const cookieHeader = request.headers.cookie;
    if (typeof cookieHeader !== 'string') return null;

    const cookie = cookieHeader
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${COOKIE_NAME}=`));
    const token = cookie?.slice(COOKIE_NAME.length + 1);
    return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

function hashToken(token) {
    return createHash('sha256').update(token).digest('hex');
}

export function normalizeEmail(value) {
    if (typeof value !== 'string') return null;
    const email = value.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return null;
    }
    return email;
}

export function isValidPassword(value) {
    return typeof value === 'string'
        && value.length >= 12
        && Buffer.byteLength(value, 'utf8') <= PASSWORD_BYTES_MAX;
}

export function isValidDisplayName(value) {
    return typeof value === 'string'
        && value.trim().length >= 1
        && value.trim().length <= 80;
}

export async function hashPassword(password) {
    const salt = randomBytes(16);
    const derivedKey = await scrypt(password, salt, 64);
    return `scrypt$${salt.toString('base64url')}$${derivedKey.toString('base64url')}`;
}

export async function verifyPassword(password, passwordHash) {
    const [algorithm, saltText, hashText] = passwordHash?.split('$') ?? [];
    const hasValidHash = algorithm === 'scrypt' && saltText && hashText;
    const salt = hasValidHash ? Buffer.from(saltText, 'base64url') : Buffer.from('musickera-dummy-salt');
    const expected = hasValidHash ? Buffer.from(hashText, 'base64url') : Buffer.alloc(64);
    const candidate = await scrypt(password, salt, 64);

    return Boolean(
        hasValidHash
        && expected.length === candidate.length
        && timingSafeEqual(expected, candidate)
    );
}

export async function createSession(userId, response) {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = hashToken(token);
    const sql = getDb();

    await sql`DELETE FROM user_sessions WHERE expires_at <= NOW()`;
    await sql`
        INSERT INTO user_sessions (token_hash, user_id, expires_at)
        VALUES (${tokenHash}, ${userId}, NOW() + INTERVAL '7 days')
    `;
    response.setHeader('Set-Cookie', sessionCookie(token, SESSION_MAX_AGE));
}

export async function getCurrentUser(request) {
    const token = getSessionToken(request);
    if (!token) return null;

    const tokenHash = hashToken(token);
    const [user] = await getDb()`
        SELECT
            users.id,
            users.email,
            users.display_name AS "displayName",
            users.created_at AS "createdAt"
        FROM user_sessions
        JOIN users ON users.id = user_sessions.user_id
        WHERE user_sessions.token_hash = ${tokenHash}
          AND user_sessions.expires_at > NOW()
        LIMIT 1
    `;
    return user ?? null;
}

export async function getCurrentUserWithPassword(request) {
    const token = getSessionToken(request);
    if (!token) return null;

    const tokenHash = hashToken(token);
    const [user] = await getDb()`
        SELECT
            users.id,
            users.email,
            users.display_name AS "displayName",
            users.password_hash AS "passwordHash",
            users.created_at AS "createdAt"
        FROM user_sessions
        JOIN users ON users.id = user_sessions.user_id
        WHERE user_sessions.token_hash = ${tokenHash}
          AND user_sessions.expires_at > NOW()
        LIMIT 1
    `;
    return user ?? null;
}

export async function clearCurrentSession(request, response) {
    const token = getSessionToken(request);
    response.setHeader('Set-Cookie', sessionCookie('', 0));
    if (!token) return;

    const tokenHash = hashToken(token);
    await getDb()`DELETE FROM user_sessions WHERE token_hash = ${tokenHash}`;
}

export async function revokeOtherSessions(request, userId) {
    const token = getSessionToken(request);
    if (!token) return;

    const currentTokenHash = hashToken(token);
    await getDb()`
        DELETE FROM user_sessions
        WHERE user_id = ${userId} AND token_hash <> ${currentTokenHash}
    `;
}
