#!/usr/bin/env node
// Writes the license files of glyphfox universe from the catalog:
//
//   LICENSES/<file>.license      the license text of every shipped set, exactly
//                                as published by the set (or the SPDX text when
//                                the set links to a web page), deduplicated
//   LICENSES/NOTICE.md           authors, links, licenses and attributions
//   packages/universe/NOTICE.md  the same notice, shipped with the package
//
// Texts are cached in scripts/universe/.cache/licenses so later builds work
// offline (--offline).

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KIND_LABELS } from '../../packages/universe/src/policy.js';
import { attributionLine, TRADEMARK_NOTICE } from '../../packages/universe/src/license.js';
import { loadTextRules, textTester } from './lib/text-rules.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const out = join(root, 'LICENSES');
const cache = join(here, '.cache', 'licenses');
const offline = process.argv.includes('--offline');
const catalogFile = join(root, 'packages', 'universe', 'dist', 'catalog.json');
const catalog = JSON.parse(readFileSync(catalogFile, 'utf8'));
const breaks = textTester(loadTextRules(root));

const SPDX_TEXT = (id) => `https://raw.githubusercontent.com/spdx/license-list-data/main/text/${id}.txt`;
const CC_DEEDS = {
  'CC-BY-3.0': 'https://creativecommons.org/licenses/by/3.0/',
  'CC-BY-4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC-BY-SA-3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
  'CC-BY-SA-4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'CC0-1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
};

/** Raw text URL of a license link, or null when it is a web page. */
export function rawUrl(url) {
  if (!url) return null;
  let m = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^#?]+)/.exec(url);
  if (m) return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}`;
  m = /^https:\/\/gitlab\.com\/(.+?)\/-\/blob\/([^#?]+)/.exec(url);
  if (m) return `https://gitlab.com/${m[1]}/-/raw/${m[2]}`;
  if (/^https:\/\/raw\.githubusercontent\.com\//.test(url)) return url;
  if (/\/LICENSE(\.md|\.txt)?$/i.test(url) && !/creativecommons|gnu\.org|apache\.org|sil\.org/.test(url)) return url;
  return null;
}

const looksLikeLicense = (text) =>
  text.length > 60 && text.length < 300000 && !/^\s*<(!doctype|html)/i.test(text) && /licen[cs]e|copyright|permission|public domain|creative commons/i.test(text);

async function cached(url) {
  const file = join(cache, createHash('sha1').update(url).digest('hex') + '.txt');
  if (existsSync(file)) {
    const t = readFileSync(file, 'utf8');
    return t === '\0' ? null : t;
  }
  if (offline) return null;
  let text = null;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (res.ok) text = await res.text();
  } catch {
    text = null;
  }
  mkdirSync(cache, { recursive: true });
  writeFileSync(file, text === null ? '\0' : text);
  return text;
}

const normalize = (t) => t.replace(/\r\n?/g, '\n').replace(/\s+$/, '') + '\n';

async function licenseText(set) {
  const raw = rawUrl(set.license.url);
  if (raw && !CC_DEEDS[set.license.spdx]) {
    const t = await cached(raw);
    if (t && looksLikeLicense(t)) return { text: normalize(t), from: set.license.url, upstream: true };
  }
  const t = await cached(SPDX_TEXT(set.license.spdx));
  if (t && looksLikeLicense(t)) return { text: normalize(t), from: SPDX_TEXT(set.license.spdx), upstream: false };
  return null;
}

const files = new Map();
const problems = [];
let next = 0;
const list = catalog.list;
const results = new Array(list.length);
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (next < list.length) {
      const i = next++;
      results[i] = await licenseText(list[i]);
    }
  }),
);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const byHash = new Map();
list.forEach((set, i) => {
  const r = results[i];
  if (!r) {
    problems.push(`${set.prefix}: no license text found for ${set.license.spdx} (${set.license.url || 'no link'})`);
    return;
  }
  const hash = createHash('sha1').update(r.text).digest('hex');
  let name = byHash.get(hash);
  if (!name) {
    name = r.upstream ? `${set.prefix}.license` : `${set.license.spdx}.license`;
    if (files.has(name)) name = `${set.prefix}.license`;
    byHash.set(hash, name);
    files.set(name, r.text);
  }
  set.license.file = `LICENSES/${name}`;
  set.license.source = r.from;
});
for (const [name, text] of files) writeFileSync(join(out, name), text);

const md = (s) => String(s || '').replace(/\|/g, '\\|');
const link = (text, url) => (url ? `[${md(text)}](${url})` : md(text));
const attrib = list.filter((s) => s.license.attribution);
const brands = list.filter((s) => s.brand);
const lines = [];
lines.push('# glyphfox universe: third party notices', '');
lines.push(
  `glyphfox-universe gives one API over ${catalog.total.toLocaleString('en-US')} icons from ${list.length} open license icon sets, as packaged by Iconify in [@iconify/json](https://github.com/iconify/icon-sets) ${catalog.source.version} (MIT) and the @iconify-json/<prefix> packages. Every set keeps its own license, listed below with its authors and links. The license texts are in this folder, exactly as each set publishes them (files ending in .license). The code of glyphfox-universe is MIT, see [LICENSE](../packages/universe/LICENSE).`,
  '',
);
lines.push('## Attribution', '');
lines.push('These sets are licensed under Creative Commons Attribution (CC BY) or Attribution ShareAlike (CC BY-SA). Credit them where their icons are used, for example in the about page or the credits of your app:', '');
for (const s of attrib) lines.push(`- ${attributionLine(s)}`);
lines.push('');
lines.push('## Trademarks', '');
lines.push(TRADEMARK_NOTICE, '');
lines.push(`Brand and logo icons are in: ${brands.map((s) => `${md(s.name)} (\`${s.prefix}\`)`).join(', ')}.`, '');
lines.push('## Sets', '');
lines.push('| Set | Prefix | Icons | Author | License | Kind | Text |', '| --- | --- | ---: | --- | --- | --- | --- |');
for (const s of list) {
  const file = s.license.file ? `[${s.license.file.replace('LICENSES/', '')}](${s.license.file.replace('LICENSES/', '')})` : 'missing';
  lines.push(`| ${md(s.name)} | \`${s.prefix}\` | ${s.total} | ${link(s.author.name || 'unknown', s.author.url)} | ${link(s.license.title, s.license.url)} | ${KIND_LABELS[s.license.kind]} | ${file} |`);
}
lines.push('');
lines.push('## Sets left out', '');
lines.push('| Set | Prefix | Icons | License | Reason |', '| --- | --- | ---: | --- | --- |');
for (const e of catalog.excluded) lines.push(`| ${md(e.name)} | \`${e.prefix}\` | ${e.total} | ${md(e.license)} | ${md(e.reason)} |`);
lines.push('');
lines.push(`${catalog.textExcluded} icon names are left out of the index by the repository text rules (scripts/check-text.mjs); they still resolve by name.`, '');
const notice = lines.join('\n');
for (const line of notice.split('\n')) if (breaks(line)) problems.push(`NOTICE: a line breaks the repository text rules: ${line.slice(0, 80)}`);
writeFileSync(join(out, 'NOTICE.md'), notice);
writeFileSync(join(root, 'packages', 'universe', 'NOTICE.md'), notice.replace(/\]\(\.\.\/packages\/universe\/LICENSE\)/, '](LICENSE)').replace(/\]\(([A-Za-z0-9.-]+\.txt)\)/g, '](https://github.com/kwy404/glyphfox/blob/main/LICENSES/$1)'));
writeFileSync(catalogFile, JSON.stringify(catalog) + '\n');

// License texts are kept as published; report the ones the text check would flag.
const flagged = [...files.entries()].filter(([, t]) => t.split('\n').some((l) => breaks(l))).map(([n]) => n);
console.log(`${files.size} license files for ${list.length} sets, ${attrib.length} sets need attribution`);
if (flagged.length) console.log(`texts with characters outside the repository text rules: ${flagged.join(', ')}`);
if (problems.length) {
  for (const p of problems) console.error(p);
  process.exit(1);
}
