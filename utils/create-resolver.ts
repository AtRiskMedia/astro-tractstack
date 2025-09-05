import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export function createResolver(importMetaUrl: string) {
  const __dirname = dirname(fileURLToPath(importMetaUrl));

  return {
    resolve: (...paths: string[]) => resolve(__dirname, ...paths),
  };
}
