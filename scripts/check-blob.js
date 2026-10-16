import { randomUUID } from 'node:crypto';
import { issueSignedToken, list } from '@vercel/blob';

if (!process.env.BLOB_STORE_ID) {
    throw new Error('BLOB_STORE_ID is not configured.');
}

await list({ prefix: 'music/', limit: 1 });
await issueSignedToken({
    pathname: `music/${randomUUID()}/oidc-check.mp3`,
    operations: ['put'],
    allowedContentTypes: ['audio/mpeg'],
    maximumSizeInBytes: 1024,
});

console.log('Vercel Blob OIDC read and upload-token authorization succeeded.');
