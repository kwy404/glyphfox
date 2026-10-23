// Hero 3D tab of the studio: any icon, fusion or modifier spec (or a fused
// icon sent from the Fusion tool) extruded in 3D. three.js loads from
// jsDelivr the first time the tab opens; the tab only renders while visible.

import { $, $$, codeBlock, download, gf, loadIcons, t, toast } from '../app.js';
import { THREE_VERSION, hasWebGL } from './loader.js';
import { DEFAULTS, Viewer, prefersReduced } from './viewer.js';
import { iconParts, resolveIcon } from './parts.js';
import { isLightBackground, swatchCss } from './backgrounds.js';

const EMBED_URL = 'https://kwy404.github.io/glyphfox/assets/js/hero3d/embed.js';
const KEYS = ['variant', 'material', 'light', 'background', 'color', 'secondary', 'depth', 'bevel', 'weight', 'turntable'];
const state = { ...DEFAULTS, icon: 'heart' };
let custom = null;
let current = null;
let viewer = null;
let starting = null;
let wired = false;
let queued = false;
let motionQuery = null;

const settings = () => Object.fromEntries(KEYS.map((k) => [k, state[k]]));
const fileName = () =>
  String(state.icon || 'icon')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'icon';

function pressed(seg, value) {
  for (const b of $$('button[value]', seg)) b.setAttribute('aria-pressed', String(b.value === value));
}

function fillRange(input) {
  const min = Number(input.min || 0);
  const max = Number(input.max || 1);
  input.style.setProperty('--p', `${((Number(input.value) - min) / (max - min)) * 100}%`);
}

function stageClasses() {
  const stage = $('[data-th-stage]');
  stage.classList.toggle('is-transparent', state.background === 'transparent');
  stage.classList.toggle('is-light', isLightBackground(state.background));
  // The plate color only matters for the duotone style.
  $('[data-th="secondary"]').closest('.field').hidden = state.variant !== 'duotone';
}

function paintSwatches() {
  for (const b of $$('[data-th-seg="background"] button[value]')) b.querySelector('i').style.background = swatchCss(b.value, state.color);
}

function sizeNote() {
  const stage = $('[data-th-stage]');
  const el = $('[data-th-size]');
  if (el) el.textContent = t('three.size', { w: Math.round(stage.clientWidth), h: Math.round(stage.clientHeight) });
}

/** The snippet for the <glyphfox-3d> element, with the icon inlined as its SVG. */
function embedCode() {
  if (!current) return '';
  const attrs = [];
  if (state.variant !== 'outline') attrs.push(`variant="${state.variant}"`);
  attrs.push(`material="${state.material}"`, `lighting="${state.light}"`, `background="${state.background}"`, `color="${state.color}"`);
  if (state.variant === 'duotone') attrs.push(`secondary="${state.secondary}"`);
  attrs.push(`depth="${state.depth}"`, `bevel="${state.bevel}"`);
  if (state.weight !== 2) attrs.push(`weight="${state.weight}"`);
  if (state.turntable) attrs.push('turntable');
  const svg = gf.renderToString(current, { size: 24, color: state.color, title: state.icon });
  return `<script type="module" src="${EMBED_URL}"></script>\n<glyphfox-3d ${attrs.join(' ')} style="width:360px;height:270px">\n  ${svg}\n</glyphfox-3d>`;
}

function renderEmbed() {
  const host = $('[data-th-embed]');
  if (!host) return;
  host.replaceChildren(codeBlock(embedCode(), 'html', 'HTML'));
}

function isComposite(spec) {
  return /[&+:@]/.test(spec || '');
}

function loadSource() {
  const input = $('[data-th="icon"]');
  const found = custom ? { icon: custom } : resolveIcon(state.icon, state.weight);
  input.setAttribute('aria-invalid', String(!found));
  $('[data-th-unknown]').hidden = !!found;
  if (!found) return;
  current = found.icon;
  if (found.variant && ['outline', 'duotone', 'solid'].includes(found.variant) && found.variant !== state.variant) {
    state.variant = found.variant;
    pressed($('[data-th-seg="variant"]'), state.variant);
    stageClasses();
  }
  const icon = current;
  // Keep a link to this icon in the address bar (#3d=cloud&lock:overlap).
  if (location.hash.startsWith('#3d')) history.replaceState(null, '', `#3d=${encodeURIComponent(state.icon)}`);
  if (viewer) {
    viewer.set(settings());
    viewer.setSource((variant) => iconParts(icon, variant));
  }
  renderEmbed();
}

function update(next) {
  Object.assign(state, next);
  stageClasses();
  if (next.color) paintSwatches();
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    if (viewer) viewer.set(settings());
    renderEmbed();
  });
}

function syncMotion() {
  const reduced = prefersReduced();
  const box = $('[data-th="turntable"]');
  box.disabled = reduced;
  box.checked = reduced ? false : state.turntable;
  $('[data-th-motion]').hidden = !reduced;
  if (viewer) viewer.requestRender();
}

async function exportPng(scale) {
  if (!viewer) return;
  const buttons = $$('[data-th-png]');
  if (buttons.some((b) => b.disabled)) return;
  const transparent = $('[data-th-alpha]').checked;
  for (const b of buttons) b.disabled = true;
  let blob = null;
  try {
    blob = await viewer.toBlob(scale, { transparent });
  } catch {
    blob = null;
  }
  for (const b of buttons) b.disabled = false;
  if (!blob) {
    toast(t('three.error'));
    return;
  }
  download(blob, `${fileName()}-3d@${scale}x.png`, 'image/png');
  toast(t('toast.downloaded'));
}

function wire() {
  wired = true;
  const input = $('[data-th="icon"]');
  input.value = state.icon;
  let timer = 0;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.icon = input.value.trim();
      custom = null;
      loadSource();
    }, 160);
  });
  for (const seg of $$('[data-th-seg]')) {
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button[value]');
      if (!b) return;
      pressed(seg, b.value);
      update({ [seg.dataset.thSeg]: b.value });
    });
  }
  for (const el of $$('[data-th]')) {
    const k = el.dataset.th;
    if (k === 'icon') continue;
    if (el.type === 'range') fillRange(el);
    el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
      const v = el.type === 'checkbox' ? el.checked : el.type === 'range' ? Number(el.value) : el.value;
      if (el.type === 'range') fillRange(el);
      const o = $(`[data-th-o="${k}"]`);
      if (o) o.textContent = el.value;
      update({ [k]: v });
      if (k === 'weight' && !custom && isComposite(state.icon)) loadSource();
    });
  }
  $('[data-th-act="reset"]').addEventListener('click', () => viewer && viewer.resetView());
  for (const b of $$('[data-th-png]')) b.addEventListener('click', () => exportPng(Number(b.dataset.thPng)));
  paintSwatches();
  stageClasses();
  motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  if (motionQuery.addEventListener) motionQuery.addEventListener('change', syncMotion);
  syncMotion();
  new ResizeObserver(sizeNote).observe($('[data-th-stage]'));
  $('[data-th-version]').textContent = THREE_VERSION;
  loadIcons().then((d) => {
    const list = $('[data-fu-names]');
    if (list && !list.children.length) list.innerHTML = d.icons.map((i) => `<option value="${i.name}"></option>`).join('');
  });
}

async function start() {
  const stage = $('[data-th-stage]');
  const status = $('[data-th-status]');
  if (!hasWebGL()) {
    status.textContent = t('three.nogl');
    starting = null;
    return;
  }
  try {
    viewer = await Viewer.create(stage, { label: t('three.canvas'), settings: settings() });
  } catch {
    status.textContent = t('three.error');
    starting = null;
    return;
  }
  status.hidden = true;
  stage.classList.add('ready');
  loadSource();
  viewer.setShown(!$('[data-panel="3d"]').hidden);
}

function applyPayload(payload) {
  const input = $('[data-th="icon"]');
  if (typeof payload === 'string' && payload) {
    custom = null;
    state.icon = payload;
  } else if (payload && payload.icon) {
    custom = payload.icon;
    state.icon = payload.name || payload.icon.name || 'fusion';
  } else return false;
  input.value = state.icon;
  return true;
}

/** Opens the tab. `payload` is a spec string or { icon, name } from the Fusion tool. */
export async function show(payload) {
  if (!wired) wire();
  const changed = applyPayload(payload);
  if (viewer) {
    viewer.setShown(true);
    if (changed) loadSource();
    return;
  }
  if (!current || changed) {
    const found = custom ? { icon: custom } : resolveIcon(state.icon, state.weight);
    current = found ? found.icon : null;
    renderEmbed();
  }
  if (!starting) starting = start();
  await starting;
}

/** Leaves the tab: rendering stops, the scene stays for the next visit. */
export function hide() {
  if (viewer) viewer.setShown(false);
}
