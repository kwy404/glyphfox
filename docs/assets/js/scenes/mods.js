// The modifiers scene: a badge flies in from the front, snaps into a corner
// with a spring and the icon underneath opens its knockout gap live. The
// gap is the real trim of the engine (trimNodes around a disk), recomputed
// as the badge approaches, so the cut you see is the cut you ship.

import { gf, reduced, svg } from '../app.js';
import { scrollScene, whenNear } from './runner.js';
import { clamp, el, layers, lerp, nodesD, smooth, span, spring } from './util.js';

const STEPS = [
  ['file', 'check', 'br'],
  ['cloud', 'sync', 'tr'],
  ['user', 'lock', 'tl'],
  ['calendar', 'clock', 'bl'],
  ['folder', 'plus', 'br'],
];
const CORNER = { br: 'bottom-right', tr: 'top-right', bl: 'bottom-left', tl: 'top-left' };
const WEIGHT = 1.25;
const GAP = 1;

function glyphRadius(name) {
  let r = 0;
  for (const n of gf.MODIFIERS[name]) for (const poly of gf.geometry.flattenNode(n, 0.1)) for (const [x, y] of poly.points) r = Math.max(r, Math.hypot(x, y));
  return r;
}

function cornerCenter(code, rb) {
  const lo = 2 + rb;
  const hi = 22 - rb;
  return [code.endsWith('l') ? lo : hi, code.startsWith('t') ? lo : hi];
}

export function modsScene() {
  const section = document.querySelector('[data-scene="mods"]');
  const stage = document.querySelector('[data-mods-stage]');
  if (!section || !stage) return;
  const steps = STEPS.filter(([n, m]) => gf.lookupIcon(n) && gf.MODIFIERS[m]).map(([name, mod, code]) => {
    const rb = glyphRadius(mod);
    return { name, mod, code, rb, c: cornerCenter(code, rb), primary: layers(name).primary, glyph: nodesD(gf.MODIFIERS[mod]) };
  });
  if (!steps.length) return;
  let root;
  let base;
  let ring;
  let badge;
  let badgePath;
  let spec;
  let chips = [];
  let lastKey = '';

  function init() {
    const board = document.createElement('div');
    board.className = 'md-board';
    root = el('svg', { viewBox: '-1 -1 26 26', fill: 'none', stroke: 'currentColor', 'stroke-width': WEIGHT, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' });
    el('rect', { class: 'md-pad', x: 2, y: 2, width: 20, height: 20, rx: 0.5 }, root);
    base = el('path', { class: 'md-base' }, root);
    ring = el('circle', { class: 'md-ring', r: 1 }, root);
    badge = el('g', { class: 'md-badge' }, root);
    badgePath = el('path', {}, badge);
    board.appendChild(root);
    spec = document.createElement('code');
    spec.className = 'md-spec';
    const row = document.createElement('div');
    row.className = 'md-chips';
    chips = steps.map((s) => {
      const chip = document.createElement('div');
      chip.className = 'tile';
      chip.innerHTML = svg(`${s.name}+${s.mod}@${s.code}`, { size: 32 });
      row.appendChild(chip);
      return chip;
    });
    stage.append(board, spec, row);
  }

  function draw(s, pos, scale, open, alpha) {
    const R = (s.rb + WEIGHT + GAP) * open;
    const nodes = R > 0.05 ? gf.trimNodes(s.primary, (p) => (p[0] - pos[0]) * (p[0] - pos[0]) + (p[1] - pos[1]) * (p[1] - pos[1]) < R * R) : s.primary;
    const d = nodesD(nodes);
    const key = `${s.name}|${d.length}|${R.toFixed(2)}`;
    if (key !== lastKey) {
      lastKey = key;
      base.setAttribute('d', d);
    }
    badgePath.setAttribute('d', s.glyph);
    badge.setAttribute('transform', `translate(${pos[0].toFixed(3)} ${pos[1].toFixed(3)}) scale(${scale.toFixed(3)})`);
    badge.style.opacity = alpha.toFixed(3);
    ring.setAttribute('cx', pos[0].toFixed(3));
    ring.setAttribute('cy', pos[1].toFixed(3));
    ring.setAttribute('r', Math.max(0.01, (s.rb + WEIGHT / 2 + GAP) * open).toFixed(3));
  }

  function update(p) {
    if (!root) return;
    const n = steps.length;
    const x = reduced ? 0.7 : Math.min(n - 1e-6, p * n);
    const i = Math.floor(x);
    const w = x - i;
    const s = steps[i];
    const last = i === n - 1;
    // Flight: from in front of the stage, outside its corner, to the corner.
    const dir = [s.c[0] - 12, s.c[1] - 12];
    const len = Math.hypot(dir[0], dir[1]) || 1;
    const from = [s.c[0] + (dir[0] / len) * 11 - (dir[1] / len) * 4, s.c[1] + (dir[1] / len) * 11 + (dir[0] / len) * 4];
    const u = span(w, 0.08, 0.5);
    const e = reduced ? 1 : spring(u, { bounce: 0.5, speed: 11 });
    const ctrl = [lerp(from[0], s.c[0], 0.5) - (dir[1] / len) * 5, lerp(from[1], s.c[1], 0.5) + (dir[0] / len) * 5];
    const bez = (a, b, c, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
    let pos = [bez(from[0], ctrl[0], s.c[0], e), bez(from[1], ctrl[1], s.c[1], e)];
    let scale = lerp(2.1, 1, e);
    let alpha = clamp(u * 4);
    const leave = last || reduced ? 0 : span(w, 0.84, 1);
    if (leave > 0) {
      const k = leave * leave;
      pos = [lerp(s.c[0], from[0], k), lerp(s.c[1], from[1], k)];
      scale = lerp(1, 2.1, k);
      alpha = 1 - k;
    }
    const dist = Math.hypot(pos[0] - s.c[0], pos[1] - s.c[1]);
    const open = smooth(clamp(1 - dist / 7));
    draw(s, pos, scale, open, alpha);
    const settle = span(w, 0.45, 0.62);
    ring.style.opacity = (open * (1 - 0.65 * settle)).toFixed(3);
    root.style.opacity = String(reduced ? 1 : clamp(w / 0.06) * (last ? 1 : 1 - span(w, 0.94, 1) * 0.5));
    spec.textContent = `${s.name}+${s.mod}@${s.code}`;
    spec.classList.toggle('on', open > 0.98);
    chips.forEach((c, j) => c.classList.toggle('hot', j === i));
    stage.dataset.corner = CORNER[s.code];
  }

  if (reduced) {
    whenNear(section, () => {
      init();
      update(1);
    });
    return;
  }
  scrollScene(section, { init, update });
}
