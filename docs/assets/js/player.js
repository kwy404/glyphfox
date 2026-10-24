// Film player of the home page: the site's own controls over the native
// video element. The page ships the video with native controls and this
// module swaps them for its own once the icons are loaded and every part is
// in place, so the native controls stay when the script does not run or fails.

import { gf, lang, loadIcons, reduced, t } from './app.js';

// Chapter starts in seconds and their key in docs/i18n (player.chapter.*).
const CHAPTERS = [
  [0, 'trace'],
  [6, 'release'],
  [12, 'axes'],
  [28, 'morph'],
  [42, 'fusion'],
  [58, 'modifiers'],
  [70, 'animations'],
  [86, 'frameworks'],
  [104, 'studio'],
  [122, 'universe'],
  [134, 'more'],
  [142, 'final'],
];
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
// Preview sprite made with ffmpeg (fps=1/2, scale=160:90, tile=10x8): one frame every 2 s.
const SPRITE = { cols: 10, rows: 8, every: 2, frames: 76 };
const IDLE_MS = 2600;
const MORPH_MS = 240;
const ICON = { size: 22, weight: 2 };

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = gf.MORPH_EASE || ((x) => x);
const decimal = new Intl.NumberFormat(lang, { maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat(lang, { style: 'percent' });

/** 75 gives "1:15", 3725 gives "1:02:05". */
function clock(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

function chapterAt(time) {
  let hit = CHAPTERS[0];
  for (const c of CHAPTERS) if (time >= c[0]) hit = c;
  return hit;
}

const chapterName = (c) => t(`player.chapter.${c[1]}`);
const rateName = (rate) => (rate === 1 ? t('player.speedNormal') : `${decimal.format(rate)}×`);

function el(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  node.append(...kids);
  return node;
}

const draw = (host, icon) => {
  host.innerHTML = gf.renderToString(icon, ICON);
};

/** A control button with an icon slot, its label and shortcut in the tooltip. */
function control(cls, keys) {
  const b = el('button', { type: 'button', class: `gf-player-btn ${cls}`, 'aria-keyshortcuts': keys });
  b.append(el('span', { class: 'gf-player-icon', 'aria-hidden': 'true' }));
  return b;
}

function name(btn, text, key) {
  btn.setAttribute('aria-label', text);
  btn.dataset.tip = key ? `${text} (${key})` : text;
}

// Icons swap with the morph engine; with reduced motion they switch at once.
const tweens = new WeakMap();
function tween(host, frame) {
  cancelAnimationFrame(tweens.get(host) || 0);
  const start = performance.now();
  const step = (now) => {
    const k = clamp((now - start) / MORPH_MS, 0, 1);
    draw(host, frame(ease(k)));
    if (k < 1) tweens.set(host, requestAnimationFrame(step));
  };
  tweens.set(host, requestAnimationFrame(step));
}

function icon(btn, next) {
  const host = btn.querySelector('.gf-player-icon');
  const prev = host.dataset.icon;
  if (prev === next) return;
  host.dataset.icon = next;
  const to = gf.lookupIcon(next);
  if (!prev || reduced) {
    cancelAnimationFrame(tweens.get(host) || 0);
    draw(host, to);
    return;
  }
  const m = gf.createMorph(gf.lookupIcon(prev), to);
  tween(host, (k) => m.frame(k));
}

function setup(root) {
  const video = root.querySelector('video');
  const source = video && video.querySelector('source');
  if (!video || !source) return;
  for (const n of ['play', 'pause', 'volume', 'volume-low', 'volume-x', 'captions', 'gauge', 'check', 'picture-in-picture', 'maximize', 'minimize']) {
    if (!gf.lookupIcon(n)) throw new Error(`missing icon ${n}`);
  }
  const track = video.textTracks && video.textTracks[0];
  const sprite = root.dataset.thumbs ? new URL(root.dataset.thumbs, video.poster || source.src).href : '';
  const fixed = Number(root.dataset.duration) || 0;
  const duration = () => (Number.isFinite(video.duration) && video.duration > 0 ? video.duration : fixed);
  const id = `gf-player-${Math.random().toString(36).slice(2, 8)}`;

  // Markup.
  const ui = el('div', { class: 'gf-player-ui' });
  const surface = el('div', { class: 'gf-player-surface', 'aria-hidden': 'true' });
  const cues = el('div', { class: 'gf-player-cues', lang: (track && track.language) || 'pt-BR' });
  const spin = el('div', { class: 'gf-player-spin', 'aria-hidden': 'true' });
  const message = el('p', { class: 'gf-player-message', role: 'alert', hidden: true });
  const big = el('button', { type: 'button', class: 'gf-player-big', 'aria-keyshortcuts': 'k Space' });
  big.append(el('span', { class: 'gf-player-icon', 'aria-hidden': 'true' }));
  big.firstChild.innerHTML = gf.renderToString(gf.lookupIcon('play'), { size: 40, weight: 2.25 });

  const buffered = el('span', { class: 'gf-player-buffered' });
  const hover = el('span', { class: 'gf-player-hover' });
  const progress = el('span', { class: 'gf-player-progress' });
  const rail = el('span', { class: 'gf-player-rail' }, buffered, hover, progress);
  const marks = CHAPTERS.slice(1).map((c) => {
    const m = el('span', { class: 'gf-player-mark' });
    rail.append(m);
    return [c, m];
  });
  const knob = el('span', { class: 'gf-player-knob' });
  const thumb = el('span', { class: 'gf-player-thumb' });
  const pvChapter = el('b');
  const pvTime = el('span', { class: 'gf-player-pvtime' });
  const preview = el('span', { class: 'gf-player-preview', 'aria-hidden': 'true' }, sprite ? thumb : '', pvChapter, pvTime);
  const scrub = el('div', {
    class: 'gf-player-scrub',
    role: 'slider',
    tabindex: 0,
    'aria-label': t('player.seek'),
    'aria-valuemin': 0,
    'aria-valuemax': Math.round(duration()),
    'aria-valuenow': 0,
    'aria-keyshortcuts': 'ArrowLeft ArrowRight j l Home End',
  }, rail, knob, preview);

  const play = control('gf-player-play', 'k Space');
  const mute = control('gf-player-mute', 'm');
  const volume = el('input', { type: 'range', class: 'gf-player-range', min: 0, max: 1, step: 0.05, 'aria-label': t('player.volume') });
  const volumeBox = el('div', { class: 'gf-player-volume' }, mute, volume);
  const cur = el('span', { text: '0:00' });
  const total = el('span', { text: clock(duration()) });
  const time = el('span', { class: 'gf-player-time', 'aria-hidden': 'true' }, cur, el('i', { text: ' / ' }), total);
  const chapter = el('span', { class: 'gf-player-chapter', 'aria-hidden': 'true' });
  const captions = track ? control('gf-player-cc', 'c') : null;
  const speed = control('gf-player-speed-btn', null);
  speed.setAttribute('aria-haspopup', 'menu');
  speed.setAttribute('aria-expanded', 'false');
  speed.setAttribute('aria-controls', `${id}-speed`);
  const badge = el('span', { class: 'gf-player-badge', 'aria-hidden': 'true' });
  speed.append(badge);
  const menu = el('div', { class: 'gf-player-menu', role: 'menu', id: `${id}-speed`, hidden: true, 'aria-label': t('player.speed') });
  for (const rate of SPEEDS) {
    const item = el('button', { type: 'button', role: 'menuitemradio', tabindex: -1, 'aria-checked': 'false', 'data-rate': rate });
    const check = el('span', { class: 'gf-player-check', 'aria-hidden': 'true' });
    check.innerHTML = gf.renderToString(gf.lookupIcon('check'), { size: 16, weight: 2.5 });
    item.append(check, el('span', { text: rateName(rate) }));
    menu.append(item);
  }
  const speedBox = el('div', { class: 'gf-player-speed' }, speed, menu);
  const canPip = !!(document.pictureInPictureEnabled && video.requestPictureInPicture && !video.disablePictureInPicture);
  const pip = canPip ? control('gf-player-pip', null) : null;
  const canFs = !!(root.requestFullscreen || root.webkitRequestFullscreen || video.webkitEnterFullscreen);
  const fs = canFs ? control('gf-player-fs', 'f') : null;
  const row = el('div', { class: 'gf-player-row' }, play, volumeBox, time, chapter, el('span', { class: 'gf-player-spacer' }));
  for (const b of [captions, speedBox, pip, fs]) if (b) row.append(b);
  const bar = el('div', { class: 'gf-player-bar' }, scrub, row);
  const status = el('div', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
  const keys = el('p', { class: 'sr-only', id: `${id}-keys`, text: t('player.keys') });
  ui.append(surface, cues, spin, message, big, bar, status, keys);

  // State.
  let scrubbing = false;
  let dragTime = 0;
  let lastPointer = 'mouse';
  let idleTimer = 0;
  let loop = 0;
  let second = -1;
  let shownChapter = null;
  let captionsOn = false;
  let ppT = 0;
  let ppRaf = 0;
  const pp = gf.createMorph(gf.lookupIcon('play'), gf.lookupIcon('pause'));
  const playHost = play.querySelector('.gf-player-icon');

  const say = (text) => {
    status.textContent = '';
    setTimeout(() => (status.textContent = text), 40);
  };
  const playing = () => !video.paused && !video.ended;

  // Play and pause: the play icon morphs into pause and back.
  function paintPlay(animate) {
    const target = playing() ? 1 : 0;
    name(play, target ? t('player.pause') : t('player.play'), 'k');
    cancelAnimationFrame(ppRaf);
    if (!animate || reduced) {
      ppT = target;
      draw(playHost, pp.frame(ppT));
      return;
    }
    const from = ppT;
    const start = performance.now();
    const ms = MORPH_MS * Math.abs(target - from) || 1;
    const step = (now) => {
      const k = clamp((now - start) / ms, 0, 1);
      ppT = from + (target - from) * k;
      draw(playHost, pp.frame(ease(ppT)));
      if (k < 1) ppRaf = requestAnimationFrame(step);
    };
    ppRaf = requestAnimationFrame(step);
  }

  function toggle() {
    if (playing()) video.pause();
    else video.play().catch(() => {});
  }

  function seek(to, quiet) {
    const d = duration();
    const target = clamp(to, 0, d || to);
    if (scrubbing && typeof video.fastSeek === 'function') video.fastSeek(target);
    else video.currentTime = target;
    paint(target);
    if (!quiet) say(valueText(target));
  }

  const valueText = (time) => `${t('player.time', { current: clock(time), total: clock(duration()) })}, ${chapterName(chapterAt(time))}`;

  // Timeline.
  function paint(at) {
    const d = duration();
    const now = at ?? (scrubbing ? dragTime : video.currentTime);
    const p = d ? clamp(now / d, 0, 1) : 0;
    progress.style.transform = `scaleX(${p})`;
    knob.style.left = `${p * 100}%`;
    const s = Math.floor(now);
    if (s !== second) {
      second = s;
      cur.textContent = clock(now);
      scrub.setAttribute('aria-valuenow', String(s));
      scrub.setAttribute('aria-valuetext', valueText(now));
    }
    const c = chapterAt(now);
    if (c !== shownChapter) {
      shownChapter = c;
      chapter.textContent = chapterName(c);
    }
  }

  function paintBuffered() {
    const d = duration();
    const b = video.buffered;
    let end = 0;
    for (let i = 0; i < b.length; i++) if (b.start(i) <= video.currentTime + 1) end = Math.max(end, b.end(i));
    buffered.style.transform = `scaleX(${d ? clamp(end / d, 0, 1) : 0})`;
  }

  function layout() {
    const d = duration();
    total.textContent = clock(d);
    scrub.setAttribute('aria-valuemax', String(Math.round(d)));
    for (const [c, m] of marks) m.style.left = `${d ? (c[0] / d) * 100 : 0}%`;
    second = -1;
    paint();
  }

  function run() {
    cancelAnimationFrame(loop);
    const step = () => {
      paint();
      if (playing()) loop = requestAnimationFrame(step);
    };
    loop = requestAnimationFrame(step);
  }

  const ratioAt = (e) => {
    const r = scrub.getBoundingClientRect();
    return r.width ? clamp((e.clientX - r.left) / r.width, 0, 1) : 0;
  };

  function showPreview(p) {
    const d = duration();
    const at = p * d;
    pvTime.textContent = clock(at);
    pvChapter.textContent = chapterName(chapterAt(at));
    hover.style.transform = `scaleX(${p})`;
    if (sprite) {
      if (!thumb.style.backgroundImage) thumb.style.backgroundImage = `url("${sprite}")`;
      const i = clamp(Math.round(at / SPRITE.every), 0, SPRITE.frames - 1);
      const w = thumb.offsetWidth;
      const h = thumb.offsetHeight;
      thumb.style.backgroundSize = `${w * SPRITE.cols}px ${h * SPRITE.rows}px`;
      thumb.style.backgroundPosition = `${-(i % SPRITE.cols) * w}px ${-Math.floor(i / SPRITE.cols) * h}px`;
    }
    const box = root.getBoundingClientRect();
    const r = scrub.getBoundingClientRect();
    const half = preview.offsetWidth / 2;
    const x = clamp(r.left - box.left + p * r.width, half + 8, box.width - half - 8);
    preview.style.left = `${x - (r.left - box.left)}px`;
    scrub.classList.add('is-hover');
  }

  function hidePreview() {
    scrub.classList.remove('is-hover');
    hover.style.transform = 'scaleX(0)';
  }

  scrub.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    e.preventDefault();
    scrub.focus({ preventScroll: true });
    try {
      scrub.setPointerCapture(e.pointerId);
    } catch {
      // A pointer the browser no longer tracks: the drag still works inside the bar.
    }
    scrubbing = true;
    scrub.classList.add('is-active');
    const p = ratioAt(e);
    dragTime = p * duration();
    seek(dragTime, true);
    showPreview(p);
  });
  scrub.addEventListener('pointermove', (e) => {
    const p = ratioAt(e);
    if (scrubbing) {
      dragTime = p * duration();
      seek(dragTime, true);
    }
    if (scrubbing || e.pointerType === 'mouse') showPreview(p);
  });
  const endDrag = (e) => {
    if (!scrubbing) return;
    scrubbing = false;
    scrub.classList.remove('is-active');
    if (e.type === 'pointerup') video.currentTime = ratioAt(e) * duration();
    if (e.pointerType !== 'mouse') hidePreview();
    second = -1;
    paint();
    wake();
  };
  scrub.addEventListener('pointerup', endDrag);
  scrub.addEventListener('pointercancel', endDrag);
  scrub.addEventListener('pointerleave', () => {
    if (!scrubbing) hidePreview();
  });

  // Volume.
  function paintVolume() {
    const v = video.muted ? 0 : video.volume;
    volume.value = String(v);
    volume.style.setProperty('--fill', `${v * 100}%`);
    volume.setAttribute('aria-valuetext', percent.format(v));
    icon(mute, v === 0 ? 'volume-x' : v < 0.5 ? 'volume-low' : 'volume');
    name(mute, video.muted || v === 0 ? t('player.unmute') : t('player.mute'), 'm');
  }
  function toggleMute() {
    if (video.muted || video.volume === 0) {
      video.muted = false;
      if (video.volume === 0) video.volume = 0.6;
      return false;
    }
    video.muted = true;
    return true;
  }
  function nudgeVolume(dv) {
    video.muted = false;
    video.volume = clamp(Math.round((video.volume + dv) * 100) / 100, 0, 1);
    say(t('player.volumeLevel', { n: percent.format(video.volume) }));
  }
  volume.addEventListener('input', () => {
    video.volume = Number(volume.value);
    video.muted = video.volume === 0;
  });
  mute.addEventListener('click', () => toggleMute());
  video.addEventListener('volumechange', paintVolume);

  // Captions: the pt-BR track, drawn by the player so they sit above the bar.
  function paintCues() {
    const active = captionsOn && track && track.activeCues ? Array.from(track.activeCues) : [];
    cues.replaceChildren(...active.map((c) => el('span', { text: String(c.text || '').replace(/<[^>]+>/g, '') })));
  }
  function setCaptions(on) {
    captionsOn = on;
    track.mode = on ? 'hidden' : 'disabled';
    captions.setAttribute('aria-pressed', String(on));
    paintCues();
  }
  if (track) {
    icon(captions, 'captions');
    name(captions, t('player.captions'), 'c');
    track.addEventListener('cuechange', paintCues);
    // The browser may turn the track on by itself (a captions preference): follow it, drawn here.
    video.textTracks.addEventListener('change', () => {
      if (track.mode === 'showing') setCaptions(true);
      else if (track.mode === 'disabled' && captionsOn) setCaptions(false);
    });
    captions.addEventListener('click', () => setCaptions(!captionsOn));
    setCaptions(track.mode === 'showing');
  }

  // Speed menu.
  const items = () => Array.from(menu.querySelectorAll('[role="menuitemradio"]'));
  function paintRate() {
    const rate = video.playbackRate;
    for (const item of items()) item.setAttribute('aria-checked', String(Number(item.dataset.rate) === rate));
    name(speed, `${t('player.speed')}: ${rateName(rate)}`, '');
    badge.textContent = rate === 1 ? '' : `${decimal.format(rate)}×`;
  }
  const outside = (e) => {
    if (!speedBox.contains(e.target)) closeMenu(false);
  };
  function openMenu() {
    menu.hidden = false;
    speed.setAttribute('aria-expanded', 'true');
    menu.style.maxHeight = `${Math.max(96, root.clientHeight - 72)}px`;
    (menu.querySelector('[aria-checked="true"]') || items()[0]).focus();
    document.addEventListener('pointerdown', outside, true);
    wake();
  }
  function closeMenu(back) {
    if (menu.hidden) return;
    menu.hidden = true;
    speed.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside, true);
    if (back) speed.focus();
    wake();
  }
  function setRate(rate) {
    video.playbackRate = rate;
    say(t('player.speedLevel', { n: rateName(rate) }));
  }
  function stepRate(dir) {
    const i = SPEEDS.indexOf(video.playbackRate);
    const next = SPEEDS[clamp((i < 0 ? 2 : i) + dir, 0, SPEEDS.length - 1)];
    if (next !== video.playbackRate) setRate(next);
  }
  icon(speed, 'gauge');
  speed.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu(true)));
  menu.addEventListener('click', (e) => {
    const item = e.target.closest('[data-rate]');
    if (!item) return;
    setRate(Number(item.dataset.rate));
    closeMenu(true);
  });
  menu.addEventListener('keydown', (e) => {
    const list = items();
    const i = list.indexOf(document.activeElement);
    const go = (j) => list[(j + list.length) % list.length].focus();
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(list.length - 1);
    else if (e.key === 'Escape') closeMenu(true);
    else if (e.key === 'Tab') {
      closeMenu(false);
      return;
    } else return;
    e.preventDefault();
    e.stopPropagation();
  });
  video.addEventListener('ratechange', paintRate);

  // Picture in picture.
  const ready = () =>
    video.readyState > 0
      ? Promise.resolve()
      : new Promise((resolve) => {
          video.addEventListener('loadedmetadata', resolve, { once: true });
          video.preload = 'metadata';
        });
  function paintPip() {
    if (!pip) return;
    const on = document.pictureInPictureElement === video;
    icon(pip, 'picture-in-picture');
    pip.setAttribute('aria-pressed', String(on));
    name(pip, on ? t('player.pipExit') : t('player.pip'), '');
  }
  if (pip) {
    pip.addEventListener('click', () => {
      if (document.pictureInPictureElement === video) document.exitPictureInPicture().catch(() => {});
      else ready().then(() => video.requestPictureInPicture()).catch(() => {});
    });
    video.addEventListener('enterpictureinpicture', paintPip);
    video.addEventListener('leavepictureinpicture', paintPip);
  }

  // Full screen: the whole player, or the native video on phones without the API.
  const fullElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  function toggleFs() {
    if (!fs) return;
    if (fullElement()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else if (root.requestFullscreen) {
      root
        .requestFullscreen({ navigationUI: 'hide' })
        .then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}))
        .catch(() => {});
    } else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
    else video.webkitEnterFullscreen();
  }
  function paintFs() {
    if (!fs) return;
    const on = fullElement() === root;
    root.classList.toggle('is-full', on);
    icon(fs, on ? 'minimize' : 'maximize');
    name(fs, on ? t('player.fullscreenExit') : t('player.fullscreen'), 'f');
  }
  if (fs) {
    fs.addEventListener('click', toggleFs);
    document.addEventListener('fullscreenchange', paintFs);
    document.addEventListener('webkitfullscreenchange', paintFs);
  }

  // Controls hide while the film plays and nobody touches them.
  const holding = () => scrubbing || !menu.hidden || bar.matches(':hover');
  function sleep() {
    if (playing() && !holding()) root.classList.add('is-idle');
  }
  function wake() {
    root.classList.remove('is-idle');
    clearTimeout(idleTimer);
    if (playing()) idleTimer = setTimeout(sleep, IDLE_MS);
  }
  root.addEventListener('pointerdown', (e) => (lastPointer = e.pointerType || 'mouse'), true);
  root.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') wake();
  });
  root.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse' && playing() && !holding()) {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(sleep, 600);
    }
  });
  root.addEventListener('focusin', wake);

  surface.addEventListener('click', () => {
    root.focus({ preventScroll: true });
    if (lastPointer !== 'mouse' && root.classList.contains('is-idle')) {
      wake();
      return;
    }
    toggle();
    wake();
  });
  surface.addEventListener('dblclick', () => {
    if (lastPointer === 'mouse') toggleFs();
  });
  big.addEventListener('click', () => {
    video.play().catch(() => {});
    // The bar shows from now on: keep the focus in the player.
    root.classList.remove('is-fresh');
    play.focus({ preventScroll: true });
  });
  play.addEventListener('click', toggle);

  // Keyboard, anywhere in the player.
  root.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    const target = e.target;
    const onButton = target instanceof HTMLButtonElement;
    const onRange = target === volume;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const d = duration();
    switch (key) {
      case ' ':
        if (onButton) return;
        toggle();
        break;
      case 'k':
        toggle();
        break;
      case 'j':
        seek(video.currentTime - 10);
        break;
      case 'l':
        seek(video.currentTime + 10);
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
        if (onRange) return;
        seek(video.currentTime + (key === 'ArrowLeft' ? -5 : 5));
        break;
      case 'ArrowUp':
      case 'ArrowDown':
        if (onRange) return;
        nudgeVolume(key === 'ArrowUp' ? 0.05 : -0.05);
        break;
      case 'PageUp':
      case 'PageDown':
        if (target !== scrub) return;
        seek(video.currentTime + (key === 'PageUp' ? 10 : -10));
        break;
      case 'Home':
      case 'End':
        if (target !== scrub) return;
        seek(key === 'Home' ? 0 : d);
        break;
      case 'm':
        say(toggleMute() ? t('player.muted') : t('player.volumeLevel', { n: percent.format(video.volume) }));
        break;
      case 'c':
        if (!track) return;
        setCaptions(!captionsOn);
        say(captionsOn ? t('player.captionsOn') : t('player.captionsOff'));
        break;
      case 'f':
        toggleFs();
        break;
      case '<':
      case '>':
        stepRate(key === '>' ? 1 : -1);
        break;
      case 'Escape':
        if (menu.hidden) return;
        closeMenu(true);
        break;
      default:
        if (/^[0-9]$/.test(key) && d) seek((d * Number(key)) / 10);
        else return;
    }
    e.preventDefault();
    wake();
  });

  // Media events.
  video.addEventListener('play', () => {
    root.classList.remove('is-fresh', 'is-ended');
    message.hidden = true;
    paintPlay(true);
    run();
    wake();
    say(t('player.playing'));
  });
  video.addEventListener('pause', () => {
    paintPlay(true);
    paint();
    wake();
    if (!video.ended && !scrubbing) say(t('player.paused'));
  });
  video.addEventListener('playing', () => root.classList.remove('is-waiting'));
  video.addEventListener('waiting', () => root.classList.add('is-waiting'));
  video.addEventListener('canplay', () => root.classList.remove('is-waiting'));
  video.addEventListener('ended', () => {
    root.classList.add('is-ended');
    name(big, t('player.replay'), 'k');
    paintPlay(true);
    wake();
  });
  video.addEventListener('timeupdate', () => {
    if (!playing()) paint();
  });
  video.addEventListener('seeked', () => {
    if (!scrubbing) paint();
    paintBuffered();
  });
  video.addEventListener('progress', paintBuffered);
  video.addEventListener('loadedmetadata', layout);
  video.addEventListener('durationchange', layout);
  const fail = () => {
    root.classList.remove('is-waiting');
    message.textContent = t('player.error');
    message.hidden = false;
  };
  video.addEventListener('error', fail);
  source.addEventListener('error', fail);

  // Swap the native controls for these.
  name(big, t('player.play'), 'k');
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', video.getAttribute('aria-label') || '');
  root.setAttribute('aria-describedby', keys.id);
  root.tabIndex = -1;
  root.append(ui);
  root.classList.add('gf-player');
  if (video.paused && !video.currentTime) root.classList.add('is-fresh');
  video.controls = false;
  paintPlay(false);
  paintVolume();
  paintRate();
  paintPip();
  paintFs();
  layout();
  paintBuffered();
  if (playing()) run();
  root.dataset.player = 'ready';
  return () => {
    ui.remove();
    root.classList.remove('gf-player', 'is-fresh', 'is-idle', 'is-ended', 'is-waiting', 'is-full');
    video.controls = true;
  };
}

const roots = Array.from(document.querySelectorAll('[data-player]'));
if (roots.length) {
  loadIcons()
    .then(() => {
      for (const root of roots) {
        try {
          setup(root);
        } catch {
          // Something is missing: keep the native controls.
          root.querySelector('.gf-player-ui')?.remove();
          root.classList.remove('gf-player', 'is-fresh');
          const video = root.querySelector('video');
          if (video) video.controls = true;
        }
      }
    })
    .catch(() => {});
}
