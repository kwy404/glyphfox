#!/usr/bin/env node
// glyphfox universe build. Streams the @iconify/json tarball one set at a
// time (the package is about 500 MB unpacked, it is never extracted), keeps
// the sets whose license allows redistribution and modification, and writes
// the compact catalog and search index of glyphfox-universe:
//
//   packages/universe/dist/catalog.json   sets, counts, licenses, CDN versions
//   packages/universe/dist/index.json     names, flags, aliases and categories
//
// Then it writes LICENSES/ and runs the license check (licenses.mjs and
// check-licenses.mjs). Icon bodies are not copied: the runtime loads them on demand from the
// @iconify-json/<prefix> packages on jsDelivr or from a local install.
//
//   node scripts/universe/build.mjs [--source file.tgz] [--offline]

import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { tarEntries } from './lib/tar.mjs';
import { classifySet } from './lib/classify.mjs';
import { loadTextRules, textTester } from './lib/text-rules.mjs';
import { encodeTags, upstreamTags } from './lib/tags.mjs';
import { licenseDecision, FEATURED } from '../../packages/universe/src/policy.js';
import { encodeAliases, encodeFlags, encodeNames, encodeRanges } from '../../packages/universe/src/format.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const pkgDir = join(root, 'packages', 'universe');
const dist = join(pkgDir, 'dist');
const cache = join(here, '.cache');
const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
};
const offline = args.includes('--offline');

const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
const SOURCE_VERSION = pkg.universe.iconify;
/** Sets bigger than this are not served by jsDelivr; they need a local install. */
const CDN_LIMIT = 50 * 1024 * 1024;

async function download(url, file) {
  mkdirSync(dirname(file), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${url}: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(`${file}.part`));
  renameSync(`${file}.part`, file);
}

async function sourceFile() {
  const given = arg('--source');
  if (given) return given;
  const file = join(cache, `iconify-json-${SOURCE_VERSION}.tgz`);
  if (!existsSync(file)) {
    if (offline) throw new Error(`missing ${file} (run without --offline to download it)`);
    console.log(`downloading @iconify/json ${SOURCE_VERSION}`);
    await download(`https://registry.npmjs.org/@iconify/json/-/json-${SOURCE_VERSION}.tgz`, file);
  }
  return file;
}

/** npm versions of the per set packages (@iconify-json/<prefix>), cached per source version. */
async function cdnVersions(prefixes) {
  const file = join(cache, `npm-versions-${SOURCE_VERSION}.json`);
  const known = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  const todo = prefixes.filter((p) => !(p in known));
  if (todo.length && offline) throw new Error(`missing npm versions for ${todo.length} sets (run without --offline)`);
  let next = 0;
  const worker = async () => {
    while (next < todo.length) {
      const prefix = todo[next++];
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch(`https://registry.npmjs.org/@iconify-json%2F${prefix}/latest`);
          if (res.status === 404) {
            known[prefix] = null;
            break;
          }
          if (!res.ok) throw new Error(String(res.status));
          known[prefix] = (await res.json()).version;
          break;
        } catch (e) {
          if (attempt === 2) throw new Error(`npm lookup failed for @iconify-json/${prefix}: ${e.message}`);
        }
      }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  mkdirSync(cache, { recursive: true });
  writeFileSync(file, JSON.stringify(known, null, 1) + '\n');
  return known;
}

const t0 = Date.now();
const rules = loadTextRules(root);
const breaks = textTester(rules);

// Upstream search tags of the most used sets, pinned and cached per source version.
const tagVersionsFile = join(cache, `tag-versions-${SOURCE_VERSION}.json`);
const tagVersions = existsSync(tagVersionsFile) ? JSON.parse(readFileSync(tagVersionsFile, 'utf8')) : {};
const tagSources = await upstreamTags({ cache: join(cache, 'tags'), versions: tagVersions, offline, breaks });
mkdirSync(cache, { recursive: true });
writeFileSync(tagVersionsFile, JSON.stringify(tagVersions, null, 1) + '\n');
const source = await sourceFile();
const sets = [];
const index = {};
const excluded = [];
let textDropped = 0;
let sourceTotal = 0;
let sourceSets = 0;

for await (const entry of tarEntries(source, (name) => /^package\/json\/[^/]+\.json$/.test(name))) {
  const data = JSON.parse(entry.data.toString('utf8'));
  const prefix = data.prefix;
  const info = data.info || {};
  const all = Object.keys(data.icons || {});
  const names = all.filter((n) => !data.icons[n].hidden).sort();
  sourceSets++;
  sourceTotal += names.length;
  const decision = licenseDecision(prefix, info);
  const lic = info.license || {};
  if (!names.length) {
    excluded.push({ prefix, name: info.name || prefix, total: 0, license: lic.spdx || '', reason: 'the set has no icons' });
    continue;
  }
  if (!decision.allowed) {
    excluded.push({ prefix, name: info.name || prefix, total: names.length, license: lic.spdx || lic.title || '', reason: decision.reason });
    continue;
  }
  if (breaks(info.name) || breaks(info.author && info.author.name)) {
    excluded.push({ prefix, name: prefix, total: names.length, license: decision.spdx, reason: 'the set name breaks the repository text rules' });
    continue;
  }
  const flagsSet = info.category === 'Flags / Maps';
  const kept = names.filter((n) => !breaks(n, { name: true, flags: flagsSet }));
  const dropped = names.length - kept.length;
  textDropped += dropped;
  const pos = new Map(kept.map((n, i) => [n, i]));

  // Categories (used as tags) and brand categories.
  const cats = [];
  const brandNames = new Set();
  for (const [cat, list] of Object.entries(data.categories || {})) {
    if (breaks(cat)) continue;
    const ids = list.map((n) => pos.get(n)).filter((i) => i !== undefined);
    if (!ids.length) continue;
    cats.push([cat, encodeRanges(ids)]);
    if (/brand|logo/i.test(cat)) for (const n of list) brandNames.add(n);
  }

  // Aliases that point (through other aliases) to a kept icon.
  const aliases = [];
  const aliasData = data.aliases || {};
  for (const [alias, a] of Object.entries(aliasData)) {
    if (a.hidden || breaks(alias, { name: true, flags: flagsSet })) continue;
    let parent = a.parent;
    for (let depth = 0; depth < 6 && aliasData[parent]; depth++) parent = aliasData[parent].parent;
    const i = pos.get(parent);
    if (i !== undefined) aliases.push([alias, i]);
  }
  aliases.sort((x, y) => (x[0] < y[0] ? -1 : 1));

  const { icons: classes, strokeWidth } = classifySet(prefix, data, kept, brandNames);
  let flags = '';
  const styles = { outline: 0, solid: 0, duotone: 0, color: 0 };
  let brand = 0;
  let stroke = 0;
  for (const n of kept) {
    const c = classes.get(n);
    flags += encodeFlags(c);
    styles[c.style]++;
    if (c.brand) brand++;
    if (c.stroke) stroke++;
  }
  index[prefix] = { n: encodeNames(kept), f: flags, a: encodeAliases(aliases), c: cats };
  const tags = tagSources[prefix] ? encodeTags(kept, tagSources[prefix]) : null;
  if (tags) index[prefix].t = tags;
  const samples = (info.samples || []).filter((s) => pos.has(s)).slice(0, 6);
  for (const n of kept) {
    if (samples.length >= 6) break;
    if (!samples.includes(n)) samples.push(n);
  }
  sets.push({
    prefix,
    name: info.name || prefix,
    total: kept.length,
    aliases: aliases.length,
    author: { name: (info.author && info.author.name) || '', url: (info.author && info.author.url) || '' },
    license: { title: lic.title || decision.spdx, spdx: decision.spdx, url: lic.url || '', kind: decision.kind, attribution: decision.attribution },
    category: info.category || '',
    palette: Boolean(info.palette),
    height: info.height || data.height || 16,
    version: info.version || '',
    styles,
    brand,
    stroke,
    strokeWidth: stroke / kept.length >= 0.6 ? strokeWidth || 1 : null,
    samples,
    bytes: entry.size,
    cdn: entry.size <= CDN_LIMIT,
    textExcluded: dropped,
  });
}

// Featured sets first, then by name.
const rank = (p) => {
  const i = FEATURED.indexOf(p);
  return i === -1 ? FEATURED.length : i;
};
sets.sort((a, b) => rank(a.prefix) - rank(b.prefix) || a.prefix.localeCompare(b.prefix));

const versions = await cdnVersions(sets.map((s) => s.prefix));
for (const s of sets) {
  const v = versions[s.prefix];
  s.npm = v ? { name: `@iconify-json/${s.prefix}`, version: v } : null;
  if (!v) s.cdn = false;
}

const total = sets.reduce((s, x) => s + x.total, 0);
const meta = { format: 1, source: { package: '@iconify/json', version: SOURCE_VERSION }, package: { name: pkg.name, version: pkg.version } };
const catalog = { ...meta, total, sets: sets.length, sourceTotal, sourceSets, textExcluded: textDropped, list: sets, excluded };
const searchIndex = { ...meta, total, sets: sets.map((s) => s.prefix), data: Object.fromEntries(sets.map((s) => [s.prefix, index[s.prefix]])) };
mkdirSync(dist, { recursive: true });
writeFileSync(join(dist, 'catalog.json'), JSON.stringify(catalog) + '\n');
writeFileSync(join(dist, 'index.json'), JSON.stringify(searchIndex) + '\n');
const prefixList = sets.map((s) => `  '${s.prefix}',`).join('\n');
writeFileSync(join(pkgDir, 'src', 'prefixes.js'), `// Generated by scripts/universe/build.mjs: the prefix of every shipped set.\nexport const PREFIXES = [\n${prefixList}\n];\n`);
const kb =(f) => Math.round(readFileSync(join(dist, f)).length / 1024);
console.log(`${total} icons in ${sets.length} sets (source: ${sourceTotal} icons in ${sourceSets} sets)`);
console.log(`excluded: ${excluded.map((e) => `${e.prefix} (${e.reason})`).join(', ')}`);
console.log(`text rules: ${textDropped} icon names left out`);
console.log(`catalog ${kb('catalog.json')} KB, index ${kb('index.json')} KB, ${((Date.now() - t0) / 1000).toFixed(1)} s`);

// License texts, the notice and the license check run with every build, so
// the catalog always carries the license file of every set.
await import('./licenses.mjs');
await import('./check-licenses.mjs');
