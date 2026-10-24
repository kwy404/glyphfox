// The studio site in docs/: links, assets, translations, credits and the
// icon names used in the README and the docs.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { iconNames } from 'glyphfox';
import { componentName, dataName } from '../packages/glyphfox/dist/core/formats.js';
import { checkI18n, hasWords, segments } from '../scripts/lib/i18n-check.mjs';
import { moveLinks, translate } from '../scripts/lib/i18n.mjs';

const docs = resolve('docs');
const read = (f) => readFileSync(f, 'utf8');
const languages = JSON.parse(read(join(docs, 'i18n', 'languages.json')));
const strings = Object.fromEntries(languages.map((l) => [l.code, JSON.parse(read(join(docs, 'i18n', `${l.code}.json`)))]));
const localized = languages.filter((l) => l.dir);
const PAGES = ['index.html', 'icons.html', 'studio.html', 'docs.html', 'changelog.html', 'labs.html'];
// Pages that are written in English only for now.
const ENGLISH_ONLY = ['native.html', 'smart.html', 'universe.html'];
const htmlIn = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.html')).map((f) => join(dir, f)) : []);
const pages = [
  ...htmlIn(docs),
  ...htmlIn(join(docs, 'frameworks')),
  ...localized.flatMap((l) => [...htmlIn(join(docs, l.dir)), ...htmlIn(join(docs, l.dir, 'frameworks'))]),
];

describe('studio site', () => {
  it('has every page in every language', () => {
    expect(languages.map((l) => l.code)).toEqual(['en', 'pt-BR', 'es', 'fr', 'de']);
    for (const p of PAGES) {
      expect(read(join(docs, p)), p).toContain('<html lang="en">');
      for (const l of localized) {
        expect(existsSync(join(docs, l.dir, p)), `${l.dir}/${p}`).toBe(true);
        expect(read(join(docs, l.dir, p)), `${l.dir}/${p}`).toContain(`<html lang="${l.code}">`);
      }
    }
    expect(existsSync(join(docs, '404.html'))).toBe(true);
  });

  it('has the framework guide and every recipe', () => {
    for (const p of ['index', 'nextjs', 'nuxt', 'sveltekit', 'remix', 'alpine', 'htmx']) {
      const html = read(join(docs, 'frameworks', `${p}.html`));
      expect(html, p).toContain('<html lang="en">');
      expect(html, p).toMatch(/href="\.\.\/assets\/site\.[0-9a-f]{8}\.css"/);
      expect(html, p).toContain(`<link rel="canonical" href="https://kwy404.github.io/glyphfox/frameworks/${p === 'index' ? '' : p + '.html'}">`);
    }
    expect(read(join(docs, 'docs.html'))).toContain('href="frameworks/index.html"');
    for (const l of localized) {
      expect(read(join(docs, l.dir, 'docs.html')), l.code).toContain('href="../frameworks/index.html"');
      expect(existsSync(join(docs, l.dir, 'frameworks')), l.code).toBe(false);
    }
    for (const p of ENGLISH_ONLY) {
      expect(read(join(docs, p)), p).toContain('<html lang="en">');
      for (const l of localized) expect(existsSync(join(docs, l.dir, p)), `${l.dir}/${p}`).toBe(false);
    }
  });

  it('only links to files that exist', () => {
    for (const page of pages) {
      const html = read(page);
      for (const m of html.matchAll(/\s(?:href|src)="([^"#?]+)(?:[#?][^"]*)?"/g)) {
        const url = m[1];
        if (/^(https?:|mailto:|data:|\/glyphfox)/.test(url)) continue;
        expect(existsSync(join(dirname(page), url)), `${page}: ${url}`).toBe(true);
      }
    }
  });

  it('has the same keys in every language and every key used exists', () => {
    const en = Object.keys(strings.en);
    for (const l of languages) expect(Object.keys(strings[l.code]), l.code).toEqual(en);
    for (const page of [...pages.filter((p) => dirname(p) === docs), ...['head', 'header', 'footer'].map((n) => join(docs, 'partials', `${n}.html`))]) {
      const html = read(page);
      for (const m of html.matchAll(/data-i18n="([^"]+)"/g)) expect(strings.en[m[1]], `${page}: ${m[1]}`).toBeDefined();
      for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
        for (const pair of m[1].split(';')) expect(strings.en[pair.split(':')[1]], `${page}: ${pair}`).toBeDefined();
      }
    }
    const js = readdirSync(join(docs, 'assets', 'js'), { recursive: true })
      .filter((f) => f.endsWith('.js') && !f.startsWith('bundle'))
      .map((f) => read(join(docs, 'assets', 'js', f)));
    for (const src of js) {
      for (const m of src.matchAll(/\bt\('([a-zA-Z0-9.]+)'/g)) expect(strings.en[m[1]], m[1]).toBeDefined();
      for (const m of src.matchAll(/\bt\(`([a-zA-Z0-9.]+)\.\$\{/g)) expect(Object.keys(strings.en).some((k) => k.startsWith(m[1] + '.')), m[1]).toBe(true);
    }
  });

  it('translates the pages, the titles and the descriptions', () => {
    for (const l of localized) {
      const s = strings[l.code];
      const home = read(join(docs, l.dir, 'index.html'));
      expect(home, l.code).toContain(`<title data-i18n="home.meta.title">${s['home.meta.title']}</title>`);
      expect(home, l.code).toContain(`<meta name="description" content="${s['home.meta.description']}"`);
      expect(home, l.code).toContain(s['home.hero.title1']);
      expect(home, l.code).toMatch(/href="\.\.\/assets\/site\.[0-9a-f]{8}\.css"/);
      expect(read(join(docs, l.dir, 'icons.html')), l.code).toContain(`placeholder="${s['icons.search']}"`);
      expect(read(join(docs, l.dir, 'changelog.html')), l.code).not.toContain('All notable changes');
    }
  });

  it('declares the canonical page and the alternates of every language', () => {
    for (const p of PAGES) {
      const path = p === 'index.html' ? '' : p;
      for (const l of languages) {
        const html = read(join(docs, l.dir, p));
        expect(html, `${l.code} ${p}`).toContain(`<link rel="canonical" href="https://kwy404.github.io/glyphfox/${l.dir ? l.dir + '/' : ''}${path}">`);
        for (const a of languages) expect(html).toContain(`<link rel="alternate" hreflang="${a.code}" href="https://kwy404.github.io/glyphfox/${a.dir ? a.dir + '/' : ''}${path}">`);
        expect(html).toContain(`<link rel="alternate" hreflang="x-default" href="https://kwy404.github.io/glyphfox/${path}">`);
        expect(html).toContain(`<meta property="og:locale" content="${l.og}">`);
      }
    }
  });

  it('has a language switcher in the header and the footer and detects the first visit', () => {
    for (const p of PAGES) {
      for (const l of languages) {
        const html = read(join(docs, l.dir, p));
        const menu = /<details class="lang-menu" data-lang-menu>[\s\S]*?<\/details>/.exec(html);
        expect(menu, `${l.code} ${p}`).not.toBeNull();
        expect(menu[0]).toContain(`aria-label="${strings[l.code]['lang.label']}: ${l.name}"`);
        const footer = /<div class="footer-langs">[\s\S]*?<\/div>/.exec(html)[0];
        for (const a of languages) {
          const target = join(docs, a.dir, p);
          for (const block of [menu[0], footer]) {
            const link = new RegExp(`<a href="([^"]+)" hreflang="${a.code}" lang="${a.code}" data-set-lang="${a.code}"(?: aria-current="page")?>`).exec(block);
            expect(link, `${l.code} ${p} -> ${a.code}`).not.toBeNull();
            expect(resolve(dirname(join(docs, l.dir, p)), link[1])).toBe(target);
          }
        }
        expect(html).toMatch(/<!--lang:detect--><script>\(function\(c,d,u\)/);
        expect(html).toContain('<script type="application/json" id="gf-strings">');
      }
    }
  });

  it('finds English left outside code in another language', async () => {
    expect(hasWords('Copy the install command')).toBe(true);
    expect(hasWords('SVG, PNG, GIF')).toBe(false);
    expect(hasWords('file+check@tr arrow-right useMorph 2.00')).toBe(false);
    const texts = segments('<html lang="es"><p>Hola <code>npm i glyphfox</code></p><p translate="no">mount</p><a lang="en" href="#">English</a><button aria-label="Copiar">x</button></html>', 'es').map((s) => s.text);
    expect(texts).toEqual(['Hola', 'Copiar', 'x']);
    const { problems } = await checkI18n(resolve('.'));
    expect(problems).toEqual([]);
  });

  it('rebases links for pages in subfolders and translations', () => {
    expect(moveLinks('<a href="icons.html"></a><img src="assets/a.svg">', 'index.html', 'guides/react.html')).toBe('<a href="../icons.html"></a><img src="../assets/a.svg">');
    expect(moveLinks('<a href="../icons.html#x"></a><link href="../assets/site.css">', 'guides/react.html', 'fr/guides/react.html', (p) => (p === 'icons.html' ? 'fr/icons.html' : p))).toBe('<a href="../icons.html#x"></a><link href="../../assets/site.css">');
    expect(translate('<html lang="en"><p data-i18n="a">A</p><input data-i18n-attr="placeholder:b" placeholder="B"></html>', { a: 'Á', b: 'B "c"' }, 'es')).toBe('<html lang="es"><p data-i18n="a">Á</p><input data-i18n-attr="placeholder:b" placeholder="B &quot;c&quot;"></html>');
  });

  it('localizes the 404 page from the address, the choice or the browser', () => {
    const html = read(join(docs, '404.html'));
    expect(html).toContain('<title data-i18n="nf.title">');
    for (const l of languages) expect(html).toContain(JSON.stringify(strings[l.code]['nf.lead']));
  });

  it('credits the author on every page', () => {
    for (const page of pages) {
      const html = read(page);
      expect(html, page).toContain('Alexandre Kohler');
      expect(html, page).toContain('https://github.com/kwy404');
      expect(html, page).toContain('https://www.linkedin.com/in/alexandre-silva-173687256/');
    }
  });

  it('uses only icon names that exist in the README and the docs', () => {
    const names = new Set(iconNames);
    const components = new Set(iconNames.map(componentName));
    const data = new Set(iconNames.map(dataName));
    const guides = readdirSync(join(docs, 'frameworks')).map((f) =>
      read(join(docs, 'frameworks', f))
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&'),
    );
    const docsText = [read('README.md'), read(join(docs, 'docs.html')), read(join('packages', 'glyphfox-angular', 'README.md')), ...guides].join('\n');
    for (const m of docsText.matchAll(/\b([A-Z][A-Za-z0-9]*Icon)\b/g)) {
      if (['MorphIcon', 'GlyphFoxIcon'].includes(m[1])) continue;
      expect(components.has(m[1]), m[1]).toBe(true);
    }
    for (const m of docsText.matchAll(/\b(icon[A-Z][A-Za-z0-9]*)\b/g)) expect(data.has(m[1]), m[1]).toBe(true);
    for (const m of docsText.matchAll(/<(?:glyph-fox|gf-icon|Icon|MorphIcon)\s[^>]*?name="([a-z0-9-]+)"/g)) expect(names.has(m[1]), m[1]).toBe(true);
    for (const m of docsText.matchAll(/data-glyph="([a-z0-9-]+)"/g)) expect(names.has(m[1]), m[1]).toBe(true);
  });

  it('fills every inline icon and Fenn illustration', () => {
    for (const page of pages) {
      const html = read(page);
      for (const m of html.matchAll(/<!--gf:([^>]+?)-->([\s\S]*?)<!--\/gf-->/g)) expect(m[2].startsWith('<svg'), `${page}: ${m[1]}`).toBe(true);
      for (const m of html.matchAll(/<!--art:([^>]+?)-->([\s\S]*?)<!--\/art-->/g)) expect(m[2], `${page}: ${m[1]}`).toMatch(/^<svg class="fenn-art[^"]*" aria-hidden="true"/);
    }
    for (const name of ['sitting', 'running', 'drawing', 'orbit']) expect(existsSync(join(docs, 'assets', 'fenn', `${name}.svg`)), name).toBe(true);
    expect(read(join(docs, 'index.html'))).toContain('<!--art:sitting:hero-mascot-->');
    expect(read(join(docs, '404.html'))).toContain('<!--art:running:nf-art-->');
  });

  it('keeps the vendored engine and the data next to the pages', () => {
    const data = JSON.parse(read(join(docs, 'data', 'icons.json')));
    expect(data.count).toBe(iconNames.length);
    expect(read(join(docs, 'vendor', 'glyphfox.js'))).toContain('glyphfox engine');
  });
});
