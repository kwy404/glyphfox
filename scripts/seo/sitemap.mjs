// Sitemap index split by page type, read from the built pages themselves
// (their canonical and hreflang links), plus robots.txt.

import { SITE } from './site.mjs';

const TYPES = ['pages', 'guides', 'icons'];

/** Type of a page from its docs relative path (any language folder). */
export function pageType(rel) {
  const m = /^(?:[a-z]{2}(?:-[a-z]{2})?\/)?(guides|icons)\//.exec(rel);
  return m ? m[1] : 'pages';
}

const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * pages: [{ rel, html }]. Pages without a canonical link or with a robots
 * noindex are left out. Returns { 'sitemap.xml': ..., 'sitemap-TYPE.xml': ..., 'robots.txt': ... }.
 */
export function sitemaps(pages) {
  const byType = Object.fromEntries(TYPES.map((t) => [t, []]));
  for (const { rel, html } of pages) {
    if (/<meta name="robots" content="[^"]*noindex/.test(html)) continue;
    const canon = /<link rel="canonical" href="([^"]+)">/.exec(html);
    if (!canon || !canon[1].startsWith(SITE)) continue;
    const alts = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map((m) => [m[1], m[2]]);
    byType[pageType(rel)].push({ loc: canon[1], alts });
  }
  const out = {};
  const index = [];
  for (const type of TYPES) {
    const list = byType[type].sort((a, b) => (a.loc < b.loc ? -1 : a.loc > b.loc ? 1 : 0));
    if (!list.length) continue;
    const urls = list.map(({ loc, alts }) => {
      const links = alts.length > 1 ? alts.map(([l, h]) => `\n    <xhtml:link rel="alternate" hreflang="${xml(l)}" href="${xml(h)}"/>`).join('') : '';
      return `  <url>\n    <loc>${xml(loc)}</loc>${links}\n  </url>`;
    });
    out[`sitemap-${type}.xml`] = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
    index.push(`  <sitemap>\n    <loc>${SITE}sitemap-${type}.xml</loc>\n  </sitemap>`);
  }
  out['sitemap.xml'] = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${index.join('\n')}\n</sitemapindex>\n`;
  out['robots.txt'] = `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`;
  return out;
}
