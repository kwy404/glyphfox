// Icons from outside the glyphfox set (for example the universe sets) are
// normalized before they are registered: moved onto the 24 grid, groups
// flattened, and filled shapes marked so the renderer, modifiers and Fusion
// know they cannot be restroked.

import { transformNode } from './geometry.js';
import { nodesToString, parseBody } from './nodes.js';

const SHAPES = new Set(['path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon']);
const INHERITED = ['fill', 'stroke', 'stroke-width', 'opacity', 'fill-rule', 'clip-rule', 'fill-opacity', 'stroke-opacity'];

function flatten(nodes, inherited = {}) {
  const out = [];
  for (const node of nodes) {
    const [tag, a, ch] = node;
    if (tag === 'g') {
      const next = { ...inherited };
      for (const k of INHERITED) if (a[k] !== undefined) next[k] = a[k];
      if (Array.isArray(ch)) out.push(...flatten(ch, next));
    } else if (SHAPES.has(tag)) out.push([tag, { ...inherited, ...a }]);
  }
  return out;
}

/** Parses a viewBox string into [minX, minY, width, height], or null. */
export function parseViewBox(viewBox) {
  if (!viewBox) return null;
  const v = String(viewBox).trim().split(/[\s,]+/).map(Number);
  return v.length === 4 && v.every(Number.isFinite) && v[2] > 0 && v[3] > 0 ? v : null;
}

/** True when a node is drawn as a filled shape (not a stroke). */
export function isFilledNode(node) {
  const a = node[1] || {};
  return a.fill !== undefined && a.fill !== 'none' && (a.stroke === undefined || a.stroke === 'none');
}

/**
 * Normalizes an icon from another set: `viewBox` (when it is not 0 0 24 24)
 * is baked into the geometry, groups are flattened, and with `mode: "fill"`
 * (or `filled: true`) every shape without its own paint is filled with
 * currentColor. Stroke based icons on the 24 grid come out unchanged, so the
 * weight axis, animations, modifiers and Fusion work on them as on the set.
 */
export function normalizeIcon(icon, name = icon && icon.name) {
  if (!icon || typeof icon.body !== 'string') return null;
  let nodes = flatten(parseBody(icon.body));
  const vb = parseViewBox(icon.viewBox);
  if (vb && !(vb[0] === 0 && vb[1] === 0 && vb[2] === 24 && vb[3] === 24)) {
    const s = 24 / Math.max(vb[2], vb[3]);
    const tx = -vb[0] * s + (24 - vb[2] * s) / 2;
    const ty = -vb[1] * s + (24 - vb[3] * s) / 2;
    nodes = nodes.map((n) => {
      const t = transformNode(n, s, tx, ty);
      if (t[1]['stroke-width'] !== undefined) t[1]['stroke-width'] = Math.round(Number(t[1]['stroke-width']) * s * 1000) / 1000;
      return t;
    });
  }
  const filled = icon.mode === 'fill' || icon.filled === true;
  if (filled) {
    nodes = nodes.map(([tag, a]) => [tag, { ...a, fill: a.fill === undefined ? 'currentColor' : a.fill, stroke: a.stroke === undefined ? 'none' : a.stroke }]);
  }
  const out = {
    name: String(name),
    body: nodesToString(nodes),
    tags: Array.isArray(icon.tags) ? icon.tags : [],
    categories: Array.isArray(icon.categories) ? icon.categories : [],
  };
  if (filled) out.filled = true;
  for (const k of ['set', 'license', 'author']) if (icon[k] !== undefined) out[k] = icon[k];
  return out;
}
