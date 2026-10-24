// glyphfox universe page: set filters, instant search and a virtual grid
// over every icon of the index. The catalog and the index load from
// jsDelivr (glyphfox-universe), icon sets load on demand per set
// (@iconify-json/<prefix> on jsDelivr), only for the cells on screen.

import { $, $$, copy, codeBlock, lang, siteRoot, t } from '../assets/js/app.js';
import * as U from './runtime.js';
import { createGallery } from './gallery.js';

const params = new URLSearchParams(location.search);
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
const fmt = (n) => Number(n).toLocaleString(lang);
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const kind = (k) => t(`icons.kind.${k}`);

const els = {
  grid: $('[data-grid]'),
  spacer: $('[data-spacer]'),
  layer: $('[data-layer]'),
  result: $('[data-result]'),
  note: $('[data-note]'),
  search: $('[data-search]'),
  setList: $('[data-set-list]'),
  setFilter: $('[data-set-filter]'),
  setsCount: $('[data-sets-count]'),
  preview: $('[data-preview]'),
  name: $('[data-name]'),
  meta: $('[data-meta]'),
  license: $('[data-license]'),
  form: $('[data-form]'),
  snippet: $('[data-snippet]'),
};

const state = {
  query: params.get('q') || '',
  set: params.get('set') || '',
  styles: new Set((params.get('style') || '').split(',').filter(Boolean)),
  licenses: new Set((params.get('license') || '').split(',').filter(Boolean)),
  ids: new Uint32Array(0),
  selected: null,
  format: 'svg',
  opts: { size: 24, weight: null, corners: '', color: '', rotate: 0, flipX: false, flipY: false },
};

let index = null;
let catalog = null;
let info = new Map();

// Set data on the page: parsed Iconify JSON per prefix, kept for the sets on screen.
const loaded = new Map();
const loading = new Map();
const MAX_SETS = 10;

async function dataUrl() {
  if (params.get('data')) return new URL(params.get('data'), location.href).href;
  if (LOCAL) {
    try {
      const local = new URL(`${siteRoot()}universe-data/`, location.origin).href;
      const r = await fetch(`${local}catalog.json`, { method: 'HEAD' });
      if (r.ok) return local;
    } catch {
      // no local data, use the CDN
    }
  }
  return null;
}

function ensureSet(prefix) {
  if (loaded.has(prefix) || loading.has(prefix)) return;
  const set = info.get(prefix);
  if (!set || set.cdn === false) return;
  const p = U.loadSet(prefix)
    .then((data) => {
      loaded.set(prefix, data);
      while (loaded.size > MAX_SETS) {
        const old = [...loaded.keys()].find((k) => !visiblePrefixes.has(k));
        if (!old) break;
        loaded.delete(old);
      }
      render(true);
    })
    .catch(() => loaded.set(prefix, null))
    .finally(() => loading.delete(prefix));
  loading.set(prefix, p);
}

function cellSvg(prefix, name, size = 28) {
  const data = loaded.get(prefix);
  if (!data) return null;
  const raw = U.iconData(data, name);
  if (!raw) return '';
  const b = U.bakeTransforms(raw);
  return `<svg viewBox="${b.left} ${b.top} ${b.width} ${b.height}" width="${size}" height="${size}" aria-hidden="true">${U.uniqueIds(b.body)}</svg>`;
}

// Virtual grid.
const GAP = 8;
const CELL = 72;
let cols = 1;
let pitch = CELL + GAP;
let visiblePrefixes = new Set();
let frame = 0;
let idle = 0;
const pool = [];

function layout() {
  const w = els.grid.clientWidth - 40;
  cols = Math.max(1, Math.floor((w + GAP) / pitch));
  const rows = Math.ceil(state.ids.length / cols);
  els.spacer.style.height = `${rows * pitch + 40}px`;
}

function render(fromLoad = false) {
  if (!index) return;
  const top = els.grid.scrollTop;
  const h = els.grid.clientHeight;
  const first = Math.max(0, Math.floor((top - 20) / pitch) - 2);
  const last = Math.min(Math.ceil(state.ids.length / cols), Math.ceil((top + h) / pitch) + 2);
  const start = first * cols;
  const end = Math.min(state.ids.length, last * cols);
  const count = end - start;
  while (pool.length < count) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'uv-cell';
    b.setAttribute('role', 'option');
    els.layer.appendChild(b);
    pool.push(b);
  }
  const width = els.grid.clientWidth - 40;
  const offset = 20 + Math.max(0, (width - (cols * pitch - GAP)) / 2);
  const prefixes = new Set();
  for (let k = 0; k < pool.length; k++) {
    const b = pool[k];
    if (k >= count) {
      if (!b.hidden) b.hidden = true;
      continue;
    }
    const pos = start + k;
    const id = state.ids[pos];
    const e = index.entry(id);
    prefixes.add(e.prefix);
    const row = Math.floor(pos / cols);
    const col = pos % cols;
    b.hidden = false;
    b.style.transform = `translate(${offset + col * pitch}px, ${20 + row * pitch}px)`;
    const key = `${e.prefix}:${e.name}`;
    if (b.dataset.key !== key || (fromLoad && b.dataset.empty)) {
      b.dataset.key = key;
      b.dataset.id = String(id);
      b.title = key;
      b.setAttribute('aria-label', key);
      const svg = cellSvg(e.prefix, e.name);
      if (svg === null) {
        b.innerHTML = '<span class="uv-skel"></span>';
        b.dataset.empty = '1';
      } else {
        b.innerHTML = svg;
        delete b.dataset.empty;
      }
    }
    b.setAttribute('aria-selected', String(state.selected === id));
  }
  visiblePrefixes = prefixes;
  clearTimeout(idle);
  idle = setTimeout(() => {
    for (const p of visiblePrefixes) ensureSet(p);
  }, fromLoad ? 0 : 90);
}

let fallback = 0;

// One render per frame; the timer covers pages that do not paint (background tabs).
function schedule() {
  if (frame) return;
  const run = () => {
    cancelAnimationFrame(frame);
    clearTimeout(fallback);
    frame = 0;
    render();
  };
  frame = requestAnimationFrame(run);
  fallback = setTimeout(run, 80);
}

// Filters and search.
let cdnSets = [];

function filters() {
  return {
    sets: state.set ? [state.set] : cdnSets,
    styles: [...state.styles].filter((s) => s !== 'brand'),
    brand: state.styles.has('brand') ? true : undefined,
    licenses: [...state.licenses],
  };
}

function syncUrl() {
  const q = new URLSearchParams();
  if (state.query) q.set('q', state.query);
  if (state.set) q.set('set', state.set);
  if (state.styles.size) q.set('style', [...state.styles].join(','));
  if (state.licenses.size) q.set('license', [...state.licenses].join(','));
  const s = q.toString();
  const hash = location.hash.startsWith('#set=') ? '' : location.hash;
  history.replaceState(null, '', `${s ? `?${s}` : location.pathname}${hash}`);
}

function update() {
  if (!index) return;
  const t0 = performance.now();
  state.ids = index.searchIds(state.query, filters());
  const ms = performance.now() - t0;
  const n = state.ids.length;
  const time = ms < 1 ? '<1' : String(Math.round(ms));
  if (state.query) els.result.textContent = t('universe.result.query', { n: fmt(n), q: state.query, ms: time });
  else els.result.textContent = state.set ? t('icons.result.set', { n: fmt(n), set: info.get(state.set)?.name || state.set }) : t('universe.result.all', { n: fmt(n) });
  els.grid.scrollTop = 0;
  for (const b of pool) delete b.dataset.key;
  layout();
  render();
  syncUrl();
  if (!state.selected && n) select(state.ids[0], false);
}

function counts() {
  const list = state.set ? [info.get(state.set)].filter(Boolean) : catalog.list;
  const styles = { outline: 0, solid: 0, duotone: 0, color: 0, brand: 0 };
  const kinds = { 'public-domain': 0, permissive: 0, attribution: 0, 'share-alike': 0 };
  for (const s of list) {
    for (const k of ['outline', 'solid', 'duotone', 'color']) styles[k] += s.styles[k];
    styles.brand += s.brand;
    kinds[s.license.kind] += s.total;
  }
  for (const [k, v] of Object.entries(styles)) $(`[data-count-style="${k}"]`).textContent = fmt(v);
  for (const [k, v] of Object.entries(kinds)) $(`[data-count-kind="${k}"]`).textContent = fmt(v);
}

function renderSets() {
  const f = els.setFilter.value.trim().toLowerCase();
  const items = [`<li><button type="button" data-set="" aria-pressed="${!state.set}"><span>${esc(t('icons.scope.all'))}</span><small>${fmt(catalog.total)}</small></button></li>`];
  for (const s of catalog.list) {
    if (s.cdn === false) continue;
    if (f && !s.name.toLowerCase().includes(f) && !s.prefix.includes(f)) continue;
    items.push(`<li><button type="button" data-set="${esc(s.prefix)}" aria-pressed="${state.set === s.prefix}" title="${esc(`${s.name} (${s.prefix}), ${s.license.title}`)}"><span>${esc(s.name)}<em>${esc(s.license.spdx)}</em></span><small>${fmt(s.total)}</small></button></li>`);
  }
  els.setList.innerHTML = items.join('');
}

// Detail panel.
const fullName = (e) => `${e.prefix}:${e.name}`;

async function select(id, focus = true) {
  state.selected = id;
  for (const b of pool) b.setAttribute('aria-selected', String(b.dataset.id === String(id)));
  const e = index.entry(id);
  const set = info.get(e.prefix);
  els.name.textContent = fullName(e);
  const tags = [...index.categoriesOf(e.prefix, e.index), ...index.tagsOf(e.prefix, e.index)].slice(0, 10);
  const aliases = index.aliasesOf(e.prefix, e.index);
  const author = set.author.url ? `<a href="${esc(set.author.url)}">${esc(set.author.name)}</a>` : esc(set.author.name);
  const style = [t(`icons.style.${['outline', 'solid', 'duotone', 'color'].includes(e.style) ? e.style : 'outline'}`), e.brand ? t('universe.style.brand') : '', e.stroke ? t('icons.meta.stroke') : ''].filter(Boolean).join(', ');
  els.meta.innerHTML = `${t('icons.meta.by', { set: esc(set.name), author })}. ${esc(style)}${tags.length ? `. ${esc(t('universe.meta.tags', { list: tags.join(', ') }))}` : ''}${aliases.length ? `. ${esc(t('icons.meta.aliases', { list: aliases.slice(0, 6).join(', ') }))}` : ''}`;
  const lic = set.license;
  const attribution = lic.attribution ? U.attributionLine(set) : '';
  els.license.innerHTML = `<div class="uv-badges"><a class="uv-badge" href="${esc(lic.url || '#sets')}">${esc(lic.title)}</a><span class="uv-badge">${esc(kind(lic.kind))}</span>${lic.attribution ? `<span class="uv-badge warn">${esc(t('icons.license.attribution'))}</span>` : ''}${e.brand ? `<span class="uv-badge warn">${esc(t('icons.license.trademark'))}</span>` : ''}</div>${
    attribution ? `<div class="uv-attrib"><p lang="en">${esc(attribution)}</p><button class="btn small" type="button" data-copy-attrib>${esc(t('icons.license.copy'))}</button></div>` : ''
  }${e.brand ? `<p class="faint">${esc(t('universe.trademarks.text'))}</p>` : ''}`;
  const btn = $('[data-copy-attrib]', els.license);
  if (btn) btn.addEventListener('click', () => copy(attribution, t('icons.license.copied')));
  $('[data-weight-field]').classList.toggle('off', !e.stroke);
  $('[data-weight-field] input').disabled = !e.stroke;
  $('[data-corners-field]').classList.toggle('off', !e.stroke);
  for (const b of $$('[data-seg="corners"] button')) b.disabled = !e.stroke;
  els.preview.innerHTML = '<span class="uv-skel"></span>';
  try {
    const icon = await U.getIcon(fullName(e));
    if (state.selected !== id) return;
    state.icon = icon;
    paint();
  } catch (err) {
    els.preview.textContent = t('icons.set.local');
    els.snippet.innerHTML = '';
  }
  if (focus) els.name.scrollIntoView({ block: 'nearest' });
}

function svgOptions(extra = {}) {
  const o = state.opts;
  return {
    size: o.size,
    color: o.color || undefined,
    weight: o.weight ?? undefined,
    corners: o.corners || undefined,
    rotate: o.rotate,
    flipX: o.flipX,
    flipY: o.flipY,
    ...extra,
  };
}

function props(kind) {
  const o = state.opts;
  const out = [];
  if (o.size !== 24) out.push(['size', o.size, true]);
  if (o.color) out.push(['color', o.color, false]);
  if (o.weight != null && state.icon && state.icon.stroke) out.push(['weight', o.weight, true]);
  if (o.corners && state.icon && state.icon.stroke) out.push(['corners', o.corners, false]);
  if (o.rotate) out.push(['rotate', o.rotate, true]);
  if (o.flipX) out.push(['flipX', true, true]);
  if (o.flipY) out.push(['flipY', true, true]);
  if (kind === 'react') return out.map(([k, v, num]) => (v === true ? ` ${k}` : num ? ` ${k}={${v}}` : ` ${k}="${v}"`)).join('');
  if (kind === 'vue') return out.map(([k, v, num]) => (v === true ? ` ${k.replace('flipX', 'flip-x').replace('flipY', 'flip-y')}` : num ? ` :${k}="${v}"` : ` ${k}="${v}"`)).join('');
  return out.map(([k, v]) => (v === true ? ` ${k === 'flipX' ? 'flip="x"' : 'flip="y"'}` : ` ${k}="${v}"`)).join('');
}

function snippet() {
  const icon = state.icon;
  const name = icon.name;
  const version = U.VERSION;
  const attribution = icon.license && icon.license.attribution ? `\n// ${U.attributionLine(info.get(icon.prefix))}` : '';
  const html = attribution ? `\n<!-- ${U.attributionLine(info.get(icon.prefix))} -->` : '';
  switch (state.format) {
    case 'react':
      return [`import { Icon } from 'glyphfox/react';\nimport 'glyphfox-universe/glyphfox';${attribution}\n\nexport function Example() {\n  return <Icon name="${name}"${props('react')} />;\n}`, 'js', 'React'];
    case 'vue':
      return [`<script setup>\nimport { Icon } from 'glyphfox/vue';\nimport 'glyphfox-universe/glyphfox';\n</script>\n${html ? html.trim() + '\n' : ''}\n<template>\n  <Icon name="${name}"${props('vue')} />\n</template>`, 'js', 'Vue'];
    case 'web':
      return [`<script type="module">\n  import 'glyphfox/web';\n  import 'glyphfox-universe/glyphfox';\n</script>${html}\n\n<glyph-fox name="${name}"${props('web')}></glyph-fox>`, 'js', t('universe.format.web')];
    case 'cdn':
      return [`<span id="icon"></span>${html}\n<script type="module">\n  import { toSvg } from 'https://cdn.jsdelivr.net/npm/glyphfox-universe@${version}/+esm';\n  document.getElementById('icon').innerHTML = await toSvg('${name}', ${JSON.stringify(svgOptions())});\n</script>`, 'js', 'CDN'];
    default:
      return [`${html ? html.trim() + '\n' : ''}${U.iconToSvg(icon, svgOptions())}`, 'js', 'SVG'];
  }
}

function paint() {
  const icon = state.icon;
  if (!icon) return;
  els.preview.innerHTML = U.iconToSvg(icon, svgOptions({ size: Math.max(96, state.opts.size * 2) }));
  const [code, lang, label] = snippet();
  els.snippet.innerHTML = '';
  els.snippet.appendChild(codeBlock(code, lang, label));
}

function setupDetail() {
  els.form.addEventListener('input', (ev) => {
    const el = ev.target;
    if (el.name === 'size') state.opts.size = Number(el.value);
    if (el.name === 'weight') state.opts.weight = Number(el.value);
    if (el.name === 'rotate') state.opts.rotate = Number(el.value);
    if (el.name === 'color') state.opts.color = el.value;
    for (const k of ['size', 'weight', 'rotate']) {
      const out = $(`[data-o="${k}"]`);
      if (out) out.textContent = k === 'weight' && state.opts.weight == null ? t('universe.native') : String(state.opts[k]);
    }
    paint();
  });
  for (const b of $$('[data-seg="corners"] button')) {
    b.addEventListener('click', () => {
      state.opts.corners = b.value;
      for (const x of $$('[data-seg="corners"] button')) x.setAttribute('aria-pressed', String(x === b));
      paint();
    });
  }
  for (const b of $$('[data-toggle]')) {
    b.addEventListener('click', () => {
      const k = b.dataset.toggle;
      state.opts[k] = !state.opts[k];
      b.setAttribute('aria-pressed', String(state.opts[k]));
      paint();
    });
  }
  for (const b of $$('[data-preview-bg] button')) {
    b.addEventListener('click', () => {
      $('.uv-preview').dataset.bg = b.value;
      for (const x of $$('[data-preview-bg] button')) x.setAttribute('aria-pressed', String(x === b));
    });
  }
  for (const b of $$('[data-formats] button')) {
    b.addEventListener('click', () => {
      state.format = b.value;
      for (const x of $$('[data-formats] button')) x.setAttribute('aria-selected', String(x === b));
      paint();
    });
  }
}

function setupControls() {
  let timer = 0;
  els.search.value = state.query;
  els.search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.query = els.search.value.trim();
      update();
    }, 60);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== els.search && !/input|textarea|select/i.test(document.activeElement.tagName)) {
      e.preventDefault();
      els.search.focus();
    }
  });
  for (const b of $$('[data-styles] button')) {
    b.setAttribute('aria-pressed', String(state.styles.has(b.value)));
    b.addEventListener('click', () => {
      if (state.styles.has(b.value)) state.styles.delete(b.value);
      else state.styles.add(b.value);
      b.setAttribute('aria-pressed', String(state.styles.has(b.value)));
      update();
    });
  }
  for (const b of $$('[data-licenses] button')) {
    b.setAttribute('aria-pressed', String(state.licenses.has(b.value)));
    b.addEventListener('click', () => {
      if (state.licenses.has(b.value)) state.licenses.delete(b.value);
      else state.licenses.add(b.value);
      b.setAttribute('aria-pressed', String(state.licenses.has(b.value)));
      update();
    });
  }
  els.setFilter.addEventListener('input', renderSets);
  els.setList.addEventListener('click', (e) => {
    const b = e.target.closest('[data-set]');
    if (!b) return;
    state.set = b.dataset.set;
    renderSets();
    counts();
    update();
  });
  els.layer.addEventListener('click', (e) => {
    const b = e.target.closest('.uv-cell');
    if (b) select(Number(b.dataset.id), false);
  });
  els.grid.addEventListener('scroll', schedule, { passive: true });
  els.grid.addEventListener('keydown', (e) => {
    if (!state.ids.length) return;
    const pos = Math.max(0, state.ids.indexOf(state.selected));
    const moves = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
    if (!(e.key in moves)) return;
    e.preventDefault();
    const next = Math.min(state.ids.length - 1, Math.max(0, pos + moves[e.key]));
    select(state.ids[next], false);
    const row = Math.floor(next / cols);
    const y = 20 + row * pitch;
    if (y < els.grid.scrollTop || y + pitch > els.grid.scrollTop + els.grid.clientHeight) els.grid.scrollTop = y - els.grid.clientHeight / 2;
    render();
  });
  new ResizeObserver(() => {
    layout();
    render();
  }).observe(els.grid);
}

// Views: the icon browser (#browse, #set=prefix) and the sets gallery
// (#gallery, #compare=a,b). Routes live in the hash: no page per set.
let gallery = null;

function setView(view) {
  els.app.hidden = view !== 'browse';
  for (const a of $$('[data-view-link]')) a.setAttribute('aria-current', String(a.dataset.viewLink === view));
}

function toViews(smooth) {
  const nav = $('.uv-views');
  const y = window.scrollY + nav.getBoundingClientRect().top - nav.offsetHeight - 13;
  if (Math.abs(window.scrollY - y) > 4) window.scrollTo({ top: Math.max(0, y), behavior: smooth ? 'smooth' : 'auto' });
}

async function ensureIndex() {
  if (!index) {
    els.result.textContent = t('universe.app.loading');
    index = await U.loadIndex();
  }
  update();
}

async function route(scroll = true) {
  const h = decodeURIComponent(location.hash.slice(1));
  if (h === 'gallery' || h === 'compare' || h.startsWith('compare=')) {
    setView(h === 'gallery' ? 'gallery' : 'compare');
    if (!gallery) gallery = createGallery({ catalog, onOpen: (p) => (location.hash = `#set=${p}`) });
    await gallery.show(h === 'gallery' ? null : h.slice(8).split(',').filter(Boolean));
    if (scroll) toViews(false);
    return;
  }
  setView('browse');
  if (gallery) gallery.hide();
  if (h.startsWith('set=') && info.has(h.slice(4))) {
    state.set = h.slice(4);
    renderSets();
    counts();
  }
  await ensureIndex();
  if (scroll && (h.startsWith('set=') || h === 'browse')) toViews(false);
}

async function start() {
  setupControls();
  setupDetail();
  els.app = $('.uv-app');
  const url = await dataUrl();
  U.configure(url ? { dataUrl: url, maxSets: 12 } : { maxSets: 12 });
  try {
    catalog = await U.loadCatalog();
    info = new Map(catalog.list.map((s) => [s.prefix, s]));
    cdnSets = catalog.list.filter((s) => s.cdn !== false).map((s) => s.prefix);
    els.setsCount.textContent = fmt(catalog.list.filter((s) => s.cdn !== false).length);
    renderSets();
    counts();
    window.addEventListener('hashchange', () => route(true));
    await route(Boolean(location.hash && location.hash !== '#sets'));
  } catch (err) {
    console.error(err);
    els.result.textContent = t('universe.app.error');
    els.note.hidden = false;
    els.note.textContent = t('universe.app.errorNote');
  }
}

start();
