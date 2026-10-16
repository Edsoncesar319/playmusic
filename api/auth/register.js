import {
    createSession,
    hashPassword,
    isValidDisplayName,
    isValidPassword,
    normalizeEmail,
} from '../../lib/auth.js';
import { getDb } from '../../lib/db.js';
import { isSameOrigin, readJsonBody, sendJson, sendServerError } from '../../lib/http.js';

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
    const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : '';
    if (!email || !isValidDisplayName(displayName) || !isValidPassword(body?.password)) {
        return sendJson(response, 400, {
            error: 'Informe um nome, um e-mail válido e uma senha de 12 a 128 bytes.',
        });
    }

    try {
        const passwordHash = await hashPassword(body.password);
        const [user] = await getDb()`
            INSERT INTO users (email, display_name, password_hash)
            VALUES (${email}, ${displayName}, ${passwordHash})
            RETURNING
                id,
                email,
                display_name AS "displayName",
                created_at AS "createdAt"
        `;

        await createSession(user.id, response);
        return sendJson(response, 201, { user });
    } catch (error) {
        if (error.code === '23505') {
            return sendJson(response, 409, { error: 'Já existe uma conta com esse e-mail.' });
        }

        return sendServerError(response, error, 'Falha ao criar conta:', 'Não foi possível criar a conta.');
    }
}
