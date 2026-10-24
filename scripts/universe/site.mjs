#!/usr/bin/env node
// Builds the universe page of the site from the catalog:
//
//   docs/universe/runtime.js   the glyphfox-universe runtime for the page
//   docs/universe.html         stats, the set table, attributions and the
//                              excluded sets (between universe:* markers),
//                              then the shared head, header, footer and
//                              inline icons, and the page in every language
//                              (scripts/lib/docs.mjs)
//   docs/icons.html            the counts of the Other sets entry
//
// Icon data is never written to docs/: the page loads it from jsDelivr.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { attributionLine, TRADEMARK_NOTICE } from '../../packages/universe/src/license.js';
import { KIND_LABELS } from '../../packages/universe/src/policy.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const page = join(root, 'docs', 'universe.html');
const catalog = JSON.parse(readFileSync(join(root, 'packages', 'universe', 'dist', 'catalog.json'), 'utf8'));
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n) => Number(n).toLocaleString('en-US');
const link = (text, url) => (url ? `<a href="${esc(url)}">${esc(text)}</a>` : esc(text));

async function runtime() {
  const esbuild = await import('esbuild');
  const r = await esbuild.build({
    entryPoints: [join(root, 'packages', 'universe', 'src', 'index.js')],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    minify: true,
    write: false,
    legalComments: 'none',
    logLevel: 'error',
  });
  return `/*! glyphfox-universe runtime for the site | MIT | Alexandre Kohler */\n${r.outputFiles[0].text}`;
}

// The page is localized by the site build (docs/I18N.md): copy carries
// data-i18n keys of docs/i18n/*.json, names and license titles are marked
// translate="no", the attribution lines stay in English (lang="en") and
// numbers carry data-num so every language writes them in its own format.
const num = (n, attrs = '') => `<span${attrs} data-num="${Number(n)}">${fmt(n)}</span>`;

function stats() {
  const list = catalog.list;
  const spdx = new Set(list.map((s) => s.license.spdx));
  const attrib = list.filter((s) => s.license.attribution).length;
  return `<ul class="uv-stats">
        <li><b data-stat="total" data-num="${catalog.total}">${fmt(catalog.total)}</b><span data-i18n="universe.stats.icons">icons</span></li>
        <li><b data-num="${list.length}">${fmt(list.length)}</b><span data-i18n="universe.stats.sets">open license sets</span></li>
        <li><b data-num="${spdx.size}">${fmt(spdx.size)}</b><span data-i18n="universe.stats.licenses">licenses, all checked</span></li>
        <li><b data-num="${attrib}">${fmt(attrib)}</b><span data-i18n="universe.stats.credited">sets credited below</span></li>
      </ul>`;
}

// Exclusion reasons written by the universe build and the license policy.
const REASONS = [
  [/^(\S+) does not allow commercial use or modification$/, 'nc'],
  [/^the set has no icons$/, 'empty'],
  [/^Apple icons are proprietary$/, 'apple'],
  [/^the set name breaks the repository text rules$/, 'text'],
];
const ENGLISH_REASONS = {
  nc: 'does not allow commercial use or modification',
  empty: 'the set has no icons',
  apple: 'Apple icons are proprietary',
  text: 'the set name breaks the repository text rules',
};

function reason(text) {
  for (const [re, key] of REASONS) {
    const m = re.exec(text);
    if (!m) continue;
    const words = `<span data-i18n="universe.reason.${key}">${ENGLISH_REASONS[key]}</span>`;
    return m[1] ? `<code>${esc(m[1])}</code> ${words}` : words;
  }
  return `<span lang="en">${esc(text)}</span>`;
}

function sets() {
  const rows = catalog.list.map(
    (s) =>
      `<tr><td translate="no">${link(s.name, s.author.url)}</td><td><code>${esc(s.prefix)}</code></td><td class="num" data-num="${s.total}">${fmt(s.total)}</td><td translate="no">${esc(s.author.name)}</td><td translate="no">${link(s.license.title, s.license.url)}</td><td><span data-i18n="icons.kind.${s.license.kind}">${esc(KIND_LABELS[s.license.kind])}</span>${s.strokeWidth ? ', <span data-i18n="universe.kind.stroke">stroke</span>' : ''}</td></tr>`,
  );
  const credits = catalog.list.filter((s) => s.license.attribution).map((s) => `<li>${esc(attributionLine(s))}</li>`);
  const excluded = catalog.excluded.map((e) => `<tr><td translate="no">${esc(e.name)}</td><td><code>${esc(e.prefix)}</code></td><td class="num" data-num="${e.total}">${fmt(e.total)}</td><td translate="no">${esc(e.license)}</td><td colspan="2">${reason(e.reason)}</td></tr>`);
  return `<div class="uv-table-wrap">
        <table class="uv-table">
          <caption class="sr-only" data-i18n="universe.table.caption">Every set in glyphfox universe with its icon count and license</caption>
          <thead><tr><th scope="col" data-i18n="universe.table.set">Set</th><th scope="col" data-i18n="universe.table.prefix">Prefix</th><th scope="col" class="num" data-i18n="universe.table.icons">Icons</th><th scope="col" data-i18n="universe.table.author">Author</th><th scope="col" data-i18n="universe.table.license">License</th><th scope="col" data-i18n="universe.table.kind">Kind</th></tr></thead>
          <tbody>
          ${rows.join('\n          ')}
          </tbody>
          <tfoot><tr><td data-i18n="universe.table.total">Total</td><td></td><td class="num" data-num="${catalog.total}">${fmt(catalog.total)}</td><td colspan="3">${num(catalog.list.length)} <span data-i18n="universe.table.from">sets from</span> <code>@iconify/json ${esc(catalog.source.version)}</code></td></tr></tfoot>
        </table>
      </div>
      <h3 class="uv-sub" id="attribution" data-i18n="universe.attribution.title">Attribution</h3>
      <p class="uv-fine" data-i18n="universe.attribution.text">These sets are licensed under Creative Commons Attribution or Attribution ShareAlike. Credit them where their icons are used; the detail panel above gives the line to copy for each icon.</p>
      <ul class="uv-credits" lang="en">
        ${credits.join('\n        ')}
      </ul>
      <h3 class="uv-sub" id="trademarks" data-i18n="universe.trademarks.title">Trademarks</h3>
      <p class="uv-fine" data-i18n="universe.trademarks.text">${esc(TRADEMARK_NOTICE)}</p>
      <h3 class="uv-sub" id="excluded" data-i18n="universe.excluded.title">Sets left out</h3>
      <p class="uv-fine"><span data-i18n="universe.excluded.text">Sets whose license does not allow commercial redistribution and modification never ship, and neither do proprietary sets such as Apple SF Symbols.</span> ${num(catalog.textExcluded)} <span data-i18n="universe.excluded.names">icon names are also left out of the index by the repository text rules; they still resolve by name.</span></p>
      <div class="uv-table-wrap">
        <table class="uv-table">
          <thead><tr><th scope="col" data-i18n="universe.table.set">Set</th><th scope="col" data-i18n="universe.table.prefix">Prefix</th><th scope="col" class="num" data-i18n="universe.table.icons">Icons</th><th scope="col" data-i18n="universe.table.license">License</th><th scope="col" colspan="2" data-i18n="universe.table.reason">Reason</th></tr></thead>
          <tbody>
          ${excluded.join('\n          ')}
          </tbody>
        </table>
      </div>`;
}

const between = (html, name, body) => html.replace(new RegExp(`(<!-- universe:${name}:start -->)[\\s\\S]*?(<!-- universe:${name}:end -->)`), (m, a, b) => `${a}\n      ${body}\n      ${b}`);

writeFileSync(join(root, 'docs', 'universe', 'runtime.js'), await runtime());
let html = readFileSync(page, 'utf8');
html = between(html, 'stats', stats());
html = between(html, 'sets', sets());
html = html.replace(/<span data-stat="total-text"[^>]*>[^<]*<\/span>/, `<span data-stat="total-text" data-num="${catalog.total}">${fmt(catalog.total)}</span>`);
writeFileSync(page, html);

// The counts of the "Other sets" entry in the sidebar of the Icons page.
const iconsPage = join(root, 'docs', 'icons.html');
const counts = { total: catalog.total, sets: catalog.list.length };
writeFileSync(
  iconsPage,
  readFileSync(iconsPage, 'utf8').replace(/<span data-universe="(total|sets)" data-num="[^"]*">[^<]*<\/span>/g, (m, k) => `<span data-universe="${k}" data-num="${counts[k]}">${fmt(counts[k])}</span>`),
);

// The shared head, header, footer and inline icons, and both pages in every
// language, exactly as scripts/build.mjs writes them.
const { readIcons } = await import('../lib/icons.mjs');
const { docsFiles } = await import('../lib/docs.mjs');
const { icons } = readIcons(join(root, 'icons'));
const version = JSON.parse(readFileSync(join(root, 'packages', 'glyphfox', 'package.json'), 'utf8')).version;
const files = await docsFiles(root, icons, { version });
for (const [file, text] of Object.entries(files)) {
  if (!/[\\/](universe|icons)\.html$/.test(file)) continue;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}
console.log(`docs/universe.html: ${fmt(catalog.total)} icons in ${catalog.list.length} sets`);

// The package README: totals, the stroke based sets, the attribution lines and
// the table of every set with its exact count.
const readmeFile = join(root, 'packages', 'universe', 'README.md');
const md = (s) => String(s ?? '').replace(/\|/g, '\|');
const mdLink = (text, url) => (url ? `[${md(text)}](${url})` : md(text));
let readme = readFileSync(readmeFile, 'utf8');
const inline = (name, value) => {
  readme = readme.replace(new RegExp(`(<!-- universe:${name} -->)[^<]*(<!-- /universe:${name} -->)`, 'g'), `$1${value}$2`);
};
const block = (name, body) => {
  readme = readme.replace(new RegExp(`(<!-- universe:${name}:start -->)[\\s\\S]*?(<!-- universe:${name}:end -->)`), (m, a, b) => `${a}\n${body}\n${b}`);
};
inline('total', fmt(catalog.total));
inline('source', catalog.source.version);
inline('sets-count', String(catalog.list.length));
const strokeSets = catalog.list.filter((s) => s.strokeWidth);
block('stroke', strokeSets.map((s) => `\`${s.prefix}\` (${s.strokeWidth})`).join(', ') + '.');
block('attribution', catalog.list.filter((s) => s.license.attribution).map((s) => `- ${attributionLine(s)}`).join('\n'));
const table = [
  `${fmt(catalog.total)} icons in ${catalog.list.length} sets (from ${fmt(catalog.sourceTotal)} icons in ${catalog.sourceSets} sets in @iconify/json ${catalog.source.version}). Counts are visible icons; aliases and hidden icons resolve too but are not counted.`,
  '',
  '| Set | Prefix | Icons | License | Kind | Stroke |',
  '| --- | --- | ---: | --- | --- | --- |',
  ...catalog.list.map((s) => `| ${mdLink(s.name, s.author.url)} | \`${s.prefix}\` | ${fmt(s.total)} | ${mdLink(s.license.title, s.license.url)} | ${KIND_LABELS[s.license.kind]} | ${s.strokeWidth ? 'yes' : ''} |`),
  `| **Total** | | **${fmt(catalog.total)}** | | | |`,
  '',
  'Sets left out:',
  '',
  ...catalog.excluded.map((e) => `- \`${e.prefix}\` (${md(e.name)}, ${fmt(e.total)} icons, ${md(e.license)}): ${md(e.reason)}.`),
  '',
  `${fmt(catalog.textExcluded)} icon names are left out of the index by the repository text rules (scripts/check-text.mjs); they still resolve by name. ${fmt(catalog.list.filter((s) => s.cdn === false).reduce((n, s) => n + s.total, 0))} icons in ${catalog.list.filter((s) => s.cdn === false).length} sets (${catalog.list
    .filter((s) => s.cdn === false)
    .map((s) => `\`${s.prefix}\``)
    .join(', ')}) are not served by jsDelivr and need a local install of their package.`,
];
block('sets', table.join('\n'));
writeFileSync(readmeFile, readme);
console.log('packages/universe/README.md: sets table written');
