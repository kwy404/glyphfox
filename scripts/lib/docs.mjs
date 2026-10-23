// Generated files of the studio site in docs/ (committed, served by GitHub
// Pages): the icon data, the engine bundle, the changelog, the shared head,
// header and footer of every page, inline icons, the Fenn illustrations,
// and the Portuguese pages in docs/pt-br/ built from docs/assets/js/i18n.js.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const SITE = 'https://kwy404.github.io/glyphfox/';
const PARTIALS = ['head', 'header', 'footer'];
const LOCALIZED = ['index.html', 'icons.html', 'studio.html', 'docs.html', 'changelog.html'];

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

function withPartials(root, html, page) {
  let out = html;
  for (const name of PARTIALS) {
    const file = join(root, 'docs', 'partials', `${name}.html`);
    if (!existsSync(file)) continue;
    const body = readFileSync(file, 'utf8').trim();
    const re = new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(<!-- ${name}:end -->)`);
    out = out.replace(re, (m, a, b) => `${a}\n${body}\n${b}`);
  }
  const key = page.replace(/\.html$/, '');
  out = out.replace(/ aria-current="page"/g, '').replace(new RegExp(`(<a [^>]*data-nav="${key}")`, 'g'), '$1 aria-current="page"');
  // Pages that are only in English (native.html) switch to the Portuguese home.
  out = out.replace(/(<a [^>]*)href="[^"]*"([^>]*data-lang-switch)/, `$1href="pt-br/${LOCALIZED.includes(page) ? page : 'index.html'}"$2`);
  return out;
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

function withChangelog(root, html) {
  const md = readFileSync(join(root, 'CHANGELOG.md'), 'utf8')
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

function withAlternates(html, page, lang) {
  const path = page === 'index.html' ? '' : page;
  const en = SITE + path;
  const pt = `${SITE}pt-br/${path}`;
  let out = html.replace(/\n?<link rel="alternate" hreflang="[^"]*" href="[^"]*">/g, '');
  out = out.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${lang === 'en' ? en : pt}">\n<link rel="alternate" hreflang="en" href="${en}">\n<link rel="alternate" hreflang="pt-BR" href="${pt}">`);
  return out;
}

const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/** Builds the Portuguese version of an English page. */
export function localize(html, page, tr) {
  let out = html.replace('<html lang="en">', '<html lang="pt-BR">');
  out = out.replace(/<([a-zA-Z][\w-]*)\b([^>]*?\sdata-i18n="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g, (m, tag, attrs, key) => (tr[key] !== undefined ? `<${tag}${attrs}>${tr[key]}</${tag}>` : m));
  out = out.replace(/<[a-zA-Z][^>]*\sdata-i18n-attr="([^"]+)"[^>]*>/g, (tagText, spec) => {
    let t = tagText;
    for (const pair of spec.split(';')) {
      const [name, key] = pair.split(':');
      if (!name || !key || tr[key] === undefined) continue;
      t = t.replace(new RegExp(`(\\s${name}=")[^"]*(")`), `$1${escAttr(tr[key])}$2`);
    }
    return t;
  });
  out = out.replace(/(\s(?:href|src)=")((?:assets|data|vendor)\/)/g, '$1../$2');
  out = out.replace(/(<a [^>]*)href="[^"]*"([^>]*data-lang-switch[^>]*)>[^<]*</, (m, a, b) => `${a}href="../${page}"${b.replace(/hreflang="[^"]*"/, 'hreflang="en"').replace(/aria-label="[^"]*"/, `aria-label="${escAttr(tr['lang.switch'] || 'EN, read in English')}"`)}>EN<`);
  out = out.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${SITE}pt-br/${page === 'index.html' ? '' : page}$2`);
  return withAlternates(out, page, 'pt-BR');
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
  const { dict } = await import(pathToFileURL(join(docs, 'assets', 'js', 'i18n.js')).href + `?v=${Date.now()}`);
  if (existsSync(docs)) {
    for (const f of readdirSync(docs)) {
      if (!f.endsWith('.html')) continue;
      const file = join(docs, f);
      if (f === '404.html') {
        files[file] = withArt(root, readFileSync(file, 'utf8'));
        continue;
      }
      let html = withChangelog(root, withArt(root, withGlyphs(withPartials(root, readFileSync(file, 'utf8'), f), api)));
      if (LOCALIZED.includes(f)) html = withAlternates(html, f, 'en');
      files[file] = html;
      if (LOCALIZED.includes(f)) files[join(docs, 'pt-br', f)] = localize(html, f, dict['pt-BR']);
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
