// Living states: animation presets that understand the icon, rendered as a
// tiny scoped stylesheet inside the SVG, plus a frame sampler used to export
// animated GIF and WebM files with the exact same motion.

import { hash } from './nodes.js';

export const ANIMATIONS = {
  draw: { duration: 1100, easing: 'cubic-bezier(.65,0,.35,1)', loop: false },
  pop: {
    duration: 520,
    easing: 'cubic-bezier(.34,1.56,.64,1)',
    loop: false,
    frames: [
      [0, { s: 0.55, o: 0 }],
      [1, { s: 1, o: 1 }],
    ],
  },
  wiggle: {
    duration: 720,
    easing: 'cubic-bezier(.36,.07,.19,.97)',
    loop: false,
    frames: [
      [0, { r: 0 }],
      [0.18, { r: -13 }],
      [0.36, { r: 11 }],
      [0.54, { r: -7 }],
      [0.72, { r: 4 }],
      [0.88, { r: -1.5 }],
      [1, { r: 0 }],
    ],
  },
  spin: {
    duration: 1000,
    easing: 'linear',
    loop: true,
    frames: [
      [0, { r: 0 }],
      [1, { r: 360 }],
    ],
  },
  pulse: {
    duration: 1500,
    easing: 'cubic-bezier(.4,0,.6,1)',
    loop: true,
    frames: [
      [0, { s: 1, o: 1 }],
      [0.5, { s: 0.88, o: 0.5 }],
      [1, { s: 1, o: 1 }],
    ],
  },
  bounce: {
    duration: 900,
    easing: 'cubic-bezier(.33,0,.25,1)',
    loop: false,
    frames: [
      [0, { y: 0 }],
      [0.28, { y: -4.5 }],
      [0.5, { y: 0 }],
      [0.66, { y: -1.8 }],
      [0.82, { y: 0 }],
      [0.92, { y: -0.5 }],
      [1, { y: 0 }],
    ],
  },
  shake: {
    duration: 950,
    easing: 'ease-in-out',
    loop: false,
    origin: [12, 2.5],
    frames: [
      [0, { r: 0 }],
      [0.08, { r: 15 }],
      [0.18, { r: -13 }],
      [0.28, { r: 10 }],
      [0.38, { r: -8 }],
      [0.48, { r: 5 }],
      [0.58, { r: -3 }],
      [0.68, { r: 1.5 }],
      [0.78, { r: 0 }],
      [1, { r: 0 }],
    ],
  },
};

export const ANIMATION_NAMES = Object.keys(ANIMATIONS);
export const TRIGGERS = ['mount', 'hover', 'click', 'focus', 'press', 'inView', 'loop', 'state'];

/** Interactive parents that play an icon with `triggerParent`. */
export const TRIGGER_PARENTS = 'a,button,label,summary,[role=button],[role=link],[role=menuitem],[role=tab],[role=option]';

/**
 * Selector groups that start an animation for a trigger. Hover, focus and
 * press also listen to a `.gf-trigger` ancestor (and, with `triggerParent`,
 * to the closest link or button); the trigger engine takes those over (the
 * gf-js class) to play the reverse smoothly. inView plays when the engine
 * adds gf-in; state plays with gf-on; click alternates data-gf-run.
 */
export function triggerScopes(cls, trigger, triggerParent = false) {
  const own = `.${cls}:not(.gf-js)`;
  const parents = (state) => [`:${state}>${own}`, `.gf-trigger:${state} ${own}`, ...(triggerParent ? [`:is(${TRIGGER_PARENTS}):${state} ${own}`] : [])];
  switch (trigger) {
    case 'hover':
      return [[`${own}:hover`, ...parents('hover')]];
    case 'focus':
      return [[`${own}:focus-visible`, ...parents('focus-visible')]];
    case 'press':
      return [[`${own}:active`, ...parents('active')]];
    case 'state':
      return [[`.${cls}.gf-on`]];
    case 'inView':
      return [[`.${cls}.gf-in`]];
    case 'click':
      return [[`.${cls}[data-gf-run="1"]`], [`.${cls}[data-gf-run="2"]`]];
    default:
      return [[`.${cls}`]];
  }
}

/** Rules that stop an animation: reduced motion, disabled parents and gf-off. */
export function stopCss(cls) {
  return `@media (prefers-reduced-motion:reduce){.${cls} *{animation:none!important}}:is(:disabled,[aria-disabled="true"]) .${cls} *,.${cls}.gf-off *{animation:none!important}`;
}

const NAMED_EASING = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
};

/** Returns an easing function for a CSS timing function string. */
export function easing(spec) {
  let p = NAMED_EASING[spec];
  if (!p) {
    const m = /cubic-bezier\(([^)]+)\)/.exec(String(spec));
    p = m ? m[1].split(',').map(Number) : NAMED_EASING.ease;
  }
  const [x1, y1, x2, y2] = p;
  if (x1 === y1 && x2 === y2) return (t) => t;
  const bx = (t) => 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
  const by = (t) => 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    let t = x;
    for (let k = 0; k < 30; k++) {
      const v = bx(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return by(t);
  };
}

const ms = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : def;
};

function iterations(loop, preset) {
  const lp = loop === undefined || loop === null ? preset.loop : loop;
  if (lp === true || lp === 'true' || lp === Infinity) return Infinity;
  const n = Number(lp);
  if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  return 1;
}

function usedProps(frames) {
  const used = new Set();
  for (const [, v] of frames) for (const k of Object.keys(v)) used.add(k);
  return used;
}

function cssState(v, used) {
  const tf = [];
  if (used.has('y')) tf.push(`translateY(${v.y ?? 0}px)`);
  if (used.has('r')) tf.push(`rotate(${v.r ?? 0}deg)`);
  if (used.has('s')) tf.push(`scale(${v.s ?? 1})`);
  const parts = [];
  if (tf.length) parts.push(`transform:${tf.join(' ')}`);
  if (used.has('o')) parts.push(`opacity:${v.o ?? 1}`);
  return parts.join(';');
}

const pct = (o) => `${Math.round(o * 1000) / 10}%`;

function keyframes(name, suffix) {
  if (name === 'draw') return `@keyframes gf-draw${suffix}{0%{stroke-dashoffset:1;opacity:0}1%{opacity:1}100%{stroke-dashoffset:0;opacity:1}}@keyframes gf-fade${suffix}{0%{opacity:0}}`;
  const p = ANIMATIONS[name];
  const used = usedProps(p.frames);
  return `@keyframes gf-${name}${suffix}{${p.frames.map(([o, v]) => `${pct(o)}{${cssState(v, used)}}`).join('')}}`;
}

/**
 * Builds the scoped stylesheet for an animation. Returns { className, css }
 * or null when `animate` is not a known preset.
 */
export function animationCss({ animate, trigger = 'mount', triggerParent = false, duration, delay, loop, count = 1 } = {}) {
  const p = ANIMATIONS[animate];
  if (!p) return null;
  const trig = TRIGGERS.includes(trigger) ? trigger : 'mount';
  const dur = ms(duration, p.duration);
  const del = ms(delay, 0);
  const it = trig === 'loop' ? Infinity : iterations(loop, p);
  const iter = it === Infinity ? 'infinite' : String(it);
  const n = animate === 'draw' ? Math.max(1, count | 0) : 0;
  const tp = triggerParent === true || triggerParent === 'true' || triggerParent === '';
  const cls = 'gf-a' + hash([animate, trig, dur, del, iter, n, tp ? 'p' : ''].join('|'));
  const scopes = triggerScopes(cls, trig, tp);
  let css = '';
  scopes.forEach((_, k) => {
    css += keyframes(animate, k ? '-r' : '');
  });
  if (animate !== 'draw') {
    const o = p.origin || [12, 12];
    css += `.${cls} .gf-anim{transform-box:view-box;transform-origin:${o[0]}px ${o[1]}px}`;
  }
  scopes.forEach((sels, k) => {
    const suf = k ? '-r' : '';
    const S = (tail) => sels.map((s) => `${s} ${tail}`).join(',');
    if (animate === 'draw') {
      const each = n > 1 ? Math.round(dur * 0.62) : dur;
      const step = n > 1 ? (dur - each) / (n - 1) : 0;
      const dir = it === Infinity ? ' alternate' : '';
      css += `${S('.gf-anim>*')}{stroke-dasharray:1 1;animation:gf-draw${suf} ${each}ms ${p.easing} ${del}ms ${iter} both${dir}}`;
      for (let i = 1; i < n; i++) css += `${S(`.gf-anim>:nth-child(${i + 1})`)}{animation-delay:${Math.round(del + i * step)}ms}`;
      css += `${S('.gf-fill')}{animation:gf-fade${suf} ${Math.round(dur * 0.4)}ms ease ${Math.round(del + dur * 0.6)}ms ${iter} both${dir}}`;
    } else {
      css += `${S('.gf-anim')}{animation:gf-${animate}${suf} ${dur}ms ${p.easing} ${del}ms ${iter} both}`;
    }
  });
  css += stopCss(cls);
  return { className: cls, css };
}

/** Total length in milliseconds of one run of the animation (Infinity when it loops). */
export function animationLength({ animate, duration, delay, loop } = {}) {
  const p = ANIMATIONS[animate];
  if (!p) return 0;
  const it = iterations(loop, p);
  return it === Infinity ? Infinity : ms(delay, 0) + ms(duration, p.duration) * it;
}

function sampleFrames(p, prog) {
  const f = p.frames;
  const ease = easing(p.easing);
  let i = 0;
  while (i < f.length - 2 && prog > f[i + 1][0]) i++;
  const [o0, v0] = f[i];
  const [o1, v1] = f[i + 1];
  const local = o1 > o0 ? Math.max(0, Math.min(1, (prog - o0) / (o1 - o0))) : 1;
  const e = ease(local);
  const out = {};
  for (const k of usedProps(f)) {
    const def = k === 's' || k === 'o' ? 1 : 0;
    const a = v0[k] ?? def;
    const b = v1[k] ?? def;
    out[k] = a + (b - a) * e;
  }
  return out;
}

function progressAt(t, del, dur, it, alternate) {
  const local = t - del;
  if (local < 0) return 0;
  if (dur <= 0) return 1;
  const k = Math.floor(local / dur);
  if (k >= it) return alternate && it % 2 === 0 ? 0 : 1;
  let prog = (local - k * dur) / dur;
  if (alternate && k % 2 === 1) prog = 1 - prog;
  return prog;
}

/**
 * Samples the animation state at time `t` (ms). For transform presets it
 * returns { transform, opacity } as SVG attribute values; for draw it returns
 * { draw: [{ offset, opacity }], fill } for each stroke element.
 */
export function frameState({ animate, duration, delay, loop, count = 1 } = {}, t = 0) {
  const p = ANIMATIONS[animate];
  if (!p) return null;
  const dur = ms(duration, p.duration);
  const del = ms(delay, 0);
  const it = iterations(loop, p);
  if (animate === 'draw') {
    const n = Math.max(1, count | 0);
    const each = n > 1 ? Math.round(dur * 0.62) : dur;
    const step = n > 1 ? (dur - each) / (n - 1) : 0;
    const ease = easing(p.easing);
    const alt = it === Infinity;
    const draw = [];
    for (let i = 0; i < n; i++) {
      const prog = progressAt(t, del + i * step, each, it, alt);
      const e = ease(prog);
      draw.push({ offset: 1 - e, opacity: prog <= 0 ? 0 : prog < 0.01 ? prog * 100 : 1 });
    }
    const fp = progressAt(t, del + dur * 0.6, dur * 0.4, it, alt);
    return { draw, fill: easing('ease')(fp) };
  }
  const prog = progressAt(t, del, dur, it, false);
  const v = sampleFrames(p, prog);
  const [ox, oy] = p.origin || [12, 12];
  const parts = [`translate(${r4(ox)} ${r4(oy + (v.y || 0))})`];
  if (v.r) parts.push(`rotate(${r4(v.r)})`);
  if (v.s !== undefined && v.s !== 1) parts.push(`scale(${r4(v.s)})`);
  parts.push(`translate(${r4(-ox)} ${r4(-oy)})`);
  return { transform: parts.join(' '), opacity: v.o === undefined ? 1 : r4(v.o) };
}

const r4 = (v) => Math.round(v * 10000) / 10000;
