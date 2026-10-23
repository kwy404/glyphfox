#!/usr/bin/env node
// Builds the universe page of the site from the catalog:
//
//   docs/universe/runtime.js   the glyphfox-universe runtime for the page
//   docs/universe.html         stats, the set table, attributions and the
//                              excluded sets (between universe:* markers),
//                              then the shared head, footer and inline
//                              icons of scripts/lib/docs.mjs
//
// Icon data is never written to docs/: the page loads it from jsDelivr.

import { readFileSync, writeFileSync } from 'node:fs';
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

function stats() {
  const list = catalog.list;
  const spdx = new Set(list.map((s) => s.license.spdx));
  const attrib = list.filter((s) => s.license.attribution).length;
  return `<ul class="uv-stats">
        <li><b data-stat="total">${fmt(catalog.total)}</b><span>icons</span></li>
        <li><b>${fmt(list.length)}</b><span>open license sets</span></li>
        <li><b>${fmt(spdx.size)}</b><span>licenses, all checked</span></li>
        <li><b>${fmt(attrib)}</b><span>sets credited below</span></li>
      </ul>`;
}

function sets() {
  const rows = catalog.list.map(
    (s) =>
      `<tr><td>${link(s.name, s.author.url)}</td><td><code>${esc(s.prefix)}</code></td><td class="num">${fmt(s.total)}</td><td>${esc(s.author.name)}</td><td>${link(s.license.title, s.license.url)}</td><td>${esc(KIND_LABELS[s.license.kind])}${s.strokeWidth ? ', stroke' : ''}</td></tr>`,
  );
  const credits = catalog.list.filter((s) => s.license.attribution).map((s) => `<li>${esc(attributionLine(s))}</li>`);
  const excluded = catalog.excluded.map((e) => `<tr><td>${esc(e.name)}</td><td><code>${esc(e.prefix)}</code></td><td class="num">${fmt(e.total)}</td><td>${esc(e.license)}</td><td colspan="2">${esc(e.reason)}</td></tr>`);
  return `<div class="uv-table-wrap">
        <table class="uv-table">
          <caption class="sr-only">Every set in glyphfox universe with its icon count and license</caption>
          <thead><tr><th scope="col">Set</th><th scope="col">Prefix</th><th scope="col" class="num">Icons</th><th scope="col">Author</th><th scope="col">License</th><th scope="col">Kind</th></tr></thead>
          <tbody>
          ${rows.join('\n          ')}
          </tbody>
          <tfoot><tr><td>Total</td><td></td><td class="num">${fmt(catalog.total)}</td><td colspan="3">${fmt(catalog.list.length)} sets from @iconify/json ${esc(catalog.source.version)}</td></tr></tfoot>
        </table>
      </div>
      <h3 class="uv-sub" id="attribution">Attribution</h3>
      <p class="uv-fine">These sets are licensed under Creative Commons Attribution or Attribution ShareAlike. Credit them where their icons are used; the detail panel above gives the line to copy for each icon.</p>
      <ul class="uv-credits">
        ${credits.join('\n        ')}
      </ul>
      <h3 class="uv-sub" id="trademarks">Trademarks</h3>
      <p class="uv-fine">${esc(TRADEMARK_NOTICE)}</p>
      <h3 class="uv-sub" id="excluded">Sets left out</h3>
      <p class="uv-fine">Sets whose license does not allow commercial redistribution and modification never ship, and neither do proprietary sets such as Apple SF Symbols. ${fmt(catalog.textExcluded)} icon names are also left out of the index by the repository text rules; they still resolve by name.</p>
      <div class="uv-table-wrap">
        <table class="uv-table">
          <thead><tr><th scope="col">Set</th><th scope="col">Prefix</th><th scope="col" class="num">Icons</th><th scope="col">License</th><th scope="col" colspan="2">Reason</th></tr></thead>
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
html = html.replace(/<span data-stat="total-text">[^<]*<\/span>/, `<span data-stat="total-text">${fmt(catalog.total)}</span>`);
writeFileSync(page, html);

// The shared head, footer and inline icons, exactly as scripts/build.mjs writes them.
const { readIcons } = await import('../lib/icons.mjs');
const { docsFiles } = await import('../lib/docs.mjs');
const { icons } = readIcons(join(root, 'icons'));
const version = JSON.parse(readFileSync(join(root, 'packages', 'glyphfox', 'package.json'), 'utf8')).version;
const files = await docsFiles(root, icons, { version });
const out = files[page];
if (out) writeFileSync(page, out);
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
