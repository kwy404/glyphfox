// Fusion tool: pick 2 to 10 icons, try every layout, drag and scale parts,
// tune the gap, check the lint, copy, export or save.

import { $, $$, FORMAT_LABELS, codeBlock, download, fennArt, gf, has, svg, t, toast } from './app.js';
import * as collection from './collection.js';

const CURATED = [
  ['cloud', 'lock', 'overlap'],
  ['file', 'check', 'badge'],
  ['user', 'shield', 'badge'],
  ['message-circle', 'heart', 'overlap'],
  ['shopping-cart', 'clock', 'badge'],
  ['shield', 'heart', 'inside'],
  ['folder', 'search', 'overlap'],
  ['calendar', 'bell', 'side'],
];

const state = { parts: ['cloud', 'lock'], layout: 'overlap', gap: 1, weight: 2, scale: [], offsets: [], selected: 1, format: 'svg' };
let fused = null;

function fusedIcon() {
  const icons = state.parts.map((n) => gf.lookupIcon(n)).filter(Boolean);
  if (icons.length < 2) return null;
  try {
    return gf.fuse(icons, { layout: state.layout, gap: state.gap, weight: state.weight, scale: state.scale.slice(0, icons.length).map((v) => v || 1), offsets: state.offsets.slice(0, icons.length).map((o) => o || [0, 0]) });
  } catch (err) {
    toast(err.message);
    return null;
  }
}

function spec() {
  return `${state.parts.join('&')}:${state.layout}`;
}

function code() {
  const custom = state.scale.some((v) => v && v !== 1) || state.offsets.some((o) => o && (o[0] || o[1]));
  const props = state.weight !== 2 ? { weight: state.weight } : {};
  if (state.format === 'svg') return gf.canonicalSvg(fused.body);
  if (state.format === 'jsx' && (custom || state.gap !== 1)) {
    const extra = [state.gap !== 1 ? `gap={${state.gap}}` : '', custom ? `scale={${JSON.stringify(state.scale.map((v) => v || 1))}}` : '', custom ? `offsets={${JSON.stringify(state.offsets.map((o) => o || [0, 0]))}}` : '', state.weight !== 2 ? `weight={${state.weight}}` : ''].filter(Boolean).join(' ');
    return `import { Fusion } from 'glyphfox/react';\n\n<Fusion icons={${JSON.stringify(state.parts)}} layout="${state.layout}" ${extra} />`;
  }
  return gf.snippet(state.format, spec(), props, { svg: gf.renderToString(fused, props), version: '1' });
}

function render() {
  fused = fusedIcon();
  const stage = $('[data-fu-stage]');
  const parts = $('[data-fu-parts]');
  parts.innerHTML = state.parts.map((n, i) => `<button class="chip" type="button" data-part="${i}" aria-pressed="${i === state.selected}">${has(n) ? svg(n, { size: 14 }) : ''}${n}<span class="x" data-remove="${i}" aria-label="remove ${n}">x</span></button>`).join('');
  if (!fused) {
    stage.innerHTML = `<div class="empty">${fennArt('orbit')}<p class="faint">${t('fusion.need')}</p></div>`;
    $('[data-fu-sizes]').innerHTML = '';
    $('[data-fu-lint]').innerHTML = '';
    $('[data-fu-code]').innerHTML = '';
    return;
  }
  stage.innerHTML =
    gf.renderToString(fused, { size: 100, weight: state.weight, class: 'out' }).replace(/width="100" height="100"/, '') +
    fused.parts
      .map((b, i) => `<div class="box${i === state.selected ? ' sel' : ''}" data-box="${i}" style="left:${(b.x / 24) * 100}%;top:${(b.y / 24) * 100}%;width:${(b.size / 24) * 100}%;height:${(b.size / 24) * 100}%"><span>${state.parts[i]}</span></div>`)
      .join('');
  $('[data-fu-sizes]').innerHTML = [16, 24, 48].map((s) => gf.renderToString(fused, { size: s, weight: state.weight })).join('') + gf.renderToString(fused, { size: 48, variant: 'solid', weight: state.weight }) + gf.renderToString(fused, { size: 48, variant: 'duotone', weight: state.weight });
  const problems = gf.lintBody(fused.body);
  $('[data-fu-lint]').innerHTML = problems.length ? problems.map((p) => `<li class="bad"><b>${p.rule}</b> ${p.message}</li>`).join('') : `<li class="ok">${t('fusion.lint.ok')}</li>`;
  $('[data-fu-code]').replaceChildren(codeBlock(code(), 'js', state.format));
  const sc = $('[data-fu="scale"]');
  sc.value = String(state.scale[state.selected] || 1);
  $('[data-fu-o="scale"]').textContent = sc.value;
}

function addPart(name) {
  const n = String(name || '').trim().toLowerCase();
  if (!n || !has(n) || state.parts.length >= 10) return false;
  state.parts.push(n);
  state.selected = state.parts.length - 1;
  render();
  return true;
}

export function loadSpec(s) {
  try {
    const p = gf.parseSpec(s);
    const names = p.names.filter(has);
    if (!names.length) return;
    state.parts = names.length >= 2 ? names : [names[0], has('check') ? 'check' : names[0]];
    if (p.layout) state.layout = p.layout;
    state.scale = [];
    state.offsets = [];
    state.selected = state.parts.length - 1;
    for (const b of $$('[data-fu-layout] button')) b.setAttribute('aria-pressed', String(b.value === state.layout));
    render();
  } catch {
    // ignore bad hashes
  }
}

export function initFusion(data, { openInEditor, openIn3d }) {
  $('[data-fu-names]').innerHTML = data.icons.map((i) => `<option value="${i.name}"></option>`).join('');
  if (!state.parts.every(has)) state.parts = data.icons.slice(0, 2).map((i) => i.name);
  $('[data-fu-layout]').innerHTML = gf.LAYOUTS.map((l) => `<button type="button" value="${l}" aria-pressed="${l === state.layout}">${l}</button>`).join('');
  $('[data-fu-gallery]').innerHTML = CURATED.filter(([a, b]) => has(a) && has(b))
    .map(([a, b, l]) => `<button class="chip" type="button" data-spec="${a}&${b}:${l}">${svg(`${a}&${b}:${l}`, { size: 16 })}${a} &amp; ${b}</button>`)
    .join('');
  $('[data-fu-formats]').innerHTML = gf.FORMATS.filter((f) => f !== 'datauri')
    .map((f) => `<button type="button" role="tab" aria-selected="${f === state.format}" data-format="${f}">${FORMAT_LABELS[f]}</button>`)
    .join('');
  const add = $('[data-fu-add]');
  add.addEventListener('change', () => {
    for (const n of add.value.split(/[\s,&]+/)) addPart(n);
    add.value = '';
  });
  add.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      for (const n of add.value.split(/[\s,&]+/)) addPart(n);
      add.value = '';
    }
  });
  $('[data-fu-parts]').addEventListener('click', (e) => {
    const rm = e.target.closest('[data-remove]');
    if (rm) {
      const i = Number(rm.dataset.remove);
      state.parts.splice(i, 1);
      state.scale.splice(i, 1);
      state.offsets.splice(i, 1);
      state.selected = Math.min(state.selected, state.parts.length - 1);
      render();
      return;
    }
    const b = e.target.closest('[data-part]');
    if (b) {
      state.selected = Number(b.dataset.part);
      render();
    }
  });
  $('[data-fu-layout]').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.layout = b.value;
    state.scale = [];
    state.offsets = [];
    for (const x of $$('[data-fu-layout] button')) x.setAttribute('aria-pressed', String(x === b));
    render();
  });
  $('[data-fu-gallery]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-spec]');
    if (b) loadSpec(b.dataset.spec);
  });
  $('[data-fu-formats]').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.format = b.dataset.format;
    for (const x of $$('[data-fu-formats] button')) x.setAttribute('aria-selected', String(x === b));
    render();
  });
  for (const input of $$('[data-fu]')) {
    input.addEventListener('input', () => {
      const v = Number(input.value);
      $(`[data-fu-o="${input.dataset.fu}"]`).textContent = input.value;
      if (input.dataset.fu === 'scale') state.scale[state.selected] = v;
      else state[input.dataset.fu] = v;
      render();
    });
  }
  const stage = $('[data-fu-stage]');
  let drag = null;
  stage.addEventListener('pointerdown', (e) => {
    const box = e.target.closest('[data-box]');
    if (!box) return;
    state.selected = Number(box.dataset.box);
    const r = stage.getBoundingClientRect();
    drag = { x: e.clientX, y: e.clientY, unit: r.width / 24, start: [...(state.offsets[state.selected] || [0, 0])] };
    stage.setPointerCapture(e.pointerId);
    render();
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = Math.round(((e.clientX - drag.x) / drag.unit) * 4) / 4;
    const dy = Math.round(((e.clientY - drag.y) / drag.unit) * 4) / 4;
    state.offsets[state.selected] = [drag.start[0] + dx, drag.start[1] + dy];
    render();
  });
  stage.addEventListener('pointerup', () => {
    drag = null;
  });
  stage.addEventListener('keydown', (e) => {
    if (!e.key.startsWith('Arrow')) return;
    e.preventDefault();
    const d = e.shiftKey ? 1 : 0.25;
    const o = state.offsets[state.selected] || [0, 0];
    state.offsets[state.selected] = [o[0] + (e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0), o[1] + (e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0)];
    render();
  });
  for (const b of $$('[data-fu-act]')) {
    b.addEventListener('click', () => {
      if (!fused) return;
      const name = state.parts.join('-');
      if (b.dataset.fuAct === 'save') {
        collection.save({ name, body: fused.body, tags: [...state.parts, 'fusion'], categories: fused.categories.slice(0, 1), source: 'fusion' });
        toast(t('toast.saved'));
      } else if (b.dataset.fuAct === 'edit') openInEditor(fused.body, name);
      else if (b.dataset.fuAct === '3d') {
        if (openIn3d) openIn3d(fused, spec());
      } else download(gf.canonicalSvg(fused.body), `${name}.svg`, 'image/svg+xml');
    });
  }
  render();
}
