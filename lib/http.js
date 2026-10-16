export function sendJson(response, status, body) {
    response.setHeader('Cache-Control', 'no-store');
    return response.status(status).json(body);
}

export function sendServerError(response, error, context, message) {
    console.error(context, error);
    if (error?.code === 'DATABASE_URL_MISSING') {
        return sendJson(response, 503, {
            error: 'Banco de dados não configurado. Defina DATABASE_URL e execute database/schema.sql no Neon.',
        });
    }
    return sendJson(response, 500, { error: message });
}

export function readJsonBody(request) {
    if (request.body && typeof request.body === 'object' && !Array.isArray(request.body)) {
        return request.body;
    }

    if (typeof request.body === 'string') {
        try {
            const body = JSON.parse(request.body);
            if (body && typeof body === 'object' && !Array.isArray(body)) {
                return body;
            }
        } catch {
            // The caller returns a client error for malformed JSON.
        }
    }

    return null;
}

export function isSameOrigin(request) {
    const origin = request.headers.origin;
    const host = request.headers['x-forwarded-host'] || request.headers.host;
    if (!origin || !host) return false;

    try {
        return new URL(origin).host.toLowerCase() === String(host).toLowerCase();
    } catch {
        return false;
    }
}
