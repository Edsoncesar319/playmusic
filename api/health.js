import { sendJson } from '../lib/http.js';

export default function handler(request, response) {
    if (request.method !== 'GET') {
        response.setHeader('Allow', 'GET');
        return sendJson(response, 405, { error: 'Método não permitido.' });
    }
    return sendJson(response, 200, { status: 'ok', storage: 'vercel' });
}
