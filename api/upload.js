import { issueSignedToken } from '@vercel/blob';
import { handleUploadPresigned } from '@vercel/blob/client';
import { isValidUploadPath } from '../lib/blob-path.js';
import { getCurrentUser } from '../lib/auth.js';
import { isSameOrigin, sendJson, sendServerError } from '../lib/http.js';

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
        return sendServerError(response, error, 'Falha ao verificar a sessão para upload:', 'Não foi possível verificar a sessão.');
    }

    if (!process.env.BLOB_STORE_ID || !process.env.BLOB_WEBHOOK_PUBLIC_KEY) {
        return sendJson(response, 503, { error: 'O Vercel Blob não está configurado.' });
    }

    try {
        const result = await handleUploadPresigned({
            body: request.body,
            request,
            getSignedToken: async (pathname) => {
                if (!isValidUploadPath(pathname)) {
                    throw new Error('Caminho de upload inválido.');
                }

                const isCover = pathname.startsWith('covers/');
                const allowedContentTypes = isCover ? imageTypes : audioTypes;
                const maximumSizeInBytes = isCover
                    ? 10 * 1024 * 1024
                    : 100 * 1024 * 1024;
                return {
                    token: await issueSignedToken({
                        pathname,
                        operations: ['put'],
                        allowedContentTypes,
                        maximumSizeInBytes,
                    }),
                    urlOptions: {
                        allowedContentTypes,
                        maximumSizeInBytes,
                        addRandomSuffix: isCover,
                    },
                };
            },
        });

        return sendJson(response, 200, result);
    } catch (error) {
        console.error('Falha ao autorizar upload para o Vercel Blob:', error);
        return sendJson(response, 500, { error: 'Não foi possível autorizar o upload no Vercel Blob.' });
    }
}
