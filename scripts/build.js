import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const outputDirectory = new URL('../public/', import.meta.url);
await mkdir(outputDirectory, { recursive: true });

for (const file of ['index.html', 'login.html', 'favicon.ico']) {
    await cp(fileURLToPath(new URL(`../${file}`, import.meta.url)), fileURLToPath(new URL(file, outputDirectory)));
}

await build({
    entryPoints: [fileURLToPath(new URL('../lib/blob-client.js', import.meta.url))],
    bundle: true,
    platform: 'browser',
    format: 'esm',
    minify: true,
    outfile: fileURLToPath(new URL('blob-client.js', outputDirectory)),
});
