// Shared helpers of the landing scenes: easing, springs, a seeded random
// source and small SVG builders that read the icon geometry.

import { gf } from '../app.js';

export const NS = 'http://www.w3.org/2000/svg';
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOut = (x) => 1 - Math.pow(1 - x, 3);
/** Progress of v inside [a, b], clamped. */
export const span = (v, a, b) => clamp((v - a) / (b - a));
export const r2 = (v) => Math.round(v * 100) / 100;

/**
 * Step response of a damped spring released at 0 toward 1, sampled at
 * progress t (0 to 1). It overshoots, settles and lands exactly on 1.
 */
export function spring(t, { bounce = 0.32, speed = 9 } = {}) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const zeta = clamp(1 - bounce, 0.05, 0.99);
  const w = speed;
  const wd = w * Math.sqrt(1 - zeta * zeta);
  const x = t * 1.6;
  const v = 1 - Math.exp(-zeta * w * x) * (Math.cos(wd * x) + ((zeta * w) / wd) * Math.sin(wd * x));
  // Blend into 1 over the last stretch so the end is exact.
  const k = smooth(span(t, 0.82, 1));
  return v + (1 - v) * k;
}

/** Small deterministic random source, so drawings look the same on every visit. */
export function random(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

export function el(tag, attrs = {}, parent) {
  const node = document.createElementNS(NS, tag);
  for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) node.setAttribute(k, String(attrs[k]));
  if (parent) parent.appendChild(node);
  return node;
}

/** Path data of a node list (any shape tag) as one string. */
export function nodesD(nodes, prec = 2) {
  let d = '';
  for (const n of nodes) d += gf.geometry.serializePath(gf.geometry.shapeToSegments(n), prec);
  return d;
}

/** Primary (stroke) nodes and the optional duotone node of an icon by name. */
export function layers(name) {
  const icon = gf.lookupIcon(name);
  if (!icon) return null;
  const { primary, secondary } = gf.splitLayers(gf.iconNodes(icon));
  return { icon, primary, secondary };
}

/** Path data of every stroke of an icon, one entry per node. */
export function strokesOf(name) {
  const l = layers(name);
  return l ? l.primary.map((n) => gf.geometry.serializePath(gf.geometry.shapeToSegments(n), 2)) : [];
}

/** Path data moved and scaled (baked, no transform attribute). */
export function bake(d, s, ox, oy) {
  const segs = gf.geometry.parsePath(d);
  return gf.geometry.serializePath(gf.geometry.transformSegments(segs, [s, 0, 0, s, ox, oy]), 2);
}

/** Polylines of path data, for sampling targets along an outline. */
export function polylines(d, step = 0.25) {
  return gf.geometry.flatten(gf.geometry.parsePath(d), step);
}

/** Points spread along a set of polylines in drawing order, by arc length. */
export function alongPolys(polys, count) {
  let total = 0;
  for (const p of polys) total += gf.geometry.polylineLength(p.points);
  const out = [];
  for (const p of polys) {
    const len = gf.geometry.polylineLength(p.points);
    const k = Math.max(2, Math.round((count * len) / total));
    const pts = gf.geometry.resample(p.points, k + (p.closed ? 1 : 0));
    if (p.closed) pts.pop();
    out.push(...pts);
  }
  return out;
}

/** A <symbol> per icon inside a hidden defs block, for <use> references. */
export function symbols(svgEl, names, prefix) {
  const defs = el('defs', {}, svgEl);
  for (const name of names) {
    const l = layers(name);
    if (!l) continue;
    const sym = el('symbol', { id: `${prefix}-${name}`, viewBox: '0 0 24 24' }, defs);
    el('path', { d: nodesD(l.primary) }, sym);
  }
  return defs;
}

/** Reads a design token of the page (theme aware). */
export const token = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/** Calls fn when the page theme changes. */
export function onTheme(fn) {
  new MutationObserver(fn).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}
