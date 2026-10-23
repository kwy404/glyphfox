// Guide pages (docs/guides/SLUG.html) and the guides index, from the
// content modules in docs/guides/content/. Text blocks carry stable ids, so
// every string has a key (guide.SLUG.ID) the translations can use.

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { highlight } from './highlight.mjs';
import { SITE, breadcrumbs, covers, esc, escAttr, pageUrl, plain, siteLinks } from './site.mjs';

export const GROUPS = ['frameworks', 'topics'];

/** Loads and checks every guide content module. */
export async function loadGuides(root, icons) {
  const dir = join(root, 'docs', 'guides', 'content');
  const names = new Set(icons.map((i) => i.name));
  const guides = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.js')).sort()) {
    const mod = await import(pathToFileURL(join(dir, f)).href + `?v=${Date.now()}`);
    guides.push(mod.default);
  }
  const slugs = new Set(guides.map((g) => g.slug));
  const problems = [];
  for (const g of guides) {
    const ids = new Set();
    const need = (cond, msg) => cond || problems.push(`guides/${g.slug}: ${msg}`);
    need(GROUPS.includes(g.group), `unknown group ${g.group}`);
    need(names.has(g.icon), `unknown icon ${g.icon}`);
    for (const r of g.related || []) need(slugs.has(r), `unknown related guide ${r}`);
    for (const k of ['title', 'description', 'h1', 'lead', 'short']) need(typeof g[k] === 'string' && g[k], `missing ${k}`);
    for (const s of g.sections) {
      need(!ids.has(s.id), `duplicate id ${s.id}`);
      ids.add(s.id);
      for (const b of s.blocks) {
        if (['code', 'props'].includes(b[0])) continue;
        need(!ids.has(b[1]), `duplicate id ${b[1]}`);
        ids.add(b[1]);
      }
    }
  }
  if (problems.length) throw new Error(problems.join('\n'));
  guides.sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.order - b.order);
  return guides;
}

/** Every string of a guide as { key: html } (the English source). */
export function guideStrings(g) {
  const k = (id) => `guide.${g.slug}.${id}`;
  const out = {};
  for (const f of ['title', 'description', 'h1', 'lead', 'short']) out[k(f)] = g[f];
  for (const s of g.sections) {
    out[k(`${s.id}.h`)] = s.h;
    for (const b of s.blocks) {
      const [type, id] = b;
      if (type === 'p' || type === 'note') out[k(id)] = b[2];
      else if (type === 'ul' || type === 'ol') b[2].forEach((item, i) => (out[k(`${id}.${i + 1}`)] = item));
      else if (type === 'pitfalls')
        b[2].forEach(([tt, d], i) => {
          out[k(`${id}.${i + 1}.t`)] = tt;
          out[k(`${id}.${i + 1}.d`)] = d;
        });
      else if (type === 'table') {
        b[2].forEach((h, c) => (out[k(`${id}.h${c + 1}`)] = h));
        b[3].forEach((row, r) => row.forEach((cell, c) => (out[k(`${id}.r${r + 1}c${c + 1}`)] = cell)));
      }
    }
  }
  for (const q of g.faq || []) {
    out[k(`faq.${q.id}.q`)] = q.q;
    out[k(`faq.${q.id}.a`)] = q.a;
  }
  return out;
}

// The shared props, in documentation order: [prop, type, default (html or a key), description key].
const PROPS = [
  ['size', 'number, string', '<code>24</code>', 'prop.size'],
  ['color', 'string', '<code>currentColor</code>', 'prop.color'],
  ['secondaryColor', 'string', '<code>color</code>', 'prop.secondaryColor'],
  ['secondaryOpacity', 'number', '<code>0.3</code> / <code>1</code>', 'prop.secondaryOpacity'],
  ['weight', 'number', '<code>2</code>', 'prop.weight'],
  ['absoluteWeight', 'boolean', '<code>false</code>', 'prop.absoluteWeight'],
  ['corners', 'round, sharp', '<code>round</code>', 'prop.corners'],
  ['variant', 'outline, duotone, solid', '<code>outline</code>', 'prop.variant'],
  ['rotate', 'number', '<code>0</code>', 'prop.rotate'],
  ['flipX', 'boolean', '<code>false</code>', 'prop.flipX'],
  ['flipY', 'boolean', '<code>false</code>', 'prop.flipY'],
  ['mirrorRtl', 'boolean', '<code>false</code>', 'prop.mirrorRtl'],
  ['animate', 'draw, pop, wiggle, spin, pulse, bounce, shake', '@seo.none', 'prop.animate'],
  ['trigger', 'mount, hover, click, state', '<code>mount</code>', 'prop.trigger'],
  ['active', 'boolean', '<code>false</code>', 'prop.active'],
  ['duration', 'number (ms)', '@prop.duration.default', 'prop.duration'],
  ['delay', 'number (ms)', '<code>0</code>', 'prop.delay'],
  ['loop', 'boolean, number', '<code>false</code>', 'prop.loop'],
  ['modifier', 'plus, minus, check, x, alert, lock, clock, sync, arrow-up, arrow-down, dot', '@seo.none', 'prop.modifier'],
  ['modifierCorner', 'top-left, top-right, bottom-left, bottom-right', '<code>bottom-right</code>', 'prop.modifierCorner'],
  ['morphTo', 'name, data', '@seo.none', 'prop.morphTo'],
  ['title', 'string', '@seo.none', 'prop.title'],
  ['decorative', 'boolean', '@prop.decorative.default', 'prop.decorative'],
];
const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
const EXTRA = {
  web: [
    ['name', 'string', '@seo.none', 'seo.prop.name'],
    ['layout', 'overlap, side, stack, grid, orbit, badge, inside', '@seo.none', 'seo.prop.layout'],
    ['gap', 'number', '<code>1</code>', 'seo.prop.gap'],
    ['morph', 'boolean', '<code>false</code>', 'seo.prop.morph'],
  ],
  html: [['glyph', 'string', '@seo.none', 'seo.prop.glyph']],
};

export const PROP_KEYS = ['seo.props.prop', 'seo.props.input', 'seo.props.option', 'seo.props.template', 'seo.props.attr', 'docs.type', 'docs.default', 'docs.desc', 'seo.none', 'prop.duration.default', 'prop.decorative.default', ...PROPS.map((p) => p[3]), ...EXTRA.web.map((p) => p[3]), ...EXTRA.html.map((p) => p[3])];

/** The props table for one flavor (react, vue, svelte, angular, web, html, tosvg). */
export function propsTable(flavor, subset, t) {
  const rows = [...PROPS];
  if (EXTRA[flavor]) rows.unshift(...EXTRA[flavor]);
  const list = subset && subset.length ? rows.filter((r) => subset.includes(r[0]) || (EXTRA[flavor] || []).includes(r)) : rows;
  const val = (v) => (v.startsWith('@') ? t(v.slice(1)) : v);
  const nameOf = (p) => {
    if (flavor === 'web') return kebab(p);
    if (flavor === 'html') return p === 'glyph' ? 'data-glyph' : `data-${kebab(p)}`;
    return p;
  };
  const first = { web: 'seo.props.attr', html: 'seo.props.attr', angular: 'seo.props.input', tosvg: 'seo.props.option' }[flavor] || 'seo.props.prop';
  const head = [`<th data-i18n="${first}">${t(first)}</th>`];
  if (flavor === 'vue') head.push(`<th data-i18n="seo.props.template">${t('seo.props.template')}</th>`);
  head.push(`<th data-i18n="docs.type">${t('docs.type')}</th>`, `<th data-i18n="docs.default">${t('docs.default')}</th>`, `<th data-i18n="docs.desc">${t('docs.desc')}</th>`);
  const body = list.map(([p, type, def, key]) => {
    const cells = [`<td><code>${esc(nameOf(p))}</code></td>`];
    if (flavor === 'vue') cells.push(`<td><code>${esc(kebab(p))}</code></td>`);
    cells.push(`<td>${esc(type)}</td>`, `<td>${val(def)}</td>`, `<td data-i18n="${key}">${t(key)}</td>`);
    return `<tr>${cells.join('')}</tr>`;
  });
  return `<div class="table-wrap"><table class="props"><thead><tr>${head.join('')}</tr></thead><tbody>\n${body.join('\n')}\n</tbody></table></div>`;
}

export function codeBlock(lang, label, code, t) {
  return `<div class="code"><div class="code-head"><span>${esc(label)}</span><button class="copy" type="button" data-i18n="action.copy">${t('action.copy')}</button></div><pre data-lang="${lang}" data-done="1">${highlight(code, lang)}</pre></div>`;
}

const pascalToKebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase();

/** Icon names that the code samples of a guide use, in order of appearance. */
export function iconsInGuide(g, names) {
  const found = [];
  const add = (n) => {
    if (names.has(n) && !found.includes(n)) found.push(n);
  };
  for (const s of g.sections)
    for (const b of s.blocks) {
      if (b[0] !== 'code') continue;
      const code = b[3];
      for (const m of code.matchAll(/\b([A-Z][A-Za-z0-9]*?)Icon\b/g)) add(pascalToKebab(m[1]));
      for (const m of code.matchAll(/\bicon([A-Z][A-Za-z0-9]*)\b/g)) add(pascalToKebab(m[1]));
      for (const m of code.matchAll(/(?:name|glyph|morph-to|morphTo)=\{?["'`]([a-z0-9-]+)/g)) add(m[1]);
      for (const m of code.matchAll(/(?:toSvg|getIcon|loadIcon)\(\s*['"`]([a-z0-9-]+)/g)) add(m[1]);
      for (const m of code.matchAll(/glyphfox\/(?:react\/|vue\/|svelte\/)?icons\/([a-z0-9-]+)/g)) add(m[1]);
      for (const m of code.matchAll(/#gf-([a-z0-9-]+)/g)) add(m[1]);
      for (const m of code.matchAll(/\bgf-\[?([a-z0-9-]+)/g)) add(m[1]);
    }
  return found;
}

function block(b, g, t, link) {
  const key = (id) => `guide.${g.slug}.${id}`;
  const tx = (id) => link(t(key(id)));
  switch (b[0]) {
    case 'p':
      return `<p data-i18n="${key(b[1])}">${tx(b[1])}</p>`;
    case 'note':
      return `<p class="note" data-i18n="${key(b[1])}">${tx(b[1])}</p>`;
    case 'ul':
    case 'ol':
      return `<${b[0]} class="list">${b[2].map((_, i) => `<li data-i18n="${key(`${b[1]}.${i + 1}`)}">${tx(`${b[1]}.${i + 1}`)}</li>`).join('')}</${b[0]}>`;
    case 'code':
      return codeBlock(b[1], b[2], b[3], t);
    case 'props':
      return propsTable(b[1], b[2], t);
    case 'pitfalls':
      return `<dl class="pitfalls">${b[2].map((_, i) => `<div><dt data-i18n="${key(`${b[1]}.${i + 1}.t`)}">${tx(`${b[1]}.${i + 1}.t`)}</dt><dd data-i18n="${key(`${b[1]}.${i + 1}.d`)}">${tx(`${b[1]}.${i + 1}.d`)}</dd></div>`).join('')}</dl>`;
    case 'table': {
      const head = b[2].map((_, c) => `<th data-i18n="${key(`${b[1]}.h${c + 1}`)}">${tx(`${b[1]}.h${c + 1}`)}</th>`).join('');
      const rows = b[3].map((row, r) => `<tr>${row.map((_, c) => `<td data-i18n="${key(`${b[1]}.r${r + 1}c${c + 1}`)}">${tx(`${b[1]}.r${r + 1}c${c + 1}`)}</td>`).join('')}</tr>`).join('\n');
      return `<div class="table-wrap"><table class="props"><thead><tr>${head}</tr></thead><tbody>\n${rows}\n</tbody></table></div>`;
    }
    default:
      throw new Error(`guides/${g.slug}: unknown block ${b[0]}`);
  }
}

/** The left navigation with every guide. */
function guideNav(guides, current, t) {
  const out = [`<nav class="docs-nav" aria-label="${escAttr(t('seo.nav.guides'))}" data-i18n-attr="aria-label:seo.nav.guides">`, `<a href="~/guides/"${current ? '' : ' aria-current="page"'} data-i18n="seo.allGuides">${t('seo.allGuides')}</a>`];
  for (const grp of GROUPS) {
    out.push(`<p class="docs-nav-title" data-i18n="seo.group.${grp}">${t(`seo.group.${grp}`)}</p>`);
    for (const g of guides.filter((x) => x.group === grp)) {
      const cur = current && current.slug === g.slug ? ' aria-current="page" class="on"' : '';
      out.push(`<a href="~/guides/${g.slug}.html"${cur} data-i18n="guide.${g.slug}.short">${t(`guide.${g.slug}.short`)}</a>`);
    }
  }
  out.push('</nav>');
  return out.join('\n');
}

function crumbsHtml(items, t) {
  const li = items.map(([label, href, key], i) =>
    i === items.length - 1 ? `<li aria-current="page"${key ? ` data-i18n="${key}"` : ''}>${label}</li>` : `<li><a href="${href}"${key ? ` data-i18n="${key}"` : ''}>${label}</a></li>`,
  );
  return `<nav class="crumbs" aria-label="${escAttr(t('seo.crumbs'))}" data-i18n-attr="aria-label:seo.crumbs"><ol>${li.join('')}</ol></nav>`;
}

/** Keys a guide page needs (for the translation coverage check). */
export function guidePageKeys(g, guides) {
  return [
    ...Object.keys(guideStrings(g)),
    ...guides.map((x) => `guide.${x.slug}.short`),
    ...(g.related || []).flatMap((r) => [`guide.${r}.h1`, `guide.${r}.description`]),
    'seo.crumb.home', 'seo.crumb.guides', 'seo.crumbs', 'seo.nav.guides', 'seo.allGuides', 'seo.toc', 'seo.faq', 'seo.related', 'seo.iconsUsed',
    'seo.guide.eyebrow', `seo.group.${g.group}`, ...GROUPS.map((x) => `seo.group.${x}`),
    ...PROP_KEYS,
  ];
}

/** One guide page. */
export function guidePage(g, guides, ctx) {
  const { t, svg, names, socialUrl } = ctx;
  const lang = t.lang;
  const path = `guides/${g.slug}.html`;
  const link = (html) => siteLinks(html, 'guides');
  const k = (id) => `guide.${g.slug}.${id}`;
  const sections = g.sections.map((s) => `<section id="${s.id}">\n<h2 data-i18n="${k(`${s.id}.h`)}">${t(k(`${s.id}.h`))}</h2>\n${s.blocks.map((b) => block(b, g, t, link)).join('\n')}\n</section>`);
  const faq = g.faq && g.faq.length ? g.faq : null;
  if (faq) {
    sections.push(
      `<section id="faq" class="faq">\n<h2 data-i18n="seo.faq">${t('seo.faq')}</h2>\n${faq
        .map((q) => `<h3 data-i18n="${k(`faq.${q.id}.q`)}">${t(k(`faq.${q.id}.q`))}</h3>\n<p data-i18n="${k(`faq.${q.id}.a`)}">${link(t(k(`faq.${q.id}.a`)))}</p>`)
        .join('\n')}\n</section>`,
    );
  }
  const used = iconsInGuide(g, names).slice(0, 16);
  if (used.length) {
    sections.push(
      `<section id="icons" class="used">\n<h2 data-i18n="seo.iconsUsed">${t('seo.iconsUsed')}</h2>\n<ul class="icon-links">${used
        .map((n) => `<li><a href="~/icons/${n}.html">${svg(n, 24)}<span>${esc(n)}</span></a></li>`)
        .join('')}</ul>\n</section>`,
    );
  }
  const related = (g.related || []).map((r) => guides.find((x) => x.slug === r)).filter(Boolean);
  if (related.length) {
    sections.push(
      `<section id="related" class="related">\n<h2 data-i18n="seo.related">${t('seo.related')}</h2>\n<ul class="guide-cards">${related
        .map(
          (r) =>
            `<li><a href="~/guides/${r.slug}.html">${svg(r.icon, 28)}<strong data-i18n="guide.${r.slug}.h1">${t(`guide.${r.slug}.h1`)}</strong><span data-i18n="guide.${r.slug}.description">${t(`guide.${r.slug}.description`)}</span></a></li>`,
        )
        .join('')}</ul>\n</section>`,
    );
  }
  const toc = g.sections.map((s) => `<li><a href="#${s.id}" data-i18n="${k(`${s.id}.h`)}">${t(k(`${s.id}.h`))}</a></li>`);
  if (faq) toc.push(`<li><a href="#faq" data-i18n="seo.faq">${t('seo.faq')}</a></li>`);
  const crumbs = [
    [t('seo.crumb.home'), '~/', 'seo.crumb.home'],
    [t('seo.crumb.guides'), '~/guides/', 'seo.crumb.guides'],
    [t(k('short')), null, k('short')],
  ];
  const ld = [
    breadcrumbs([
      [t('seo.crumb.home'), pageUrl('index.html', lang)],
      [t('seo.crumb.guides'), pageUrl('guides/index.html', lang)],
      [t(k('short')), pageUrl(path, lang)],
    ]),
  ];
  if (faq) {
    ld.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((q) => ({ '@type': 'Question', name: plain(t(k(`faq.${q.id}.q`))), acceptedAnswer: { '@type': 'Answer', text: plain(t(k(`faq.${q.id}.a`))) } })),
    });
  }
  const main = `<div class="wrap docs-layout guide-layout">
${guideNav(guides, g, t)}
<main id="main" class="docs-main guide">
${crumbsHtml(crumbs, t)}
<header class="docs-hero">
<span class="eyebrow" data-i18n="seo.group.${g.group}">${t(`seo.group.${g.group}`)}</span>
<h1 class="title" data-i18n="${k('h1')}">${t(k('h1'))}</h1>
<p class="lead" data-i18n="${k('lead')}">${link(t(k('lead')))}</p>
<nav class="toc" aria-label="${escAttr(t('seo.toc'))}" data-i18n-attr="aria-label:seo.toc"><ol>${toc.join('')}</ol></nav>
</header>
${sections.join('\n')}
</main>
</div>`;
  return {
    path,
    title: t(k('title')),
    titleKey: k('title'),
    description: t(k('description')),
    descriptionKey: k('description'),
    image: socialUrl(g),
    imageAlt: `${plain(t(k('h1')))}: glyphfox`,
    ogType: 'article',
    css: ['~/assets/docs.css', '~/guides/guides.css'],
    bodyClass: 'docs-page guide-page',
    ld,
    main,
  };
}

/** Keys of the guides index. */
export function indexKeys(guides) {
  return [
    'seo.guides.title', 'seo.guides.description', 'seo.guides.h1', 'seo.guides.lead', 'seo.guides.frameworks', 'seo.guides.topics',
    'seo.crumb.home', 'seo.crumb.guides', 'seo.crumbs', 'seo.nav.guides', 'seo.allGuides', ...GROUPS.map((x) => `seo.group.${x}`),
    ...guides.flatMap((g) => [`guide.${g.slug}.short`, `guide.${g.slug}.h1`, `guide.${g.slug}.description`]),
  ];
}

/** The guides index (docs/guides/index.html). */
export function guidesIndex(guides, ctx) {
  const { t, svg } = ctx;
  const lang = t.lang;
  const groups = GROUPS.map(
    (grp) => `<section id="${grp}">
<h2 data-i18n="seo.group.${grp}">${t(`seo.group.${grp}`)}</h2>
<p data-i18n="seo.guides.${grp}">${t(`seo.guides.${grp}`)}</p>
<ul class="guide-cards">${guides
      .filter((g) => g.group === grp)
      .map((g) => `<li><a href="~/guides/${g.slug}.html">${svg(g.icon, 28)}<strong data-i18n="guide.${g.slug}.h1">${t(`guide.${g.slug}.h1`)}</strong><span data-i18n="guide.${g.slug}.description">${t(`guide.${g.slug}.description`)}</span></a></li>`)
      .join('')}</ul>
</section>`,
  );
  const main = `<div class="wrap docs-layout guide-layout">
${guideNav(guides, null, t)}
<main id="main" class="docs-main guide">
${crumbsHtml([[t('seo.crumb.home'), '~/', 'seo.crumb.home'], [t('seo.crumb.guides'), null, 'seo.crumb.guides']], t)}
<header class="docs-hero">
<h1 class="title" data-i18n="seo.guides.h1">${t('seo.guides.h1')}</h1>
<p class="lead" data-i18n="seo.guides.lead">${t('seo.guides.lead')}</p>
</header>
${groups.join('\n')}
</main>
</div>`;
  return {
    path: 'guides/index.html',
    title: t('seo.guides.title'),
    titleKey: 'seo.guides.title',
    description: t('seo.guides.description'),
    descriptionKey: 'seo.guides.description',
    css: ['~/assets/docs.css', '~/guides/guides.css'],
    bodyClass: 'docs-page guide-page',
    ld: [breadcrumbs([[t('seo.crumb.home'), pageUrl('index.html', lang)], [t('seo.crumb.guides'), pageUrl('guides/index.html', lang)]])],
    main,
  };
}

export { SITE, covers };
