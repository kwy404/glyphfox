// One frame loop for every sticky scene. An IntersectionObserver marks the
// scenes near the viewport; only those read the scroll position and draw.
// Progress is eased toward the scroll target, so wheel steps glide instead
// of jumping, and the loop sleeps as soon as every scene has caught up.

import { clamp } from './util.js';

const scenes = [];
let raf = 0;
let last = 0;

function headerHeight() {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h'));
  return Number.isFinite(v) ? v : 64;
}
let headerH = 64;

function frame(now) {
  raf = 0;
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
  last = now;
  const vh = window.innerHeight;
  let busy = false;
  // Read every rect first, then write, so layout is computed once per frame.
  const live = [];
  for (const s of scenes) {
    if (!s.near) continue;
    const r = s.el.getBoundingClientRect();
    const total = Math.max(1, s.el.offsetHeight - vh + headerH);
    s.target = clamp((headerH - r.top) / total);
    live.push(s);
  }
  for (const s of live) {
    if (s.p < 0) s.p = s.target;
    const k = 1 - Math.exp(-dt * 11);
    s.p += (s.target - s.p) * k;
    if (Math.abs(s.target - s.p) < 0.0004) s.p = s.target;
    else busy = true;
    if (s.p !== s.drawn) {
      s.drawn = s.p;
      s.update(s.p, dt);
    }
  }
  if (busy) request();
  else last = 0;
}

function request() {
  if (!raf) raf = requestAnimationFrame(frame);
}

const io =
  'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            const s = scenes.find((x) => x.el === e.target);
            if (!s) continue;
            s.near = e.isIntersecting;
            if (s.near && !s.ready) {
              s.ready = true;
              s.init();
            }
          }
          request();
        },
        { rootMargin: '60% 0px 60% 0px' },
      )
    : null;

/**
 * Registers a sticky scene. init() builds the stage the first time the
 * section comes near; update(p) draws progress p (0 to 1).
 */
export function scrollScene(section, { init = () => {}, update }) {
  if (!section) return;
  const s = { el: section, init, update, near: false, ready: false, p: -1, target: 0, drawn: -1 };
  scenes.push(s);
  if (io) io.observe(section);
  else {
    s.ready = true;
    init();
    s.near = true;
  }
}

/** Runs fn once, the first time el comes near the viewport. */
export function whenNear(el, fn, margin = '50%') {
  if (!el) return;
  if (!('IntersectionObserver' in window)) {
    fn();
    return;
  }
  const o = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        o.disconnect();
        fn();
      }
    },
    { rootMargin: `${margin} 0px ${margin} 0px` },
  );
  o.observe(el);
}

/** Calls cb(visible) whenever el enters or leaves the viewport. */
export function watchVisible(el, cb, margin = '0px') {
  if (!el) return;
  if (!('IntersectionObserver' in window)) {
    cb(true);
    return;
  }
  new IntersectionObserver((entries) => cb(entries[entries.length - 1].isIntersecting), { rootMargin: margin }).observe(el);
}

export function startScroll() {
  headerH = headerHeight();
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', () => {
    headerH = headerHeight();
    request();
  });
  request();
}
