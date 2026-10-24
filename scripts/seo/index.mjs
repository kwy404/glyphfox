// Search pages of the studio site, called by scripts/lib/docs.mjs:
//   docs/guides/SLUG.html      one guide per framework and use case (docs/guides/content)
//   docs/guides/index.html     the guides index
//   docs/icons/NAME.html       one page per original icon of icons/
//   docs/icons/index.html      every icon by category
//   docs/guides/social/*.png   the social image of each guide
//   docs/guides/page.js        the small script of these pages
//   docs/sitemap.xml           sitemap index: sitemap-pages.xml, sitemap-guides.xml, sitemap-icons.xml
//   docs/robots.txt
// It also adds structured data and og:description to the site pages.
// English is always written; another language is written for a page once
// docs/guides/i18n.js (and the site strings) translate every key it uses.
// A language that only docs/guides/i18n.js has gets its header and footer
// from there and links to the English site pages.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { guidePage, guidePageKeys, guideStrings, guidesIndex, indexKeys, loadGuides } from './guides.mjs';
import { iconPage, iconPageKeys, iconsIndex, iconsIndexKeys } from './icon-pages.mjs';
import { AUTHOR, SITE, SITE_PAGES, covers, escAttr, ldJson, langDir, loadPartials, plain, shell, translator } from './site.mjs';
import { sitemaps } from './sitemap.mjs';
import { samePng, socialImage } from './social.mjs';

function clientScript(api) {
  const icon = (name, size) => api.toSvg(name, { size, weight: 2 });
  const icons = { sun: icon('sun', 18), moon: icon('moon', 18), menu: icon('menu', 20), x: icon('x', 20), check: icon('check', 18) };
  return `// Guide and icon pages: theme, menu, copy and download. Written by scripts/seo.
const ICONS = ${JSON.stringify(icons)};
const root = document.documentElement;
const body = document.body;
let toastEl = null;
let toastTimer = 0;

function toast(message) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    toastEl.innerHTML = ICONS.check + '<span></span>';
    body.appendChild(toastEl);
  }
  toastEl.querySelector('span').textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch {
      // nothing else to try
    }
    ta.remove();
  }
  toast(body.dataset.copied || 'Copied');
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.code .copy');
  if (btn) {
    const pre = btn.closest('.code').querySelector('pre');
    if (pre) copy(pre.textContent);
    return;
  }
  const dl = e.target.closest('[data-download]');
  if (dl) {
    const pre = document.querySelector('#snip-svg pre');
    if (!pre) return;
    const url = URL.createObjectURL(new Blob([pre.textContent + '\\n'], { type: 'image/svg+xml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = dl.dataset.download;
    body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
});

const themeBtn = document.querySelector('[data-theme-toggle]');
if (themeBtn) {
  const paint = () => {
    const light = root.dataset.theme === 'light';
    themeBtn.setAttribute('aria-pressed', String(light));
    themeBtn.setAttribute('aria-label', light ? body.dataset.themeDark : body.dataset.themeLight);
    themeBtn.innerHTML = light ? ICONS.moon : ICONS.sun;
  };
  themeBtn.addEventListener('click', () => {
    const light = root.dataset.theme !== 'light';
    if (light) root.dataset.theme = 'light';
    else delete root.dataset.theme;
    try {
      localStorage.setItem('gf-theme', light ? 'light' : 'dark');
    } catch {
      // private mode
    }
    paint();
  });
  paint();
}

const menuBtn = document.querySelector('[data-menu-toggle]');
const nav = document.querySelector('.nav');
if (menuBtn && nav) {
  let open = false;
  menuBtn.addEventListener('click', () => {
    open = !open;
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.innerHTML = open ? ICONS.x : ICONS.menu;
  });
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a') && open) menuBtn.click();
  });
}
`;
}

/** Structured data and og:description for the site pages (an idempotent block before </head>). */
function enrichSitePage(html, rel, lang, available) {
  const clean = html.replace(/\n?<!-- seo:start -->[\s\S]*?<!-- seo:end -->/, '');
  const add = [];
  const desc = /<meta name="description" content="([^"]*)"/.exec(clean);
  if (desc && !/<meta property="og:description"/.test(clean)) add.push(`<meta property="og:description" content="${desc[1]}">`);
  const page = rel.slice(langDir(lang).length);
  if (page === 'index.html') {
    add.push(
      ldJson({
        '@context': 'https://schema.org',
        '@type': 'SoftwareSourceCode',
        name: 'glyphfox',
        description: desc ? plain(desc[1]) : undefined,
        url: SITE,
        codeRepository: 'https://github.com/kwy404/glyphfox',
        programmingLanguage: ['JavaScript', 'TypeScript'],
        runtimePlatform: 'Node.js',
        license: 'https://opensource.org/licenses/MIT',
        keywords: 'icons, svg icons, icon library, react, vue, svelte, angular, web components, tailwind css',
        inLanguage: lang,
        image: `${SITE}og.png`,
        author: { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url, sameAs: [AUTHOR.url, AUTHOR.linkedin] },
      }),
    );
  }
  let out = add.length ? clean.replace('</head>', `<!-- seo:start -->\n${add.join('\n')}\n<!-- seo:end -->\n</head>`) : clean;
  // Links from a translated site page to search pages that are not translated yet go to English.
  if (lang !== 'en') out = out.replace(/(\shref=")((?:guides|icons)\/[^"#]*)/g, (m, a, target) => (available(target.endsWith('/') || !target ? target + 'index.html' : target, lang) ? m : `${a}../${target}`));
  return out;
}

export async function seoFiles({ root, icons, files, siteDict, sitePages = SITE_PAGES }) {
  const docs = join(root, 'docs');
  const api = await import(pathToFileURL(join(root, 'packages', 'glyphfox', 'dist', 'index.js')).href);
  const { dict: seoStrings } = await import(pathToFileURL(join(docs, 'guides', 'i18n.js')).href + `?v=${Date.now()}`);
  const guides = await loadGuides(root, icons);
  const seoDict = { ...seoStrings, en: { ...seoStrings.en } };
  for (const g of guides) Object.assign(seoDict.en, guideStrings(g));
  // The site languages, then the languages that only the page strings have.
  const siteLangs = Object.keys(siteDict);
  const langs = [...siteLangs, ...Object.keys(seoStrings).filter((l) => !siteLangs.includes(l))];
  const names = new Set(icons.map((i) => i.name));
  const partials = loadPartials(root, api);
  const cache = new Map();
  const svg = (name, size) => {
    const key = `${name}|${size}`;
    if (!cache.has(key)) cache.set(key, api.toSvg(name, { size }));
    return cache.get(key);
  };
  const socialUrl = (g) => `${SITE}guides/social/${g.slug}.png`;

  const pages = [
    { path: 'guides/index.html', nav: 'docs', keys: indexKeys(guides), build: (c) => guidesIndex(guides, c) },
    ...guides.map((g) => ({ path: `guides/${g.slug}.html`, nav: 'docs', keys: guidePageKeys(g, guides), build: (c) => guidePage(g, guides, c) })),
    { path: 'icons/index.html', nav: 'icons', keys: iconsIndexKeys(), build: (c) => iconsIndex(icons, c) },
    ...icons.map((ic) => ({ path: `icons/${ic.name}.html`, nav: 'icons', keys: iconPageKeys(ic, api), build: (c) => iconPage(ic, c) })),
  ];
  const avail = new Map(pages.map((p) => [p.path, langs.filter((l) => covers(l, p.keys, seoDict, siteDict))]));
  const available = (target, lang) => (sitePages.includes(target) ? siteLangs.includes(lang) : (avail.get(target) || []).includes(lang));
  // Header and footer strings per language: the site strings, else the page strings.
  const chrome = Object.fromEntries(langs.map((l) => [l, siteDict[l] || seoDict[l]]));

  const out = {};
  for (const p of pages) {
    for (const lang of avail.get(p.path)) {
      const t = translator(lang, seoDict, siteDict);
      const page = p.build({ t, api, icons, names, svg, socialUrl });
      Object.assign(page, { lang, alternates: avail.get(p.path), nav: p.nav });
      out[join(docs, langDir(lang) + p.path)] = shell(page, { partials, t, siteDict: chrome, available });
    }
  }
  out[join(docs, 'guides', 'page.js')] = clientScript(api);
  for (const g of guides) {
    // Keep the committed file when only the zlib output would differ.
    const file = join(docs, 'guides', 'social', `${g.slug}.png`);
    const png = socialImage(g, api);
    const old = existsSync(file) ? readFileSync(file) : null;
    out[file] = old && samePng(old, png) ? old : png;
  }

  // Site pages: structured data, og:description and links to untranslated search pages.
  const rel = (file) => file.slice(docs.length + 1).split('\\').join('/');
  for (const [file, text] of Object.entries(files)) {
    if (!file.endsWith('.html') || !file.startsWith(docs)) continue;
    const r = rel(file);
    if (r === '404.html') continue;
    const lang = langs.find((l) => l !== 'en' && r.startsWith(langDir(l))) || 'en';
    files[file] = enrichSitePage(text, r, lang, available);
  }

  const all = [...Object.entries(files), ...Object.entries(out)]
    .filter(([f]) => f.endsWith('.html') && f.startsWith(docs))
    .map(([f, html]) => ({ rel: rel(f), html }))
    .filter((p) => p.rel !== '404.html');
  for (const [name, text] of Object.entries(sitemaps(all))) out[join(docs, name)] = text;
  return out;
}

export { escAttr };
