import { readFile } from 'node:fs/promises';
import path from 'node:path';

const types: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!/^[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/i.test(filename) || filename.includes('..')) {
    return new Response('Not found', { status: 404 });
  }
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const contentType = types[extension] || 'application/octet-stream';
  try {
    if (process.env.DATA_BACKEND === 'firebase') {
      const { storageBucket } = await import('@/lib/admin/firebase-app');
      const [bytes] = await storageBucket().file(`uploads/${filename}`).download();
      return new Response(new Uint8Array(bytes), {
        headers: { 'content-type': contentType, 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' },
      });
    }
    const root = path.resolve(process.cwd(), 'public', 'uploads');
    const file = path.resolve(root, filename);
    if (!file.startsWith(`${root}${path.sep}`)) return new Response('Not found', { status: 404 });
    const bytes = await readFile(file);
    return new Response(new Uint8Array(bytes), {
      headers: { 'content-type': contentType, 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
