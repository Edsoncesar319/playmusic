import { handleUpload } from '@vercel/blob/client';
import { getCurrentUser } from '../lib/auth.js';
import { isSameOrigin, sendJson } from '../lib/http.js';

const audioTypes = [
    'audio/aac',
    'audio/flac',
    'audio/mp4',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'audio/webm',
    'audio/x-flac',
    'audio/x-wav',
];

const imageTypes = [
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/webp',
];

const uploadPathPattern = /^(music|covers)\/[0-9a-f-]{36}\/[\p{L}\p{N}._ -]{1,180}$/iu;

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return sendJson(response, 405, { error: 'Método não permitido.' });
    }

    if (!isSameOrigin(request)) {
        return sendJson(response, 403, { error: 'Origem da solicitação não permitida.' });
    }

    try {
        const user = await getCurrentUser(request);
        if (!user) {
            return sendJson(response, 401, { error: 'Autenticação necessária.' });
        }
    } catch (error) {
        console.error('Falha ao verificar a sessão para upload:', error);
        return sendJson(response, 500, { error: 'Não foi possível verificar a sessão.' });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return sendJson(response, 503, { error: 'O Vercel Blob não está configurado.' });
    }

    try {
        const result = await handleUpload({
            body: request.body,
            request,
            onBeforeGenerateToken: async (pathname) => {
                if (!uploadPathPattern.test(pathname)) {
                    throw new Error('Caminho de upload inválido.');
                }

                const isCover = pathname.startsWith('covers/');
                return {
                    allowedContentTypes: isCover ? imageTypes : audioTypes,
                    maximumSizeInBytes: isCover ? 10 * 1024 * 1024 : 100 * 1024 * 1024,
                    addRandomSuffix: isCover,
                };
            },
        });

        return sendJson(response, 200, result);
    } catch (error) {
        console.error('Falha ao autorizar upload para o Vercel Blob:', error);
        return sendJson(response, 400, { error: 'Não foi possível autorizar o upload.' });
    }
}
