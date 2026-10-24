// The open license sets of glyphfox universe in the icon browser: the set
// picker (name, count, license and a strip of previews for every set, in the
// groups of the Iconify catalog), search in one set or in every set, a
// virtual grid, and the license, copy formats and transforms of a set icon.
// The catalog, the previews, the search index and each set load on demand
// from jsDelivr through the universe runtime, which keeps every download in
// the Cache Storage of the browser. No set data is stored in the repository.

import * as U from '../../universe/runtime.js';
import { lang, siteRoot, t } from './app.js';

export const fmt = (n) => Number(n).toLocaleString(lang);
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Groups of the catalog, in menu order; the English names come from Iconify.
const GROUPS = [
  ['Material', 'material'],
  ['UI 24px', 'ui24'],
  ['UI 16px / 32px', 'ui16'],
  ['UI Other / Mixed Grid', 'uiOther'],
  ['UI Multicolor', 'uiColor'],
  ['Logos', 'logos'],
  ['Programming', 'programming'],
  ['Emoji', 'emoji'],
  ['Flags / Maps', 'flags'],
  ['Thematic', 'thematic'],
  ['', 'other'],
  ['Archive / Unmaintained', 'archive'],
];
const groupOf = (s) => (GROUPS.find(([name]) => name === (s.category || '')) || ['', 'other'])[1];
const STYLE_NAMES = ['outline', 'solid', 'duotone', 'color'];
// Animations the universe runtime draws itself; the others go through the glyphfox engine.
export const NATIVE_MOTION = ['spin', 'pulse', 'draw'];
const STRIP = 6;

let catalog = null;
let info = new Map();
let previews = null;
let index = null;

/** Where the data comes from: ?data=, a local universe-data/ folder on localhost, or jsDelivr. */
async function dataUrl() {
  const param = new URLSearchParams(location.search).get('data');
  if (param) return new URL(param, location.href).href;
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
    const local = new URL(`${siteRoot()}universe-data/`, location.origin).href;
    try {
      const r = await fetch(`${local}catalog.json`, { method: 'HEAD' });
      if (r.ok) return local;
    } catch {
      // no local data, use the CDN
    }
  }
  return null;
}

let ready = null;

/** Loads the catalog once. */
export function loadCatalog() {
  if (!ready) {
    ready = (async () => {
      const url = await dataUrl();
      U.configure(url ? { dataUrl: url, maxSets: 12 } : { maxSets: 12 });
      catalog = await U.loadCatalog();
      info = new Map(catalog.list.map((s) => [s.prefix, s]));
      return catalog;
    })();
    ready.catch(() => {
      ready = null;
    });
  }
  return ready;
}

export const setInfo = (prefix) => info.get(prefix) || null;
export const isSet = (prefix) => Boolean(prefix && info.has(prefix));
export const cdnSets = () => catalog.list.filter((s) => s.cdn !== false).map((s) => s.prefix);

/** The search index, loaded once. */
export async function loadIndex() {
  await loadCatalog();
  if (!index) index = await U.loadIndex();
  return index;
}

// Picker.

function stripIcon(prefix, entry, box) {
  const [name, body, flagDigit, , own] = entry;
  const [left, top, width, height] = own || box;
  const v = parseInt(flagDigit, 16) || 0;
  return `<span class="set-strip-ic" title="${esc(`${prefix}:${name}`)}">${U.iconToSvg({ prefix, body, left, top, width, height, stroke: Boolean(v & 8) }, { size: 16 })}</span>`;
}

function strip(prefix) {
  const p = previews && previews.sets[prefix];
  return p ? p.icons.slice(0, STRIP).map((e) => stripIcon(prefix, e, p.box)).join('') : '';
}

function item(s, current) {
  const lic = s.license;
  const off = s.cdn === false;
  const title = off ? `${s.name}: ${t('icons.set.local')}` : `${s.name}, ${lic.title}, ${s.author.name}`;
  return `<li><button class="set-item" type="button" data-pick="${esc(s.prefix)}" aria-pressed="${current === s.prefix}"${off ? ' disabled' : ''} title="${esc(title)}">
    <span class="set-item-top"><span class="set-item-name" translate="no">${esc(s.name)}</span><small>${fmt(s.total)}</small></span>
    <span class="set-item-lic" translate="no">${esc(lic.title)}${lic.attribution ? ` <em>${esc(t('icons.license.credit'))}</em>` : ''}</span>
    <span class="set-strip" data-strip="${esc(s.prefix)}" aria-hidden="true">${strip(s.prefix)}</span>
  </button></li>`;
}

/**
 * The picker list: glyphfox first, then every set in its group. `ours` is
 * { count, strip } for the glyphfox entry, `filter` the text of the filter
 * box, `current` the chosen set ('' for glyphfox).
 */
export function pickerHtml({ ours, filter = '', current = '' }) {
  const f = filter.trim().toLowerCase();
  const match = (s) =>
    !f ||
    s.name.toLowerCase().includes(f) ||
    s.prefix.includes(f) ||
    s.author.name.toLowerCase().includes(f) ||
    s.license.title.toLowerCase().includes(f) ||
    s.license.spdx.toLowerCase().includes(f);
  const out = [];
  if (!f || 'glyphfox'.includes(f) || 'mit'.includes(f)) {
    out.push(`<ul class="set-ours"><li><button class="set-item" type="button" data-pick="" aria-pressed="${!current}">
      <span class="set-item-top"><span class="set-item-name" translate="no">glyphfox</span><small>${fmt(ours.count)}</small></span>
      <span class="set-item-lic" translate="no">MIT</span>
      <span class="set-strip" aria-hidden="true">${ours.strip}</span>
    </button></li></ul>`);
  }
  if (catalog) {
    for (const [, slug] of GROUPS) {
      const sets = catalog.list.filter((s) => groupOf(s) === slug && match(s)).sort((a, b) => a.name.localeCompare(b.name, lang));
      if (!sets.length) continue;
      out.push(`<section class="set-group"><h3>${esc(t(`icons.group.${slug}`))} <small>${fmt(sets.length)}</small></h3><ul>${sets.map((s) => item(s, current)).join('')}</ul></section>`);
    }
  }
  return out.join('') || `<p class="set-none">${esc(t('icons.set.none'))}</p>`;
}

/** Loads the preview strips and fills the strips of a rendered list. */
export async function paintStrips(list) {
  if (!previews) {
    try {
      previews = await U.loadPreviews();
    } catch {
      return;
    }
  }
  for (const el of list.querySelectorAll('[data-strip]')) if (!el.firstChild) el.innerHTML = strip(el.dataset.strip);
}

// Sets in memory: parsed Iconify JSON per prefix, for the cells on screen.
const loaded = new Map();
const loading = new Map();
const MAX_SETS = 10;

// Virtual grid over the window scroll: only the rows on screen exist.
const MIN_CELL = 104;
const GAP = 10;
const ROW = 108;

/**
 * The grid of a set or of a search in every set. `source` is
 * { count, at(k) } where at(k) returns { key, label, title, svg } (svg is
 * null while the set of a cell loads); `onSelect(key, k)` is called on a
 * click or an arrow key.
 */
export function createGrid(root, layer, onSelect) {
  let source = { count: 0, at: () => null };
  let cols = 1;
  let width = MIN_CELL;
  let selected = '';
  let pos = -1;
  let frame = 0;
  let idle = 0;
  const pool = [];
  const visible = new Set();

  function layout() {
    const w = root.clientWidth;
    cols = Math.max(1, Math.floor((w + GAP) / (MIN_CELL + GAP)));
    width = (w - (cols - 1) * GAP) / cols;
    const rows = Math.ceil(source.count / cols);
    root.style.height = `${Math.max(0, rows * (ROW + GAP) - GAP)}px`;
  }

  function render(fromLoad = false) {
    if (root.hidden) return;
    const r = root.getBoundingClientRect();
    const top = Math.max(0, -r.top);
    const bottom = Math.min(r.height, innerHeight - r.top);
    const first = Math.max(0, Math.floor(top / (ROW + GAP)) - 2);
    const last = Math.max(first, Math.ceil(bottom / (ROW + GAP)) + 2);
    const start = first * cols;
    const end = Math.min(source.count, last * cols);
    const count = Math.max(0, end - start);
    while (pool.length < count) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'icon-cell set-cell';
      b.setAttribute('role', 'option');
      b.innerHTML = '<span class="ic"></span><span></span>';
      layer.appendChild(b);
      pool.push(b);
    }
    const prefixes = new Set();
    for (let k = 0; k < pool.length; k++) {
      const b = pool[k];
      if (k >= count) {
        if (!b.hidden) b.hidden = true;
        continue;
      }
      const p = start + k;
      const it = source.at(p);
      b.hidden = false;
      b.style.transform = `translate(${(p % cols) * (width + GAP)}px, ${Math.floor(p / cols) * (ROW + GAP)}px)`;
      b.style.width = `${width}px`;
      if (it.prefix) prefixes.add(it.prefix);
      if (b.dataset.key !== it.key || (fromLoad && b.dataset.empty)) {
        b.dataset.key = it.key;
        b.dataset.pos = String(p);
        b.title = it.title;
        b.lastChild.textContent = it.label;
        if (it.svg === null) {
          b.firstChild.innerHTML = '<span class="set-skel"></span>';
          b.dataset.empty = '1';
        } else {
          b.firstChild.innerHTML = it.svg;
          delete b.dataset.empty;
        }
      }
      b.setAttribute('aria-selected', String(it.key === selected));
    }
    visible.clear();
    for (const p of prefixes) visible.add(p);
    clearTimeout(idle);
    idle = setTimeout(() => {
      for (const p of visible) ensureSet(p, () => render(true));
    }, fromLoad ? 0 : 90);
  }

  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      render();
    });
  }

  function ensureSet(prefix, done) {
    if (loaded.has(prefix) || loading.has(prefix)) return;
    const set = info.get(prefix);
    if (!set || set.cdn === false) return;
    const p = U.loadSet(prefix)
      .then((data) => {
        loaded.set(prefix, data);
        while (loaded.size > MAX_SETS) {
          const old = [...loaded.keys()].find((k) => !visible.has(k));
          if (!old) break;
          loaded.delete(old);
        }
      })
      .catch(() => loaded.set(prefix, null))
      .finally(() => {
        loading.delete(prefix);
        done();
      });
    loading.set(prefix, p);
  }

  function scrollTo(p) {
    const r = root.getBoundingClientRect();
    const y = r.top + scrollY + Math.floor(p / cols) * (ROW + GAP);
    const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 64;
    if (y < scrollY + header + 120 || y + ROW > scrollY + innerHeight) window.scrollTo({ top: Math.max(0, y - innerHeight / 2) });
  }

  layer.addEventListener('click', (e) => {
    const b = e.target.closest('.set-cell');
    if (!b) return;
    pos = Number(b.dataset.pos);
    onSelect(b.dataset.key, pos);
  });
  root.addEventListener('keydown', (e) => {
    const moves = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
    if (!(e.key in moves) || !source.count) return;
    e.preventDefault();
    pos = Math.min(source.count - 1, Math.max(0, (pos < 0 ? 0 : pos) + (pos < 0 ? 0 : moves[e.key])));
    onSelect(source.at(pos).key, pos);
    scrollTo(pos);
    render();
  });
  addEventListener('scroll', schedule, { passive: true });
  new ResizeObserver(() => {
    if (root.hidden) return;
    layout();
    render();
  }).observe(root);

  return {
    /** Shows a new list of cells from the top. */
    show(next) {
      source = next;
      if (!next.keep) pos = -1;
      for (const b of pool) delete b.dataset.key;
      layout();
      render();
    },
    /** Draws the cells again (new transforms). */
    refresh() {
      for (const b of pool) delete b.dataset.key;
      render();
    },
    select(key, at) {
      selected = key;
      if (at !== undefined) pos = at;
      for (const b of pool) if (!b.hidden) b.setAttribute('aria-selected', String(b.dataset.key === key));
    },
    get count() {
      return source.count;
    },
  };
}

/** Grid markup of a set icon with the transforms of the grid, or null while its set loads. */
export function cellSvg(prefix, name, opts) {
  const data = loaded.get(prefix);
  if (!data) return loaded.has(prefix) ? '' : null;
  const raw = U.iconData(data, name);
  if (!raw) return '';
  const b = U.bakeTransforms(raw);
  const set = info.get(prefix);
  const stroke = U.isStroke(b.body) && !(set && set.palette);
  return U.iconToSvg({ prefix, ...b, stroke }, { ...transforms(opts, stroke), size: 32 });
}

/** The universe options of the inspector state: weight and corners only change stroke icons. */
export function transforms(o, stroke) {
  const out = { size: o.size, rotate: o.rotate, flipX: o.flipX, flipY: o.flipY };
  if (o.color) out.color = o.color;
  if (o.secondaryColor) {
    out.secondaryColor = o.secondaryColor;
    if (o.secondaryOpacity !== null && o.secondaryOpacity !== undefined) out.secondaryOpacity = o.secondaryOpacity;
  }
  if (stroke && o.weight !== 2) out.weight = o.weight;
  if (stroke && o.corners === 'sharp') out.corners = 'sharp';
  if (o.animate && NATIVE_MOTION.includes(o.animate)) out.animate = o.animate;
  return out;
}

// Search.

/** Ids of the icons of one set (or of every set) for a query and a category of that set. */
export function searchIds(query, { prefix = '', cat = '' } = {}) {
  const ids = index.searchIds(query, { sets: prefix ? [prefix] : cdnSets() });
  if (!prefix || !cat) return ids;
  const d = index.set(prefix);
  const c = d && d.cats.find((x) => x.name === cat);
  if (!c) return ids;
  const base = index.offsets[index.position.get(prefix)];
  const keep = new Set(Array.from(c.ids, (i) => base + i));
  return ids.filter((id) => keep.has(id));
}

/** Categories of a set: [[name, count]], by name. */
export function categories(prefix) {
  const d = index.set(prefix);
  if (!d) return [];
  return d.cats.map((c) => [c.name, c.ids.length]).sort((a, b) => a[0].localeCompare(b[0], 'en'));
}

export const entry = (id) => index.entry(id);

/** The icon object of the runtime (body, viewBox, stroke, license), loading its set. */
export const getIcon = (name) => U.getIcon(name);

// Inspector.

/** Preview and SVG copy of a set icon: the universe runtime draws it like the universe page. */
export function iconSvg(icon, opts, extra = {}) {
  return U.iconToSvg(icon, { ...transforms(opts, icon.stroke), ...extra });
}

/** The index entry of a set icon (style, brand, stroke and its position in the set), or null. */
function entryOf(name) {
  const p = name.indexOf(':');
  const prefix = name.slice(0, p);
  const at = index && index.position.has(prefix) ? index.find(prefix, name.slice(p + 1)) : -1;
  return at >= 0 ? index.entry(index.offsets[index.position.get(prefix)] + at) : null;
}

/** Description line of a set icon: set, author, style, tags and aliases. */
export function metaText(name) {
  const prefix = name.slice(0, name.indexOf(':'));
  const set = info.get(prefix);
  if (!set) return '';
  const parts = [t('icons.meta.by', { set: set.name, author: set.author.name })];
  const e = entryOf(name);
  if (e) {
    const at = e.index;
    parts.push([t(`icons.style.${STYLE_NAMES.indexOf(e.style) >= 0 ? e.style : 'outline'}`), e.stroke ? t('icons.meta.stroke') : '', e.brand ? t('icons.license.trademark') : ''].filter(Boolean).join(', '));
    const tags = [...index.categoriesOf(prefix, at), ...index.tagsOf(prefix, at)].slice(0, 8);
    if (tags.length) parts.push(tags.join(', '));
    const aliases = index.aliasesOf(prefix, at).slice(0, 6);
    if (aliases.length) parts.push(t('icons.meta.aliases', { list: aliases.join(', ') }));
  }
  return parts.join(' / ');
}

/** License badges, the attribution line to copy and the trademark notice of a set icon. */
export function licenseHtml(name) {
  const set = info.get(name.slice(0, name.indexOf(':')));
  if (!set) return '';
  const e = entryOf(name);
  const brand = Boolean(e && e.brand);
  const lic = set.license;
  const line = lic.attribution ? U.attributionLine(set) : '';
  return `<div class="insp-badges"><a class="insp-badge" href="${esc(lic.url || 'universe.html#sets')}" translate="no">${esc(lic.title)}</a><span class="insp-badge">${esc(t(`icons.kind.${lic.kind}`))}</span>${
    lic.attribution ? `<span class="insp-badge warn">${esc(t('icons.license.attribution'))}</span>` : ''
  }${brand ? `<span class="insp-badge warn">${esc(t('icons.license.trademark'))}</span>` : ''}</div>${
    line ? `<div class="insp-attrib"><p lang="en">${esc(line)}</p><button class="btn small" type="button" data-copy-attrib>${esc(t('icons.license.copy'))}</button></div>` : ''
  }`;
}

/** The attribution line of the set of an icon, or ''. */
export function attribution(name) {
  const set = info.get(name.slice(0, name.indexOf(':')));
  return set && set.license.attribution ? U.attributionLine(set) : '';
}

/** Copy formats of a set icon, the ones of the universe page: SVG, React, Vue, web component, CDN and a data URI. */
export const SET_FORMATS = ['svg', 'jsx', 'vue', 'html', 'cdn', 'datauri'];

function propList(o, stroke) {
  const out = [];
  if (o.size !== 24) out.push(['size', o.size, true]);
  if (o.color) out.push(['color', o.color, false]);
  if (stroke && o.weight !== 2) out.push(['weight', o.weight, true]);
  if (stroke && o.corners === 'sharp') out.push(['corners', 'sharp', false]);
  if (o.rotate) out.push(['rotate', o.rotate, true]);
  if (o.flipX) out.push(['flipX', true, true]);
  if (o.flipY) out.push(['flipY', true, true]);
  if (o.animate) out.push(['animate', o.animate, false]);
  return out;
}

const attrs = {
  react: (list) => list.map(([k, v, num]) => (v === true ? ` ${k}` : num ? ` ${k}={${v}}` : ` ${k}="${v}"`)).join(''),
  vue: (list) => list.map(([k, v, num]) => (v === true ? ` ${k.replace('flipX', 'flip-x').replace('flipY', 'flip-y')}` : num ? ` :${k}="${v}"` : ` ${k}="${v}"`)).join(''),
  web: (list) => list.map(([k, v]) => (v === true ? ` ${k === 'flipX' ? 'flip="x"' : 'flip="y"'}` : ` ${k}="${v}"`)).join(''),
};

/** The code to copy for a set icon in one format. `svg` is the markup of the preview. */
export function snippet(format, icon, opts, svg) {
  const name = icon.name;
  const credit = attribution(name);
  const js = credit ? `\n// ${credit}` : '';
  const html = credit ? `<!-- ${credit} -->\n` : '';
  const list = propList(opts, icon.stroke);
  switch (format) {
    case 'jsx':
      return `import { Icon } from 'glyphfox/react';\nimport 'glyphfox-universe/glyphfox';${js}\n\nexport function Example() {\n  return <Icon name="${name}"${attrs.react(list)} />;\n}`;
    case 'vue':
      return `<script setup>\nimport { Icon } from 'glyphfox/vue';\nimport 'glyphfox-universe/glyphfox';\n</script>\n${html}\n<template>\n  <Icon name="${name}"${attrs.vue(list)} />\n</template>`;
    case 'html':
      return `<script type="module">\n  import 'glyphfox/web';\n  import 'glyphfox-universe/glyphfox';\n</script>\n${html}\n<glyph-fox name="${name}"${attrs.web(list)}></glyph-fox>`;
    case 'cdn': {
      const o = transforms(opts, icon.stroke);
      for (const [k, v] of Object.entries({ size: 24, rotate: 0, flipX: false, flipY: false })) if (o[k] === v) delete o[k];
      return `<span id="icon"></span>\n${html}<script type="module">\n  import { toSvg } from 'https://cdn.jsdelivr.net/npm/glyphfox-universe@${U.VERSION}/+esm';\n  document.getElementById('icon').innerHTML = await toSvg('${name}', ${JSON.stringify(o)});\n</script>`;
    }
    case 'datauri':
      return U.svgToDataUri(svg);
    default:
      return `${html}${svg}`;
  }
}
