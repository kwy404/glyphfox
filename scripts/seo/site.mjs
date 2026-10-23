// Shared pieces of the guide and icon pages: escaping, links, the site
// partials, the page shell (head, Open Graph, Twitter, JSON-LD) and the
// languages. Pages are written with site relative links ("~/guides/x.html")
// and finish() turns them into relative links for the page location.

import { existsSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';

export const SITE = 'https://kwy404.github.io/glyphfox/';
export const AUTHOR = { name: 'Alexandre Kohler', url: 'https://github.com/kwy404', linkedin: 'https://www.linkedin.com/in/alexandre-silva-173687256/' };

const OG_LOCALE = { en: 'en_US', 'pt-BR': 'pt_BR', es: 'es_ES', fr: 'fr_FR', de: 'de_DE' };

/** Pages of the site that exist in every language of the site strings. */
export const SITE_PAGES = ['index.html', 'icons.html', 'studio.html', 'docs.html', 'changelog.html'];

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Plain text of an HTML fragment (for meta tags and JSON-LD). */
export function plain(html) {
  return String(html)
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Folder of a language below docs/: '' for English, 'pt-br/' for pt-BR. */
export const langDir = (lang) => (lang === 'en' ? '' : `${lang.toLowerCase()}/`);

/** Public URL of a page path (docs relative), without index.html. */
export function pageUrl(path, lang = 'en') {
  const p = langDir(lang) + path;
  return SITE + p.replace(/(^|\/)index\.html$/, '$1');
}

/**
 * Translator for one language: page strings first, then the site strings,
 * then English. `{name}` placeholders are filled from vars.
 */
export function translator(lang, seoDict, siteDict) {
  const pick = (key) => {
    for (const d of [seoDict[lang], siteDict[lang], seoDict.en, siteDict.en]) if (d && d[key] !== undefined) return d[key];
    throw new Error(`seo: missing string ${key}`);
  };
  const t = (key, vars) => {
    let s = pick(key);
    if (vars) for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]));
    return s;
  };
  t.lang = lang;
  return t;
}

/** True when a language has every key in the list (site or page strings). */
export function covers(lang, keys, seoDict, siteDict) {
  if (lang === 'en') return true;
  const a = seoDict[lang] || {};
  const b = siteDict[lang] || {};
  return keys.every((k) => a[k] !== undefined || b[k] !== undefined);
}

/** Resolves a link written inside a page at `fromDir` into the "~/" form. */
export function siteLink(href, fromDir) {
  if (/^(?:[a-z]+:|#|\/\/|\/|~\/)/i.test(href)) return href;
  const [path, hash = ''] = href.split('#');
  const joined = posix.normalize(posix.join(fromDir, path));
  return `~/${joined}${hash ? '#' + hash : ''}`;
}

/** Rewrites relative href and src values of an HTML fragment into "~/" links. */
export function siteLinks(html, fromDir = '') {
  return html.replace(/(\s(?:href|src)=")([^"]*)(")/g, (m, a, v, b) => `${a}${siteLink(v, fromDir)}${b}`);
}

/**
 * Final pass: "~/x" links become relative links for a page at `path` in
 * `lang`. Pages that exist in that language stay in it, other pages and
 * every asset point to the shared English folder.
 */
export function finish(html, path, lang, available) {
  const from = posix.dirname(langDir(lang) + path);
  return html.replace(/(\s(?:href|src)=")~\/([^"#]*)(#[^"]*)?(")/g, (m, a, target, hash = '', b) => {
    let t = target;
    if (t === '' || t.endsWith('/')) t += 'index.html';
    const isPage = t.endsWith('.html');
    const localized = isPage && lang !== 'en' && available(t, lang);
    const full = (localized ? langDir(lang) : '') + t;
    const dir = /(^|\/)index\.html$/.test(full);
    const to = dir ? posix.dirname(full) : full;
    let rel = posix.relative(from === '.' ? '' : from, to === '.' ? '' : to);
    if (dir) rel = rel ? `${rel}/` : './';
    return `${a}${rel || './'}${hash}${b}`;
  });
}

/** Relative link from a page to a docs path in any language folder. */
export function relFrom(path, lang, full) {
  const depth = (langDir(lang) + path).split('/').length - 1;
  return ('../'.repeat(depth) + full).replace(/(^|\/)index\.html$/, '$1') || './';
}

/** Replaces data-i18n content and data-i18n-attr values from a dictionary. */
export function translateMarked(html, tr) {
  let out = html.replace(/<([a-zA-Z][\w-]*)\b([^>]*?\sdata-i18n="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g, (m, tag, attrs, key) => (tr[key] !== undefined ? `<${tag}${attrs}>${tr[key]}</${tag}>` : m));
  out = out.replace(/<[a-zA-Z][^>]*\sdata-i18n-attr="([^"]+)"[^>]*>/g, (tagText, spec) => {
    let tg = tagText;
    for (const pair of spec.split(';')) {
      const [name, key] = pair.split(':');
      if (!name || !key || tr[key] === undefined) continue;
      tg = tg.replace(new RegExp(`(\\s${name}=")[^"]*(")`), `$1${escAttr(tr[key])}$2`);
    }
    return tg;
  });
  return out;
}

/** The site partials with their inline icons, as "~/" linked fragments. */
export function loadPartials(root, api) {
  const out = {};
  for (const name of ['head', 'header', 'footer']) {
    const file = join(root, 'docs', 'partials', `${name}.html`);
    let body = existsSync(file) ? readFileSync(file, 'utf8').trim() : '';
    body = body.replace(/<!--gf:([^:>]+):(\d+)(?::([^>]*?))?-->[\s\S]*?<!--\/gf-->/g, (m, spec, size, cls) => {
      let svg = '';
      try {
        svg = api.toSvg(spec, { size: Number(size), class: cls || undefined });
      } catch {
        svg = '';
      }
      return `<!--gf:${spec}:${size}${cls ? ':' + cls : ''}-->${svg}<!--/gf-->`;
    });
    out[name] = siteLinks(body, '');
  }
  return out;
}

/** JSON for a script element (no closing tags inside). */
export const ldJson = (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

export function breadcrumbs(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name: plain(name), item: url })),
  };
}

/**
 * A full page. `page` has path, lang, title, description, keys (the string
 * keys the page uses), crumbs, ld (JSON-LD objects), image, imageAlt, css,
 * bodyClass, main (the body between header and footer) and alternates.
 */
export function shell(page, ctx) {
  const { partials, t, siteDict } = ctx;
  const { path, lang } = page;
  const url = pageUrl(path, lang);
  const alt = page.alternates || ['en'];
  const links = [`<link rel="canonical" href="${url}">`];
  for (const l of alt) links.push(`<link rel="alternate" hreflang="${l}" href="${pageUrl(path, l)}">`);
  if (alt.length > 1) links.push(`<link rel="alternate" hreflang="x-default" href="${pageUrl(path, 'en')}">`);
  const image = page.image || `${SITE}og.png`;
  const imageAlt = page.imageAlt || 'glyphfox: icons that move, morph and fuse';
  let head = partials.head
    .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${escAttr(image)}">`)
    .replace(/<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="${escAttr(imageAlt)}">`);
  if (page.ogType) head = head.replace(/<meta property="og:type" content="[^"]*">/, `<meta property="og:type" content="${page.ogType}">`);
  const title = plain(page.title);
  const description = plain(page.description);
  const meta = [
    `<title${page.titleKey ? ` data-i18n="${page.titleKey}"` : ''}>${esc(title)}</title>`,
    `<meta name="description" content="${escAttr(description)}"${page.descriptionKey ? ` data-i18n-attr="content:${page.descriptionKey}"` : ''}>`,
    ...links,
    `<meta property="og:title" content="${escAttr(title)}">`,
    `<meta property="og:description" content="${escAttr(description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:locale" content="${OG_LOCALE[lang] || lang.replace('-', '_')}">`,
    `<meta name="twitter:title" content="${escAttr(title)}">`,
    `<meta name="twitter:description" content="${escAttr(description)}">`,
    `<meta name="twitter:image" content="${escAttr(image)}">`,
    `<meta name="twitter:image:alt" content="${escAttr(imageAlt)}">`,
    ...(page.css || []).map((c) => `<link rel="stylesheet" href="${c}">`),
    ...(page.ld || []).map(ldJson),
  ];
  let header = partials.header.replace(/ aria-current="page"/g, '');
  let footer = partials.footer;
  const tr = siteDict[lang] || {};
  if (lang !== 'en') {
    head = translateMarked(head, tr);
    header = translateMarked(header, tr);
    footer = translateMarked(footer, tr);
  }
  if (page.nav) header = header.replace(new RegExp(`(<a [^>]*data-nav="${page.nav}")`), '$1 aria-current="page"');
  // Language switch: the same page in the other language when it exists, else that language's home.
  const other = lang === 'en' ? Object.keys(siteDict).find((l) => l !== 'en') : 'en';
  if (other) {
    const target = alt.includes(other) ? path : 'index.html';
    const label = lang === 'en' ? null : tr['lang.switch'] || 'EN, read in English';
    header = header.replace(/(<a [^>]*)href="[^"]*"([^>]*data-lang-switch[^>]*)>[^<]*</, (m, a, b) => {
      let attrs = b.replace(/hreflang="[^"]*"/, `hreflang="${other}"`);
      if (label) attrs = attrs.replace(/aria-label="[^"]*"/, `aria-label="${escAttr(label)}"`);
      const text = other === 'en' ? 'EN' : other.split('-')[0].toUpperCase();
      return `${a}href="${relFrom(path, lang, langDir(other) + target)}"${attrs}>${text}<`;
    });
  }
  const strings = `data-copied="${escAttr(t('toast.copied'))}" data-theme-light="${escAttr(t('theme.light'))}" data-theme-dark="${escAttr(t('theme.dark'))}"`;
  const html = `<!doctype html>
<html lang="${lang}">
<head>
${head}
${meta.join('\n')}
</head>
<body class="${page.bodyClass || ''}" ${strings}>
${header}
${page.main}
${footer}
<script type="module" src="~/guides/page.js"></script>
</body>
</html>
`;
  return finish(html, path, lang, ctx.available);
}
