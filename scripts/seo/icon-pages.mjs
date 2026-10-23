// One page per original glyphfox icon (docs/icons/NAME.html), built from
// icons/ at build time, and the index of every icon by category.

import { codeBlock } from './guides.mjs';
import { breadcrumbs, esc, escAttr, pageUrl } from './site.mjs';

export const CATEGORY_ORDER = ['arrows', 'interface', 'navigation', 'files', 'communication', 'media', 'devices', 'development', 'data', 'commerce', 'finance', 'weather', 'nature', 'maps', 'people', 'security', 'text', 'shapes', 'symbols', 'animals', 'gaming', 'space', 'music', 'food', 'sports', 'travel'];
const FORMATS = ['jsx', 'vue', 'svelte', 'angular', 'html', 'cdn', 'tailwind', 'svg', 'datauri', 'sprite', 'runtime', 'js'];
const MODIFIERS = ['check', 'plus', 'x', 'alert'];
const USE_GUIDES = ['react', 'vue', 'svelte', 'angular', 'web-components', 'html-cdn', 'tailwind', 'svg-sprite'];

/** "arrow-right" becomes "arrow right". */
export const words = (name) => name.replace(/-/g, ' ');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Icons that share tags, categories and name words, best first. */
export function relatedIcons(icon, icons, limit = 12) {
  const tokens = new Set(icon.name.split('-'));
  const tags = new Set(icon.tags);
  const scored = [];
  for (const o of icons) {
    if (o.name === icon.name) continue;
    let s = 0;
    for (const tg of o.tags) if (tags.has(tg)) s += 3;
    for (const c of o.categories) if (icon.categories.includes(c)) s += 1;
    for (const w of o.name.split('-')) if (tokens.has(w)) s += 2;
    if (tags.has(o.name)) s += 2;
    if (s > 1) scored.push([s, o.name]);
  }
  scored.sort((a, b) => b[0] - a[0] || a[1].localeCompare(b[1]));
  return scored.slice(0, limit).map((x) => x[1]);
}

/** Hand tuned morph pairs that contain the icon. */
export function morphPairs(name, api) {
  return api.MORPH_PAIRS.filter(([a, b]) => a.split('/')[0] === name || b.split('/')[0] === name);
}

const isDirectional = (name) => /^(arrow|chevron|chevrons|circle-arrow|corner)-/.test(name) && /(^|-)(left|right)(-|$)/.test(name);

function shapeCount(icon, api) {
  return api.parseBody(icon.body).filter((n) => n[1].class !== 'gf-secondary').length;
}

/** Copyable snippets for every format. */
export function snippets(name, api) {
  const svg = api.toSvg(name);
  const out = {};
  for (const f of ['jsx', 'vue', 'svelte', 'angular', 'html', 'cdn', 'tailwind', 'svg', 'datauri']) out[f] = api.snippet(f, name, {}, { svg, version: '1' });
  out.sprite = `<!-- copy node_modules/glyphfox/dist/sprite.svg to your public folder -->\n<svg width="24" height="24" aria-hidden="true">\n  <use href="/sprite.svg#gf-${name}"></use>\n</svg>`;
  out.runtime = `<!-- main.js: import 'glyphfox/runtime'; -->\n<i data-glyph="${name}"></i>`;
  out.js = `import { renderToString } from 'glyphfox/core';\nimport ${api.dataName(name)} from 'glyphfox/icons/${name}';\n\nconst svg = renderToString(${api.dataName(name)}, { size: 24 });\n\n// or, with every icon registered by name:\n// import { toSvg } from 'glyphfox';\n// toSvg('${name}', { size: 24 });`;
  return out;
}

const LANG = { jsx: 'js', vue: 'js', svelte: 'js', angular: 'js', html: 'js', cdn: 'js', tailwind: 'js', svg: 'js', datauri: 'sh', sprite: 'js', runtime: 'js', js: 'js' };
const LABEL = { jsx: 'App.jsx', vue: 'App.vue', svelte: 'App.svelte', angular: 'app.component', html: 'index.html', cdn: 'index.html', tailwind: 'index.html', svg: `NAME.svg`, datauri: 'data URI', sprite: 'index.html', runtime: 'index.html', js: 'icon.js' };

/** Keys an icon page needs. */
export function iconPageKeys(icon, api) {
  const keys = [
    'seo.icon.title', 'seo.icon.description', 'seo.icon.h1', 'seo.icon.lead.base', 'seo.icon.lead.one', 'seo.icon.lead.many', 'seo.icon.lead.duotone', 'seo.icon.lead.solid', 'seo.icon.lead.open',
    'seo.icon.lead.morph', 'seo.icon.lead.rtl', 'seo.icon.lead.tags', 'seo.icon.customize', 'seo.icon.download', 'seo.icon.preview', 'seo.icon.preview.p', 'seo.icon.sizes', 'seo.icon.weights',
    'seo.icon.styles', 'seo.icon.weight', 'seo.icon.sharp', 'seo.icon.code', 'seo.icon.code.p', 'seo.icon.formats', ...FORMATS.map((f) => `seo.icon.fmt.${f}`), 'seo.icon.details',
    'seo.icon.d.name', 'seo.icon.d.component', 'seo.icon.d.data', 'seo.icon.d.categories', 'seo.icon.d.tags', 'seo.icon.d.styles', 'seo.icon.d.shapes', 'seo.icon.d.license',
    'seo.icon.d.duotoneLayer', 'seo.icon.d.duotoneFill', 'seo.icon.mods', 'seo.icon.mods.p', 'seo.icon.related', 'seo.icon.use', 'seo.icon.use.p', 'seo.crumb.home', 'seo.crumb.icons', 'seo.crumbs',
    'variant.outline', 'variant.duotone', 'variant.solid', 'action.copy', ...icon.categories.map((c) => `seo.cat.${c}`), ...USE_GUIDES.map((g) => `guide.${g}.short`),
  ];
  if (morphPairs(icon.name, api).length) keys.push('seo.icon.morph', 'seo.icon.morph.p', 'seo.icon.morph.to');
  return keys;
}

function figure(svg, caption, cls = '') {
  return `<figure${cls ? ` class="${cls}"` : ''}>${svg}<figcaption>${caption}</figcaption></figure>`;
}

/** One icon page. */
export function iconPage(icon, ctx) {
  const { t, api, icons, svg } = ctx;
  const lang = t.lang;
  const name = icon.name;
  const path = `icons/${name}.html`;
  const label = words(name);
  const Label = cap(label);
  const n = shapeCount(icon, api);
  const layer = icon.body.includes('gf-secondary');
  const solid = !!icon.solid;
  const pairs = morphPairs(name, api);
  const cat = icon.categories[0];
  const catLabel = t(`seo.cat.${cat}`);

  const lead = [
    t('seo.icon.lead.base', { Name: Label, category: catLabel, count: n === 1 ? t('seo.icon.lead.one') : t('seo.icon.lead.many', { n }) }),
    layer ? t('seo.icon.lead.duotone') : '',
    solid ? t('seo.icon.lead.solid') : layer ? '' : t('seo.icon.lead.open'),
    pairs.length ? t('seo.icon.lead.morph') : '',
    isDirectional(name) ? t('seo.icon.lead.rtl') : '',
    icon.tags.length ? t('seo.icon.lead.tags', { tags: icon.tags.map(esc).join(', ') }) : '',
  ]
    .filter(Boolean)
    .join(' ');

  const sizes = [16, 20, 24, 32, 48].map((s) => figure(api.toSvg(name, { size: s }), `${s} px`)).join('');
  const weights = [1, 1.5, 2, 2.5, 3].map((w) => figure(api.toSvg(name, { size: 40, weight: w }), esc(t('seo.icon.weight', { n: w })))).join('');
  const styles = [figure(api.toSvg(name, { size: 40 }), t('variant.outline'))];
  if (layer || solid) styles.push(figure(api.toSvg(name, { size: 40, variant: 'duotone', secondaryColor: '#ff7a1a' }), t('variant.duotone')));
  if (solid) styles.push(figure(api.toSvg(name, { size: 40, variant: 'solid' }), t('variant.solid')));
  styles.push(figure(api.toSvg(name, { size: 40, corners: 'sharp' }), t('seo.icon.sharp')));

  const snips = snippets(name, api);
  const radios = FORMATS.map((f, i) => `<input type="radio" name="fmt" id="fmt-${f}" value="${f}"${i === 0 ? ' checked' : ''}><label for="fmt-${f}" data-i18n="seo.icon.fmt.${f}">${t(`seo.icon.fmt.${f}`)}</label>`).join('');
  const panels = FORMATS.map((f) => `<div class="snip snip-${f}" id="snip-${f}">${codeBlock(LANG[f], LABEL[f].replace('NAME', name), snips[f], t)}</div>`).join('\n');

  const styleNames = [t('variant.outline')];
  if (layer) styleNames.push(t('seo.icon.d.duotoneLayer'));
  else if (solid) styleNames.push(t('seo.icon.d.duotoneFill'));
  if (solid) styleNames.push(t('variant.solid'));
  const details = [
    ['seo.icon.d.name', `<code>${esc(name)}</code>`],
    ['seo.icon.d.component', `<code>${esc(api.componentName(name))}</code>`],
    ['seo.icon.d.data', `<code>${esc(api.dataName(name))}</code>`],
    ['seo.icon.d.categories', icon.categories.map((c) => `<a href="~/icons/#${c}">${esc(t(`seo.cat.${c}`))}</a>`).join(', ')],
    ['seo.icon.d.tags', icon.tags.map((tg) => `<a class="chip" href="~/icons.html?q=${encodeURIComponent(tg)}">${esc(tg)}</a>`).join(' ')],
    ['seo.icon.d.styles', styleNames.map(esc).join(', ')],
    ['seo.icon.d.shapes', String(n)],
    ['seo.icon.d.license', '<a href="https://github.com/kwy404/glyphfox/blob/main/LICENSE">MIT</a>'],
  ]
    .map(([k, v]) => `<tr><th scope="row" data-i18n="${k}">${t(k)}</th><td>${v}</td></tr>`)
    .join('\n');

  const sections = [];
  sections.push(`<section id="preview" class="icon-section">
<h2 data-i18n="seo.icon.preview">${t('seo.icon.preview')}</h2>
<p data-i18n="seo.icon.preview.p">${t('seo.icon.preview.p')}</p>
<h3 data-i18n="seo.icon.sizes">${t('seo.icon.sizes')}</h3>
<div class="specimen sizes">${sizes}</div>
<h3 data-i18n="seo.icon.weights">${t('seo.icon.weights')}</h3>
<div class="specimen">${weights}</div>
<h3 data-i18n="seo.icon.styles">${t('seo.icon.styles')}</h3>
<div class="specimen">${styles.join('')}</div>
</section>`);
  sections.push(`<section id="code" class="icon-section">
<h2 data-i18n="seo.icon.code">${t('seo.icon.code')}</h2>
<p data-i18n="seo.icon.code.p">${t('seo.icon.code.p')}</p>
<div class="snips">
<fieldset class="fmt-tabs"><legend class="sr-only" data-i18n="seo.icon.formats">${t('seo.icon.formats')}</legend>${radios}</fieldset>
${panels}
</div>
</section>`);
  sections.push(`<section id="details" class="icon-section">
<h2 data-i18n="seo.icon.details">${t('seo.icon.details')}</h2>
<div class="table-wrap"><table class="props details"><tbody>
${details}
</tbody></table></div>
</section>`);
  if (pairs.length) {
    const figs = pairs
      .map(([a, b]) => {
        const demo = api.toSvg(a, { size: 72, morphTo: b, trigger: 'hover' });
        const other = (a.split('/')[0] === name ? b : a).split('/')[0];
        const cap2 = t('seo.icon.morph.to', { a: esc(a.replace('/solid', ' solid')), b: esc(b.replace('/solid', ' solid')) });
        const linkTo = other !== name ? ` <a href="~/icons/${other}.html">${esc(other)}</a>` : '';
        return `<figure class="morph-demo" tabindex="0">${demo}<figcaption>${cap2}${linkTo ? ` <span aria-hidden="true">/</span>${linkTo}` : ''}</figcaption></figure>`;
      })
      .join('');
    sections.push(`<section id="morph" class="icon-section">
<h2 data-i18n="seo.icon.morph">${t('seo.icon.morph')}</h2>
<p data-i18n="seo.icon.morph.p">${t('seo.icon.morph.p')}</p>
<div class="specimen">${figs}</div>
</section>`);
  }
  const mods = [];
  for (const m of MODIFIERS) {
    try {
      mods.push(figure(api.toSvg(`${name}+${m}`, { size: 40 }), `<code>${esc(name)}+${m}</code>`));
    } catch {
      // a modifier that cannot be placed on this icon is left out
    }
  }
  if (mods.length) {
    sections.push(`<section id="modifiers" class="icon-section">
<h2 data-i18n="seo.icon.mods">${t('seo.icon.mods')}</h2>
<p data-i18n="seo.icon.mods.p">${t('seo.icon.mods.p')}</p>
<div class="specimen">${mods.join('')}</div>
</section>`);
  }
  const rel = relatedIcons(icon, icons);
  if (rel.length) {
    sections.push(`<section id="related" class="icon-section">
<h2 data-i18n="seo.icon.related">${t('seo.icon.related')}</h2>
<ul class="icon-links">${rel.map((r) => `<li><a href="~/icons/${r}.html">${svg(r, 24)}<span>${esc(r)}</span></a></li>`).join('')}</ul>
</section>`);
  }
  sections.push(`<section id="use" class="icon-section">
<h2 data-i18n="seo.icon.use">${t('seo.icon.use')}</h2>
<p data-i18n="seo.icon.use.p">${t('seo.icon.use.p')}</p>
<ul class="chips">${USE_GUIDES.map((g) => `<li><a class="chip" href="~/guides/${g}.html" data-i18n="guide.${g}.short">${t(`guide.${g}.short`)}</a></li>`).join('')}</ul>
</section>`);

  const crumbs = `<nav class="crumbs" aria-label="${escAttr(t('seo.crumbs'))}" data-i18n-attr="aria-label:seo.crumbs"><ol><li><a href="~/" data-i18n="seo.crumb.home">${t('seo.crumb.home')}</a></li><li><a href="~/icons/" data-i18n="seo.crumb.icons">${t('seo.crumb.icons')}</a></li><li><a href="~/icons/#${cat}">${esc(catLabel)}</a></li><li aria-current="page">${esc(label)}</li></ol></nav>`;
  const main = `<main id="main" class="wrap icon-page">
${crumbs}
<div class="icon-hero">
<div class="icon-stage" aria-hidden="true">${api.toSvg(name, { size: 144 })}</div>
<div class="icon-intro">
<span class="eyebrow">${esc(catLabel)}</span>
<h1 class="title">${esc(t('seo.icon.h1', { Name: Label }))}</h1>
<p class="lead">${lead}</p>
<div class="icon-actions"><a class="btn primary small" href="~/icons.html#${name}" data-i18n="seo.icon.customize">${t('seo.icon.customize')}</a><button class="btn small" type="button" data-download="${name}.svg" data-i18n="seo.icon.download">${t('seo.icon.download')}</button></div>
</div>
</div>
${sections.join('\n')}
</main>`;
  return {
    path,
    title: t('seo.icon.title', { Name: Label }),
    description: t('seo.icon.description', { name: label }),
    css: ['~/assets/docs.css', '~/guides/guides.css'],
    bodyClass: 'docs-page icon-detail',
    ld: [
      breadcrumbs([
        [t('seo.crumb.home'), pageUrl('index.html', lang)],
        [t('seo.crumb.icons'), pageUrl('icons/index.html', lang)],
        [catLabel, pageUrl('icons/index.html', lang) + '#' + cat],
        [label, pageUrl(path, lang)],
      ]),
    ],
    main,
  };
}

export function iconsIndexKeys() {
  return ['seo.icons.title', 'seo.icons.description', 'seo.icons.h1', 'seo.icons.lead', 'seo.icons.categories', 'seo.icons.count', 'seo.crumb.home', 'seo.crumb.icons', 'seo.crumbs', ...CATEGORY_ORDER.map((c) => `seo.cat.${c}`)];
}

/** Every icon by category (docs/icons/index.html). Each icon is listed under its first category. */
export function iconsIndex(icons, ctx) {
  const { t, svg } = ctx;
  const lang = t.lang;
  const by = new Map();
  for (const ic of icons) {
    const c = ic.categories[0];
    if (!by.has(c)) by.set(c, []);
    by.get(c).push(ic.name);
  }
  const cats = [...CATEGORY_ORDER.filter((c) => by.has(c)), ...[...by.keys()].filter((c) => !CATEGORY_ORDER.includes(c)).sort()];
  const nav = cats.map((c) => `<li><a class="chip" href="#${c}">${esc(t(`seo.cat.${c}`))} <span class="faint">${by.get(c).length}</span></a></li>`).join('');
  const groups = cats
    .map(
      (c) => `<section id="${c}" class="icon-section">
<h2>${esc(cap(t(`seo.cat.${c}`)))} <span class="faint" data-i18n="seo.icons.count">${t('seo.icons.count', { n: by.get(c).length })}</span></h2>
<ul class="icon-links">${by
        .get(c)
        .map((nm) => `<li><a href="~/icons/${nm}.html">${svg(nm, 24)}<span>${esc(nm)}</span></a></li>`)
        .join('')}</ul>
</section>`,
    )
    .join('\n');
  const main = `<main id="main" class="wrap icon-page icons-index">
<nav class="crumbs" aria-label="${escAttr(t('seo.crumbs'))}" data-i18n-attr="aria-label:seo.crumbs"><ol><li><a href="~/" data-i18n="seo.crumb.home">${t('seo.crumb.home')}</a></li><li aria-current="page" data-i18n="seo.crumb.icons">${t('seo.crumb.icons')}</li></ol></nav>
<header class="docs-hero">
<h1 class="title" data-i18n="seo.icons.h1">${t('seo.icons.h1')}</h1>
<p class="lead">${t('seo.icons.lead', { count: icons.length })}</p>
<h2 class="sr-only" data-i18n="seo.icons.categories">${t('seo.icons.categories')}</h2>
<ul class="chips">${nav}</ul>
</header>
${groups}
</main>`;
  return {
    path: 'icons/index.html',
    title: t('seo.icons.title'),
    titleKey: 'seo.icons.title',
    description: t('seo.icons.description', { count: icons.length }),
    css: ['~/assets/docs.css', '~/guides/guides.css'],
    bodyClass: 'docs-page icon-detail',
    ld: [breadcrumbs([[t('seo.crumb.home'), pageUrl('index.html', lang)], [t('seo.crumb.icons'), pageUrl('icons/index.html', lang)]])],
    main,
  };
}
