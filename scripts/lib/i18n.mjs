// Localization of the studio site. The English pages in docs/ are the
// source; every page that uses the string files (an element with data-i18n
// or data-i18n-attr) is written again for each language of
// docs/i18n/languages.json, in docs/<dir>/ with the same relative path.
// See docs/I18N.md.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';

export const SITE = 'https://kwy404.github.io/glyphfox/';
/** Top level folders of docs/ that never hold pages. */
export const SKIP_DIRS = new Set(['assets', 'data', 'vendor', 'partials', 'i18n']);
/**
 * Top level folders whose pages are written by scripts/seo in every language
 * its strings cover (docs/guides/i18n.js and the site strings), so they are
 * not localized a second time.
 */
export const GENERATED_DIRS = new Set(['guides', 'icons']);
/** Old single file of strings, still read so older branches merge cleanly. */
export const LEGACY = ['docs', 'assets', 'js', 'i18n.js'];

const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Languages, string files and the default (source) language. */
export async function loadI18n(root) {
  const dir = join(root, 'docs', 'i18n');
  const languages = JSON.parse(readFileSync(join(dir, 'languages.json'), 'utf8'));
  const strings = {};
  for (const l of languages) {
    const file = join(dir, `${l.code}.json`);
    strings[l.code] = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  }
  const legacy = join(root, ...LEGACY);
  if (existsSync(legacy)) {
    const { dict = {} } = await import(pathToFileURL(legacy).href + `?v=${Date.now()}`);
    for (const [code, values] of Object.entries(dict)) {
      if (!strings[code]) continue;
      for (const [k, v] of Object.entries(values)) if (strings[code][k] === undefined) strings[code][k] = v;
    }
  }
  return { languages, strings, def: languages[0], legacy: existsSync(legacy) };
}

/** Every .html page of docs/ outside the language folders, as posix paths relative to docs/. */
export function findPages(root, languages) {
  const docs = join(root, 'docs');
  const langDirs = new Set(languages.map((l) => l.dir).filter(Boolean));
  const out = [];
  const walk = (rel) => {
    for (const e of readdirSync(rel ? join(docs, rel) : docs, { withFileTypes: true })) {
      const p = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (e.name.startsWith('.') || (!rel && (SKIP_DIRS.has(e.name) || GENERATED_DIRS.has(e.name) || langDirs.has(e.name)))) continue;
        walk(p);
      } else if (e.name.endsWith('.html')) out.push(p);
    }
  };
  if (existsSync(docs)) walk('');
  return out.sort();
}

// A page is localized when its own content uses the string files: the shared
// partials alone do not count, so a page with no strings of its own
// (universe.html) stays in English with the site header and footer.
export const usesStrings = (html) => /\sdata-i18n(?:-attr)?="/.test(html.replace(/<!-- (head|header|footer):start -->[\s\S]*?<!-- \1:end -->/g, ''));
export const langPath = (lang, page) => (lang.dir ? `${lang.dir}/${page}` : page);
export const pageUrl = (lang, page) => SITE + (lang.dir ? `${lang.dir}/` : '') + page.replace(/(^|\/)index\.html$/, '$1');

/** Relative link from one docs/ path to another. */
export function relLink(from, to) {
  return posix.relative(posix.dirname(from), to) || posix.basename(to);
}

const SKIP_URL = /^(?:[a-z][a-z0-9+.-]*:|\/|#|\$|\{)/i;

/**
 * Rewrites the relative href and src values of a piece of HTML that was
 * written for `from` so that it works from `to`. `map(target)` may send a
 * target path somewhere else (a page to its translation).
 */
export function moveLinks(html, from, to, map = (p) => p) {
  return html.replace(/(\s(?:href|src|poster)=")([^"]*)(")/g, (m, a, url, b) => {
    if (!url || SKIP_URL.test(url)) return m;
    const [, path, rest] = /^([^?#]*)(.*)$/.exec(url);
    if (!path) return m;
    const dir = path.endsWith('/') || path === '.' || path === '..';
    let target = posix.join(posix.dirname(from), path);
    if (target.startsWith('..')) return m;
    target = map(dir ? posix.join(target, 'index.html') : target);
    let link = relLink(to, target);
    if (dir) link = link.replace(/(^|\/)index\.html$/, '$1') || './';
    return a + link + rest + b;
  });
}

/** Fills data-i18n elements, data-i18n-attr attributes and the html lang with one language. */
export function translate(html, s, code) {
  let out = html.replace(/<html\b([^>]*?)\slang="[^"]*"/, `<html$1 lang="${code}"`);
  out = out.replace(/<([a-zA-Z][\w-]*)\b([^>]*?\sdata-i18n="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g, (m, tag, attrs, key) =>
    s[key] !== undefined ? `<${tag}${attrs}>${s[key]}</${tag}>` : m,
  );
  out = out.replace(/<[a-zA-Z][^>]*\sdata-i18n-attr="([^"]+)"[^>]*>/g, (tagText, spec) => {
    let t = tagText;
    for (const pair of spec.split(';')) {
      const [name, key] = pair.split(':').map((x) => x.trim());
      if (!name || !key || s[key] === undefined) continue;
      t = t.replace(new RegExp(`(\\s${name}=")[^"]*(")`), `$1${escAttr(s[key])}$2`);
    }
    return t;
  });
  return out;
}

/** Canonical, hreflang alternates, og:url and og:locale for one page in one language. */
export function withAlternates(html, page, lang, langs, def) {
  const own = pageUrl(lang, page);
  let block = `<link rel="canonical" href="${own}">`;
  if (langs.length > 1) {
    block += langs.map((l) => `\n<link rel="alternate" hreflang="${l.code}" href="${pageUrl(l, page)}">`).join('');
    block += `\n<link rel="alternate" hreflang="x-default" href="${pageUrl(def, page)}">`;
  }
  let out = html.replace(/\n?<link rel="alternate" hreflang="[^"]*" href="[^"]*">/g, '');
  out = /<link rel="canonical" href="[^"]*">/.test(out) ? out.replace(/<link rel="canonical" href="[^"]*">/, block) : out.replace('</head>', `${block}\n</head>`);
  out = out.replace(/\n?<meta property="og:locale(?::alternate)?" content="[^"]*">/g, '');
  const locale = [`<meta property="og:locale" content="${lang.og}">`, ...langs.filter((l) => l !== lang).map((l) => `<meta property="og:locale:alternate" content="${l.og}">`)].join('\n');
  const ogUrl = /<meta property="og:url" content="[^"]*">/;
  if (ogUrl.test(out)) out = out.replace(ogUrl, `<meta property="og:url" content="${own}">\n${locale}`);
  else if (/<meta property="og:/.test(out)) out = out.replace('</head>', `<meta property="og:url" content="${own}">\n${locale}\n</head>`);
  return out;
}

// First visit: pick the browser language and remember it; English pages
// (the default, x-default) then send the visitor to the remembered
// language. Language folders always show their own language.
const DETECT = `(function(c,d,u){try{var k='gf-lang',s=localStorage.getItem(k);if(!s||!u[s]){s='';var n=navigator.languages||[navigator.language||''];for(var i=0;i<n.length&&!s;i++){var p=String(n[i]).toLowerCase();for(var l in u){var q=l.toLowerCase();if(p===q||p.split('-')[0]===q.split('-')[0]){s=l;break}}}s=s||d;localStorage.setItem(k,s)}if(c===d&&s!==d&&u[s])location.replace(u[s]+location.search+location.hash)}catch(e){}})`;

/** The pieces of the page that depend on the language: menus, detection and runtime strings. */
export function withLangUi(html, page, lang, ctx) {
  const { languages, def, strings } = ctx.i18n;
  const s = strings[lang.code];
  const here = langPath(lang, page);
  const langs = ctx.localized.has(page) ? languages : [def];
  const links = (cls) =>
    langs
      .map((l) => `<li><a href="${relLink(here, langPath(l, page))}" hreflang="${l.code}" lang="${l.code}" data-set-lang="${l.code}"${l === lang ? ' aria-current="page"' : ''}${cls}>${escText(l.name)}</a></li>`)
      .join('');
  const label = s['lang.label'] ?? strings[def.code]['lang.label'] ?? 'Language';
  const render = {
    detect: () => {
      if (langs.length < 2) return '';
      const map = Object.fromEntries(langs.map((l) => [l.code, relLink(here, langPath(l, page))]));
      return `<script>${DETECT}(${JSON.stringify(lang.code)},${JSON.stringify(def.code)},${JSON.stringify(map)})</script>`;
    },
    menu: () =>
      langs.length < 2
        ? ''
        : `<details class="lang-menu" data-lang-menu><summary class="icon-btn" aria-label="${escAttr(`${label}: ${lang.name}`)}" title="${escAttr(label)}">${ctx.globe}<span>${lang.short}</span></summary><ul class="lang-list">${links('')}</ul></details>`,
    list: () => (langs.length < 2 ? '' : `<div class="footer-langs"><h2>${escText(label)}</h2><ul>${links('')}</ul></div>`),
    strings: () => {
      const values = Object.fromEntries(ctx.runtimeKeys.map((k) => [k, s[k] ?? strings[def.code][k]]).filter(([, v]) => v !== undefined));
      return `<script type="application/json" id="gf-strings">${JSON.stringify(values).replace(/</g, '\\u003c')}</script>`;
    },
  };
  let out = html.replace(/<!--lang:([a-z]+)-->[\s\S]*?<!--\/lang-->/g, (m, name) => (render[name] ? `<!--lang:${name}-->${render[name]()}<!--/lang-->` : m));
  if (!out.includes('<!--lang:strings-->') && /<script [^>]*src="[^"]*assets\/js\//.test(out)) out = out.replace('</head>', `<!--lang:strings-->${render.strings()}<!--/lang-->\n</head>`);
  return out;
}

/** Keys the site scripts read at runtime: t('key'), t(`prefix.${x}`) and string literals that are keys. */
export function runtimeKeys(root, en) {
  const dir = join(root, 'docs', 'assets');
  const legacy = join(root, ...LEGACY);
  const keys = new Set();
  const all = Object.keys(en);
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const f = join(d, e.name);
      if (e.isDirectory()) {
        if (e.name !== 'bundle') walk(f);
      }
      else if (/\.m?js$/.test(e.name) && f !== legacy) {
        const src = readFileSync(f, 'utf8');
        for (const m of src.matchAll(/(['"`])([a-zA-Z][\w-]*(?:\.[\w-]+)+)\1/g)) if (m[2] in en) keys.add(m[2]);
        for (const m of src.matchAll(/\bt\(`([\w.-]+)\.\$\{/g)) for (const k of all) if (k.startsWith(`${m[1]}.`)) keys.add(k);
      }
    }
  };
  if (existsSync(dir)) walk(dir);
  return all.filter((k) => keys.has(k));
}

// The 404 page is a single file for every URL: it picks the language from
// the folder in the address, then the remembered choice, then the browser.
const NOT_FOUND = `(function(d){var b=d.base,p=location.pathname,c='',i=p.indexOf(b),f=i<0?'':p.slice(i+b.length).split('/')[0],k,s;for(k in d.l)if(d.l[k].dir&&d.l[k].dir===f)c=k;if(!c){try{s=localStorage.getItem('gf-lang')}catch(e){}if(s&&d.l[s])c=s}if(!c){var n=navigator.languages||[navigator.language||''];for(var j=0;j<n.length&&!c;j++){var q=String(n[j]).toLowerCase().split('-')[0];for(k in d.l)if(k.toLowerCase().split('-')[0]===q){c=k;break}}}if(!c||c===d.def)return;var L=d.l[c],e=document.querySelectorAll('[data-i18n]'),a=document.querySelectorAll('[data-nf-link]'),x;document.documentElement.lang=c;for(x=0;x<e.length;x++){var v=L.s[e[x].getAttribute('data-i18n')];if(v)e[x].textContent=v}for(x=0;x<a.length;x++)a[x].href=b+L.dir+'/'+a[x].getAttribute('data-nf-link')})`;

export function notFoundPage(html, i18n) {
  const { languages, strings, def } = i18n;
  let out = translate(html, strings[def.code], def.code);
  const keys = [...new Set([...out.matchAll(/\sdata-i18n="([^"]+)"/g)].map((m) => m[1]))];
  const l = {};
  for (const lang of languages) l[lang.code] = { dir: lang.dir, s: Object.fromEntries(keys.map((k) => [k, strings[lang.code][k] ?? strings[def.code][k]])) };
  const data = JSON.stringify({ base: new URL(SITE).pathname, def: def.code, l }).replace(/</g, '\\u003c');
  return out.replace(/<!--lang:404-->[\s\S]*?<!--\/lang-->/, `<!--lang:404--><script>${NOT_FOUND}(${data})</script><!--/lang-->`);
}
