// The sync scene: seven signature icons play their living states from one
// clock, like a step sequencer. Scrolling brings the tracks in one by one;
// the clock only runs while the stage is on screen. Frames come from the
// same sampler the studio uses to export GIF and WebM.

import { gf, reduced } from '../app.js';
import { scrollScene, watchVisible, whenNear } from './runner.js';
import { el, layers, nodesD } from './util.js';

const STEPS = 16;
const STEP_MS = 60000 / 112 / 2;
const TRACKS = [
  { name: 'bell', preset: 'shake', hits: [0, 8] },
  { name: 'heart', preset: 'pop', hits: [4, 12] },
  { name: 'download', preset: 'bounce', hits: [2, 6, 10, 14] },
  { name: 'loader-circle', preset: 'spin', hits: [0, 8], duration: STEP_MS * 8 },
  { name: 'star', preset: 'wiggle', hits: [3, 11] },
  { name: 'activity', preset: 'draw', hits: [0], duration: STEP_MS * 6 },
  { name: 'mic', preset: 'pulse', hits: [0, 2, 4, 6, 8, 10, 12, 14], duration: STEP_MS * 2 },
];

export function syncScene() {
  const section = document.querySelector('[data-scene="sync"]');
  const stage = document.querySelector('[data-sync-stage]');
  if (!section || !stage) return;
  const tracks = TRACKS.filter((tr) => gf.lookupIcon(tr.name));
  let built = false;
  let playhead;
  let visible = false;
  let raf = 0;
  let t0 = 0;
  let lastStep = -1;
  let live = reduced ? tracks.length : 0;

  function init() {
    if (built) return;
    built = true;
    const row = document.createElement('div');
    row.className = 'sy-row';
    const seq = document.createElement('div');
    seq.className = 'sy-seq';
    playhead = document.createElement('i');
    playhead.className = 'sy-head';
    seq.appendChild(playhead);
    tracks.forEach((tr, k) => {
      const l = layers(tr.name);
      const cell = document.createElement('div');
      cell.className = 'sy-icon';
      const root = el('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' });
      const g = el('g', {}, root);
      if (l.secondary) tr.fill = el('path', { class: 'sy-fill', d: nodesD([l.secondary]), fill: 'currentColor', stroke: 'none', opacity: 0.3 }, g);
      tr.paths = l.primary.map((node) => el('path', { d: nodesD([node]), pathLength: tr.preset === 'draw' ? 1 : undefined, 'stroke-dasharray': tr.preset === 'draw' ? '1 1' : undefined }, g));
      tr.g = g;
      tr.spec = { animate: tr.preset, duration: tr.duration, count: tr.paths.length };
      const name = document.createElement('small');
      name.textContent = tr.preset;
      cell.append(root, name);
      row.appendChild(cell);
      tr.cell = cell;
      const line = document.createElement('div');
      line.className = 'sy-line';
      tr.cells = [];
      for (let s = 0; s < STEPS; s++) {
        const c = document.createElement('i');
        if (tr.hits.includes(s)) c.className = 'hit';
        line.appendChild(c);
        tr.cells.push(c);
      }
      seq.appendChild(line);
      tr.line = line;
      tr.index = k;
      tr.last = -Infinity;
    });
    stage.append(row, seq);
    mute();
  }

  function mute() {
    tracks.forEach((tr, k) => {
      const on = k < live;
      tr.cell.classList.toggle('on', on);
      tr.line.classList.toggle('on', on);
    });
  }

  function pose(tr, ms) {
    const st = gf.frameState(tr.spec, ms);
    if (!st) return;
    if (tr.preset === 'draw') {
      tr.paths.forEach((p, i) => {
        const d = st.draw[i] || { offset: 0 };
        p.setAttribute('stroke-dashoffset', d.offset.toFixed(4));
      });
      if (tr.fill) tr.fill.setAttribute('opacity', (0.3 * st.fill).toFixed(3));
    } else {
      tr.g.setAttribute('transform', st.transform);
      tr.g.setAttribute('opacity', String(st.opacity));
    }
  }

  function rest(tr) {
    if (tr.resting) return;
    tr.resting = true;
    if (tr.preset === 'draw') tr.paths.forEach((p) => p.setAttribute('stroke-dashoffset', '0'));
    else {
      tr.g.removeAttribute('transform');
      tr.g.removeAttribute('opacity');
    }
  }

  function frame(now) {
    raf = 0;
    if (!visible) return;
    init();
    const clock = now - t0;
    const pos = clock / STEP_MS;
    const step = Math.floor(pos) % STEPS;
    if (step !== lastStep) {
      lastStep = step;
      playhead.style.transform = `translateX(${step * 100}%)`;
      for (const tr of tracks) {
        const hit = tr.hits.includes(step);
        if (hit && tr.index < live) {
          tr.last = Math.floor(pos) * STEP_MS;
          tr.cells[step].animate([{ transform: 'scale(1.45)', opacity: 1 }, { transform: 'scale(1)', opacity: 0.85 }], { duration: 420, easing: 'cubic-bezier(.22,1.2,.36,1)' });
        }
      }
    }
    for (const tr of tracks) {
      if (tr.index >= live || tr.last === -Infinity) {
        rest(tr);
        continue;
      }
      tr.resting = false;
      pose(tr, clock - tr.last);
    }
    raf = requestAnimationFrame(frame);
  }

  function update(p) {
    init();
    const n = Math.max(0, Math.min(tracks.length, Math.floor((p - 0.04) / 0.1) + 1));
    if (n !== live) {
      live = n;
      mute();
    }
  }

  if (reduced) {
    whenNear(section, () => {
      init();
      stage.classList.add('is-still');
    });
    return;
  }
  scrollScene(section, { init, update });
  watchVisible(stage, (v) => {
    visible = v;
    if (v && !raf) {
      if (!t0) t0 = performance.now();
      raf = requestAnimationFrame(frame);
    }
  });
}
