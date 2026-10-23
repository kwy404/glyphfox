// The morph scene: one icon travels the chain menu, close, check, heart and
// finally fills. Strands come straight from the morph engine (matched,
// resampled and aligned once per pair), so every scroll frame only moves
// points. A short trail and the matched points show the engine at work, and
// each arrival lands with a small spring.

import { gf, reduced, svg } from '../app.js';
import { scrollScene, whenNear } from './runner.js';
import { clamp, easeInOut, el, nodesD, span } from './util.js';

const CHAIN = [
  ['menu', 'menu'],
  ['x', 'x'],
  ['check', 'check'],
  ['heart', 'heart'],
];
const ARROW = '→';

export function morphChain() {
  const section = document.querySelector('[data-scene="morph"]');
  const host = document.querySelector('[data-morph-chain]');
  if (!section || !host) return;
  const chain = CHAIN.filter(([n]) => gf.lookupIcon(n));
  if (chain.length < 2) return;
  const label = section.querySelector('[data-morph-label]');
  const list = section.querySelector('[data-pairs]');
  const ring = section.querySelector('.morph-ring');
  let root;
  let main;
  let trail = [];
  let dots;
  let fill;
  let items = [];
  const preps = [];
  let current = -1;
  let paths = [];
  let trailPaths = [];
  let dotEls = [];

  function init() {
    if (list) {
      list.classList.add('chain-list');
      list.innerHTML = chain.map(([n, word]) => `<li>${svg(n, { size: 14 })}<span>${word}</span></li>`).join('') + `<li class="chain-fill">${svg('heart', { size: 14, variant: 'solid' })}<span>heart/solid</span></li>`;
      items = [...list.children];
    }
    root = el('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false', class: 'mc-svg' });
    const heart = gf.lookupIcon('heart');
    fill = el('path', { class: 'mc-fill', d: heart ? nodesD(gf.splitLayers(gf.iconNodes(heart)).primary) : '', fill: 'currentColor', stroke: 'none' }, root);
    trail = [el('g', { class: 'mc-trail', opacity: 0.1 }, root), el('g', { class: 'mc-trail', opacity: 0.22 }, root)];
    main = el('g', { class: 'mc-main' }, root);
    dots = el('g', { class: 'mc-dots' }, root);
    for (let i = 0; i < chain.length - 1; i++) preps.push(gf.prepareMorph(gf.lookupIcon(chain[i][0]), gf.lookupIcon(chain[i + 1][0])));
    host.appendChild(root);
  }

  function useSegment(i) {
    if (i === current) return;
    current = i;
    const prep = preps[i];
    main.replaceChildren();
    trail.forEach((g) => g.replaceChildren());
    dots.replaceChildren();
    paths = prep.pairs.map(() => el('path', {}, main));
    trailPaths = trail.map((g) => prep.pairs.map(() => el('path', {}, g)));
    dotEls = [];
    for (const pair of prep.pairs) {
      for (let k = 0; k < pair.A.length; k += 5) dotEls.push({ pair, k, node: el('circle', { r: 0.28 }, dots) });
    }
  }

  function drawPairs(prep, m, targets) {
    prep.pairs.forEach((pair, j) => {
      const node = targets[j];
      const op = gf.pairOpacity(pair, m);
      if (op <= 0.01) {
        node.setAttribute('d', '');
        return;
      }
      node.setAttribute('d', gf.pointsToPath(gf.pairPoints(pair, m), pair.closed && pair.fade === 0));
      node.setAttribute('opacity', op < 1 ? op.toFixed(3) : '1');
    });
  }

  function update(p) {
    if (!root) return;
    const segs = preps.length + 1;
    const x = reduced ? segs - 1e-6 : Math.min(segs - 1e-6, p * segs);
    const i = Math.floor(x);
    const u = x - i;
    const fillSeg = i >= preps.length;
    const si = Math.min(i, preps.length - 1);
    useSegment(si);
    const prep = preps[si];
    const m = fillSeg ? 1 : easeInOut(span(u, 0.12, 0.72));
    drawPairs(prep, m, paths);
    const moving = m > 0 && m < 1;
    trail.forEach((g, k) => {
      g.style.display = moving ? '' : 'none';
      if (moving) drawPairs(prep, clamp(m - (2 - k) * 0.07), trailPaths[k]);
    });
    const dotOp = moving ? Math.sin(Math.PI * m) : 0;
    dots.style.opacity = dotOp.toFixed(3);
    if (dotOp > 0.02) {
      for (const d of dotEls) {
        const pts = gf.pairPoints(d.pair, m);
        const pt = pts[d.k];
        if (!pt) continue;
        d.node.setAttribute('cx', pt[0].toFixed(2));
        d.node.setAttribute('cy', pt[1].toFixed(2));
      }
    }
    // Spring on arrival: a damped wobble after each morph lands.
    const v = fillSeg ? span(u, 0.05, 0.8) : span(u, 0.7, 1);
    const wobble = v > 0 && v < 1 ? Math.exp(-5 * v) * Math.sin(v * 15) : 0;
    root.style.transform = `scale(${(1 + 0.22 * wobble).toFixed(4)})`;
    const f = reduced ? 1 : fillSeg ? span(u, 0.05, 0.45) : 0;
    fill.style.opacity = (f * 0.95).toFixed(3);
    host.classList.toggle('is-love', fillSeg || (i === preps.length - 1 && m >= 1));
    if (ring) ring.style.transform = `rotate(${(p * 120).toFixed(2)}deg)`;
    const at = fillSeg ? chain.length : m >= 0.5 ? si + 1 : si;
    items.forEach((li, j) => {
      li.classList.toggle('on', j === at);
      li.classList.toggle('done', j < at);
    });
    if (label) {
      const a = chain[si][1];
      const b = chain[si + 1][1];
      label.textContent = fillSeg ? `heart ${ARROW} heart/solid` : `${a} ${ARROW} ${b}`;
    }
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
