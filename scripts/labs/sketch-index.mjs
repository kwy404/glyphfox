#!/usr/bin/env node
// Builds docs/data/sketch-index.json, the shape index behind the sketch
// search of the studio, from docs/data/icons.json (run npm run build first
// when icons change). Each icon is flattened into center lines and turned
// into a compact signature by docs/assets/js/labs/sketch-core.js.
//
//   node scripts/labs/sketch-index.mjs          write the index
//   node scripts/labs/sketch-index.mjs --check  fail when it is out of date

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseBody, splitLayers } from '../../packages/glyphfox/src/core/nodes.js';
import { flattenNode } from '../../packages/glyphfox/src/core/geometry.js';
import { extract, packIndex } from '../../docs/assets/js/labs/sketch-core.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DATA = join(root, 'docs', 'data', 'icons.json');
export const INDEX = join(root, 'docs', 'data', 'sketch-index.json');

/** Center lines of the primary layer of an icon body. */
export function iconPolylines(body) {
  const out = [];
  for (const node of splitLayers(parseBody(body)).primary) for (const p of flattenNode(node, 0.25)) out.push(p.points);
  return out;
}

/** Index text for the studio data ({ icons: [[name, body, ...], ...] }). */
export function buildIndex(data) {
  const entries = [];
  for (const [name, body] of data.icons) {
    const sig = extract(iconPolylines(body));
    if (sig) entries.push({ name, sig });
  }
  return JSON.stringify(packIndex(entries)) + '\n';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const text = buildIndex(JSON.parse(readFileSync(DATA, 'utf8')));
  const old = existsSync(INDEX) ? readFileSync(INDEX, 'utf8') : null;
  const count = JSON.parse(text).count;
  if (process.argv.includes('--check')) {
    if (old !== text) {
      console.error('docs/data/sketch-index.json is out of date\nrun: node scripts/labs/sketch-index.mjs');
      process.exit(1);
    }
    console.log(`sketch index is up to date (${count} icons)`);
  } else {
    if (old !== text) writeFileSync(INDEX, text);
    console.log(`sketch index: ${count} icons, ${(text.length / 1024).toFixed(1)} KB${old === text ? ' (unchanged)' : ''}`);
  }
}
