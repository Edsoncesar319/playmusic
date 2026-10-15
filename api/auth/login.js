import {
    createSession,
    normalizeEmail,
    verifyPassword,
} from '../../lib/auth.js';
import { getDb } from '../../lib/db.js';
import { isSameOrigin, readJsonBody, sendJson } from '../../lib/http.js';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return sendJson(response, 405, { error: 'Método não permitido.' });
    }

    if (!isSameOrigin(request)) {
        return sendJson(response, 403, { error: 'Origem da solicitação não permitida.' });
    }

    const body = readJsonBody(request);
    const email = normalizeEmail(body?.email);
    if (!email || typeof body?.password !== 'string'
        || Buffer.byteLength(body.password, 'utf8') > 128) {
        return sendJson(response, 400, { error: 'E-mail ou senha inválidos.' });
    }

    try {
        const [account] = await getDb()`
            SELECT id, email, display_name AS "displayName", password_hash AS "passwordHash",
                created_at AS "createdAt"
            FROM users
            WHERE email = ${email}
            LIMIT 1
        `;
        const validPassword = await verifyPassword(body.password, account?.passwordHash);
        if (!account || !validPassword) {
            return sendJson(response, 401, { error: 'E-mail ou senha inválidos.' });
        }

        const { passwordHash, ...user } = account;
        await createSession(user.id, response);
        return sendJson(response, 200, { user });
    } catch (error) {
        console.error('Falha ao iniciar sessão:', error);
        return sendJson(response, 500, { error: 'Não foi possível iniciar sessão.' });
    }
}
