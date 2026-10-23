// The local collection: icons drawn, Fox-ified or fused in the studio,
// stored in this browser, with exports (SVG files, sprite, package).

import { gf } from './app.js';
import { zip } from './exporters.js';

const KEY = 'gf-collection';
const listeners = new Set();

export function load() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.filter((i) => i && typeof i.body === 'string' && i.name) : [];
  } catch {
    return [];
  }
}

function persist(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // storage full or blocked: keep working in memory
  }
  for (const fn of listeners) fn(list);
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function slug(name) {
  return (
    String(name || 'icon')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'icon'
  );
}

/** Adds or replaces an icon (by id); returns the stored item. */
export function save(item) {
  const list = load();
  const now = Date.now();
  const entry = {
    id: item.id || `i${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: slug(item.name),
    body: item.body,
    tags: item.tags || [],
    categories: item.categories && item.categories.length ? item.categories : ['shapes'],
    source: item.source || 'editor',
    updated: now,
  };
  const i = list.findIndex((x) => x.id === entry.id);
  if (i >= 0) list[i] = entry;
  else list.unshift(entry);
  persist(list);
  return entry;
}

export function remove(id) {
  persist(load().filter((x) => x.id !== id));
}

export function get(id) {
  return load().find((x) => x.id === id) || null;
}

function unique(list) {
  const seen = new Map();
  return list.map((i) => {
    const n = seen.get(i.name) || 0;
    seen.set(i.name, n + 1);
    return { ...i, file: n ? `${i.name}-${n + 1}` : i.name };
  });
}

/** Canonical SVG text of a collection item. */
export function svgOf(item) {
  return gf.canonicalSvg(item.body);
}

export function svgsZip(list = load()) {
  return zip(unique(list).map((i) => ({ name: `icons/${i.file}.svg`, data: svgOf(i) })));
}

export function sprite(list = load()) {
  return `<svg xmlns="http://www.w3.org/2000/svg">\n${unique(list)
    .map((i) => `<symbol id="gf-${i.file}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${i.body}</symbol>`)
    .join('\n')}\n</svg>\n`;
}

/** A ready to publish package skeleton with the sources in the glyphfox format. */
export function packageZip(list = load(), name = 'my-glyphfox-icons') {
  const items = unique(list);
  const files = [];
  files.push({
    name: 'package.json',
    data:
      JSON.stringify(
        {
          name,
          version: '0.1.0',
          description: `${items.length} icons drawn with the glyphfox studio`,
          type: 'module',
          main: './index.js',
          types: './index.d.ts',
          exports: { '.': { types: './index.d.ts', default: './index.js' }, './sprite.svg': './sprite.svg', './icons/*': './icons/*' },
          files: ['index.js', 'index.d.ts', 'sprite.svg', 'icons', 'icons.json'],
          keywords: ['icons', 'svg', 'glyphfox'],
          license: 'MIT',
          peerDependencies: { glyphfox: '>=1.0.0' },
          peerDependenciesMeta: { glyphfox: { optional: true } },
        },
        null,
        2,
      ) + '\n',
  });
  const ident = (f) => 'icon' + f.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('').replace(/[^A-Za-z0-9]/g, '');
  files.push({
    name: 'index.js',
    data: `// Icon data in the glyphfox format. Render with toSvg from glyphfox:\n//   import { renderToString } from 'glyphfox/core';\n${items
      .map((i) => `export const ${ident(i.file)} = ${JSON.stringify({ name: i.file, body: i.body, tags: i.tags, categories: i.categories })};`)
      .join('\n')}\n`,
  });
  files.push({ name: 'index.d.ts', data: `import type { IconData } from 'glyphfox';\n${items.map((i) => `export declare const ${ident(i.file)}: IconData;`).join('\n')}\n` });
  files.push({ name: 'icons.json', data: JSON.stringify(Object.fromEntries(items.map((i) => [i.file, { body: i.body, tags: i.tags, categories: i.categories }])), null, 2) + '\n' });
  files.push({ name: 'sprite.svg', data: sprite(list) });
  for (const i of items) {
    files.push({ name: `icons/${i.file}.svg`, data: svgOf(i) });
    files.push({ name: `icons/${i.file}.json`, data: JSON.stringify({ categories: i.categories, tags: i.tags }, null, 2) + '\n' });
  }
  files.push({
    name: 'README.md',
    data: `# ${name}\n\n${items.length} icons drawn with the [glyphfox studio](https://kwy404.github.io/glyphfox/studio.html), in the glyphfox format (24 grid, stroke 2, round joins).\n\n\`\`\`js\nimport { renderToString } from 'glyphfox/core';\nimport { ${items[0] ? ident(items[0].file) : 'iconName'} } from '${name}';\n\nel.innerHTML = renderToString(${items[0] ? ident(items[0].file) : 'iconName'}, { size: 24, weight: 1.5 });\n\`\`\`\n`,
  });
  return zip(files);
}
