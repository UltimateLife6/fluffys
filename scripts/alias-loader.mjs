import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const file = path.join(process.cwd(), specifier.slice(2));
    return nextResolve(pathToFileURL(`${file}.ts`).href, context);
  }
  return nextResolve(specifier, context);
}
