// Icon browser: the set picker (glyphfox with its display and isometric
// collections first, then every open license set of glyphfox universe),
// search in the chosen set or in every set, categories, sketch search, live
// axes, inspector with copy in every format and downloads (SVG, PNG,
// animated SVG, GIF, WebM). The universe sets live in sets.js, loaded the
// first time a set is opened.

import { $, $$, FORMAT_LABELS, category, codeBlock, copy, download, gf, lang, loadIcons, siteRoot, svg, t, toast } from './app.js';
import { animatedSvg, animationGif, animationWebm, bakeColor, svgToPng } from './exporters.js';
import { rank, sketchPad } from './sketch.js';

const DEFAULT_PROPS = { weight: 2, size: 24, corners: 'round', variant: 'outline', rotate: 0, flipX: false, flipY: false };
const COLLECTIONS = ['display', 'isometric'];
const state = {
  q: '',
  cat: '',
  set: '',
  scope: 'set',
  sketch: null,
  selected: '',
  kind: 'gf',
  icon: null,
  props: { ...DEFAULT_PROPS },
  colors: { color: null, secondaryColor: null, secondaryOpacity: null },
  extras: { modifier: '', modifierCorner: 'bottom-right', animate: '', trigger: 'mount', morphTo: '' },
  format: 'svg',
  bg: 'dark',
};
let data = null;
let version = '1';
// Display and isometric icons, registered with the engine as display-NAME and isometric-NAME.
const colls = new Map();
const fmt = (n) => Number(n).toLocaleString(lang);

// The universe sets (sets.js) and their grid, loaded on demand.
let sets = null;
let setGrid = null;
let setsPromise = null;
function loadSets() {
  if (!setsPromise) {
    setsPromise = import('./sets.js').then(async (m) => {
      await m.loadCatalog();
      sets = m;
      setGrid = m.createGrid($('[data-sgrid]'), $('[data-slayer]'), (key, pos) => select(key, { pos }));
      return m;
    });
    setsPromise.catch(() => {
      setsPromise = null;
    });
  }
  return setsPromise;
}

function loadCollections() {
  return fetch(new URL(`${siteRoot()}data/collections.json`, location.origin))
    .then((r) => r.json())
    .then((d) => {
      for (const id of COLLECTIONS) {
        const c = d[id];
        if (!c) continue;
        for (const [name, body, tags, categories] of c.icons) {
          const icon = gf.normalizeIcon({ body, viewBox: `0 0 ${c.grid} ${c.grid}`, tags, categories }, `${id}-${name}`);
          if (!icon) continue;
          gf.registerIcons([icon]);
          colls.set(icon.name, { ...icon, label: `${id}/${name}`, coll: id, scale: 24 / c.grid });
        }
      }
    })
    .catch(() => {});
}

const kindOf = (name) => (!name ? '' : data.byName.has(name) ? 'gf' : colls.has(name) ? 'coll' : sets && name.includes(':') && sets.isSet(name.slice(0, name.indexOf(':'))) ? 'set' : '');
const ours = () => [...data.icons, ...colls.values()];
const collOf = (cat) => (cat.startsWith('coll:') ? cat.slice(5) : '');
const inUniverse = () => Boolean(state.set) || (state.scope === 'all' && Boolean(state.q.trim()) && !state.sketch);

/** Display and isometric icons keep their own line weight: 2 on the 48 grid is 1 on the 24 grid. */
const scaled = (name, props) => {
  const c = colls.get(name);
  return c && c.scale !== 1 && props.weight !== undefined ? { ...props, weight: props.weight * c.scale } : props;
};

// glyphfox: its own icons and collections.

function visible() {
  let list = data.icons;
  const coll = collOf(state.cat);
  if (coll) list = [...colls.values()].filter((i) => i.coll === coll);
  if (state.sketch) {
    const order = new Map(state.sketch.map((n, i) => [n, i]));
    list = data.icons.filter((i) => order.has(i.name)).sort((a, b) => order.get(a.name) - order.get(b.name));
  } else if (state.q.trim()) {
    // Same ranking as the package and the CLI, synonyms in five languages included.
    list = gf.searchIcons(coll ? list : ours(), state.q, { limit: Infinity, lang });
  }
  if (state.cat && !coll && !state.sketch) list = list.filter((i) => i.categories.includes(state.cat));
  return list;
}

function gridProps() {
  const p = state.props;
  return {
    size: 32,
    weight: p.weight,
    corners: p.corners,
    variant: p.variant,
    rotate: p.rotate,
    flipX: p.flipX,
    flipY: p.flipY,
    color: state.colors.color || undefined,
    secondaryColor: state.colors.secondaryColor || undefined,
    secondaryOpacity: state.colors.secondaryOpacity ?? undefined,
  };
}

/** Options of a set icon in the grid or the inspector. */
function setOpts(extra = {}) {
  const p = { ...state.props, ...extra };
  return { ...p, color: state.colors.color, secondaryColor: state.colors.secondaryColor, secondaryOpacity: state.colors.secondaryOpacity, animate: extra.animate ?? state.extras.animate };
}

const label = (i) => i.label || i.name;

function renderGrid() {
  if (inUniverse()) {
    showSetGrid();
    return [];
  }
  showToken++;
  $('[data-sgrid]').hidden = true;
  const grid = $('[data-grid]');
  grid.hidden = false;
  const list = visible();
  const gp = gridProps();
  grid.innerHTML = list
    .map(
      (i) =>
        `<button class="icon-cell" type="button" role="option" id="ic-${i.name}" data-name="${i.name}"${i.scale && i.scale !== 1 ? ` data-scale="${i.scale}"` : ''} aria-selected="${i.name === state.selected}" title="${label(i)}"><span class="ic">${svg(i.name, scaled(i.name, gp))}</span><span>${label(i)}</span></button>`,
    )
    .join('');
  $('[data-empty]').hidden = list.length > 0;
  // The grid keeps its height while the data loads, not when nothing matches.
  grid.style.minHeight = list.length ? '' : '0';
  const line = $('[data-result]');
  if (state.sketch) line.textContent = t('icons.result.sketch', { n: list.length });
  else if (state.q || state.cat) line.textContent = t('icons.result.count', { n: list.length });
  else line.textContent = '';
  return list;
}

function updateGridWeight() {
  const w = state.props.weight;
  for (const s of $$('[data-grid] .ic svg')) {
    const cell = s.closest('[data-scale]');
    s.setAttribute('stroke-width', String(cell ? w * Number(cell.dataset.scale) : w));
  }
}

// Universe: one set, or a search in every set (glyphfox first).

let setIds = new Uint32Array(0);
let gfHits = [];
let showToken = 0;
let pendingHash = '';

async function showSetGrid() {
  $('[data-grid]').hidden = true;
  $('[data-empty]').hidden = true;
  $('[data-sgrid]').hidden = false;
  const line = $('[data-result]');
  if (!sets) line.textContent = t('icons.result.loading');
  const token = ++showToken;
  try {
    const m = await loadSets();
    await m.loadIndex();
  } catch {
    if (token === showToken) line.textContent = t('icons.result.error');
    return;
  }
  if (token !== showToken) return;
  const q = state.q.trim();
  // All sets: the search runs in glyphfox and in every universe set, whatever set is open.
  const every = state.scope === 'all' && Boolean(q);
  const t0 = performance.now();
  setIds = sets.searchIds(q, every ? {} : { prefix: state.set, cat: state.cat });
  gfHits = every ? gf.searchIcons(ours(), q, { limit: Infinity, lang }) : [];
  const ms = Math.round(performance.now() - t0);
  const n = setIds.length + gfHits.length;
  const set = !every && state.set ? sets.setInfo(state.set) : null;
  const time = ms < 1 ? '<1' : String(ms);
  if (q) line.textContent = set ? t('icons.result.inSet', { n: fmt(n), set: set.name, ms: time }) : t('icons.result.inAll', { n: fmt(n), ms: time });
  else line.textContent = t('icons.result.set', { n: fmt(n), set: set ? set.name : 'glyphfox' });
  $('[data-empty]').hidden = n > 0;
  const gp = gridProps();
  const opts = setOpts({ size: 32, animate: '' });
  const keyAt = (k) => {
    if (k < gfHits.length) return gfHits[k].name;
    const e = sets.entry(setIds[k - gfHits.length]);
    return `${e.prefix}:${e.name}`;
  };
  setGrid.show({
    count: n,
    at: (k) => {
      if (k < gfHits.length) {
        const i = gfHits[k];
        return { key: i.name, label: label(i), title: `glyphfox: ${label(i)}`, svg: svg(i.name, scaled(i.name, gp)) };
      }
      const e = sets.entry(setIds[k - gfHits.length]);
      const key = `${e.prefix}:${e.name}`;
      return { key, prefix: e.prefix, label: e.name, title: key, svg: sets.cellSvg(e.prefix, e.name, opts) };
    },
  });
  setGrid.select(state.selected);
  if (pendingHash && kindOf(pendingHash)) {
    const h = pendingHash;
    pendingHash = '';
    select(h);
  } else if (n && (q || !state.selected.startsWith(`${state.set}:`))) select(keyAt(0), { pos: 0 });
}

function refreshGrids() {
  if (inUniverse()) {
    if (setGrid && !$('[data-sgrid]').hidden) showSetGridCells();
  } else renderGrid();
}

/** New transforms for the cells of the set grid, without a new search. */
function showSetGridCells() {
  if (!sets || !setGrid) return;
  const gp = gridProps();
  const opts = setOpts({ size: 32, animate: '' });
  const n = setIds.length + gfHits.length;
  setGrid.show({
    count: n,
    at: (k) => {
      if (k < gfHits.length) {
        const i = gfHits[k];
        return { key: i.name, label: label(i), title: `glyphfox: ${label(i)}`, svg: svg(i.name, scaled(i.name, gp)) };
      }
      const e = sets.entry(setIds[k - gfHits.length]);
      return { key: `${e.prefix}:${e.name}`, prefix: e.prefix, label: e.name, title: `${e.prefix}:${e.name}`, svg: sets.cellSvg(e.prefix, e.name, opts) };
    },
    keep: true,
  });
  setGrid.select(state.selected);
}

// Sidebar: the set picker and the categories.

const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function renderCats() {
  const list = $('[data-cats]');
  if (state.set) {
    const cats = sets ? sets.categories(state.set) : [];
    const total = sets ? sets.setInfo(state.set).total : 0;
    list.innerHTML = [`<li><button type="button" data-cat="" aria-pressed="${!state.cat}">${t('icons.all')}<small>${fmt(total)}</small></button></li>`]
      .concat(cats.map(([name, n]) => `<li><button type="button" data-cat="${escAttr(name)}" aria-pressed="${state.cat === name}" lang="en">${escAttr(name)}<small>${fmt(n)}</small></button></li>`))
      .join('');
    return;
  }
  const counts = new Map();
  for (const i of data.icons) for (const c of i.categories) counts.set(c, (counts.get(c) || 0) + 1);
  const cats = [...counts.keys()].sort((a, b) => category(a).localeCompare(category(b), document.documentElement.lang));
  const collCounts = COLLECTIONS.map((id) => [id, [...colls.values()].filter((i) => i.coll === id).length]).filter(([, n]) => n);
  list.innerHTML = [`<li><button type="button" data-cat="" aria-pressed="${!state.cat}">${t('icons.all')}<small>${data.icons.length}</small></button></li>`]
    .concat(cats.map((c) => `<li><button type="button" data-cat="${c}" aria-pressed="${state.cat === c}">${category(c)}<small>${counts.get(c)}</small></button></li>`))
    .concat(collCounts.length ? [`<li class="cats-sep">${t('icons.coll.title')}</li>`] : [])
    .concat(collCounts.map(([id, n]) => `<li><button type="button" data-cat="coll:${id}" aria-pressed="${state.cat === `coll:${id}`}">${t(`icons.coll.${id}`)}<small>${n}</small></button></li>`))
    .join('');
}

function ourStrip() {
  return ['home', 'search', 'heart', 'user', 'settings', 'bell']
    .filter((n) => data.byName.has(n))
    .map((n) => `<span class="set-strip-ic">${svg(n, { size: 16 })}</span>`)
    .join('');
}

const ourCount = () => data.icons.length + colls.size;

function renderSetHeader() {
  const set = state.set && sets ? sets.setInfo(state.set) : null;
  $('[data-set-name]').textContent = set ? set.name : 'glyphfox';
  $('[data-set-meta]').textContent = set ? t('icons.set.meta', { n: fmt(set.total), license: set.license.title }) : t('icons.set.ours');
  $('[data-set-more]').hidden = Boolean(set);
  $('[data-total]').textContent = fmt(set ? set.total : ourCount());
  $('[data-sketch-toggle]').hidden = Boolean(set);
  for (const b of $$('[data-scope] button')) b.setAttribute('aria-pressed', String(b.value === state.scope));
}

function wirePicker() {
  const toggle = $('[data-set-toggle]');
  const panel = $('[data-set-panel]');
  const list = $('[data-set-list]');
  const filter = $('[data-set-filter]');
  let timer = 0;
  const fill = () => {
    if (!sets) {
      list.innerHTML = `<p class="set-none">${t('icons.result.loading')}</p>`;
      return;
    }
    list.innerHTML = sets.pickerHtml({ ours: { count: ourCount(), strip: ourStrip() }, filter: filter.value, current: state.set });
    sets.paintStrips(list);
  };
  const open = async (on) => {
    panel.hidden = !on;
    toggle.setAttribute('aria-expanded', String(on));
    $('[data-set-more]').hidden = on || Boolean(state.set);
    if (!on) return;
    fill();
    filter.focus();
    try {
      await loadSets();
      if (!panel.hidden) fill();
    } catch {
      list.innerHTML = `<p class="set-none">${t('icons.result.error')}</p>`;
    }
  };
  toggle.addEventListener('click', () => open(panel.hidden));
  $('[data-set-more]').addEventListener('click', (e) => {
    e.preventDefault();
    open(true);
  });
  filter.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(fill, 80);
  });
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      open(false);
      toggle.focus();
    }
  });
  list.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pick]');
    if (!b || b.disabled) return;
    open(false);
    chooseSet(b.dataset.pick);
  });
}

async function chooseSet(prefix) {
  if (prefix) {
    try {
      await loadSets();
    } catch {
      toast(t('icons.result.error'));
      return;
    }
    if (!sets.isSet(prefix)) prefix = '';
  }
  state.set = prefix;
  state.cat = '';
  state.sketch = null;
  if (prefix) {
    // Sketch search covers the glyphfox icons only.
    $('#sketch').hidden = true;
    $('[data-sketch-toggle]').setAttribute('aria-expanded', 'false');
  }
  renderSetHeader();
  if (prefix) {
    $('[data-result]').textContent = t('icons.result.loading');
    try {
      await sets.loadIndex();
    } catch {
      $('[data-result]').textContent = t('icons.result.error');
      return;
    }
  }
  renderCats();
  const list = renderGrid();
  if (!prefix && list[0] && kindOf(state.selected) === 'set') select(list[0].name);
  syncUrl();
  if (scrollY > 200) window.scrollTo({ top: 0 });
}

// Inspector.

function spec() {
  const e = state.extras;
  if (!e.modifier || state.kind === 'set') return state.selected;
  const code = { 'bottom-right': '', 'bottom-left': '@bl', 'top-right': '@tr', 'top-left': '@tl' }[e.modifierCorner];
  return `${state.selected}+${e.modifier}${code}`;
}

function allProps(extra = {}) {
  const p = { ...state.props };
  const c = state.colors;
  if (c.color) p.color = c.color;
  if (c.secondaryColor) p.secondaryColor = c.secondaryColor;
  if (c.secondaryOpacity !== null) p.secondaryOpacity = c.secondaryOpacity;
  const e = state.extras;
  if (e.animate) {
    p.animate = e.animate;
    if (e.trigger !== 'mount') p.trigger = e.trigger;
  }
  if (e.morphTo && state.kind !== 'set' && validSpec(e.morphTo)) {
    p.morphTo = e.morphTo;
    if (e.trigger !== 'mount') p.trigger = e.trigger;
  }
  return { ...p, ...extra };
}

function validSpec(s) {
  try {
    gf.resolveSpec(s, gf.lookupIcon);
    return true;
  } catch {
    return false;
  }
}

function snippetProps() {
  const p = allProps();
  const out = {};
  for (const [k, v] of Object.entries(p)) if (DEFAULT_PROPS[k] === undefined || DEFAULT_PROPS[k] !== v) out[k] = v;
  return out;
}

/** SVG markup of the selected icon with the inspector settings (and `extra`). */
function markup(extra = {}) {
  if (state.kind === 'set') {
    if (!state.icon) return '';
    const animate = extra.animate ?? state.extras.animate;
    // The universe runtime draws spin, pulse and draw; the other motions go through the engine.
    if (animate && !sets.NATIVE_MOTION.includes(animate) && gf.lookupIcon(state.icon.name)) {
      const { morphTo: _m, ...p } = allProps(extra);
      return svg(state.icon.name, { ...p, variant: 'outline' });
    }
    return sets.iconSvg(state.icon, setOpts(extra));
  }
  return svg(spec(), scaled(state.selected, allProps(extra)));
}

function formatsFor(kind) {
  if (kind === 'set') return sets.SET_FORMATS;
  if (kind === 'coll') return ['svg', 'datauri'];
  return gf.FORMATS;
}

function renderFormats() {
  const tabs = $('[data-formats]');
  const list = formatsFor(state.kind);
  if (!list.includes(state.format)) state.format = 'svg';
  const key = list.join(',');
  if (tabs.dataset.list !== key) {
    tabs.dataset.list = key;
    tabs.innerHTML = list.map((f) => `<button type="button" role="tab" aria-selected="${f === state.format}" data-format="${f}">${FORMAT_LABELS[f]}</button>`).join('');
  } else for (const b of $$('button', tabs)) b.setAttribute('aria-selected', String(b.dataset.format === state.format));
}

function renderInspector() {
  if (!state.selected) return;
  const kind = state.kind;
  for (const el of $$('[data-kinds]')) el.hidden = !el.dataset.kinds.split(' ').includes(kind);
  renderFormats();
  const lic = $('[data-insp-license]');
  if (kind === 'set') {
    $('[data-insp-name]').textContent = state.selected;
    $('[data-insp-meta]').textContent = sets.metaText(state.selected);
    lic.innerHTML = sets.licenseHtml(state.selected);
    lic.hidden = false;
    const btn = $('[data-copy-attrib]', lic);
    if (btn) btn.addEventListener('click', () => copy(sets.attribution(state.selected), t('icons.license.copied')));
    if (!state.icon) return;
    $('[data-preview]').innerHTML = markup({ size: 150 });
    renderSnippet();
    return;
  }
  lic.hidden = true;
  lic.innerHTML = '';
  const icon = kind === 'coll' ? colls.get(state.selected) : data.byName.get(state.selected);
  const s = spec();
  $('[data-preview]').innerHTML = markup({ size: 150 });
  $('[data-insp-name]').textContent = kind === 'coll' ? s.replace(icon.name, icon.label) : s;
  const meta = `${icon.categories.map(category).join(', ')} / ${icon.tags.join(', ')}`;
  $('[data-insp-meta]').textContent = kind === 'coll' ? `${t(`icons.coll.${icon.coll}`)} / ${meta}. ${t('icons.coll.note')}` : meta;
  renderSnippet();
  if (kind === 'gf') {
    $('[data-open-editor]').href = `studio.html#editor=${encodeURIComponent(s)}`;
    $('[data-open-fusion]').href = `studio.html#fusion=${encodeURIComponent(state.selected)}`;
  }
}

function renderSnippet() {
  if (state.kind === 'set') {
    if (!state.icon) return;
    const code = sets.snippet(state.format, state.icon, setOpts(), markup());
    $('[data-snippet]').replaceChildren(codeBlock(code, state.format === 'datauri' ? 'sh' : 'js', state.format));
    return;
  }
  const s = spec();
  const props = snippetProps();
  const { modifier, modifierCorner, ...rest } = props;
  void modifier;
  void modifierCorner;
  const code = gf.snippet(state.format, s, rest, { svg: bakeColor(markup(), null), version });
  const lang = { svg: 'js', html: 'js', cdn: 'js', tailwind: 'js', datauri: 'sh' }[state.format] || 'js';
  $('[data-snippet]').replaceChildren(codeBlock(code, lang, state.format));
}

let selectToken = 0;

async function select(name, { scroll = false, pos } = {}) {
  const kind = kindOf(name);
  if (!kind) return;
  state.selected = name;
  state.kind = kind;
  for (const c of $$('.icon-cell[aria-selected="true"]')) c.setAttribute('aria-selected', 'false');
  if (setGrid) setGrid.select(name, pos);
  const cell = document.getElementById(`ic-${name}`);
  if (cell) {
    cell.setAttribute('aria-selected', 'true');
    if (scroll) cell.scrollIntoView({ block: 'nearest' });
    $('[data-grid]').setAttribute('aria-activedescendant', `ic-${name}`);
  }
  history.replaceState(null, '', `${location.pathname}${location.search}#${name}`);
  const token = ++selectToken;
  state.icon = null;
  if (kind === 'set') {
    $('[data-preview]').innerHTML = '<span class="set-skel"></span>';
    renderInspector();
    try {
      const icon = await sets.getIcon(name);
      if (token !== selectToken || !icon) return;
      state.icon = icon;
      // Registered with the engine for the motions the runtime does not draw.
      if (!gf.lookupIcon(icon.name)) {
        const n = gf.normalizeIcon({ body: icon.body, viewBox: icon.viewBox, mode: icon.stroke ? undefined : 'fill' }, icon.name);
        if (n) gf.registerIcons([n]);
      }
    } catch {
      if (token === selectToken) $('[data-preview]').textContent = t('icons.set.local');
      return;
    }
  }
  renderInspector();
}

function syncUrl() {
  const params = new URLSearchParams();
  if (state.set) params.set('set', state.set);
  if (state.q) params.set('q', state.q);
  if (state.cat) params.set('cat', state.cat);
  if (state.scope === 'all') params.set('scope', 'all');
  const qs = params.toString();
  history.replaceState(null, '', `${location.pathname}${qs ? '?' + qs : ''}${state.selected ? '#' + state.selected : ''}`);
}

let frame = 0;
function schedule(fn) {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(fn);
}

function wireForm() {
  const form = $('[data-form]');
  for (const input of $$('input[type=range]', form)) {
    const sync = (initial) => {
      const min = Number(input.min);
      const max = Number(input.max);
      input.style.setProperty('--p', `${((Number(input.value) - min) / (max - min)) * 100}%`);
      const o = $(`[data-o="${input.name}"]`, form);
      if (o) o.textContent = input.value;
      if (initial) return;
      const v = Number(input.value);
      if (input.name === 'secondaryOpacity') state.colors.secondaryOpacity = v;
      else state.props[input.name] = v;
      schedule(() => {
        if (input.name === 'weight' && !inUniverse()) updateGridWeight();
        else if (input.name !== 'size') refreshGrids();
        renderInspector();
      });
    };
    input.addEventListener('input', () => sync(false));
    sync(true);
  }
  for (const seg of $$('[data-seg]', form)) {
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      for (const x of $$('button', seg)) x.setAttribute('aria-pressed', String(x === b));
      state.props[seg.dataset.seg] = b.value;
      refreshGrids();
      renderInspector();
    });
  }
  for (const b of $$('[data-toggle]', form)) {
    b.addEventListener('click', () => {
      const k = b.dataset.toggle;
      state.props[k] = !state.props[k];
      b.setAttribute('aria-pressed', String(state.props[k]));
      refreshGrids();
      renderInspector();
    });
  }
  $('input[name=color]', form).addEventListener('input', (e) => {
    state.colors.color = e.target.value;
    schedule(() => {
      refreshGrids();
      renderInspector();
    });
  });
  const sec = $('input[name=secondaryColor]', form);
  const useSec = $('input[name=useSecondary]', form);
  const syncSec = () => {
    state.colors.secondaryColor = useSec.checked ? sec.value : null;
    schedule(() => {
      refreshGrids();
      renderInspector();
    });
  };
  sec.addEventListener('input', () => {
    useSec.checked = true;
    syncSec();
  });
  useSec.addEventListener('change', syncSec);
  $('[data-reset]', form).addEventListener('click', () => {
    state.props = { ...DEFAULT_PROPS };
    state.colors = { color: null, secondaryColor: null, secondaryOpacity: null };
    form.reset();
    for (const input of $$('input[type=range]', form)) input.dispatchEvent(new Event('input'));
    state.colors.secondaryOpacity = null;
    for (const seg of $$('[data-seg]', form)) for (const b of $$('button', seg)) b.setAttribute('aria-pressed', String(b.value === state.props[seg.dataset.seg]));
    for (const b of $$('[data-toggle]', form)) b.setAttribute('aria-pressed', 'false');
    refreshGrids();
    renderInspector();
  });
}

function wireExtras() {
  const mod = $('[data-extra="modifier"]');
  mod.insertAdjacentHTML('beforeend', gf.MODIFIER_NAMES.map((m) => `<option value="${m}">${m}</option>`).join(''));
  const anim = $('[data-extra="animate"]');
  anim.insertAdjacentHTML('beforeend', gf.ANIMATION_NAMES.map((m) => `<option value="${m}">${m}</option>`).join(''));
  $('[data-names]').innerHTML = data.icons.map((i) => `<option value="${i.name}"></option>`).join('');
  for (const el of $$('[data-extra]')) {
    el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => {
      state.extras[el.dataset.extra] = el.value;
      renderInspector();
    });
  }
  $('[data-replay]').addEventListener('click', () => {
    const host = $('[data-preview]');
    const props = allProps({ size: 150 });
    if (props.trigger === 'click' || props.trigger === 'state' || props.trigger === 'hover') props.trigger = 'mount';
    host.innerHTML = '';
    requestAnimationFrame(() => {
      host.innerHTML = state.kind === 'set' ? markup({ size: 150 }) : svg(spec(), scaled(state.selected, props));
    });
  });
}

function wireDownloads() {
  const name = () => spec().replace(/[^a-z0-9-]+/gi, '-');
  const fileColor = () => state.colors.color || '#000000';
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-dl]');
    if (!b) return;
    const kind = b.dataset.dl;
    const base = scaled(state.selected, allProps());
    try {
      if (kind === 'svg') {
        download(bakeColor(markup({ animate: '', morphTo: undefined }), state.colors.color), `${name()}.svg`, 'image/svg+xml');
      } else if (kind === 'png') {
        const size = Number($('[data-png-size]').value);
        const blob = await svgToPng(bakeColor(markup({ size, animate: '', morphTo: undefined }), fileColor()), size);
        download(blob, `${name()}-${size}.png`, 'image/png');
      } else {
        const icon = gf.resolveSpec(spec(), gf.lookupIcon, { weight: gf.strokeWidth(base) }).icon;
        const props = { ...base, animate: base.animate || 'draw', color: fileColor() === '#000000' ? '#f5f5f6' : fileColor() };
        delete props.morphTo;
        if (!base.animate) toast(t('icons.dl.drawHint'));
        if (kind === 'anim') download(animatedSvg(icon, { ...props, loop: true }), `${name()}-${props.animate}.svg`, 'image/svg+xml');
        else if (kind === 'gif') download(await animationGif(icon, props, { size: 256 }), `${name()}-${props.animate}.gif`, 'image/gif');
        else if (kind === 'webm') download(await animationWebm(icon, props, { size: 512 }), `${name()}-${props.animate}.webm`, 'video/webm');
      }
      toast(t('toast.downloaded'));
    } catch (err) {
      toast(err.message);
    }
  });
}

function wireFormats() {
  const tabs = $('[data-formats]');
  renderFormats();
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.format = b.dataset.format;
    for (const x of $$('button', tabs)) x.setAttribute('aria-selected', String(x === b));
    renderSnippet();
  });
}

function wireBackground() {
  const host = $('.insp-preview');
  $('.bg-switch').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.bg = b.value;
    host.dataset.bg = b.value;
    for (const x of $$('.bg-switch button')) x.setAttribute('aria-pressed', String(x === b));
  });
}

function wireSketch() {
  const panel = $('#sketch');
  const toggle = $('[data-sketch-toggle]');
  let pad = null;
  const open = (on) => {
    panel.hidden = !on;
    toggle.setAttribute('aria-expanded', String(on));
    if (on && !pad) {
      pad = sketchPad($('[data-sketch]'), (strokes) => {
        schedule(() => {
          const ranked = rank(strokes, data.icons, 48);
          state.sketch = ranked.length ? ranked.map((r) => r.icon.name) : null;
          renderGrid();
          if (state.sketch && state.sketch[0]) select(state.sketch[0]);
        });
      });
    }
    if (!on) {
      state.sketch = null;
      if (pad) pad.clear();
      renderGrid();
    }
  };
  toggle.addEventListener('click', () => open(panel.hidden));
  $('[data-sketch-clear]').addEventListener('click', () => pad && pad.clear());
  $('[data-sketch-undo]').addEventListener('click', () => pad && pad.undo());
  if (location.hash === '#sketch') open(true);
}

function wireGrid() {
  const grid = $('[data-grid]');
  grid.addEventListener('click', (e) => {
    const cell = e.target.closest('.icon-cell');
    if (cell) select(cell.dataset.name);
  });
  grid.addEventListener('dblclick', (e) => {
    const cell = e.target.closest('.icon-cell');
    if (cell) copy(svg(cell.dataset.name, scaled(cell.dataset.name, gridProps())));
  });
  $('[data-sgrid]').addEventListener('dblclick', (e) => {
    if (e.target.closest('.set-cell')) copy(markup());
  });
  grid.addEventListener('keydown', (e) => {
    const cells = $$('.icon-cell', grid);
    if (!cells.length) return;
    const i = Math.max(0, cells.findIndex((c) => c.dataset.name === state.selected));
    const cols = Math.max(1, Math.round(grid.clientWidth / cells[0].offsetWidth));
    let j = i;
    if (e.key === 'ArrowRight') j = i + 1;
    else if (e.key === 'ArrowLeft') j = i - 1;
    else if (e.key === 'ArrowDown') j = i + cols;
    else if (e.key === 'ArrowUp') j = i - cols;
    else if (e.key === 'Enter') {
      copy(markup());
      return;
    } else return;
    e.preventDefault();
    j = Math.max(0, Math.min(cells.length - 1, j));
    select(cells[j].dataset.name, { scroll: true });
    cells[j].focus();
  });
  $('[data-cats]').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.cat = b.dataset.cat;
    for (const x of $$('[data-cats] button')) x.setAttribute('aria-pressed', String(x === b));
    const list = renderGrid();
    if (collOf(state.cat) && list[0]) select(list[0].name);
    syncUrl();
  });
  const search = $('[data-search]');
  let timer = 0;
  search.addEventListener('input', () => {
    state.q = search.value;
    state.sketch = null;
    const run = () => {
      const list = renderGrid();
      if (list.length && state.q) select(list[0].name);
      syncUrl();
    };
    clearTimeout(timer);
    // A search in a universe set (or in every set) waits for a pause in the typing.
    if (inUniverse()) timer = setTimeout(run, 120);
    else schedule(run);
  });
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      search.value = '';
      search.dispatchEvent(new Event('input'));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const first = inUniverse() ? $('[data-sgrid]') : $('.icon-cell', grid);
      if (first) first.focus();
    }
  });
  $('[data-scope]').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.value === state.scope) return;
    state.scope = b.value;
    renderSetHeader();
    const list = renderGrid();
    if (list.length && state.q) select(list[0].name);
    syncUrl();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== search && !/input|textarea|select/i.test(document.activeElement.tagName)) {
      e.preventDefault();
      search.focus();
    }
  });
}

Promise.all([loadIcons(), loadCollections()]).then(async ([d]) => {
  data = d;
  version = d.version === '0.0.0' ? '1' : d.version;
  const params = new URLSearchParams(location.search);
  state.q = params.get('q') || '';
  state.cat = params.get('cat') || '';
  state.scope = params.get('scope') === 'all' ? 'all' : 'set';
  const wanted = params.get('set') && params.get('set') !== 'glyphfox' ? params.get('set') : '';
  $('[data-search]').value = state.q;
  const fromHash = decodeURIComponent(location.hash.slice(1));
  if (wanted || (state.scope === 'all' && state.q)) {
    // The sets load first, so the glyphfox grid is not drawn in between.
    $('[data-grid]').hidden = true;
    $('[data-result]').textContent = t('icons.result.loading');
    try {
      await loadSets();
      if (sets.isSet(wanted)) state.set = wanted;
      if (state.set) {
        await sets.loadIndex();
        if (!sets.categories(state.set).some(([n]) => n === state.cat)) state.cat = '';
      }
    } catch {
      state.set = '';
      state.scope = 'set';
      $('[data-grid]').hidden = false;
      toast(t('icons.result.error'));
    }
  }
  if (!state.set && collOf(state.cat) && !COLLECTIONS.includes(collOf(state.cat))) state.cat = '';
  renderSetHeader();
  renderCats();
  wireForm();
  wireExtras();
  wireFormats();
  wireBackground();
  wireDownloads();
  wireSketch();
  wireGrid();
  wirePicker();
  if (inUniverse()) {
    pendingHash = fromHash;
    renderGrid();
    return;
  }
  const list = renderGrid();
  state.selected = kindOf(fromHash) && !fromHash.includes(':') ? fromHash : list[0] ? list[0].name : d.icons[0].name;
  select(state.selected, { scroll: true });
});
