// The grid scene: the 24 grid draws itself, the padding box and keylines
// settle in, then the strokes of real icons fly in and snap onto the grid
// with a spring, one icon after another, while their path data types out.

import { gf, reduced } from '../app.js';
import { scrollScene, whenNear } from './runner.js';
import { clamp, el, layers, random, span, spring } from './util.js';

const SEQUENCE = ['camera', 'cpu', 'fenn'];

function anchors(node) {
  const out = [];
  const seen = new Set();
  for (const s of gf.geometry.shapeToSegments(node)) {
    if (s[0] === 'Z') continue;
    const x = s[s.length - 2];
    const y = s[s.length - 1];
    const key = `${Math.round(x * 4)}:${Math.round(y * 4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push([x, y]);
  }
  return out;
}

function centerOf(d) {
  const b = gf.geometry.segmentsBounds(gf.geometry.parsePath(d));
  return [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2];
}

export function gridScene() {
  const section = document.querySelector('[data-scene="grid"]');
  const stage = document.querySelector('[data-grid-stage]');
  if (!section || !stage) return;
  const names = SEQUENCE.filter((n) => gf.lookupIcon(n));
  let svg;
  let lines = [];
  let pad;
  let keys;
  let icons = [];
  let code;
  let codeName;
  let lastText = '';
  let drawnGrid = -1;

  function init() {
    svg = el('svg', { viewBox: '-2.5 -2.5 29 29', class: 'grid-svg', 'aria-hidden': 'true', focusable: 'false' });
    const g = el('g', { class: 'g-lines' }, svg);
    for (let i = 0; i <= 24; i++) {
      const strong = i % 12 === 0;
      lines.push(el('path', { d: `M${i} 0V24`, pathLength: 1, class: strong ? 'strong' : '' }, g));
      lines.push(el('path', { d: `M0 ${i}H24`, pathLength: 1, class: strong ? 'strong' : '' }, g));
    }
    pad = el('rect', { class: 'g-pad', x: 2, y: 2, width: 20, height: 20 }, svg);
    keys = el('g', { class: 'g-keys' }, svg);
    el('circle', { cx: 12, cy: 12, r: 10 }, keys);
    el('rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 }, keys);
    el('rect', { x: 4, y: 2, width: 16, height: 20, rx: 2 }, keys);
    el('rect', { x: 2, y: 4, width: 20, height: 16, rx: 2 }, keys);
    el('path', { d: 'M0 0L24 24M24 0L0 24' }, keys);
    const rnd = random(11);
    icons = names.map((name) => {
      const l = layers(name);
      const group = el('g', { class: 'g-icon' }, svg);
      const fill = l.secondary ? el('path', { class: 'g-fill', d: gf.geometry.serializePath(gf.geometry.shapeToSegments(l.secondary), 2) }, group) : null;
      const strokes = l.primary.map((node, i) => {
        const d = gf.geometry.serializePath(gf.geometry.shapeToSegments(node), 2);
        const wrap = el('g', { class: 'g-stroke' }, group);
        el('path', { class: 'g-body', d }, wrap);
        el('path', { class: 'g-spine', d }, wrap);
        const dots = anchors(node).map(([x, y]) => el('rect', { class: 'g-node', x: x - 0.32, y: y - 0.32, width: 0.64, height: 0.64, rx: 0.12 }, group));
        const a = rnd() * Math.PI * 2;
        const dist = 9 + rnd() * 6;
        return { wrap, dots, d, c: centerOf(d), dx: Math.cos(a) * dist, dy: Math.sin(a) * dist, rot: (rnd() - 0.5) * 140, sc: 0.45 + rnd() * 1.1, at: l.primary.length > 1 ? (i / (l.primary.length - 1)) * 0.3 : 0, out: rnd() * Math.PI * 2 };
      });
      const text = strokes.map((s) => s.d).join(' ');
      return { name, group, fill, strokes, text };
    });
    stage.appendChild(svg);
    const readout = document.createElement('div');
    readout.className = 'grid-code';
    readout.setAttribute('aria-hidden', 'true');
    codeName = document.createElement('b');
    code = document.createElement('span');
    readout.append(codeName, code);
    stage.appendChild(readout);
  }

  function update(p) {
    if (!svg) return;
    // Grid lines draw from the center out.
    const gp = reduced ? 1 : span(p, 0, 0.13);
    if (gp !== drawnGrid) {
      drawnGrid = gp;
      lines.forEach((ln, i) => {
        const k = Math.abs(Math.floor(i / 2) - 12) / 12;
        const v = clamp((gp - k * 0.55) / 0.45);
        ln.setAttribute('stroke-dashoffset', String(1 - v));
      });
    }
    pad.style.opacity = String(span(p, 0.06, 0.14));
    keys.style.opacity = String(span(p, 0.09, 0.17));
    const n = icons.length;
    const start = 0.14;
    const len = (1 - start) / n;
    icons.forEach((icon, k) => {
      const w = reduced ? (k === n - 1 ? 1 : -1) : (p - start - k * len) / len;
      const last = k === n - 1;
      if (w < -0.02 || (w > 1.02 && !last)) {
        icon.group.style.display = 'none';
        return;
      }
      icon.group.style.display = '';
      let built = 0;
      icon.strokes.forEach((s) => {
        const u = span(w, s.at, s.at + 0.42);
        const e = spring(u, { bounce: 0.42, speed: 10 });
        const o = last ? 0 : span(w, 0.86 + s.at * 0.25, 1);
        const oe = o * o;
        const tx = s.dx * (1 - e) + Math.cos(s.out) * 14 * oe;
        const ty = s.dy * (1 - e) + Math.sin(s.out) * 14 * oe;
        const r = s.rot * (1 - e) + s.rot * 0.6 * oe;
        const sc = 1 + (s.sc - 1) * (1 - e);
        s.wrap.setAttribute('transform', `translate(${(tx + s.c[0]).toFixed(3)} ${(ty + s.c[1]).toFixed(3)}) rotate(${r.toFixed(2)}) scale(${sc.toFixed(3)}) translate(${-s.c[0]} ${-s.c[1]})`);
        const vis = clamp(u * 5) * (1 - oe);
        s.wrap.style.opacity = String(vis);
        const pop = spring(span(u, 0.5, 1), { bounce: 0.5, speed: 12 });
        for (const dot of s.dots) {
          dot.style.opacity = String(clamp(pop * 1.4) * (1 - o));
          dot.style.transform = `scale(${(0.2 + 0.8 * pop).toFixed(3)})`;
        }
        if (u >= 1) built++;
      });
      if (icon.fill) icon.fill.style.opacity = String(0.32 * span(w, 0.55, 0.75) * (1 - (last ? 0 : span(w, 0.86, 0.95))));
      if (w >= 0 && w <= 1.02) {
        const typed = Math.round(icon.text.length * clamp(w / 0.62));
        const text = icon.text.slice(0, typed);
        const key = icon.name + typed;
        if (key !== lastText) {
          lastText = key;
          codeName.textContent = `${icon.name}.svg`;
          code.textContent = text;
        }
      }
      icon.group.classList.toggle('built', built === icon.strokes.length);
    });
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
