// glyphfox-universe for Node: the catalog and the index are read from the
// package (dist/), and icon sets from a local install of @iconify-json/<prefix>
// or @iconify/json when there is one, before falling back to jsDelivr.

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { setLocalSource } from './core.js';

const dist = new URL('../dist/', import.meta.url);
const requires = () => [createRequire(join(process.cwd(), 'index.js')), createRequire(import.meta.url)];

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

/** Path of a locally installed Iconify JSON for a set, or null. */
export function localSetFile(prefix) {
  for (const req of requires()) {
    for (const id of [`@iconify-json/${prefix}/icons.json`, `@iconify/json/json/${prefix}.json`]) {
      try {
        return req.resolve(id);
      } catch {
        // not installed here
      }
    }
  }
  return null;
}

setLocalSource({
  readData: (file) => readJson(new URL(file, dist)),
  readSet: async (prefix) => {
    const file = localSetFile(prefix);
    return file ? readJson(file) : null;
  },
});

export * from './core.js';
