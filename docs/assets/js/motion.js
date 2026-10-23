// Motion: the frames editor. A timeline per element of an icon, keyframes
// you add, drag and ease, a live preview with play, scrub and loop, and
// export as CSS, as the JSON sidecar format, as animated SVG, GIF or WebM.

import { $, $$, codeBlock, copy, download, gf, t, toast } from './app.js';
import { bakeColor, encodeGif, svgToCanvas } from './exporters.js';

const EASINGS = ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'cubic-bezier(.34,1.56,.64,1)', 'cubic-bezier(.65,0,.35,1)'];
const FORMATS = ['css', 'json', 'svg'];
const state = { name: '', icon: null, tl: null, selected: -1, t: 0, playing: false, format: 'css', raf: 0, last: 0 };

const DEFAULT_TL = () => ({
  name: 'custom',
  duration: 900,
  easing: 'ease-in-out',
  loop: true,
  frames: [
    { at: 0, element: 'all', props: { transform: 'scale(1)' } },
    { at: 0.5, element: 'all', props: { transform: 'scale(1.15)' } },
    { at: 1, element: 'all', props: { transform: 'scale(1)' } },
  ],
});

function elements() {
  if (!state.icon) return [];
  const nodes = gf.parseBody(state.icon.body);
  const { secondary, primary } = gf.splitLayers(nodes);
  return ['all', ...primary.map((_, i) => String(i)), ...(secondary ? ['secondary'] : [])];
}

const keyOf = (el) => (el === undefined || el === null || el === '*' ? 'all' : String(el));
const label = (k) => (k === 'all' ? t('motion.all') : k === 'secondary' ? t('motion.secondary') : `${t('motion.element')} ${Number(k) + 1}`);
const normalized = () => gf.normalizeTimeline(state.tl);

function load(name) {
  const icon = gf.lookupIcon(name);
  if (!icon) return false;
  state.name = name;
  state.icon = icon;
  const own = icon.animation ? (Array.isArray(icon.animation) ? icon.animation[0] : icon.animation) : null;
  state.tl = JSON.parse(JSON.stringify(own || DEFAULT_TL()));
  state.selected = -1;
  state.t = 0;
  $('[data-mo="duration"]').value = String(state.tl.duration || 800);
  $('[data-mo="easing"]').value = EASINGS.includes(state.tl.easing) ? state.tl.easing : 'ease';
  $('[data-mo="loop"]').checked = state.tl.loop !== false;
  render();
  return true;
}

function frameMarkup(size, ms) {
  const tl = normalized();
  if (!tl) return gf.renderToString(state.icon, { size });
  return gf.renderToString(state.icon, { size, animation: state.tl, frame: ms, weight: 2 });
}

function renderStage() {
  const dur = state.tl.duration || 800;
  $('[data-mo-stage]').innerHTML = frameMarkup(240, state.t * dur);
  $('[data-mo="scrub"]').value = String(Math.round(state.t * 1000));
  $('[data-mo-time]').textContent = `${Math.round(state.t * dur)} ms`;
  const lanes = $$('[data-mo-lane]');
  for (const l of lanes) l.style.setProperty('--gf-head', `${state.t * 100}%`);
}

function renderTimeline() {
  const rows = elements().map((k) => {
    const marks = state.tl.frames
      .map((f, i) => ({ f, i }))
      .filter(({ f }) => keyOf(f.element) === k)
      .map(({ f, i }) => `<button type="button" class="mo-key${i === state.selected ? ' on' : ''}" data-key="${i}" style="left:${(f.at * 100).toFixed(2)}%" aria-label="${label(k)} ${Math.round(f.at * 100)}%"></button>`)
      .join('');
    return `<div class="mo-row"><span class="mo-name">${label(k)}</span><div class="mo-lane" data-mo-lane="${k}">${marks}</div></div>`;
  });
  $('[data-mo-timeline]').innerHTML = rows.join('');
}

function renderInspector() {
  const box = $('[data-mo-keyframe]');
  const f = state.tl.frames[state.selected];
  box.hidden = !f;
  if (!f) return;
  $('[data-mk="at"]').value = String(Math.round(f.at * 1000) / 10);
  $('[data-mk="transform"]').value = f.props.transform ?? '';
  $('[data-mk="opacity"]').value = f.props.opacity ?? '';
  $('[data-mk="dash"]').value = f.props.strokeDashoffset ?? '';
  $('[data-mk="easing"]').value = f.easing ?? '';
}

function renderCode() {
  const tl = normalized();
  let code = '';
  let lang = 'css';
  if (state.format === 'json') {
    code = JSON.stringify({ animation: state.tl }, null, 2);
    lang = 'json';
  } else if (state.format === 'svg') {
    code = gf.renderToString(state.icon, { animation: state.tl, trigger: 'mount', size: 24 });
    lang = 'html';
  } else {
    code = tl ? gf.timelineCss(tl, { trigger: 'mount' }).css.replace(/\}/g, '}\n') : '';
  }
  $('[data-mo-code]').replaceChildren(codeBlock(code, lang, state.format.toUpperCase()));
  for (const b of $$('[data-mo-formats] button')) b.setAttribute('aria-selected', String(b.dataset.format === state.format));
}

function render() {
  if (!state.icon) return;
  renderTimeline();
  renderInspector();
  renderStage();
  renderCode();
}

function tick(now) {
  if (!state.playing) return;
  const dur = state.tl.duration || 800;
  const dt = state.last ? now - state.last : 0;
  state.last = now;
  state.t += dt / dur;
  if (state.t >= 1) {
    if ($('[data-mo="loop"]').checked) state.t %= 1;
    else {
      state.t = 1;
      setPlaying(false);
    }
  }
  renderStage();
  state.raf = requestAnimationFrame(tick);
}

function setPlaying(on) {
  state.playing = on;
  state.last = 0;
  cancelAnimationFrame(state.raf);
  const b = $('[data-mo-act="play"]');
  b.setAttribute('aria-pressed', String(on));
  b.innerHTML = gf.renderToString(gf.lookupIcon(on ? 'pause' : 'play') || gf.lookupIcon('circle'), { size: 18 });
  b.setAttribute('aria-label', t(on ? 'motion.pause' : 'motion.play'));
  if (on) {
    if (state.t >= 1) state.t = 0;
    state.raf = requestAnimationFrame(tick);
  }
}

function sampled(key) {
  const tl = normalized();
  if (!tl) return {};
  const st = gf.sampleTimeline(tl, state.t * tl.duration).find((s) => s.element === key) || {};
  const props = {};
  for (const k of ['transform', 'opacity', 'strokeDashoffset']) if (st[k] !== undefined) props[k] = typeof st[k] === 'number' ? Math.round(st[k] * 1000) / 1000 : st[k];
  return Object.keys(props).length ? props : { transform: 'scale(1)' };
}

function laneAt(lane, clientX) {
  const r = lane.getBoundingClientRect();
  return Math.max(0, Math.min(1, Math.round(((clientX - r.left) / r.width) * 100) / 100));
}

async function exportFrames(size, fps) {
  const dur = state.tl.duration || 800;
  const count = Math.max(2, Math.round((dur / 1000) * fps) + 1);
  const frames = [];
  for (let i = 0; i < count; i++) {
    const markup = bakeColor(frameMarkup(size, (i / (count - 1)) * dur), '#f5f5f6');
    const c = await svgToCanvas(markup, size, size, '#0b0b0f');
    frames.push(c.getContext('2d').getImageData(0, 0, size, size));
  }
  return { frames, delay: 1000 / fps };
}

async function exportWebm() {
  if (typeof MediaRecorder === 'undefined') throw new Error('MediaRecorder');
  const size = 512;
  const fps = 30;
  const { frames, delay } = await exportFrames(size, fps);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(frames[0], 0, 0);
  const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((x) => MediaRecorder.isTypeSupported(x)) || 'video/webm';
  const rec = new MediaRecorder(canvas.captureStream(fps), { mimeType: type });
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise((r) => (rec.onstop = r));
  rec.start();
  for (const f of frames) {
    ctx.putImageData(f, 0, 0);
    await new Promise((r) => setTimeout(r, delay));
  }
  rec.stop();
  await done;
  return new Blob(chunks, { type: 'video/webm' });
}

export function initMotion() {
  $('[data-mo="easing"]').innerHTML = EASINGS.map((e) => `<option value="${e}">${e}</option>`).join('');
  $('[data-mk="easing"]').innerHTML = `<option value="">${t('motion.inherit')}</option>` + EASINGS.map((e) => `<option value="${e}">${e}</option>`).join('');
  $('[data-mo-formats]').innerHTML = FORMATS.map((f) => `<button type="button" role="tab" data-format="${f}" aria-selected="${f === state.format}">${f.toUpperCase()}</button>`).join('');
  const iconInput = $('[data-mo="icon"]');
  iconInput.addEventListener('change', () => {
    if (!load(iconInput.value.trim())) toast(t('motion.unknown'));
  });
  $('[data-mo="duration"]').addEventListener('input', (e) => {
    const v = Number(e.target.value);
    if (Number.isFinite(v) && v >= 50) state.tl.duration = Math.round(v);
    render();
  });
  $('[data-mo="easing"]').addEventListener('change', (e) => {
    state.tl.easing = e.target.value;
    render();
  });
  $('[data-mo="loop"]').addEventListener('change', (e) => {
    state.tl.loop = e.target.checked;
    renderCode();
  });
  $('[data-mo="scrub"]').addEventListener('input', (e) => {
    setPlaying(false);
    state.t = Number(e.target.value) / 1000;
    renderStage();
  });
  $('[data-mo-act="play"]').addEventListener('click', () => setPlaying(!state.playing));
  $('[data-mo-act="reset"]').addEventListener('click', () => load(state.name));
  $('[data-mo-act="clear"]').addEventListener('click', () => {
    state.tl.frames = [];
    state.selected = -1;
    render();
  });
  // Timeline: click a lane to add a keyframe there, drag a keyframe to move it.
  const timeline = $('[data-mo-timeline]');
  let drag = null;
  timeline.addEventListener('pointerdown', (e) => {
    const key = e.target.closest('[data-key]');
    const lane = e.target.closest('[data-mo-lane]');
    if (!lane) return;
    if (key) {
      state.selected = Number(key.dataset.key);
      drag = { lane, index: state.selected };
      key.setPointerCapture(e.pointerId);
      renderTimeline();
      renderInspector();
      return;
    }
    const at = laneAt(lane, e.clientX);
    const element = lane.dataset.moLane;
    state.tl.frames.push({ at, element: element === 'all' || element === 'secondary' ? element : Number(element), props: sampled(element) });
    state.selected = state.tl.frames.length - 1;
    render();
  });
  timeline.addEventListener('pointermove', (e) => {
    if (!drag) return;
    state.tl.frames[drag.index].at = laneAt(drag.lane, e.clientX);
    state.t = state.tl.frames[drag.index].at;
    renderTimeline();
    renderInspector();
    renderStage();
  });
  const end = () => {
    if (!drag) return;
    drag = null;
    render();
  };
  timeline.addEventListener('pointerup', end);
  timeline.addEventListener('pointercancel', end);
  timeline.addEventListener('keydown', (e) => {
    if (state.selected < 0) return;
    const f = state.tl.frames[state.selected];
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      f.at = Math.max(0, Math.min(1, Math.round((f.at + (e.key === 'ArrowRight' ? 0.01 : -0.01)) * 100) / 100));
      e.preventDefault();
      render();
      $(`[data-key="${state.selected}"]`)?.focus();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      state.tl.frames.splice(state.selected, 1);
      state.selected = -1;
      render();
    }
  });
  // Keyframe inspector.
  const edit = (field, value) => {
    const f = state.tl.frames[state.selected];
    if (!f) return;
    if (field === 'at') f.at = Math.max(0, Math.min(1, Number(value) / 100 || 0));
    else if (field === 'easing') {
      if (value) f.easing = value;
      else delete f.easing;
    } else {
      const prop = field === 'dash' ? 'strokeDashoffset' : field;
      if (value === '' || value === null) delete f.props[prop];
      else f.props[prop] = prop === 'transform' ? value : Number(value);
    }
    render();
  };
  for (const input of $$('[data-mk]')) input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', () => edit(input.dataset.mk, input.value));
  $('[data-mo-act="delete"]').addEventListener('click', () => {
    if (state.selected < 0) return;
    state.tl.frames.splice(state.selected, 1);
    state.selected = -1;
    render();
  });
  // Export.
  $('[data-mo-formats]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-format]');
    if (!b) return;
    state.format = b.dataset.format;
    renderCode();
  });
  $('[data-mo-act="copy"]').addEventListener('click', () => copy($('[data-mo-code] code').textContent, t('toast.copied')));
  $('[data-mo-act="json"]').addEventListener('click', () => download(JSON.stringify({ categories: state.icon.categories, tags: state.icon.tags, animation: state.tl }, null, 2) + '\n', `${state.name}.json`, 'application/json'));
  $('[data-mo-act="svg"]').addEventListener('click', () => download(bakeColor(gf.renderToString(state.icon, { animation: state.tl, trigger: 'mount', size: 96 }), '#121014'), `${state.name}-${state.tl.name || 'motion'}.svg`, 'image/svg+xml'));
  $('[data-mo-act="gif"]').addEventListener('click', async () => {
    const { frames, delay } = await exportFrames(256, 25);
    download(encodeGif(frames, delay), `${state.name}.gif`, 'image/gif');
  });
  $('[data-mo-act="webm"]').addEventListener('click', async () => {
    try {
      download(await exportWebm(), `${state.name}.webm`, 'video/webm');
    } catch {
      toast(t('motion.nowebm'));
    }
  });
  if (!load(iconInput.value.trim() || 'heartbeat')) load(gf.lookupIcon('heartbeat') ? 'heartbeat' : 'heart');
  setPlaying(!matchMedia('(prefers-reduced-motion: reduce)').matches);
}

export function stopMotion() {
  setPlaying(false);
}
