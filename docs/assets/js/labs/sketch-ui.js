// Sketch search tool of the studio: draw a rough shape and the closest
// icons appear while you draw. The shape index (docs/data/sketch-index.json,
// built by scripts/labs/sketch-index.mjs) is compared in the page, so there
// is no network round trip after it loads.

import { $, copy, fennArt, svg, t, toast } from '../app.js';
import { sketchPad } from '../sketch.js';
import { extract, rank, unpackIndex } from './sketch-core.js';

export const LIMIT = 24;

let indexPromise = null;

/** The index entries ({ name, sig }), fetched once. */
export function loadIndex() {
  if (!indexPromise) {
    indexPromise = fetch(new URL('../../../data/sketch-index.json', import.meta.url))
      .then((r) => {
        if (!r.ok) throw new Error(`sketch index: HTTP ${r.status}`);
        return r.json();
      })
      .then(unpackIndex);
  }
  return indexPromise;
}

export async function initSketch(data, { openInEditor }) {
  const panel = $('[data-panel="sketch"]');
  const results = $('[data-sk-results]', panel);
  const status = $('[data-sk-status]', panel);
  const bar = $('[data-sk-actions]', panel);
  let entries = [];
  let strokes = [];
  let hits = [];
  let selected = null;
  let frame = 0;

  const paint = (ms) => {
    if (!hits.length) {
      status.textContent = strokes.length ? t('sketch.more') : t('sketch.hint');
      results.innerHTML = `<div class="sk-empty">${fennArt('drawing')}<p class="faint">${t('sketch.empty')}</p></div>`;
      bar.hidden = true;
      return;
    }
    status.textContent = t('sketch.result', { n: hits.length, ms: ms < 1 ? '<1' : ms.toFixed(1) });
    if (!hits.some((h) => h.name === selected)) selected = null;
    results.innerHTML = hits
      .map((h, i) => `<button type="button" class="sk-hit${i === 0 ? ' best' : ''}" data-name="${h.name}" aria-pressed="${h.name === selected}" title="${h.name}">${svg(h.name, { size: 28 })}<span>${h.name}</span></button>`)
      .join('');
    bar.hidden = !selected;
  };

  const update = () => {
    frame = 0;
    const t0 = performance.now();
    hits = rank(extract(strokes), entries, LIMIT);
    paint(performance.now() - t0);
  };

  const pad = sketchPad($('[data-sk-canvas]', panel), (s) => {
    strokes = s;
    if (!frame) frame = requestAnimationFrame(update);
  });

  results.addEventListener('click', (e) => {
    const b = e.target.closest('[data-name]');
    if (!b) return;
    selected = b.dataset.name;
    for (const x of results.querySelectorAll('[data-name]')) x.setAttribute('aria-pressed', String(x === b));
    $('[data-sk-name]', bar).textContent = selected;
    $('[data-sk-view]', bar).setAttribute('href', `icons.html#${selected}`);
    bar.hidden = false;
  });
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sk]');
    if (!b) return;
    const act = b.dataset.sk;
    if (act === 'undo') pad.undo();
    else if (act === 'clear') pad.clear();
    else if (act === 'copy' && selected) copy(svg(selected));
    else if (act === 'edit' && selected) {
      const icon = data.byName.get(selected);
      if (icon) openInEditor(icon.body, `${selected}-remix`);
    }
  });

  status.textContent = t('sketch.loading');
  try {
    entries = (await loadIndex()).filter((e) => data.byName.has(e.name));
  } catch (err) {
    status.textContent = t('sketch.failed');
    toast(err.message);
    return;
  }
  paint(0);
}
