// Checks of the localized studio site (see docs/I18N.md):
// - every string file has exactly the keys of the English one, with the same
//   {placeholders} and HTML tags, and no empty value;
// - every key used by a page (data-i18n, data-i18n-attr) or a script (t('key'),
//   t(`prefix.${x}`)) exists;
// - every localized page exists in every language, with its html lang,
//   canonical and hreflang alternates;
// - no page in another language keeps English text outside code: a text or a
//   translatable attribute that is identical to the English page and has a
//   real word in it. Code (pre, code, kbd, samp, var, script, style, svg),
//   elements with translate="no" and elements with a lang of another language
//   are not read; values a translation keeps on purpose equal to English
//   ("Docs", "Props") are allowed;
// - every changelog translation has the releases, sections and items of CHANGELOG.md.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { LEGACY, findPages, langPath, loadI18n, pageUrl, usesStrings } from './i18n.mjs';

/** Names and terms that read the same in every language. */
const NEUTRAL = new Set(
  'glyphfox fenn react vue svelte angular tailwind css html javascript typescript svg png gif webm jsx tsx cli cdn npm pnpm yarn github linkedin mit jsdelivr unpkg alexandre kohler web json zip api runtime ctrl shift esc'.split(' '),
);
const PHRASES = ['data uri', 'three.js', 'fox-ify', 'keep a changelog', 'semantic versioning'];
const ATTRS = ['title', 'alt', 'placeholder', 'aria-label', 'aria-description', 'aria-roledescription', 'aria-valuetext'];
const META = new Set(['description', 'og:title', 'og:description', 'og:image:alt', 'twitter:title', 'twitter:description', 'twitter:image:alt']);
const SKIP = new Set(['script', 'style', 'pre', 'code', 'kbd', 'samp', 'var', 'template', 'textarea']);

const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const bare = (s) => norm(s).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
const primary = (code) => String(code).toLowerCase().split('-')[0];
const placeholders = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join(' ');
const tags = (s) => (String(s).match(/<\/?[a-zA-Z][\w-]*/g) || []).sort().join(' ');

/** True when a text has a word that is not a name, a number or code. */
export function hasWords(text) {
  let t = ` ${text} `;
  for (const p of PHRASES) t = t.replace(new RegExp(p.replace(/[.]/g, '\\.'), 'gi'), ' ');
  for (const raw of t.split(/\s+/)) {
    const tok = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    if (!tok) continue;
    if (/[\d_./:@&+=<>{}[\]()#$\\*|~^%]/.test(tok) || /\p{L}-\p{L}/u.test(tok) || /\p{Ll}\p{Lu}/u.test(tok)) continue;
    if (NEUTRAL.has(tok.toLowerCase())) continue;
    if ((tok.match(/\p{L}/gu) || []).length >= 2) return true;
  }
  return false;
}

/** Readable texts of a page: text nodes and translatable attributes, outside code. */
export function segments(html, code) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const out = [];
  const walk = (el) => {
    const name = el.localName;
    if (el.getAttribute('translate') === 'no') return;
    const l = el.getAttribute('lang');
    if (l && el !== doc.documentElement && primary(l) !== primary(code)) return;
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (v && norm(v)) out.push({ where: `<${name} ${a}>`, text: norm(v) });
    }
    if (name === 'meta' && META.has(el.getAttribute('name') || el.getAttribute('property'))) {
      const v = norm(el.getAttribute('content') || '');
      if (v) out.push({ where: `<meta ${el.getAttribute('name') || el.getAttribute('property')}>`, text: v });
    }
    if (SKIP.has(name) || name === 'svg') return;
    for (const n of el.childNodes) {
      if (n.nodeType === 3) {
        const v = norm(n.textContent);
        if (v) out.push({ where: `<${name}>`, text: v });
      } else if (n.nodeType === 1) walk(n);
    }
  };
  walk(doc.documentElement);
  dom.window.close();
  return out;
}

function scriptFiles(dir, legacy, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, e.name);
    // Bundles are generated from the sources (scripts/lib/assets.mjs) and minified.
    if (e.isDirectory()) {
      if (e.name !== 'bundle') scriptFiles(f, legacy, out);
    }
    else if (/\.m?js$/.test(e.name) && f !== legacy) out.push(f);
  }
  return out;
}

function changelogShape(md) {
  const lines = md.split(/\r?\n/);
  return {
    releases: lines.filter((l) => l.startsWith('## ')).map((l) => (l.match(/\d+\.\d+\.\d+/) || ['next'])[0]),
    sections: lines.filter((l) => l.startsWith('### ')).length,
    items: lines.filter((l) => /^\s*[-*] /.test(l)).length,
  };
}

/** Returns the list of problems, empty when the site is fully localized. */
export async function checkI18n(root) {
  const problems = [];
  const docs = join(root, 'docs');
  const i18n = await loadI18n(root);
  const { languages, strings, def } = i18n;
  const en = strings[def.code];
  const legacy = join(root, ...LEGACY);
  if (i18n.legacy) problems.push(`docs/assets/js/i18n.js: legacy string file; move its keys into docs/i18n/<lang>.json (every language) and delete it`);

  // String files.
  for (const lang of languages) {
    const file = `docs/i18n/${lang.code}.json`;
    if (!existsSync(join(docs, 'i18n', `${lang.code}.json`))) {
      problems.push(`${file}: missing string file`);
      continue;
    }
    const s = strings[lang.code];
    for (const k of Object.keys(en)) {
      if (s[k] === undefined) problems.push(`${file}: missing key ${k}`);
      else if (typeof s[k] !== 'string' || !s[k].trim()) problems.push(`${file}: empty value for ${k}`);
      else {
        if (placeholders(s[k]) !== placeholders(en[k])) problems.push(`${file}: ${k} must keep the placeholders ${placeholders(en[k]) || '(none)'}`);
        if (tags(s[k]) !== tags(en[k])) problems.push(`${file}: ${k} must keep the HTML tags of the English value`);
      }
    }
    for (const k of Object.keys(s)) if (en[k] === undefined) problems.push(`${file}: key ${k} is not in ${def.code}.json`);
  }

  // Keys used by pages, partials and scripts.
  const pages = findPages(root, languages);
  const sources = [...pages.map((p) => [`docs/${p}`, join(docs, p)]), ...['head', 'header', 'footer'].map((n) => [`docs/partials/${n}.html`, join(docs, 'partials', `${n}.html`)])];
  for (const [rel, file] of sources) {
    if (!existsSync(file)) continue;
    const html = readFileSync(file, 'utf8');
    for (const m of html.matchAll(/\sdata-i18n="([^"]+)"/g)) if (en[m[1]] === undefined) problems.push(`${rel}: unknown key ${m[1]}`);
    for (const m of html.matchAll(/\sdata-i18n-attr="([^"]+)"/g)) {
      for (const pair of m[1].split(';')) {
        const [name, key] = pair.split(':').map((x) => x && x.trim());
        if (!name || !key) problems.push(`${rel}: bad data-i18n-attr "${m[1]}" (use attr:key;attr:key)`);
        else if (en[key] === undefined) problems.push(`${rel}: unknown key ${key}`);
      }
    }
  }
  for (const file of [...scriptFiles(join(docs, 'assets'), legacy), ...scriptFiles(join(docs, 'universe'), legacy)]) {
    const rel = file.slice(root.length + 1).split('\\').join('/');
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/\bt\(\s*(['"])([^'"]+)\1/g)) if (en[m[2]] === undefined) problems.push(`${rel}: unknown key ${m[2]}`);
    for (const m of src.matchAll(/\bt\(`([\w.-]+)\.\$\{/g)) if (!Object.keys(en).some((k) => k.startsWith(`${m[1]}.`))) problems.push(`${rel}: no key starts with ${m[1]}.`);
  }

  // Generated pages.
  let checked = 0;
  for (const page of pages) {
    if (page === '404.html') continue;
    const source = readFileSync(join(docs, page), 'utf8');
    if (!usesStrings(source)) continue;
    const english = new Set(segments(source, def.code).map((s) => s.text));
    for (const lang of languages) {
      const rel = `docs/${langPath(lang, page)}`;
      const file = join(docs, langPath(lang, page));
      if (!existsSync(file)) {
        problems.push(`${rel}: missing (run npm run build)`);
        continue;
      }
      const html = readFileSync(file, 'utf8');
      checked++;
      if (!new RegExp(`<html[^>]*\\slang="${lang.code}"`).test(html)) problems.push(`${rel}: html lang must be ${lang.code}`);
      if (!html.includes(`<link rel="canonical" href="${pageUrl(lang, page)}">`)) problems.push(`${rel}: canonical must be ${pageUrl(lang, page)}`);
      for (const l of languages) if (!html.includes(`<link rel="alternate" hreflang="${l.code}" href="${pageUrl(l, page)}">`)) problems.push(`${rel}: missing hreflang ${l.code}`);
      if (!html.includes(`<link rel="alternate" hreflang="x-default" href="${pageUrl(def, page)}">`)) problems.push(`${rel}: missing hreflang x-default`);
      if (lang === def) continue;
      const s = strings[lang.code];
      const same = new Set();
      for (const k of Object.keys(en)) {
        if (s[k] === undefined || norm(s[k]) !== norm(en[k])) continue;
        for (const part of s[k].split(/<[^>]+>/)) if (bare(part)) same.add(bare(part));
      }
      const seen = new Set();
      for (const seg of segments(html, lang.code)) {
        if (!english.has(seg.text) || same.has(bare(seg.text)) || !hasWords(seg.text) || seen.has(seg.where + seg.text)) continue;
        seen.add(seg.where + seg.text);
        problems.push(`${rel}: English left in ${seg.where}: "${seg.text.length > 90 ? seg.text.slice(0, 87) + '...' : seg.text}"`);
      }
    }
  }

  // Changelog translations.
  const log = changelogShape(readFileSync(join(root, 'CHANGELOG.md'), 'utf8'));
  for (const lang of languages) {
    if (lang === def) continue;
    const rel = `docs/i18n/changelog/${lang.code}.md`;
    const file = join(docs, 'i18n', 'changelog', `${lang.code}.md`);
    if (!existsSync(file)) {
      problems.push(`${rel}: missing translation of CHANGELOG.md`);
      continue;
    }
    const tr = changelogShape(readFileSync(file, 'utf8'));
    if (tr.releases.join(' ') !== log.releases.join(' ')) problems.push(`${rel}: releases ${tr.releases.join(', ')} differ from CHANGELOG.md (${log.releases.join(', ')})`);
    else if (tr.sections !== log.sections || tr.items !== log.items) problems.push(`${rel}: ${tr.sections} sections and ${tr.items} items, CHANGELOG.md has ${log.sections} and ${log.items}`);
  }
  return { problems, checked, languages: languages.length };
}
