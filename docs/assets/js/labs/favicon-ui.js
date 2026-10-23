// Favicon panel: frames of a living state or a morph, an animated preview
// in two browser tabs, a filmstrip, a switch that plays the animation on
// this page's own tab icon, and the kit download (SVG, PNG, runtime, tags).

import { $, $$, codeBlock, download, reduced, t, toast } from '../app.js';
import { zip } from '../exporters.js';
import { FAVICON_ANIMATIONS, animateFavicon, faviconFrames, faviconKit } from '../../../vendor/glyphfox-labs.js';
import { entries, esc, rangeFill, resolveIcon, sourceControl, svgUri } from './shared.js';

const FRAMES = 24;
const state = { animate: 'pulse', morphTo: 'bell-ring', color: '#ff7a1a', background: '#14112b', useBackground: false, fps: 12 };
let src;
let uris = [];
let frames = [];
let index = 0;
let timer = 0;
let tab = null;

function options(icon) {
  const opts = { animate: state.animate, color: state.color, background: state.useBackground ? state.background : null, frames: FRAMES };
  if (state.animate === 'morph') opts.morphTo = resolveIcon(state.morphTo) || icon;
  return opts;
}

function paint() {
  if (!uris.length) return;
  const u = uris[index % uris.length];
  $('[data-fv-big]').src = u;
  for (const img of $$('[data-fv-tabicon]')) img.src = u;
  const strip = $$('[data-fv-frames] img');
  strip.forEach((img, k) => img.classList.toggle('on', k === index % uris.length));
}

function play() {
  clearInterval(timer);
  index = 0;
  paint();
  if (reduced || uris.length < 2) return;
  timer = setInterval(() => {
    if ($('[data-panel="favicon"]').hidden || document.hidden) return;
    index = (index + 1) % uris.length;
    paint();
  }, 1000 / state.fps);
}

function restartTab() {
  if (!tab) return;
  tab.stop();
  tab = animateFavicon(frames, { fps: state.fps });
}

function render() {
  const icon = src.icon();
  const note = $('[data-fv-note]');
  note.textContent = reduced ? t('labs.favicon.reduced') : '';
  if (!icon) {
    uris = [];
    frames = [];
    $('[data-fv-frames]').innerHTML = '';
    return;
  }
  try {
    frames = faviconFrames(icon, options(icon));
  } catch (err) {
    note.textContent = t('labs.error', { message: err.message });
    return;
  }
  uris = frames.map(svgUri);
  $('[data-fv-frames]').innerHTML = uris.map((u) => `<img src="${u}" alt="" width="40" height="40" loading="lazy">`).join('');
  play();
  restartTab();
}

function setTabButton() {
  const b = $('[data-fv-act="tab"]');
  b.setAttribute('aria-pressed', String(Boolean(tab)));
  $('[data-fv-tab-label]').textContent = t(tab ? 'labs.favicon.tabStop' : 'labs.favicon.tab');
}

export function init() {
  src = sourceControl('favicon', render);
  const sel = $('[data-fv="animate"]');
  sel.innerHTML = FAVICON_ANIMATIONS.map((a) => `<option value="${esc(a)}"${a === state.animate ? ' selected' : ''}>${esc(a)}</option>`).join('');
  sel.addEventListener('change', () => {
    state.animate = sel.value;
    $('[data-fv-morph]').hidden = state.animate !== 'morph';
    render();
  });
  const morph = $('[data-fv="morphTo"]');
  morph.addEventListener('change', () => {
    state.morphTo = morph.value.trim();
    render();
  });
  for (const key of ['color', 'background']) {
    const input = $(`[data-fv="${key}"]`);
    input.addEventListener('input', () => {
      state[key] = input.value;
      if (key === 'background' && !state.useBackground) {
        state.useBackground = true;
        $('[data-fv="useBackground"]').checked = true;
      }
      render();
    });
  }
  $('[data-fv="useBackground"]').addEventListener('change', (e) => {
    state.useBackground = e.target.checked;
    render();
  });
  const fps = $('[data-fv="fps"]');
  rangeFill(fps);
  fps.addEventListener('input', () => {
    state.fps = Number(fps.value);
    $('[data-fv-o="fps"]').textContent = fps.value;
    rangeFill(fps);
    play();
    restartTab();
  });
  $('[data-fv-act="tab"]').addEventListener('click', () => {
    if (tab) {
      tab.stop();
      tab = null;
    } else if (frames.length) {
      tab = animateFavicon(frames, { fps: state.fps });
    }
    setTabButton();
  });
  $('[data-fv-act="download"]').addEventListener('click', () => {
    const icon = src.icon();
    if (!icon) return;
    try {
      const files = faviconKit(icon, { ...options(icon), fps: state.fps });
      download(zip(entries(files)), `${src.name()}-favicon.zip`, 'application/zip');
      toast(t('toast.downloaded'));
    } catch (err) {
      toast(t('labs.error', { message: err.message }));
    }
  });
  const sample = resolveIcon('bell');
  if (sample) $('[data-fv-code]').replaceChildren(codeBlock(faviconKit(sample, { frames: 2 })['favicon.html'], 'js', 'favicon.html'));
  setTabButton();
  render();
}

export function shown() {
  paint();
}
