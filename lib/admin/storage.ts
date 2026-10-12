import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { extensionForType, hasImageSignature, validateImageUpload } from '@/lib/admin/images';

export function storageProvider() {
  if (process.env.DATA_BACKEND === 'firebase') return 'firebase';
  return process.env.BLOB_READ_WRITE_TOKEN ? 'blob' : 'local';
}

export function safeUploadName(type: string) {
  return `${randomUUID()}.${extensionForType(type)}`;
}

export function assertUploadPath(filePath: string) {
  if (!filePath.startsWith('/uploads/') || filePath.includes('..') || filePath.includes('\\')) {
    throw new Error('That image path is not allowed.');
  }
}

export async function storeImage(file: { type: string; size: number; name?: string; bytes: Uint8Array }) {
  const message = validateImageUpload(file);
  if (message) throw new Error(message);
  if (!hasImageSignature(file.bytes, file.type)) throw new Error('That file is not a valid image.');
  const filename = safeUploadName(file.type);
  if (storageProvider() === 'firebase') {
    const { storageBucket } = await import('@/lib/admin/firebase-app');
    await storageBucket().file(`uploads/${filename}`).save(Buffer.from(file.bytes), {
      contentType: file.type,
      resumable: false,
      metadata: { contentType: file.type },
    });
    return { path: `/uploads/${filename}`, provider: 'firebase' as const, byteSize: file.bytes.byteLength, contentType: file.type };
  }
  if (storageProvider() === 'blob') {
    const token = process.env.BLOB_READ_WRITE_TOKEN || '';
    const response = await fetch(`https://blob.vercel-storage.com/${filename}`, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${token}`,
        'x-content-type': file.type,
        'x-api-version': '7',
      },
      body: Buffer.from(file.bytes),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error('Image storage did not accept the file.');
    const payload = (await response.json()) as { url?: string };
    if (!payload.url || !payload.url.startsWith('https://')) throw new Error('Image storage did not return a URL.');
    return { path: payload.url, provider: 'blob' as const, byteSize: file.bytes.byteLength, contentType: file.type };
  }
  const directory = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(directory, { recursive: true });
  const stored = path.join(directory, filename);
  if (!stored.startsWith(directory)) throw new Error('That image path is not allowed.');
  await writeFile(stored, file.bytes);
  return { path: `/uploads/${filename}`, provider: 'local' as const, byteSize: file.bytes.byteLength, contentType: file.type };
}
