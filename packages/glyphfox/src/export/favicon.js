// Animated favicon: frames of any living state (or a morph) rendered as
// standalone SVG, a tiny self contained runtime that plays them on the tab
// icon through a canvas, and the static fallback files of the kit.

import { ANIMATIONS } from '../core/animate.js';
import { morphFrame } from '../core/controller.js';
import { nodesToString } from '../core/nodes.js';
import { renderIcon } from '../core/render.js';
import { toPng } from './raster.js';

export const FAVICON_ANIMATIONS = ['pulse', 'spin', 'draw', 'pop', 'wiggle', 'bounce', 'shake', 'morph'];

const SIZE = 32;
const r2 = (v) => Math.round(v * 100) / 100;

/** Puts a rounded background square under the icon (outside of any animated group). */
function withBackground(node, background, radius) {
  if (!background) return node;
  const [tag, attrs, children] = node;
  const rx = r2(((Number(radius) || 0) * 24) / SIZE);
  const rect = ['rect', { x: '0', y: '0', width: '24', height: '24', rx: rx > 0 ? String(rx) : undefined, fill: String(background), stroke: 'none' }];
  const head = children.filter((c) => c[0] === 'title' || c[0] === 'style');
  const rest = children.filter((c) => c[0] !== 'title' && c[0] !== 'style');
  return [tag, attrs, [...head, rect, ...rest]];
}

function frameSvg(icon, props, background, radius) {
  return nodesToString(withBackground(renderIcon(icon, props), background, radius));
}

/**
 * SVG strings for every frame of one loop of a favicon animation. Living
 * states are sampled with the renderer's frame prop (presets that play once
 * end with a short hold on the last frame); `morph` ping pongs between the
 * icon and `morphTo`. Colors are explicit so each frame stands alone.
 */
export function faviconFrames(icon, options = {}) {
  if (!icon || typeof icon.body !== 'string') throw new TypeError('faviconFrames expects an icon data object');
  const { animate = 'pulse', morphTo, frames = 24, color = '#ff7a1a', background = null, radius = 7, weight = 2, variant = 'outline', duration } = options;
  const n = Math.max(2, Math.min(240, Math.round(Number(frames) || 24)));
  const base = { size: SIZE, color, weight, variant, decorative: true };
  const out = [];
  if (animate === 'morph') {
    if (!morphTo || typeof morphTo.body !== 'string') throw new TypeError('the morph animation needs a morphTo icon');
    for (let k = 0; k < n; k++) {
      const u = k / n;
      const p = u < 0.15 ? 0 : u < 0.5 ? (u - 0.15) / 0.35 : u < 0.65 ? 1 : 1 - (u - 0.65) / 0.35;
      const f = morphFrame(icon, morphTo, p, { variant });
      out.push(frameSvg(f.icon, { ...base, variant: f.variant || variant }, background, radius));
    }
    return out;
  }
  const preset = ANIMATIONS[animate];
  if (!preset) throw new RangeError(`unknown favicon animation "${animate}" (use ${FAVICON_ANIMATIONS.join(', ')})`);
  const dur = Number.isFinite(Number(duration)) && Number(duration) > 0 ? Math.round(Number(duration)) : preset.duration;
  const props = { ...base, animate, duration: dur, loop: preset.loop ? true : 1 };
  if (preset.loop) {
    for (let k = 0; k < n; k++) out.push(frameSvg(icon, { ...props, frame: (k / n) * dur }, background, radius));
  } else {
    const run = Math.max(2, Math.round(n * 0.75));
    for (let k = 0; k < run; k++) out.push(frameSvg(icon, { ...props, frame: (k / (run - 1)) * dur }, background, radius));
    while (out.length < n) out.push(out[run - 1]);
  }
  return out;
}

/** The static favicon: one standalone SVG with an explicit color and an optional rounded background. */
export function faviconSvg(icon, { color = '#ff7a1a', background = null, radius = 7, weight = 2, variant = 'outline' } = {}) {
  if (!icon || typeof icon.body !== 'string') throw new TypeError('faviconSvg expects an icon data object');
  return frameSvg(icon, { size: SIZE, color, weight, variant, decorative: true }, background, radius);
}

/**
 * Plays frames (SVG strings or image URLs) on the tab icon. Every frame is
 * drawn once on a canvas and turned into a PNG data URL, then the icon links
 * cycle through them. The original link is the static fallback: it stays
 * under prefers-reduced-motion and comes back on stop(). Returns
 * { start, stop, playing, ready }. Self contained on purpose: its source is
 * embedded as is into the runtime module written by faviconRuntime().
 */
export function animateFavicon(frames, options) {
  var o = options || {};
  var doc = o.document || globalThis.document;
  var Img = o.Image || globalThis.Image;
  var idle = { start: function () {}, stop: function () {}, playing: false, ready: Promise.resolve([]) };
  if (!doc || typeof doc.createElement !== 'function') return idle;
  var fps = Number(o.fps) > 0 ? Number(o.fps) : 12;
  var size = Number(o.size) > 0 ? Math.round(Number(o.size)) : 32;
  var loop = o.loop !== false;
  var reduced = o.reducedMotion;
  if (reduced === undefined || reduced === null) {
    try {
      reduced = typeof globalThis.matchMedia === 'function' && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      reduced = false;
    }
  }
  var list = Array.prototype.slice.call(frames || []);
  var links = Array.prototype.slice.call(doc.querySelectorAll('link[rel~="icon"]'));
  if (!links.length) {
    var made = doc.createElement('link');
    made.setAttribute('rel', 'icon');
    (doc.head || doc.documentElement).appendChild(made);
    links = [made];
  }
  var saved = links.map(function (l) {
    return [l.getAttribute('href'), l.getAttribute('type')];
  });
  var urls = [];
  var timer = null;
  var index = 0;
  var playing = false;
  var wanted = false;
  var source = function (f) {
    var s = String(f);
    return /^\s*</.test(s) ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s) : s;
  };
  var ready = new Promise(function (resolve) {
    var left = list.length;
    if (!left) {
      resolve(urls);
      return;
    }
    var canvas = doc.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext ? canvas.getContext('2d') : null;
    list.forEach(function (f, k) {
      var src = source(f);
      var done = function (url) {
        urls[k] = url;
        left -= 1;
        if (!left) resolve(urls);
      };
      if (!ctx || !Img) {
        done(src);
        return;
      }
      var img = new Img();
      img.onload = function () {
        try {
          ctx.clearRect(0, 0, size, size);
          ctx.drawImage(img, 0, 0, size, size);
          done(canvas.toDataURL('image/png'));
        } catch (e) {
          done(src);
        }
      };
      img.onerror = function () {
        done(src);
      };
      img.src = src;
    });
  });
  var show = function (url) {
    var type = /^data:image\/png/.test(url) ? 'image/png' : /^data:image\/svg/.test(url) ? 'image/svg+xml' : null;
    links.forEach(function (l) {
      if (type) l.setAttribute('type', type);
      else l.removeAttribute('type');
      l.setAttribute('href', url);
    });
  };
  var restore = function () {
    links.forEach(function (l, k) {
      if (saved[k][0] === null) l.removeAttribute('href');
      else l.setAttribute('href', saved[k][0]);
      if (saved[k][1] === null) l.removeAttribute('type');
      else l.setAttribute('type', saved[k][1]);
    });
  };
  var controller = {
    ready: ready,
    get playing() {
      return playing;
    },
    start: function () {
      wanted = true;
      if (reduced || playing) return controller;
      ready.then(function () {
        if (!wanted || playing || !urls.length) return;
        playing = true;
        index = 0;
        tick();
        timer = setInterval(tick, 1000 / fps);
      });
      return controller;
    },
    stop: function () {
      wanted = false;
      if (timer !== null) clearInterval(timer);
      timer = null;
      playing = false;
      restore();
      return controller;
    },
  };
  var tick = function () {
    if (index >= urls.length) {
      if (loop) index = 0;
      else {
        controller.stop();
        return;
      }
    }
    show(urls[index]);
    index += 1;
  };
  if (o.autostart !== false) controller.start();
  return controller;
}

/**
 * Source of a standalone ES module that carries the frames and the runtime:
 * it exports animateFavicon(options) and stopFavicon() and, unless autostart
 * is false, starts as soon as it loads in a page.
 */
export function faviconRuntime(frames, { fps = 12, size = 32, loop = true, autostart = true } = {}) {
  const list = Array.prototype.slice.call(frames || []).map(String);
  return [
    '// glyphfox animated favicon: plays the frames on the tab icon through a canvas.',
    '// The <link rel="icon"> already in the page is the static fallback: it stays under',
    '// prefers-reduced-motion and comes back when the animation stops.',
    '// Load it with <script type="module" src="favicon-animated.js"></script>, or',
    "// import { animateFavicon, stopFavicon } from './favicon-animated.js';",
    `const FRAMES = ${JSON.stringify(list)};`,
    `const DEFAULTS = ${JSON.stringify({ fps: Number(fps) > 0 ? Number(fps) : 12, size: Number(size) > 0 ? Number(size) : 32, loop: loop !== false })};`,
    `const run = ${animateFavicon.toString()};`,
    'let current = null;',
    '',
    '/** Starts the animation (options: fps, loop, size, reducedMotion) and returns its controller. */',
    'export function animateFavicon(options = {}) {',
    '  if (current) current.stop();',
    '  current = run(FRAMES, Object.assign({}, DEFAULTS, options));',
    '  return current;',
    '}',
    '',
    '/** Stops the animation and restores the static icon. */',
    'export function stopFavicon() {',
    '  if (current) current.stop();',
    '  current = null;',
    '}',
    '',
    ...(autostart ? ["if (typeof document !== 'undefined') animateFavicon();", ''] : []),
  ].join('\n');
}

const SNIPPET = `<!-- glyphfox favicon: the static icons are the fallback, the module animates them -->
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="alternate icon" href="favicon-32.png" type="image/png" sizes="32x32">
<script type="module" src="favicon-animated.js"></script>
<!-- control it from your own code:
  import { animateFavicon, stopFavicon } from './favicon-animated.js';
  animateFavicon({ fps: 12 });
  stopFavicon();
-->
`;

/**
 * Every file of the favicon kit: favicon.svg (static), favicon-32.png
 * (static, for browsers without SVG icons), favicon-animated.js (the runtime
 * with the frames) and favicon.html (the tags to paste into the page head).
 * Options: those of faviconFrames plus fps, loop, autostart and deflate.
 */
export function faviconKit(icon, options = {}) {
  const { color = '#ff7a1a', background = null, radius = 7, weight = 2, variant = 'outline', fps = 12, deflate } = options;
  const frames = faviconFrames(icon, options);
  return {
    'favicon.svg': faviconSvg(icon, { color, background, radius, weight, variant }) + '\n',
    'favicon-32.png': toPng(icon, { size: SIZE, color, background, radius, weight, variant, deflate }),
    'favicon-animated.js': faviconRuntime(frames, { fps, loop: options.loop !== false, autostart: options.autostart !== false }),
    'favicon.html': SNIPPET,
  };
}
