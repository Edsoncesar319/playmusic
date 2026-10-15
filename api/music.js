import { list } from '@vercel/blob';

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

function getTrackId(pathname, type) {
    const match = pathname.match(new RegExp(`^${type}/([0-9a-f-]{36})/`, 'i'));
    return match?.[1]?.toLowerCase();
}

function getTrackDetails(pathname) {
    const fileName = pathname.split('/').pop() ?? '';
    const nameWithoutExtension = fileName.replace(/\.[^.]+$/, '');
    const metadata = nameWithoutExtension.split(' -- ');
    if (metadata.length >= 3) {
        return {
            artist: metadata[0],
            album: metadata[1],
            title: metadata.slice(2).join(' -- '),
            fileName,
        };
    }

    const titleAndArtist = nameWithoutExtension.split(' - ');

    return {
        title: titleAndArtist.length > 1 ? titleAndArtist.slice(1).join(' - ') : titleAndArtist[0],
        artist: titleAndArtist.length > 1 ? titleAndArtist[0] : 'Artista desconhecido',
        album: 'Álbum desconhecido',
        fileName,
    };
}

export default async function handler(request, response) {
    if (request.method !== 'GET') {
        response.setHeader('Allow', 'GET');
        return response.status(405).json({ error: 'Método não permitido.' });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return response.status(503).json({ error: 'O Vercel Blob não está configurado.' });
    }

    try {
        const [musicBlobs, coverBlobs] = await Promise.all([
            listAll('music/'),
            listAll('covers/'),
        ]);

        const coversByTrack = new Map();
        for (const blob of coverBlobs.sort((a, b) => (
            new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        ))) {
            const trackId = getTrackId(blob.pathname, 'covers');
            if (trackId && !coversByTrack.has(trackId)) {
                coversByTrack.set(trackId, blob.url);
            }
        }

        const music = musicBlobs
            .filter((blob) => getTrackId(blob.pathname, 'music'))
            .map((blob) => {
                const id = getTrackId(blob.pathname, 'music');
                return {
                    ...getTrackDetails(blob.pathname),
                    id,
                    blobId: id,
                    duration: '0:00',
                    cover: coversByTrack.get(id) ?? '',
                    file: blob.url,
                };
            })
            .sort((a, b) => a.fileName.localeCompare(b.fileName, 'pt-BR'));

        return response.status(200).json({ music });
    } catch (error) {
        console.error('Falha ao listar arquivos do Vercel Blob:', error);
        return response.status(500).json({ error: 'Não foi possível carregar a biblioteca do Blob.' });
    }
}
