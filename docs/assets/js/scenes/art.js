// Illustrations built from the icon geometry, as inline SVG: Fenn tiled from
// the icons of the set, a constellation of icons that traces his head, and
// an exploded view of the grid an icon is drawn on. Each piece is generated
// once, when it comes near the viewport, and its motion only runs on screen.

import { gf, reduced } from '../app.js';
import { whenNear, watchVisible } from './runner.js';
import { NS, alongPolys, bake, el, layers, nodesD, polylines, random, symbols } from './util.js';

const HEAD = 'M4 2.5 9 7 15 7 20 2.5 20.5 9.5 22 13.5 15 16.5 12 21.5 9 16.5 2 13.5 3.5 9.5Z';
const BODY = 'M27 17.5L36 24 44 35 46 47 42 60H21L19 44 21 30 24 22.5Z';
const TAIL = 'M41 59L52 56 59 47 58 37 53 46 45 52Z';
const MOSAIC = ['home', 'search', 'heart', 'bell', 'camera', 'cloud', 'lock', 'folder', 'star', 'mail', 'user', 'settings', 'music', 'image', 'calendar', 'sun', 'moon', 'zap', 'gift', 'globe', 'compass', 'terminal', 'package', 'sparkles', 'map-pin', 'message-circle', 'download', 'send', 'bookmark', 'shield', 'key', 'wifi', 'code', 'database', 'cpu', 'headphones', 'mic', 'phone', 'clock', 'file', 'layers', 'activity', 'leaf', 'flame', 'feather', 'rocket', 'droplet', 'paw', 'flower', 'tree', 'bird', 'fish', 'anchor', 'crown', 'diamond', 'gem', 'puzzle', 'trophy', 'umbrella', 'coffee'];
const SKY = ['star', 'sparkle', 'moon', 'sun', 'planet', 'zap', 'gem', 'compass', 'rocket', 'globe', 'sparkles', 'diamond', 'flame', 'feather'];

function poly(d) {
  return polylines(d, 0.5)[0].points;
}

function inside(pt, ring) {
  return gf.geometry.pointInPolygon(pt, ring);
}

function svgRoot(viewBox) {
  const root = document.createElementNS(NS, 'svg');
  root.setAttribute('viewBox', viewBox);
  root.setAttribute('class', 'art-svg');
  root.setAttribute('aria-hidden', 'true');
  root.setAttribute('focusable', 'false');
  return root;
}

/** Fenn sitting, tiled from the icons of the set. */
function foxOfIcons(host) {
  const names = MOSAIC.filter((n) => gf.lookupIcon(n));
  const root = svgRoot('0 0 64 64');
  symbols(root, names, 'fx');
  const head = poly(bake(HEAD, 1, 12, 1));
  const body = poly(BODY);
  const tail = poly(TAIL);
  const eyes = [
    [21, 13],
    [27, 13],
  ];
  const rnd = random(19);
  const pitch = 2.3;
  const tiles = el('g', { class: 'fx-tiles' }, root);
  let k = 0;
  for (let y = pitch / 2; y < 64; y += pitch) {
    for (let x = pitch / 2; x < 64; x += pitch) {
      const pt = [x, y];
      const inHead = inside(pt, head);
      const inBody = !inHead && inside(pt, body);
      const inTail = !inHead && !inBody && inside(pt, tail);
      if (!inHead && !inBody && !inTail) continue;
      if (eyes.some(([ex, ey]) => Math.hypot(ex - x, ey - y) < 1.5)) continue;
      const name = names[Math.floor(rnd() * names.length)];
      const s = pitch * 0.84;
      const accent = inHead || inTail || rnd() < 0.08;
      const shade = inBody ? 0.45 + 0.5 * (1 - (y - 17) / 46) * (0.7 + 0.3 * rnd()) : 0.7 + 0.3 * rnd();
      const use = el('use', { href: `#fx-${name}`, x: (x - s / 2).toFixed(2), y: (y - s / 2).toFixed(2), width: s.toFixed(2), height: s.toFixed(2), class: accent ? 'fx-tile accent' : 'fx-tile' }, tiles);
      use.style.opacity = shade.toFixed(2);
      k++;
    }
  }
  const outline = el('g', { class: 'fx-outline' }, root);
  for (const d of [bake(HEAD, 1, 12, 1), BODY, TAIL]) el('path', { d }, outline);
  for (const [ex, ey] of eyes) el('circle', { class: 'fx-eye', cx: ex, cy: ey, r: 1.05 }, root);
  host.dataset.count = String(k);
  host.appendChild(root);
}

/** A constellation of icons tracing Fenn's head, over a quiet star field. */
function constellation(host) {
  const names = SKY.filter((n) => gf.lookupIcon(n));
  const root = svgRoot('0 0 96 64');
  symbols(root, names, 'sk');
  const defs = el('defs', {}, root);
  const grad = el('radialGradient', { id: 'sk-glow' }, defs);
  el('stop', { offset: 0, 'stop-color': 'currentColor', 'stop-opacity': 0.35 }, grad);
  el('stop', { offset: 1, 'stop-color': 'currentColor', 'stop-opacity': 0 }, grad);
  const rnd = random(5);
  const field = el('g', { class: 'sk-field' }, root);
  for (let i = 0; i < 90; i++) {
    const c = el('circle', { cx: (rnd() * 96).toFixed(2), cy: (rnd() * 64).toFixed(2), r: (0.12 + rnd() * 0.22).toFixed(2) }, field);
    c.style.opacity = (0.15 + rnd() * 0.55).toFixed(2);
  }
  for (let i = 0; i < 9; i++) {
    const s = 1.3 + rnd() * 0.8;
    el('use', { href: `#sk-${names[i % names.length]}`, x: (rnd() * 92).toFixed(2), y: (rnd() * 60).toFixed(2), width: s.toFixed(2), height: s.toFixed(2), class: 'sk-dim' }, field);
  }
  // Twinkles live in their own HTML layer, so they animate on the compositor.
  const sparkle = document.createElement('div');
  sparkle.className = 'sk-twinkle';
  sparkle.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 10; i++) {
    const dot = document.createElement('i');
    dot.style.left = `${(4 + rnd() * 92).toFixed(1)}%`;
    dot.style.top = `${(4 + rnd() * 92).toFixed(1)}%`;
    dot.style.setProperty('--d', `${(rnd() * -4).toFixed(2)}s`);
    sparkle.appendChild(dot);
  }
  // The head polygon, scaled up: each vertex is a star.
  const S = 2.35;
  const ox = 48 - 12 * S;
  const oy = 32 - 12 * S;
  const pts = [
    [4, 2.5],
    [9, 7],
    [15, 7],
    [20, 2.5],
    [20.5, 9.5],
    [22, 13.5],
    [15, 16.5],
    [12, 21.5],
    [9, 16.5],
    [2, 13.5],
    [3.5, 9.5],
  ].map(([x, y]) => [ox + x * S, oy + y * S]);
  const lines = el('g', { class: 'sk-lines' }, root);
  let d = '';
  pts.forEach((p, i) => {
    d += `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
  });
  el('path', { d: d + 'Z', pathLength: 1 }, lines);
  const stars = el('g', { class: 'sk-stars' }, root);
  const eyes = [
    [ox + 9 * S, oy + 12 * S],
    [ox + 15 * S, oy + 12 * S],
  ];
  [...pts, ...eyes].forEach((p, i) => {
    const eye = i >= pts.length;
    const s = eye ? 3.2 : i % 3 === 0 ? 4.6 : 3.6;
    const g = el('g', { class: eye || i % 4 === 0 ? 'sk-star accent' : 'sk-star' }, stars);
    g.style.setProperty('--d', `${(i * 0.13).toFixed(2)}s`);
    el('circle', { cx: p[0].toFixed(2), cy: p[1].toFixed(2), r: (s * 0.95).toFixed(2), fill: 'url(#sk-glow)', class: 'sk-halo' }, g);
    el('circle', { cx: p[0].toFixed(2), cy: p[1].toFixed(2), r: (s * 0.62).toFixed(2), class: 'sk-disc' }, g);
    const name = eye ? 'sparkle' : names[i % names.length];
    el('use', { href: `#sk-${gf.lookupIcon(name) ? name : names[0]}`, x: (p[0] - s / 2).toFixed(2), y: (p[1] - s / 2).toFixed(2), width: s.toFixed(2), height: s.toFixed(2) }, g);
  });
  host.append(root, sparkle);
}

/**
 * The grid, keylines, fill and strokes of an icon, pulled apart in
 * isometric view. Each layer is its own SVG in a stack, so the layers can
 * separate and float on the compositor without repainting.
 */
function explodedGrid(host) {
  const icon = layers('fenn') || layers('heart');
  const k = 1.72;
  const c = Math.cos(Math.PI / 6) * k;
  const s = Math.sin(Math.PI / 6) * k;
  const ox = 50;
  const oy = 10;
  const gap = 15;
  const plane = (h) => `matrix(${c.toFixed(4)} ${s.toFixed(4)} ${(-c).toFixed(4)} ${s.toFixed(4)} ${ox} ${(oy + 3 * gap - h).toFixed(2)})`;
  const proj = (x, y, h) => [ox + (x - y) * c, oy + 3 * gap - h + (x + y) * s];
  const stack = document.createElement('div');
  stack.className = 'ex-stack';
  const wires = svgRoot('0 0 100 84');
  wires.classList.add('ex-wires');
  for (const [x, y] of [
    [0, 0],
    [24, 0],
    [24, 24],
    [0, 24],
  ]) {
    const a = proj(x, y, 0);
    const b = proj(x, y, 3 * gap);
    el('path', { d: `M${a[0].toFixed(2)} ${a[1].toFixed(2)}L${b[0].toFixed(2)} ${b[1].toFixed(2)}` }, wires);
  }
  stack.appendChild(wires);
  const layer = (i, cls) => {
    const root = svgRoot('0 0 100 84');
    root.classList.add('ex-layer', cls);
    root.style.setProperty('--i', String(i));
    stack.appendChild(root);
    return el('g', { transform: plane(i * gap) }, root);
  };
  const g0 = layer(0, 'ex-grid');
  el('rect', { x: 0, y: 0, width: 24, height: 24, class: 'ex-plate' }, g0);
  let d = '';
  for (let i = 1; i < 24; i++) d += `M${i} 0V24M0 ${i}H24`;
  el('path', { d, class: 'ex-lines' }, g0);
  el('rect', { x: 2, y: 2, width: 20, height: 20, class: 'ex-pad' }, g0);
  const g1 = layer(1, 'ex-keys');
  el('rect', { x: 0, y: 0, width: 24, height: 24, class: 'ex-plate' }, g1);
  el('circle', { cx: 12, cy: 12, r: 10 }, g1);
  el('rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 }, g1);
  el('rect', { x: 4, y: 2, width: 16, height: 20, rx: 2 }, g1);
  el('rect', { x: 2, y: 4, width: 20, height: 16, rx: 2 }, g1);
  const g2 = layer(2, 'ex-fill');
  el('rect', { x: 0, y: 0, width: 24, height: 24, class: 'ex-plate' }, g2);
  if (icon && icon.secondary) el('path', { d: nodesD([icon.secondary]), class: 'ex-duo' }, g2);
  const g3 = layer(3, 'ex-ink');
  el('rect', { x: 0, y: 0, width: 24, height: 24, class: 'ex-plate' }, g3);
  if (icon) el('path', { d: nodesD(icon.primary), class: 'ex-stroke' }, g3);
  if (icon) {
    for (const [x, y] of alongPolys(icon.primary.flatMap((n) => gf.geometry.flattenNode(n, 0.5)), 14)) el('circle', { cx: x.toFixed(2), cy: y.toFixed(2), r: 0.32, class: 'ex-node' }, g3);
  }
  host.appendChild(stack);
}

const PIECES = { fox: foxOfIcons, constellation, exploded: explodedGrid };

export function artPieces() {
  for (const host of document.querySelectorAll('[data-art-piece]')) {
    const fn = PIECES[host.dataset.artPiece];
    if (!fn) continue;
    const build = () => {
      try {
        fn(host);
      } catch {
        return;
      }
      if (reduced) {
        host.classList.add('in', 'still');
        return;
      }
      requestAnimationFrame(() => requestAnimationFrame(() => host.classList.add('in')));
      // The idle float starts once the entrance has played.
      setTimeout(() => host.classList.add('settled'), 1900);
      watchVisible(host, (v) => host.classList.toggle('live', v));
    };
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1));
    whenNear(host, () => idle(build, { timeout: 400 }), '120%');
  }
}
