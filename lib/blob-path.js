const encodedUploadPathPattern = /^(music|covers)\/([0-9a-f-]{36})\/((?:[\p{L}\p{N}._ -]|%[0-9a-f]{2}){1,540})$/iu;
const decodedFileNamePattern = /^[\p{L}\p{N}._ -]{1,180}$/u;

export function isValidUploadPath(pathname) {
    const match = typeof pathname === 'string' ? pathname.match(encodedUploadPathPattern) : null;
    if (!match) return false;

    let fileName;
    try {
        fileName = decodeURIComponent(match[3]);
    } catch {
        return false;
    }
    return fileName.length <= 180 && decodedFileNamePattern.test(fileName);
}

export function decodeBlobFileName(pathname) {
    const fileName = pathname.split('/').pop() ?? '';
    try {
        return decodeURIComponent(fileName);
    } catch {
        return fileName;
    }
}

export function encodeBlobFileName(fileName) {
    return encodeURIComponent(fileName);
}
