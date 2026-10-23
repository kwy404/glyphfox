// Data files for the studio site in docs/ (committed, served by GitHub Pages).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

export function docsFiles(root, icons, { version }) {
  const data = {
    version,
    count: icons.length,
    icons: icons.map((ic) => [ic.name, ic.body, ic.tags, ic.categories, ic.solid]),
  };
  return {
    [join(root, 'docs', 'data', 'icons.json')]: JSON.stringify(data) + '\n',
  };
}

/** Writes (or with check: compares) the docs data. Returns the changed paths. */
export function buildDocsData(root, icons, { version, check }) {
  const files = docsFiles(root, icons, { version });
  const changed = [];
  for (const [file, text] of Object.entries(files)) {
    const old = existsSync(file) ? readFileSync(file, 'utf8') : null;
    if (old === text) continue;
    changed.push(relative(root, file).split('\\').join('/'));
    if (!check) {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, text);
    }
  }
  return changed;
}
