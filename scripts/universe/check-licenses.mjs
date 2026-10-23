#!/usr/bin/env node
// License check of glyphfox universe: fails (exit 1) when a shipped set has a
// missing or non redistributable license, when its license text is missing
// from LICENSES/, when the notice leaves a set out, or when an excluded set
// shows up in the search index.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkCatalog } from '../../packages/universe/src/license.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dist = join(root, 'packages', 'universe', 'dist');
const problems = [];
const read = (f) => JSON.parse(readFileSync(f, 'utf8'));

if (!existsSync(join(dist, 'catalog.json')) || !existsSync(join(dist, 'index.json'))) {
  console.error('glyphfox universe: run node scripts/universe/build.mjs first');
  process.exit(1);
}
const catalog = read(join(dist, 'catalog.json'));
const index = read(join(dist, 'index.json'));
const dir = join(root, 'LICENSES');
const files = new Set(existsSync(dir) ? readdirSync(dir).map((f) => `LICENSES/${f}`) : []);
problems.push(...checkCatalog(catalog, { files }));
for (const f of files) {
  if (f.endsWith('.license') && !readFileSync(join(root, f), 'utf8').trim()) problems.push(`${f} is empty`);
}

const notice = existsSync(join(dir, 'NOTICE.md')) ? readFileSync(join(dir, 'NOTICE.md'), 'utf8') : '';
if (!notice) problems.push('LICENSES/NOTICE.md is missing');
for (const set of catalog.list) {
  if (notice && !notice.includes(`\`${set.prefix}\``)) problems.push(`${set.prefix}: not in LICENSES/NOTICE.md`);
  if (set.license.attribution && notice && !notice.includes(`"${set.name}"`)) problems.push(`${set.prefix}: no attribution line in LICENSES/NOTICE.md`);
  if (!index.data[set.prefix]) problems.push(`${set.prefix}: not in the search index`);
}
const shipped = new Set(catalog.list.map((s) => s.prefix));
for (const prefix of index.sets) if (!shipped.has(prefix)) problems.push(`${prefix}: in the search index but not in the catalog`);
for (const e of catalog.excluded) if (index.data[e.prefix]) problems.push(`${e.prefix}: excluded (${e.reason}) but in the search index`);
const total = catalog.list.reduce((s, x) => s + x.total, 0);
if (total !== catalog.total) problems.push(`catalog total ${catalog.total} does not match the sets (${total})`);

if (problems.length) {
  for (const p of problems) console.error(p);
  console.error(`glyphfox universe license check: ${problems.length} problem${problems.length === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log(`glyphfox universe license check: ${catalog.list.length} sets, ${catalog.total} icons, every license allows redistribution and modification`);
