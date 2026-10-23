// Designed animations: a frame timeline per element of an icon, authored in
// the icon's JSON sidecar or passed as a prop.
//
//   {
//     name: 'beat',
//     duration: 900,                  // ms, default 800
//     easing: 'ease-in-out',          // CSS timing function, default ease
//     loop: false,                    // true, false or a count
//     frames: [
//       { at: 0, element: 0, props: { transform: 'scale(1)', opacity: 1 } },
//       { at: 0.5, element: 0, props: { transform: 'scale(1.2)' }, easing: 'ease-out' },
//       { at: 1, element: 0, props: { transform: 'scale(1)' } },
//     ],
//   }
//
// `element` is the index of a drawn element of the icon (the duotone layer
// is not counted), "all" (or no element) for the whole icon, or
// "secondary" for the duotone layer. `props` takes transform (CSS, in grid
// units: translate(2px, 0) moves two grid units), opacity, strokeDashoffset
// (the element is drawn with pathLength 1, so 1 hides it and 0 shows it)
// and d (path data). The same timeline renders as scoped CSS inside the SVG
// (no script needed), plays on the Web Animations API with the trigger
// engine, and is sampled frame by frame for GIF and WebM export.

import { TRIGGERS, easing, stopCss, triggerScopes } from './animate.js';
import { hash } from './nodes.js';

const KEYS = ['transform', 'opacity', 'strokeDashoffset', 'd'];
const CSS_NAME = { transform: 'transform', opacity: 'opacity', strokeDashoffset: 'stroke-dashoffset', d: 'd' };

/** Track key of an element reference: "all", "secondary" or the index. */
export function trackKey(element) {
  if (element === undefined || element === null || element === 'all' || element === '*') return 'all';
  if (element === 'secondary') return 'secondary';
  const n = Number(element);
  return Number.isInteger(n) && n >= 0 ? String(n) : 'all';
}

/**
 * Validates and normalizes a timeline into tracks of keyframes:
 * { name, duration, easing, loop, origin, tracks: [{ element, keyframes: [{ offset, easing?, ...props }] }] }.
 * Returns null when the timeline has no usable frame.
 */
export function normalizeTimeline(timeline) {
  let tl = timeline;
  if (typeof tl === 'string') {
    try {
      tl = JSON.parse(tl);
    } catch {
      return null;
    }
  }
  if (!tl || typeof tl !== 'object' || !Array.isArray(tl.frames)) return null;
  const groups = new Map();
  for (const f of tl.frames) {
    if (!f || typeof f !== 'object') continue;
    const at = Math.max(0, Math.min(1, Number(f.at)));
    if (!Number.isFinite(at)) continue;
    const props = {};
    for (const k of KEYS) {
      const v = f.props ? f.props[k] : undefined;
      if (v === undefined || v === null || v === '') continue;
      props[k] = k === 'opacity' || k === 'strokeDashoffset' ? Number(v) : String(v);
    }
    if (!Object.keys(props).length) continue;
    const key = trackKey(f.element);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ offset: at, ...(f.easing ? { easing: String(f.easing) } : {}), ...props });
  }
  if (!groups.size) return null;
  const tracks = [...groups.entries()].map(([element, keyframes]) => {
    keyframes.sort((a, b) => a.offset - b.offset);
    // Every property starts and ends somewhere: fill the ends from the
    // nearest frame so CSS and the Web Animations API agree.
    const used = new Set(keyframes.flatMap((k) => KEYS.filter((p) => k[p] !== undefined)));
    if (keyframes[0].offset > 0) keyframes.unshift({ offset: 0 });
    if (keyframes[keyframes.length - 1].offset < 1) keyframes.push({ offset: 1 });
    for (const p of used) {
      const first = keyframes.find((k) => k[p] !== undefined);
      const last = [...keyframes].reverse().find((k) => k[p] !== undefined);
      if (keyframes[0][p] === undefined) keyframes[0][p] = first[p];
      if (keyframes[keyframes.length - 1][p] === undefined) keyframes[keyframes.length - 1][p] = last[p];
    }
    return { element, keyframes };
  });
  const dur = Number(tl.duration);
  return {
    name: tl.name ? String(tl.name) : 'animation',
    duration: Number.isFinite(dur) && dur > 0 ? Math.round(dur) : 800,
    easing: tl.easing ? String(tl.easing) : 'ease',
    loop: tl.loop === undefined ? false : tl.loop,
    origin: Array.isArray(tl.origin) && tl.origin.length === 2 ? tl.origin.map(Number) : [12, 12],
    tracks,
  };
}

/** The designed animation of an icon: by name, or the first one for true or "default". */
export function iconAnimation(icon, which) {
  const list = icon && icon.animation ? (Array.isArray(icon.animation) ? icon.animation : [icon.animation]) : [];
  if (which && typeof which === 'object') return normalizeTimeline(which);
  if (typeof which === 'string' && which.trim().startsWith('{')) return normalizeTimeline(which);
  if (!list.length) return null;
  const pick = which === true || which === 'true' || which === 'default' || which === '' ? list[0] : list.find((a) => a && a.name === which);
  return pick ? normalizeTimeline(pick) : null;
}

/** True when a track animates the stroke dash (the element needs pathLength 1). */
export function usesDash(track) {
  return track.keyframes.some((k) => k.strokeDashoffset !== undefined);
}

const pct = (o) => `${Math.round(o * 10000) / 100}%`;

function cssDecl(k) {
  const parts = [];
  for (const p of KEYS) {
    if (k[p] === undefined) continue;
    parts.push(p === 'd' ? `d:path("${k[p]}")` : `${CSS_NAME[p]}:${k[p]}`);
  }
  if (k.easing) parts.push(`animation-timing-function:${k.easing}`);
  return parts.join(';');
}

/** CSS @keyframes for one track. */
export function trackKeyframes(name, track) {
  return `@keyframes ${name}{${track.keyframes.map((k) => `${pct(k.offset)}{${cssDecl(k)}}`).join('')}}`;
}

/** Selector of the element a track drives, inside the icon root. */
export function trackSelector(track) {
  if (track.element === 'all') return '.gf-anim';
  if (track.element === 'secondary') return '.gf-secondary';
  return `.gf-e${track.element}`;
}

/** WAAPI keyframes for a track (CSS property names in camel case). */
export function waapiKeyframes(track) {
  return track.keyframes.map((k) => {
    const out = { offset: k.offset };
    if (k.transform !== undefined) out.transform = k.transform;
    if (k.opacity !== undefined) out.opacity = k.opacity;
    if (k.strokeDashoffset !== undefined) out.strokeDashoffset = k.strokeDashoffset;
    if (k.d !== undefined) out.d = `path("${k.d}")`;
    if (k.easing) out.easing = k.easing;
    return out;
  });
}

// Sampling (for frame export): numbers interpolate, transforms interpolate
// when both ends use the same functions, path data when the commands match.

const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

function lerpString(a, b, t) {
  if (a === b) return a;
  const na = String(a).match(NUM) || [];
  const nb = String(b).match(NUM) || [];
  const sa = String(a).replace(NUM, '#');
  const sb = String(b).replace(NUM, '#');
  if (sa !== sb || na.length !== nb.length) return t < 0.5 ? a : b;
  let i = 0;
  return sa.replace(/#/g, () => {
    const v = Number(na[i]) + (Number(nb[i]) - Number(na[i])) * t;
    i++;
    return String(Math.round(v * 1000) / 1000);
  });
}

function sampleTrack(track, prog, globalEase) {
  const ks = track.keyframes;
  const out = {};
  for (const p of KEYS) {
    const withP = ks.filter((k) => k[p] !== undefined);
    if (!withP.length) continue;
    let i = 0;
    while (i < withP.length - 2 && prog > withP[i + 1].offset) i++;
    const a = withP[i];
    const b = withP[Math.min(i + 1, withP.length - 1)];
    const span = b.offset - a.offset;
    const local = span > 0 ? Math.max(0, Math.min(1, (prog - a.offset) / span)) : 1;
    const e = (a.easing ? easing(a.easing) : globalEase)(local);
    out[p] = typeof a[p] === 'number' ? a[p] + (b[p] - a[p]) * e : lerpString(a[p], b[p], e);
  }
  return out;
}

function iterationsOf(loop) {
  if (loop === true || loop === 'true' || loop === Infinity) return Infinity;
  const n = Number(loop);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

/** Total length of one run in ms (Infinity when it loops). */
export function timelineLength(tl, { duration, delay, loop } = {}) {
  const dur = Number.isFinite(Number(duration)) && duration !== undefined ? Number(duration) : tl.duration;
  const it = iterationsOf(loop === undefined ? tl.loop : loop);
  return it === Infinity ? Infinity : (Number(delay) || 0) + dur * it;
}

/**
 * State of every track at time t (ms): [{ element, transform?, opacity?,
 * strokeDashoffset?, d? }]. Used to export GIF and WebM frames.
 */
export function sampleTimeline(tl, t, { duration, delay, loop } = {}) {
  const dur = Number.isFinite(Number(duration)) && duration !== undefined ? Number(duration) : tl.duration;
  const del = Number(delay) || 0;
  const it = iterationsOf(loop === undefined ? tl.loop : loop);
  const local = t - del;
  let prog;
  if (local <= 0) prog = 0;
  else if (dur <= 0) prog = 1;
  else {
    const k = Math.floor(local / dur);
    prog = k >= it ? 1 : (local - k * dur) / dur;
  }
  const ease = easing(tl.easing);
  return tl.tracks.map((tr) => ({ element: tr.element, ...sampleTrack(tr, prog, ease) }));
}

/**
 * Scoped CSS that plays a timeline with a trigger (the CSS fallback that
 * needs no script). Returns { className, css }.
 */
export function timelineCss(tl, { trigger = 'mount', triggerParent = false, duration, delay, loop } = {}) {
  const trig = TRIGGERS.includes(trigger) ? trigger : 'mount';
  const dur = Number.isFinite(Number(duration)) && duration !== undefined && duration !== null && duration !== '' ? Math.max(0, Math.round(Number(duration))) : tl.duration;
  const del = Number.isFinite(Number(delay)) && delay !== undefined && delay !== null && delay !== '' ? Math.max(0, Math.round(Number(delay))) : 0;
  const it = trig === 'loop' ? Infinity : iterationsOf(loop === undefined || loop === null ? tl.loop : loop);
  const iter = it === Infinity ? 'infinite' : String(it);
  const tp = triggerParent === true || triggerParent === 'true' || triggerParent === '';
  const cls = 'gf-t' + hash(JSON.stringify(tl.tracks) + '|' + [tl.easing, tl.origin.join(' '), trig, dur, del, iter, tp ? 'p' : ''].join('|'));
  const scopes = triggerScopes(cls, trig, tp);
  let css = '';
  scopes.forEach((_, k) => tl.tracks.forEach((tr, i) => (css += trackKeyframes(`${cls}-${i}${k ? '-r' : ''}`, tr))));
  css += `.${cls} .gf-anim,.${cls} .gf-secondary,.${cls} [class*="gf-e"]{transform-box:view-box;transform-origin:${tl.origin[0]}px ${tl.origin[1]}px}`;
  scopes.forEach((sels, k) => {
    const S = (tail) => sels.map((s) => `${s} ${tail}`).join(',');
    tl.tracks.forEach((tr, i) => {
      css += `${S(trackSelector(tr))}{animation:${cls}-${i}${k ? '-r' : ''} ${dur}ms ${tl.easing} ${del}ms ${iter} both}`;
    });
  });
  css += stopCss(cls);
  return { className: cls, css };
}

/** Inline style (and path data) of a sampled track state, for frame export. */
export function stateStyle(state, origin) {
  const parts = [];
  if (state.transform !== undefined) parts.push(`transform-box:view-box`, `transform-origin:${origin[0]}px ${origin[1]}px`, `transform:${state.transform}`);
  if (state.opacity !== undefined) parts.push(`opacity:${Math.round(state.opacity * 1000) / 1000}`);
  if (state.strokeDashoffset !== undefined) parts.push(`stroke-dashoffset:${Math.round(state.strokeDashoffset * 1000) / 1000}`);
  return parts.join(';');
}

export { iterationsOf };
