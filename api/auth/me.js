import {
    clearCurrentSession,
    getCurrentUserWithPassword,
    hashPassword,
    isValidDisplayName,
    isValidPassword,
    normalizeEmail,
    revokeOtherSessions,
    verifyPassword,
} from '../../lib/auth.js';
import { getDb } from '../../lib/db.js';
import { isSameOrigin, readJsonBody, sendJson } from '../../lib/http.js';

export default async function handler(request, response) {
    if (!['GET', 'PATCH', 'DELETE'].includes(request.method)) {
        response.setHeader('Allow', 'GET, PATCH, DELETE');
        return sendJson(response, 405, { error: 'Método não permitido.' });
    }

    try {
        const user = await getCurrentUserWithPassword(request);
        if (!user) {
            return sendJson(response, 401, { error: 'Autenticação necessária.' });
        }

        if (request.method === 'GET') {
            const { passwordHash, ...publicUser } = user;
            return sendJson(response, 200, { user: publicUser });
        }

        if (!isSameOrigin(request)) {
            return sendJson(response, 403, { error: 'Origem da solicitação não permitida.' });
        }

        if (request.method === 'DELETE') {
            await getDb()`DELETE FROM users WHERE id = ${user.id}`;
            await clearCurrentSession(request, response);
            return sendJson(response, 200, { success: true });
        }

        const body = readJsonBody(request);
        if (!body) {
            return sendJson(response, 400, { error: 'Corpo da solicitação inválido.' });
        }
        const displayName = typeof body?.displayName === 'string'
            ? body.displayName.trim()
            : user.displayName;
        const email = body?.email === undefined ? user.email : normalizeEmail(body.email);
        const passwordChanged = body?.newPassword !== undefined && body.newPassword !== '';
        const emailChanged = email !== user.email;

        if (!isValidDisplayName(displayName) || !email) {
            return sendJson(response, 400, { error: 'Informe um nome e um e-mail válidos.' });
        }

        if ((emailChanged || passwordChanged)
            && (typeof body?.currentPassword !== 'string'
                || !await verifyPassword(body.currentPassword, user.passwordHash))) {
            return sendJson(response, 403, { error: 'A senha atual está incorreta.' });
        }

        if (passwordChanged && !isValidPassword(body.newPassword)) {
            return sendJson(response, 400, {
                error: 'A nova senha deve ter de 12 a 128 bytes.',
            });
        }

        const passwordHash = passwordChanged ? await hashPassword(body.newPassword) : null;
        const [updatedUser] = await getDb()`
            UPDATE users
            SET display_name = ${displayName},
                email = ${email},
                password_hash = COALESCE(${passwordHash}, password_hash),
                updated_at = NOW()
            WHERE id = ${user.id}
            RETURNING id, email, display_name AS "displayName", created_at AS "createdAt"
        `;

        if (passwordChanged) {
            await revokeOtherSessions(request, user.id);
        }

        return sendJson(response, 200, { user: updatedUser });
    } catch (error) {
        if (error.code === '23505') {
            return sendJson(response, 409, { error: 'Já existe uma conta com esse e-mail.' });
        }

        console.error('Falha ao acessar a conta:', error);
        return sendJson(response, 500, { error: 'Não foi possível processar a conta.' });
    }
}
