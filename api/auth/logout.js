import { clearCurrentSession } from '../../lib/auth.js';
import { isSameOrigin, sendJson } from '../../lib/http.js';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return sendJson(response, 405, { error: 'Método não permitido.' });
    }

    if (!isSameOrigin(request)) {
        return sendJson(response, 403, { error: 'Origem da solicitação não permitida.' });
    }

    try {
        await clearCurrentSession(request, response);
        return sendJson(response, 200, { success: true });
    } catch (error) {
        console.error('Falha ao encerrar sessão:', error);
        return sendJson(response, 500, { error: 'Não foi possível encerrar a sessão.' });
    }
}
