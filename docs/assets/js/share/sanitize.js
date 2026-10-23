// Icons that arrive from a link or from a friend are untrusted markup. Only
// the shapes of the icon rules survive: path, circle, ellipse, rect, line,
// polyline and polygon with their geometry, plus the duotone layer. No
// scripts, handlers, styles, links or nested elements.

import { nodesToString, parseBody } from '../../../vendor/glyphfox.js';

export const LIMITS = { items: 500, body: 20000, nodes: 200, name: 64, tags: 24, tag: 40, categories: 4 };

const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const PATH = /^[MmLlHhVvCcSsQqTtAaZz0-9.,+\-eE\s]*$/;
const POINTS = /^[0-9.,+\-eE\s]*$/;

const GEOMETRY = {
  path: { d: PATH },
  circle: { cx: NUMBER, cy: NUMBER, r: NUMBER },
  ellipse: { cx: NUMBER, cy: NUMBER, rx: NUMBER, ry: NUMBER },
  rect: { x: NUMBER, y: NUMBER, width: NUMBER, height: NUMBER, rx: NUMBER, ry: NUMBER },
  line: { x1: NUMBER, y1: NUMBER, x2: NUMBER, y2: NUMBER },
  polyline: { points: POINTS },
  polygon: { points: POINTS },
};

const LAYER = {
  class: /^gf-secondary$/,
  fill: /^(?:none|currentColor)$/,
  stroke: /^(?:none|currentColor)$/,
  opacity: NUMBER,
};

/** The safe markup of an icon body (may be empty). */
export function cleanBody(body) {
  if (typeof body !== 'string' || body.length > LIMITS.body) return '';
  let nodes;
  try {
    nodes = parseBody(body);
  } catch {
    return '';
  }
  const out = [];
  for (const [tag, attrs] of nodes) {
    const allowed = GEOMETRY[tag];
    if (!allowed || out.length >= LIMITS.nodes) continue;
    const clean = {};
    for (const [k, v] of Object.entries(attrs || {})) {
      const rule = allowed[k] || LAYER[k];
      if (rule && typeof v === 'string' && rule.test(v.trim())) clean[k] = v.trim();
    }
    if (tag === 'path' && !clean.d) continue;
    out.push([tag, clean]);
  }
  return nodesToString(out);
}

/** Lower case kebab name, like the collection stores it. */
export function cleanName(name) {
  return (
    String(name || 'icon')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, LIMITS.name)
      .replace(/^-+|-+$/g, '') || 'icon'
  );
}

const words = (list, max, len) =>
  (Array.isArray(list) ? list : [])
    .filter((x) => typeof x === 'string')
    .map((x) => x.trim().toLowerCase().replace(/[<>"&]/g, '').slice(0, len))
    .filter(Boolean)
    .slice(0, max);

/** A collection item rebuilt from untrusted data, or null when nothing usable is left. */
export function cleanItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const body = cleanBody(raw.body);
  if (!body) return null;
  const categories = words(raw.categories, LIMITS.categories, LIMITS.tag);
  return {
    name: cleanName(raw.name),
    body,
    tags: words(raw.tags, LIMITS.tags, LIMITS.tag),
    categories: categories.length ? categories : ['shapes'],
  };
}
