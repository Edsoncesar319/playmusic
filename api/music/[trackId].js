import { del, list, rename } from '@vercel/blob';
import { getCurrentUser } from '../../lib/auth.js';
import { isSameOrigin, readJsonBody, sendJson, sendServerError } from '../../lib/http.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const metadataPattern = /^[\p{L}\p{N}._ -]{1,80}$/u;

async function listAll(prefix) {
    const blobs = [];
    let cursor;

    do {
        const page = await list({ prefix, limit: 1000, cursor });
        blobs.push(...page.blobs);
        cursor = page.cursor;
    } while (cursor);

    return blobs;
}

function validMetadata(body) {
    if (!body || typeof body.title !== 'string'
        || typeof body.artist !== 'string' || typeof body.album !== 'string') {
        return null;
    }

    const metadata = {
        title: body.title.trim(),
        artist: body.artist.trim(),
        album: body.album.trim(),
    };
    const fileName = `${metadata.artist} -- ${metadata.album} -- ${metadata.title}.mp3`;

    if (!Object.values(metadata).every(value => (
        metadataPattern.test(value) && !value.includes(' -- ')
    )) || fileName.length > 180) {
        return null;
    }
    return metadata;
}

export default async function handler(request, response) {
    if (!['PATCH', 'DELETE'].includes(request.method)) {
        response.setHeader('Allow', 'PATCH, DELETE');
        return sendJson(response, 405, { error: 'Método não permitido.' });
    }

    const trackId = request.query?.trackId;
    if (typeof trackId !== 'string' || !uuidPattern.test(trackId)) {
        return sendJson(response, 400, { error: 'Identificador de música inválido.' });
    }

    try {
        const user = await getCurrentUser(request);
        if (!user) {
            return sendJson(response, 401, { error: 'Autenticação necessária.' });
        }
    } catch (error) {
        return sendServerError(response, error, 'Falha ao verificar a sessão para alterar músicas:', 'Não foi possível verificar a sessão.');
    }

    if (!isSameOrigin(request)) {
        return sendJson(response, 403, { error: 'Origem da solicitação não permitida.' });
    }
    try {
        const musicBlobs = await listAll(`music/${trackId}/`);
        if (musicBlobs.length === 0) {
            return sendJson(response, 404, { error: 'Música não encontrada.' });
        }

        if (request.method === 'DELETE') {
            const coverBlobs = await listAll(`covers/${trackId}/`);
            await del([...musicBlobs, ...coverBlobs].map(blob => blob.url));
            return sendJson(response, 200, { success: true });
        }

        const metadata = validMetadata(readJsonBody(request));
        if (!metadata) {
            return sendJson(response, 400, {
                error: 'Informe título, artista e álbum válidos (até 80 caracteres cada).',
            });
        }

        const musicBlob = musicBlobs.find(blob => blob.pathname.startsWith(`music/${trackId}/`));
        const oldFileName = musicBlob.pathname.split('/').pop();
        const extension = oldFileName.match(/\.[^.]+$/)?.[0] ?? '.mp3';
        const fileName = `${metadata.artist} -- ${metadata.album} -- ${metadata.title}${extension}`;
        const newPathname = `music/${trackId}/${fileName}`;
        if (musicBlob.pathname !== newPathname) {
            await rename(musicBlob.url, newPathname, { access: 'public' });
        }
        return sendJson(response, 200, { success: true });
    } catch (error) {
        return sendServerError(response, error, 'Falha ao alterar arquivos no Vercel Blob:', 'Não foi possível alterar a música.');
    }
}
