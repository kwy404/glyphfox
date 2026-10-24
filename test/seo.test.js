// Search pages written by scripts/seo: guides, icon pages, structured data,
// social images, sitemaps and robots.txt.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { readIcons } from '../scripts/lib/icons.mjs';
import { loadGuides, guideStrings } from '../scripts/seo/guides.mjs';
import { finish, siteLink } from '../scripts/seo/site.mjs';
import { pageType } from '../scripts/seo/sitemap.mjs';

const root = resolve('.');
const docs = join(root, 'docs');
const read = (f) => readFileSync(f, 'utf8');
const { icons } = readIcons(join(root, 'icons'));
const guides = await loadGuides(root, icons);
const guidePages = guides.map((g) => join(docs, 'guides', `${g.slug}.html`));
const iconPages = icons.map((i) => join(docs, 'icons', `${i.name}.html`));
const indexPages = [join(docs, 'guides', 'index.html'), join(docs, 'icons', 'index.html')];
const all = [...guidePages, ...iconPages, ...indexPages];
// Languages of the guides: [html lang, folder below docs/].
const LANGS = [
  ['en', ''],
  ['pt-BR', 'pt-br/'],
  ['es', 'es/'],
];
const jsonLd = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

describe('search pages', () => {
  it('has one guide per framework and use case', () => {
    const slugs = guides.map((g) => g.slug).sort();
    expect(slugs).toEqual(
      ['accessibility', 'angular', 'animated-icons', 'astro', 'html-cdn', 'nextjs', 'nuxt', 'preact', 'qwik', 'react', 'react-native', 'solid', 'ssr', 'svelte', 'sveltekit', 'svg-sprite', 'tailwind', 'tree-shaking', 'vue', 'web-components'].sort(),
    );
    for (const g of guides) {
      const kinds = new Set(g.sections.flatMap((s) => s.blocks.map((b) => b[0])));
      expect(kinds.has('code'), g.slug).toBe(true);
      expect(kinds.has('props') || kinds.has('table'), g.slug).toBe(true);
      expect(g.sections.some((s) => s.id === 'pitfalls'), g.slug).toBe(true);
      const words = Object.values(guideStrings(g)).join(' ').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
      expect(words, g.slug).toBeGreaterThan(800);
    }
  });

  it('writes one page per original icon and nothing else in docs/icons', () => {
    for (const f of iconPages) expect(existsSync(f), f).toBe(true);
    const html = readdirSync(join(docs, 'icons')).filter((f) => f.endsWith('.html'));
    expect(html.length).toBe(icons.length + 1);
  });

  it('gives every page a unique title, description and canonical URL', () => {
    const seen = { title: new Set(), description: new Set(), canonical: new Set() };
    for (const f of all) {
      const html = read(f);
      const title = /<title[^>]*>([^<]+)<\/title>/.exec(html)[1];
      const description = /<meta name="description" content="([^"]+)"/.exec(html)[1];
      const canonical = /<link rel="canonical" href="([^"]+)">/.exec(html)[1];
      for (const [k, v] of Object.entries({ title, description, canonical })) {
        expect(seen[k].has(v), `${f}: duplicate ${k}`).toBe(false);
        seen[k].add(v);
      }
      expect(description.length, f).toBeGreaterThan(70);
      expect(description.length, f).toBeLessThan(200);
      expect(html.match(/<h1[\s>]/g).length, f).toBe(1);
      for (const tag of ['og:title', 'og:description', 'og:url', 'og:image']) expect(html, `${f}: ${tag}`).toContain(`property="${tag}"`);
      for (const tag of ['twitter:card', 'twitter:title', 'twitter:image']) expect(html, `${f}: ${tag}`).toContain(`name="${tag}"`);
    }
  });

  it('adds structured data where it belongs', () => {
    for (const f of [...guidePages, ...iconPages]) {
      const types = jsonLd(read(f)).map((d) => d['@type']);
      expect(types, f).toContain('BreadcrumbList');
      expect(types.includes('FAQPage'), f).toBe(read(f).includes('<section id="faq"'));
    }
    for (const f of iconPages) expect(jsonLd(read(f)).map((d) => d['@type'])).not.toContain('FAQPage');
    expect(jsonLd(read(join(docs, 'index.html'))).map((d) => d['@type'])).toContain('SoftwareSourceCode');
  });

  it('draws a 1200 by 630 social image per guide', () => {
    for (const g of guides) {
      const png = readFileSync(join(docs, 'guides', 'social', `${g.slug}.png`));
      expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
      expect(png.readUInt32BE(16)).toBe(1200);
      expect(png.readUInt32BE(20)).toBe(630);
      expect(read(join(docs, 'guides', `${g.slug}.html`))).toContain(`guides/social/${g.slug}.png`);
    }
  });

  it('only links to files that exist', () => {
    for (const f of all) {
      const html = read(f).replace(/<pre[\s\S]*?<\/pre>/g, '');
      for (const m of html.matchAll(/\s(?:href|src)="([^"#?]+)(?:[#?][^"]*)?"/g)) {
        if (/^(https?:|mailto:|data:)/.test(m[1])) continue;
        let target = join(dirname(f), m[1]);
        if (existsSync(target) && statSync(target).isDirectory()) target = join(target, 'index.html');
        expect(existsSync(target), `${f}: ${m[1]}`).toBe(true);
      }
    }
  });

  it('writes every guide in every language with its canonical and hreflang links', () => {
    const site = 'https://kwy404.github.io/glyphfox/';
    const paths = [...guides.map((g) => `guides/${g.slug}.html`), 'guides/index.html'];
    for (const path of paths) {
      const url = (dir) => site + (dir + path).replace(/index\.html$/, '');
      const titleOf = (html) => /<title[^>]*>([^<]+)<\/title>/.exec(html)[1];
      const english = titleOf(read(join(docs, path)));
      for (const [lang, dir] of LANGS) {
        const f = join(docs, dir + path);
        expect(existsSync(f), f).toBe(true);
        const html = read(f);
        expect(html, f).toContain(`<html lang="${lang}">`);
        expect(html, f).toContain(`<link rel="canonical" href="${url(dir)}">`);
        expect(html, f).toContain(`<meta property="og:url" content="${url(dir)}">`);
        for (const [l, d] of LANGS) expect(html, `${f}: ${l}`).toContain(`<link rel="alternate" hreflang="${l}" href="${url(d)}">`);
        expect(html, f).toContain(`<link rel="alternate" hreflang="x-default" href="${url('')}">`);
        if (lang !== 'en') expect(titleOf(html), f).not.toBe(english);
        const body = html.replace(/<pre[\s\S]*?<\/pre>/g, '');
        for (const m of body.matchAll(/\s(?:href|src)="([^"#?]+)(?:[#?][^"]*)?"/g)) {
          if (/^(https?:|mailto:|data:)/.test(m[1])) continue;
          let target = join(dirname(f), m[1]);
          if (existsSync(target) && statSync(target).isDirectory()) target = join(target, 'index.html');
          expect(existsSync(target), `${f}: ${m[1]}`).toBe(true);
        }
      }
    }
  });

  it('lists every page in a sitemap index split by type', () => {
    const index = read(join(docs, 'sitemap.xml'));
    for (const t of ['pages', 'guides', 'icons']) expect(index).toContain(`sitemap-${t}.xml`);
    const locs = ['pages', 'guides', 'icons'].flatMap((t) => [...read(join(docs, `sitemap-${t}.xml`)).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
    expect(new Set(locs).size).toBe(locs.length);
    expect(locs).toContain('https://kwy404.github.io/glyphfox/');
    expect(locs).toContain('https://kwy404.github.io/glyphfox/pt-br/docs.html');
    expect(locs.filter((l) => l.includes('/icons/')).length).toBe(icons.length + 1);
    expect(locs.filter((l) => l.includes('/guides/')).length).toBe((guides.length + 1) * LANGS.length);
    expect(locs.some((l) => l.endsWith('404.html'))).toBe(false);
    expect(read(join(docs, 'robots.txt'))).toContain('Sitemap: https://kwy404.github.io/glyphfox/sitemap.xml');
    expect(pageType('pt-br/guides/react.html')).toBe('guides');
    expect(pageType('icons.html')).toBe('pages');
  });

  it('turns site links into relative links for every page location', () => {
    expect(siteLink('react.html', 'guides')).toBe('~/guides/react.html');
    expect(siteLink('../docs.html#props', 'guides')).toBe('~/docs.html#props');
    const html = '<a href="~/guides/react.html"></a><a href="~/"></a><link href="~/assets/site.css">';
    expect(finish(html, 'guides/vue.html', 'en', () => false)).toBe('<a href="react.html"></a><a href="../"></a><link href="../assets/site.css">');
    expect(finish(html, 'guides/vue.html', 'pt-BR', (t) => t === 'index.html')).toBe('<a href="../../guides/react.html"></a><a href="../"></a><link href="../../assets/site.css">');
  });
});
