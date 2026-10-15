import { handleUpload } from '@vercel/blob/client';

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
        return response.status(405).json({ error: 'Método não permitido.' });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return response.status(503).json({ error: 'O Vercel Blob não está configurado.' });
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

        return response.status(200).json(result);
    } catch (error) {
        console.error('Falha ao autorizar upload para o Vercel Blob:', error);
        return response.status(400).json({ error: 'Não foi possível autorizar o upload.' });
    }
}
