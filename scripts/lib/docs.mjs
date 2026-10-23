// Generated files of the studio site in docs/ (committed, served by GitHub
// Pages): the icon data, the engine bundle, the changelog, the shared head,
// header and footer of every page, inline icons, the Fenn illustrations,
// and every page again in each language of docs/i18n/languages.json
// (docs/pt-br/, docs/es/, docs/fr/, docs/de/), built from the string files
// in docs/i18n/. See scripts/lib/i18n.mjs and docs/I18N.md.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { findPages, langPath, loadI18n, moveLinks, notFoundPage, runtimeKeys, translate, usesStrings, withAlternates, withLangUi } from './i18n.mjs';

const PARTIALS = ['head', 'header', 'footer'];

async function engineBundle(root) {
  const esbuild = await import('esbuild');
  // The studio loads icon data itself, so the on demand loader of the
  // package (one chunk per icon) is replaced by a stub.
  const noLoader = {
    name: 'studio-loader',
    setup(build) {
      build.onLoad({ filter: /[\\/]core[\\/]lookup\.js$/ }, (args) => ({
        contents: readFileSync(args.path, 'utf8').replace(/let loader = [^\n]*/, 'let loader = () => Promise.resolve(null);'),
        loader: 'js',
      }));
    },
  };
  const result = await esbuild.build({
    entryPoints: [join(root, 'packages', 'glyphfox', 'src', 'studio.js')],
    plugins: [noLoader],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    minify: true,
    write: false,
    legalComments: 'none',
    logLevel: 'error',
  });
  return `/*! glyphfox engine for the studio | MIT | Alexandre Kohler */\n${result.outputFiles[0].text}`;
}

/** Inserts the partials (their links rebased for pages in subfolders) and marks the current nav item. */
function withPartials(root, html, page) {
  let out = html;
  for (const name of PARTIALS) {
    const file = join(root, 'docs', 'partials', `${name}.html`);
    if (!existsSync(file)) continue;
    const body = moveLinks(readFileSync(file, 'utf8').trim(), 'index.html', page);
    const re = new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(<!-- ${name}:end -->)`);
    out = out.replace(re, (m, a, b) => `${a}\n${body}\n${b}`);
  }
  const key = page.replace(/\.html$/, '');
  const keys = [key, key.split('/')[0]];
  out = out.replace(/ aria-current="page"/g, '');
  return out.replace(/(<a [^>]*data-nav="([^"]+)")/g, (m, a, nav) => (keys.includes(nav) ? `${a} aria-current="page"` : m));
}

const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inlineMd(s) {
  return escHtml(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

/** The Markdown subset used by CHANGELOG.md, rendered to HTML. */
export function markdown(md) {
  const out = [];
  let list = false;
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const li = /^\s*[-*] (.*)$/.exec(line);
    if (li) {
      if (!list) {
        out.push('<ul>');
        list = true;
      }
      out.push(`<li>${inlineMd(li[1])}</li>`);
      continue;
    }
    if (list) {
      out.push('</ul>');
      list = false;
    }
    const h = /^(#{1,3}) (.*)$/.exec(line);
    if (h) {
      if (h[1].length > 1) out.push(`<h${h[1].length}>${inlineMd(h[2].replace(/^\[([^\]]+)\]/, '$1'))}</h${h[1].length}>`);
    } else if (line.trim()) out.push(`<p>${inlineMd(line)}</p>`);
  }
  if (list) out.push('</ul>');
  return out.join('\n');
}

/** The changelog of a language: CHANGELOG.md, or its translation in docs/i18n/changelog/. */
export function changelogFile(root, lang, def) {
  const file = join(root, 'docs', 'i18n', 'changelog', `${lang.code}.md`);
  return lang === def || !existsSync(file) ? join(root, 'CHANGELOG.md') : file;
}

function withChangelog(root, html, file) {
  if (!html.includes('<!-- log:start -->')) return html;
  const md = readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter((l) => !l.startsWith('# '))
    .join('\n');
  return html.replace(/(<!-- log:start -->)[\s\S]*?(<!-- log:end -->)/, (m, a, b) => `${a}\n${markdown(md)}\n${b}`);
}

function withGlyphs(html, api) {
  return html.replace(/<!--gf:([^:>]+):(\d+)(?::([^>]*?))?-->[\s\S]*?<!--\/gf-->/g, (m, spec, size, cls) => {
    let svg = '';
    try {
      svg = api.toSvg(spec, { size: Number(size), class: cls || undefined });
    } catch {
      svg = '';
    }
    return `<!--gf:${spec}:${size}${cls ? ':' + cls : ''}-->${svg}<!--/gf-->`;
  });
}

/** Fenn illustrations from docs/assets/fenn (see scripts/art.mjs), inlined as decoration. */
function withArt(root, html) {
  return html.replace(/<!--art:([a-z]+)(?::([^>]*?))?-->[\s\S]*?<!--\/art-->/g, (m, name, cls) => {
    const file = join(root, 'docs', 'assets', 'fenn', `${name}.svg`);
    if (!existsSync(file)) throw new Error(`docs: there is no Fenn illustration named ${name}`);
    const svg = readFileSync(file, 'utf8')
      .trim()
      .replace(/ role="img" aria-label="[^"]*"/, '')
      .replace('<svg ', `<svg class="fenn-art${cls ? ' ' + cls : ''}" aria-hidden="true" focusable="false" `);
    return `<!--art:${name}${cls ? ':' + cls : ''}-->${svg}<!--/art-->`;
  });
}

/** One page in one language: strings, changelog, links, alternates and the language menus. */
function renderPage(html, page, lang, ctx) {
  const { root, i18n, localized } = ctx;
  let out = translate(html, i18n.strings[lang.code], lang.code);
  out = withChangelog(root, out, changelogFile(root, lang, i18n.def));
  if (lang !== i18n.def) out = moveLinks(out, page, langPath(lang, page), (p) => (localized.has(p) ? langPath(lang, p) : p));
  out = withAlternates(out, page, lang, localized.has(page) ? i18n.languages : [i18n.def], i18n.def);
  return withLangUi(out, page, lang, ctx);
}

export async function docsFiles(root, icons, { version }) {
  const files = {};
  files[join(root, 'docs', 'data', 'icons.json')] =
    JSON.stringify({
      version,
      count: icons.length,
      icons: icons.map((ic) => [ic.name, ic.body, ic.tags, ic.categories, ic.solid]),
    }) + '\n';
  files[join(root, 'docs', 'data', 'changelog.md')] = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
  files[join(root, 'docs', 'vendor', 'glyphfox.js')] = await engineBundle(root);
  const docs = join(root, 'docs');
  const api = await import(pathToFileURL(join(root, 'packages', 'glyphfox', 'dist', 'index.js')).href);
  const i18n = await loadI18n(root);
  const base = new Map();
  for (const page of findPages(root, i18n.languages)) {
    const file = join(docs, page);
    const html = readFileSync(file, 'utf8');
    if (page === '404.html') files[file] = notFoundPage(withArt(root, html), i18n);
    else base.set(page, withArt(root, withGlyphs(withPartials(root, html, page), api)));
  }
  const localized = new Set([...base].filter(([, html]) => usesStrings(html)).map(([page]) => page));
  let globe = '';
  try {
    globe = api.toSvg('globe', { size: 18 });
  } catch {
    globe = '';
  }
  const ctx = { root, i18n, localized, globe, runtimeKeys: runtimeKeys(root, i18n.strings[i18n.def.code]) };
  for (const [page, html] of base) {
    for (const lang of i18n.languages) {
      if (lang !== i18n.def && !localized.has(page)) continue;
      files[join(docs, langPath(lang, page))] = renderPage(html, page, lang, ctx);
    }
  }
  return files;
}

/** Writes (or with check: compares) the docs files. Returns the changed paths. */
export async function buildDocsData(root, icons, { version, check }) {
  const files = await docsFiles(root, icons, { version });
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
