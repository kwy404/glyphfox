// Icon browser: search, categories, sketch search, live axes, inspector with
// copy in every format and downloads (SVG, PNG, animated SVG, GIF, WebM).

import { $, $$, FORMAT_LABELS, codeBlock, copy, download, gf, lang, loadIcons, svg, t, toast } from './app.js';
import { animatedSvg, animationGif, animationWebm, bakeColor, svgToPng } from './exporters.js';
import { rank, sketchPad } from './sketch.js';

const DEFAULT_PROPS = { weight: 2, size: 24, corners: 'round', variant: 'outline', rotate: 0, flipX: false, flipY: false };
const state = {
  q: '',
  cat: '',
  sketch: null,
  selected: '',
  props: { ...DEFAULT_PROPS },
  colors: { color: null, secondaryColor: null, secondaryOpacity: null },
  extras: { modifier: '', modifierCorner: 'bottom-right', animate: '', trigger: 'mount', morphTo: '' },
  format: 'svg',
  bg: 'dark',
};
let data = null;
let version = '1';

function visible() {
  let list = data.icons;
  if (state.sketch) {
    const order = new Map(state.sketch.map((n, i) => [n, i]));
    list = list.filter((i) => order.has(i.name)).sort((a, b) => order.get(a.name) - order.get(b.name));
  } else if (state.q.trim()) {
    // Same ranking as the package and the CLI, synonyms in five languages included.
    list = gf.searchIcons(list, state.q, { limit: Infinity, lang });
  }
  if (state.cat) list = list.filter((i) => i.categories.includes(state.cat));
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

function renderGrid() {
  const grid = $('[data-grid]');
  const list = visible();
  const gp = gridProps();
  grid.innerHTML = list
    .map((i) => `<button class="icon-cell" type="button" role="option" id="ic-${i.name}" data-name="${i.name}" aria-selected="${i.name === state.selected}" title="${i.name}"><span class="ic">${svg(i.name, gp)}</span><span>${i.name}</span></button>`)
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
  const w = String(state.props.weight);
  for (const s of $$('[data-grid] .ic svg')) s.setAttribute('stroke-width', w);
}

function renderCats() {
  const counts = new Map();
  for (const i of data.icons) for (const c of i.categories) counts.set(c, (counts.get(c) || 0) + 1);
  const cats = [...counts.keys()].sort();
  $('[data-cats]').innerHTML = [`<li><button type="button" data-cat="" aria-pressed="${!state.cat}">${t('icons.all')}<small>${data.icons.length}</small></button></li>`]
    .concat(cats.map((c) => `<li><button type="button" data-cat="${c}" aria-pressed="${state.cat === c}">${c}<small>${counts.get(c)}</small></button></li>`))
    .join('');
}

function spec() {
  const e = state.extras;
  if (!e.modifier) return state.selected;
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
  if (e.morphTo && validSpec(e.morphTo)) {
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

function renderInspector() {
  if (!state.selected) return;
  const icon = data.byName.get(state.selected);
  const s = spec();
  const props = allProps();
  $('[data-preview]').innerHTML = svg(s, { ...props, size: 150 });
  $('[data-insp-name]').textContent = s;
  $('[data-insp-meta]').textContent = `${icon.categories.join(', ')} / ${icon.tags.join(', ')}`;
  renderSnippet();
  const editor = $('[data-open-editor]');
  editor.href = `studio.html#editor=${encodeURIComponent(s)}`;
  $('[data-open-fusion]').href = `studio.html#fusion=${encodeURIComponent(state.selected)}`;
}

function renderSnippet() {
  const s = spec();
  const props = snippetProps();
  const { modifier, modifierCorner, ...rest } = props;
  void modifier;
  void modifierCorner;
  const markup = svg(s, allProps());
  const code = gf.snippet(state.format, s, rest, { svg: bakeColor(markup, null), version });
  const lang = { svg: 'js', html: 'js', cdn: 'js', tailwind: 'js', datauri: 'sh' }[state.format] || 'js';
  $('[data-snippet]').replaceChildren(codeBlock(code, lang, state.format));
}

function select(name, { scroll = false } = {}) {
  if (!data.byName.has(name)) return;
  state.selected = name;
  for (const c of $$('.icon-cell[aria-selected="true"]')) c.setAttribute('aria-selected', 'false');
  const cell = document.getElementById(`ic-${name}`);
  if (cell) {
    cell.setAttribute('aria-selected', 'true');
    if (scroll) cell.scrollIntoView({ block: 'nearest' });
  }
  $('[data-grid]').setAttribute('aria-activedescendant', `ic-${name}`);
  history.replaceState(null, '', `${location.pathname}${location.search}#${name}`);
  renderInspector();
}

function syncUrl() {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.cat) params.set('cat', state.cat);
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
        if (input.name === 'weight') updateGridWeight();
        else if (input.name !== 'size') renderGrid();
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
      renderGrid();
      renderInspector();
    });
  }
  for (const b of $$('[data-toggle]', form)) {
    b.addEventListener('click', () => {
      const k = b.dataset.toggle;
      state.props[k] = !state.props[k];
      b.setAttribute('aria-pressed', String(state.props[k]));
      renderGrid();
      renderInspector();
    });
  }
  $('input[name=color]', form).addEventListener('input', (e) => {
    state.colors.color = e.target.value;
    schedule(() => {
      renderGrid();
      renderInspector();
    });
  });
  const sec = $('input[name=secondaryColor]', form);
  const useSec = $('input[name=useSecondary]', form);
  const syncSec = () => {
    state.colors.secondaryColor = useSec.checked ? sec.value : null;
    schedule(() => {
      renderGrid();
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
    renderGrid();
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
      host.innerHTML = svg(spec(), props);
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
    const base = allProps();
    try {
      if (kind === 'svg') {
        const { animate: _a, trigger: _t, morphTo: _m, ...still } = base;
        download(bakeColor(svg(spec(), still), state.colors.color), `${name()}.svg`, 'image/svg+xml');
      } else if (kind === 'png') {
        const size = Number($('[data-png-size]').value);
        const { animate: _a, morphTo: _m, ...still } = base;
        const blob = await svgToPng(bakeColor(svg(spec(), { ...still, size }), fileColor()), size);
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
  tabs.innerHTML = gf.FORMATS.map((f) => `<button type="button" role="tab" aria-selected="${f === state.format}" data-format="${f}">${FORMAT_LABELS[f]}</button>`).join('');
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
    if (cell) copy(svg(cell.dataset.name, gridProps()));
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
      copy(svg(spec(), allProps()));
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
    renderGrid();
    syncUrl();
  });
  const search = $('[data-search]');
  search.addEventListener('input', () => {
    state.q = search.value;
    state.sketch = null;
    schedule(() => {
      const list = renderGrid();
      if (list.length && state.q) select(list[0].name);
      syncUrl();
    });
  });
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      search.value = '';
      search.dispatchEvent(new Event('input'));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const first = $('.icon-cell', grid);
      if (first) first.focus();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== search && !/input|textarea|select/i.test(document.activeElement.tagName)) {
      e.preventDefault();
      search.focus();
    }
  });
}

loadIcons().then((d) => {
  data = d;
  version = d.version === '0.0.0' ? '1' : d.version;
  const params = new URLSearchParams(location.search);
  state.q = params.get('q') || '';
  state.cat = params.get('cat') || '';
  $('[data-search]').value = state.q;
  $('[data-total]').textContent = String(d.icons.length);
  renderCats();
  const list = renderGrid();
  const fromHash = decodeURIComponent(location.hash.slice(1));
  state.selected = d.byName.has(fromHash) ? fromHash : list[0] ? list[0].name : d.icons[0].name;
  wireForm();
  wireExtras();
  wireFormats();
  wireBackground();
  wireDownloads();
  wireSketch();
  wireGrid();
  select(state.selected, { scroll: true });
});
