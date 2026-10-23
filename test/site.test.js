// The studio site in docs/: links, assets, translations, credits and the
// icon names used in the README and the docs.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { iconNames } from 'glyphfox';
import { componentName, dataName } from '../packages/glyphfox/dist/core/formats.js';

const docs = resolve('docs');
const pages = [
  ...readdirSync(docs)
    .filter((f) => f.endsWith('.html'))
    .map((f) => join(docs, f)),
  ...readdirSync(join(docs, 'pt-br')).map((f) => join(docs, 'pt-br', f)),
  ...readdirSync(join(docs, 'frameworks')).map((f) => join(docs, 'frameworks', f)),
];
const read = (f) => readFileSync(f, 'utf8');
const { dict } = await import(pathToFileURL(join(docs, 'assets', 'js', 'i18n.js')).href);

describe('studio site', () => {
  it('has every page in English and Portuguese', () => {
    for (const p of ['index.html', 'icons.html', 'studio.html', 'docs.html', 'changelog.html', 'labs.html']) {
      expect(existsSync(join(docs, p)), p).toBe(true);
      expect(existsSync(join(docs, 'pt-br', p)), p).toBe(true);
      expect(read(join(docs, 'pt-br', p))).toContain('<html lang="pt-BR">');
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
    expect(read(join(docs, 'pt-br', 'docs.html'))).toContain('href="../frameworks/index.html"');
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

  it('has the same keys in both languages and every key used exists', () => {
    const en = Object.keys(dict.en).sort();
    expect(Object.keys(dict['pt-BR']).sort()).toEqual(en);
    for (const page of pages.filter((p) => !p.includes('pt-br'))) {
      const html = read(page);
      for (const m of html.matchAll(/data-i18n="([^"]+)"/g)) expect(dict.en[m[1]], `${page}: ${m[1]}`).toBeDefined();
      for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
        for (const pair of m[1].split(';')) expect(dict.en[pair.split(':')[1]], `${page}: ${pair}`).toBeDefined();
      }
    }
    const js = readdirSync(join(docs, 'assets', 'js'), { recursive: true })
      .filter((f) => f.endsWith('.js') && !f.startsWith('bundle'))
      .map((f) => read(join(docs, 'assets', 'js', f)));
    for (const src of js) {
      for (const m of src.matchAll(/\bt\('([a-zA-Z0-9.]+)'/g)) expect(dict.en[m[1]], m[1]).toBeDefined();
      for (const m of src.matchAll(/\bt\(`([a-zA-Z0-9.]+)\.\$\{/g)) expect(Object.keys(dict.en).some((k) => k.startsWith(m[1] + '.')), m[1]).toBe(true);
    }
  });

  it('translates the Portuguese pages', () => {
    const pt = read(join(docs, 'pt-br', 'index.html'));
    expect(pt).toContain(dict['pt-BR']['home.hero.title1']);
    expect(pt).toMatch(/href="\.\.\/assets\/site\.[0-9a-f]{8}\.css"/);
    expect(pt).toContain('hreflang="en"');
    expect(read(join(docs, 'pt-br', 'icons.html'))).toContain(`placeholder="${dict['pt-BR']['icons.search']}"`);
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
