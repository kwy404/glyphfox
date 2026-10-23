// The fusion scene: two icons fly in from depth, one from behind the stage
// and one from in front of it, meet in their fusion boxes and fuse. While
// they travel, the part in front already carves its knockout out of the
// part behind (a live mask drawn with the front strokes, widened by the
// gap), then the stage swaps to the exact output of fuse().

import { gf, reduced } from '../app.js';
import { scrollScene, whenNear } from './runner.js';
import { clamp, el, layers, lerp, nodesD, smooth, span, spring } from './util.js';

const FUSIONS = [
  ['cloud', 'lock', 'overlap'],
  ['shield', 'heart', 'inside'],
  ['folder', 'search', 'overlap'],
];
const W = 1.25;
const GAP = 1;
let uid = 0;

export function fuseScene() {
  const section = document.querySelector('[data-scene="fusion"]');
  const stage = document.querySelector('[data-fuse-stage]');
  if (!section || !stage) return;
  const caption = section.querySelector('[data-fusion-caption]');
  const items = FUSIONS.filter(([a, b]) => gf.lookupIcon(a) && gf.lookupIcon(b));
  if (!items.length) return;
  let root;
  let built = [];
  let current = -1;
  let parts = [];
  let cutter;
  let fusedG;
  let fusedPath;
  let fusedFill;
  let flash;

  function init() {
    built = items.map(([a, b, layout]) => {
      const fused = gf.fuse([gf.lookupIcon(a), gf.lookupIcon(b)], { layout, weight: W, gap: GAP });
      const fl = gf.splitLayers(gf.iconNodes(fused));
      const boxes = fused.parts;
      const centers = boxes.map((bx) => [bx.x + bx.size / 2, bx.y + bx.size / 2]);
      return { a, b, layout, fusedD: nodesD(fl.primary), fillD: fl.secondary ? nodesD([fl.secondary]) : '', boxes, meet: [(centers[0][0] + centers[1][0]) / 2, (centers[0][1] + centers[1][1]) / 2], parts: [layers(a), layers(b)] };
    });
    const id = `fz-cut-${++uid}`;
    root = el('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': W, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false', class: 'fz-svg' });
    const defs = el('defs', {}, root);
    const mask = el('mask', { id, maskUnits: 'userSpaceOnUse', x: -60, y: -60, width: 144, height: 144 }, defs);
    el('rect', { x: -60, y: -60, width: 144, height: 144, fill: '#fff', stroke: 'none' }, mask);
    cutter = el('g', { stroke: '#000' }, mask);
    const backWrap = el('g', { mask: `url(#${id})` }, root);
    parts = [el('g', { class: 'fz-part fz-back' }, backWrap), el('g', { class: 'fz-part fz-front' }, root)];
    fusedG = el('g', { class: 'fz-fused' }, root);
    fusedFill = el('path', { class: 'fz-fill', fill: 'currentColor', stroke: 'none' }, fusedG);
    fusedPath = el('path', {}, fusedG);
    flash = el('circle', { class: 'fz-flash', r: 1 }, root);
    stage.appendChild(root);
  }

  function useFusion(i) {
    if (i === current) return;
    current = i;
    const f = built[i];
    f.parts.forEach((l, j) => {
      const g = parts[j];
      const box = f.boxes[j];
      const s = box.size / 20;
      g.replaceChildren();
      g.setAttribute('stroke-width', (W / s).toFixed(3));
      el('path', { d: nodesD(l.primary) }, g);
    });
    cutter.replaceChildren();
    const front = f.parts[1];
    const s1 = f.boxes[1].size / 20;
    for (const node of front.primary) {
      const closed = gf.geometry.isClosedNode(node);
      el('path', { d: nodesD([node]), fill: closed ? '#000' : 'none', 'stroke-width': ((W + 2 * GAP) / s1).toFixed(3) }, cutter);
    }
    fusedPath.setAttribute('d', f.fusedD);
    fusedFill.setAttribute('d', f.fillD);
    if (caption) caption.innerHTML = `<b>${f.a} &amp; ${f.b}</b> / ${f.layout} <span class="fz-spec">${f.a}&amp;${f.b}:${f.layout}</span>`;
  }

  function partTransform(f, j, e) {
    const box = f.boxes[j];
    const s = box.size / 20;
    const cx = box.x + box.size / 2;
    const cy = box.y + box.size / 2;
    // Part 0 comes from behind (small, upper left), part 1 from the front (large, lower right).
    const fromX = j === 0 ? -14 : 16;
    const fromY = j === 0 ? -9 : 11;
    const fromS = j === 0 ? 0.35 : 2.3;
    const rot = (j === 0 ? -38 : 32) * (1 - e);
    const k = lerp(fromS, 1, e);
    const tx = cx + fromX * (1 - e);
    const ty = cy + fromY * (1 - e);
    return `translate(${tx.toFixed(3)} ${ty.toFixed(3)}) rotate(${rot.toFixed(2)}) scale(${(k * s).toFixed(4)}) translate(-12 -12)`;
  }

  function update(p) {
    if (!root) return;
    const n = built.length;
    const x = reduced ? 0.75 : Math.min(n - 1e-6, p * n);
    const i = Math.floor(x);
    const w = x - i;
    useFusion(i);
    const f = built[i];
    const last = i === n - 1;
    const fly = [span(w, 0.02, 0.46), span(w, 0.08, 0.5)];
    const merge = reduced ? 1 : span(w, 0.5, 0.6);
    parts.forEach((g, j) => {
      const e = reduced ? 1 : spring(fly[j], { bounce: 0.34, speed: 6.5 });
      const tf = partTransform(f, j, e);
      g.setAttribute('transform', tf);
      if (j === 1) cutter.setAttribute('transform', tf);
      g.style.opacity = (clamp(fly[j] * 5) * (1 - merge)).toFixed(3);
    });
    const out = last || reduced ? 0 : span(w, 0.9, 1);
    const v = span(w, 0.5, 0.8);
    const wobble = v > 0 && v < 1 ? Math.exp(-5 * v) * Math.sin(v * 14) : 0;
    fusedG.style.opacity = (merge * (1 - out)).toFixed(3);
    fusedG.setAttribute('transform', `translate(12 12) scale(${(1 + 0.12 * wobble - 0.08 * out).toFixed(4)}) translate(-12 -12)`);
    fusedFill.style.opacity = (0.3 * (reduced ? 1 : smooth(span(w, 0.58, 0.75)))).toFixed(3);
    const fl = span(w, 0.48, 0.7);
    flash.setAttribute('cx', f.meet[0].toFixed(2));
    flash.setAttribute('cy', f.meet[1].toFixed(2));
    flash.setAttribute('r', (1 + fl * 11).toFixed(3));
    flash.style.opacity = fl > 0 && fl < 1 ? ((1 - fl) * 0.9).toFixed(3) : '0';
    stage.classList.toggle('is-fused', merge >= 1 && out < 0.5);
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
