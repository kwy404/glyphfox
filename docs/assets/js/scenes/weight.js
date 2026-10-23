// The weight scene: one specimen and a strip of icons ride the weight axis
// from 1 to 3 as the page scrolls. The strip lags behind the specimen, so
// the sweep rolls through it like a wave; the needle on the axis follows,
// then corners turn sharp and the style steps through duotone and solid.

import { reduced, svg, t } from '../app.js';
import { scrollScene, whenNear } from './runner.js';
import { clamp, easeInOut, el } from './util.js';

const SPECIMEN = 'bell';
const STRIP = ['home', 'search', 'heart', 'star', 'cloud', 'folder', 'mail', 'settings'];

function weightAt(q) {
  if (q <= 0) return 1;
  if (q < 0.45) return 1 + 2 * easeInOut(q / 0.45);
  if (q < 0.6) return 3 - easeInOut((q - 0.45) / 0.15);
  return 2;
}

export function weightScene() {
  const section = document.querySelector('[data-scene="axes"]');
  const board = document.querySelector('[data-weight-board]');
  if (!section || !board) return;
  const out = (k) => section.querySelector(`[data-out="${k}"]`);
  const bar = section.querySelector('[data-bar="weight"]');
  let spec;
  let strip = [];
  let needle;
  let px;
  let state = '';

  function init() {
    const hero = document.createElement('div');
    hero.className = 'wt-hero';
    spec = document.createElement('div');
    spec.className = 'wt-spec';
    px = document.createElement('span');
    px.className = 'wt-px';
    hero.append(spec, px);
    const axis = el('svg', { class: 'wt-axis', viewBox: '0 0 320 46', 'aria-hidden': 'true', focusable: 'false' });
    el('path', { class: 'wt-base', d: 'M20 18H300' }, axis);
    for (let i = 0; i <= 20; i++) {
      const x = 20 + i * 14;
      const major = i % 5 === 0;
      el('path', { class: major ? 'wt-tick major' : 'wt-tick', d: `M${x} ${major ? 10 : 13}V${major ? 26 : 23}` }, axis);
      if (major) {
        const label = el('text', { x, y: 42, 'text-anchor': 'middle' }, axis);
        label.textContent = (1 + i * 0.1).toFixed(1);
      }
    }
    el('path', { class: 'wt-fill', d: 'M20 18H300', pathLength: 1 }, axis);
    needle = el('g', { class: 'wt-needle' }, axis);
    el('path', { d: 'M0 4V32' }, needle);
    el('circle', { cx: 0, cy: 18, r: 5 }, needle);
    const row = document.createElement('div');
    row.className = 'wt-strip';
    strip = STRIP.map(() => {
      const tile = document.createElement('div');
      tile.className = 'tile';
      row.appendChild(tile);
      return tile;
    });
    board.append(hero, axis, row);
  }

  function paint(corners, variant) {
    spec.innerHTML = svg(SPECIMEN, { size: 160, corners, variant });
    STRIP.forEach((n, i) => {
      strip[i].innerHTML = svg(n, { size: 40, corners, variant });
    });
  }

  function update(p) {
    if (!spec) return;
    const q = reduced ? 1 : p;
    const corners = q >= 0.62 && q < 0.74 ? 'sharp' : 'round';
    const variant = reduced ? 'duotone' : q < 0.74 ? 'outline' : q < 0.87 ? 'duotone' : 'solid';
    if (`${corners}|${variant}` !== state) {
      state = `${corners}|${variant}`;
      paint(corners, variant);
    }
    const w = reduced ? 2 : weightAt(q);
    const set = (host, v) => {
      const s = host.firstElementChild;
      if (s) s.setAttribute('stroke-width', v.toFixed(3));
    };
    set(spec, w);
    strip.forEach((tile, i) => {
      // Still layout: the strip shows the whole axis at once, 1 to 3.
      const v = reduced ? 1 + (2 * i) / (strip.length - 1) : weightAt(q - 0.035 * (i + 1));
      set(tile, v);
      tile.classList.toggle('hot', !reduced && Math.abs(v - w) < 0.04 && q > 0.02 && q < 0.6);
    });
    const x = 20 + ((w - 1) / 2) * 280;
    needle.setAttribute('transform', `translate(${x.toFixed(2)} 0)`);
    needle.previousElementSibling.setAttribute('stroke-dashoffset', String(1 - (w - 1) / 2));
    px.textContent = `${w.toFixed(2)}`;
    const ow = out('weight');
    if (ow) ow.textContent = w.toFixed(2);
    const oc = out('corners');
    if (oc) oc.textContent = t(`corners.${corners}`);
    const ov = out('variant');
    if (ov) ov.textContent = t(`variant.${variant}`);
    if (bar) bar.style.width = `${clamp((w - 1) / 2) * 100}%`;
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
