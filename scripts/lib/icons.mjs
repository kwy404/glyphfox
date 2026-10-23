// Reads icons/NAME.svg and icons/NAME.json, checks the structural rules and
// returns optimized icon data. Optimization is lossless: numbers are
// normalized and line, polyline and polygon become compact paths.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { minifyPath, nodeBounds, parsePath, serializePath, shapeToSegments } from '../../packages/glyphfox/src/core/geometry.js';
import { attrNum, nodesToString, parseBody } from '../../packages/glyphfox/src/core/nodes.js';
import { analyzeSolid } from '../../packages/glyphfox/src/core/solid.js';

export const ROOT = {
  xmlns: 'http://www.w3.org/2000/svg',
  width: '24',
  height: '24',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '2',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
};

export const ELEMENTS = {
  path: ['d'],
  circle: ['cx', 'cy', 'r'],
  ellipse: ['cx', 'cy', 'rx', 'ry'],
  rect: ['x', 'y', 'width', 'height', 'rx', 'ry'],
  line: ['x1', 'y1', 'x2', 'y2'],
  polyline: ['points'],
  polygon: ['points'],
};

const SECONDARY_EXTRA = ['class', 'fill', 'stroke', 'opacity'];
const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const RESERVED = new Set(['spin', 'pulse', 'pop', 'wiggle', 'bounce', 'shake', 'draw']);

function parseRoot(text) {
  const m = /<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/.exec(text.replace(/^﻿/, '').trim());
  if (!m) throw new Error('not an <svg> document');
  const attrs = {};
  const re = /([\w:.-]+)\s*=\s*"([^"]*)"/g;
  let a;
  while ((a = re.exec(m[1]))) attrs[a[1]] = a[2];
  return { attrs, body: m[2] };
}

function optimizeNode(node) {
  const [tag, a] = node;
  const secondary = a.class === 'gf-secondary';
  const extra = {};
  if (secondary) for (const k of SECONDARY_EXTRA) if (a[k] !== undefined) extra[k] = a[k];
  const withExtra = (geom) => (secondary ? { class: 'gf-secondary', ...geom, fill: extra.fill, stroke: extra.stroke, opacity: extra.opacity } : geom);
  switch (tag) {
    case 'path':
      return ['path', withExtra({ d: minifyPath(a.d) })];
    case 'line':
    case 'polyline':
    case 'polygon':
      return ['path', withExtra({ d: serializePath(shapeToSegments(node), 2) })];
    default: {
      const geom = {};
      for (const k of ELEMENTS[tag]) if (a[k] !== undefined) geom[k] = attrNum(Number(a[k]));
      return [tag, withExtra(geom)];
    }
  }
}

/** Checks one icon and returns { data, problems }. */
export function readIcon(dir, name) {
  const problems = [];
  const fail = (msg) => problems.push(`${name}: ${msg}`);
  if (!NAME_RE.test(name)) fail('names must be kebab-case');
  if (RESERVED.has(name)) fail(`"${name}" is reserved for an animation class`);
  const svgPath = join(dir, `${name}.svg`);
  const jsonPath = join(dir, `${name}.json`);
  if (!existsSync(jsonPath)) fail('missing the .json sidecar');
  let meta = { categories: [], tags: [] };
  try {
    if (existsSync(jsonPath)) meta = JSON.parse(readFileSync(jsonPath, 'utf8'));
  } catch (err) {
    fail(`invalid JSON (${err.message})`);
  }
  let root;
  try {
    root = parseRoot(readFileSync(svgPath, 'utf8'));
  } catch (err) {
    fail(err.message);
    return { data: null, problems };
  }
  for (const [k, v] of Object.entries(ROOT)) if (root.attrs[k] !== v) fail(`root ${k} must be "${v}"`);
  for (const k of Object.keys(root.attrs)) if (!(k in ROOT)) fail(`unexpected root attribute "${k}"`);
  if (/<!--|<!\[CDATA|<\?/.test(root.body)) fail('comments and processing instructions are not allowed');
  const nodes = parseBody(root.body);
  if (!nodes.length) fail('the icon has no elements');
  let secondaryCount = 0;
  nodes.forEach((node, index) => {
    const [tag, a, children] = node;
    const where = `<${tag}> #${index + 1}`;
    if (!ELEMENTS[tag]) return fail(`${where} is not an allowed element`);
    if (children && children.length) fail(`${where} must be empty`);
    const secondary = a.class !== undefined;
    if (secondary) {
      secondaryCount++;
      if (a.class !== 'gf-secondary') fail(`${where} class must be "gf-secondary"`);
      if (index !== 0) fail(`${where} the duotone layer must come first`);
      if (a.fill !== 'currentColor' || a.stroke !== 'none') fail(`${where} the duotone layer needs fill="currentColor" stroke="none"`);
    }
    for (const k of Object.keys(a)) {
      if (k === 'transform') fail(`${where} has a transform`);
      else if (!ELEMENTS[tag].includes(k) && !(secondary && SECONDARY_EXTRA.includes(k))) fail(`${where} attribute "${k}" is not allowed`);
    }
    try {
      if (tag === 'path') parsePath(a.d || '');
      const b = nodeBounds(node);
      if (b.minX < 2 - 0.001 || b.minY < 2 - 0.001 || b.maxX > 22 + 0.001 || b.maxY > 22 + 0.001) fail(`${where} leaves the 2 to 22 padding box`);
    } catch (err) {
      fail(`${where} ${err.message}`);
    }
  });
  if (secondaryCount > 1) fail('only one duotone element is allowed');
  if (!Array.isArray(meta.categories) || !meta.categories.length) fail('categories must be a non-empty array');
  if (!Array.isArray(meta.tags)) fail('tags must be an array');
  if (problems.length) return { data: null, problems };
  const optimized = nodes.map(optimizeNode);
  const primary = optimized.filter((n) => n[1].class !== 'gf-secondary');
  const solid = analyzeSolid(primary);
  const data = {
    name,
    body: nodesToString(optimized),
    tags: meta.tags,
    categories: meta.categories,
    solid: solid ? [solid.fill, solid.knock] : null,
  };
  // The optimizer must keep the geometry: compare bounds before and after.
  const before = nodes.map((n) => nodeBounds(n));
  const after = optimized.map((n) => nodeBounds(n));
  before.forEach((b, k) => {
    const c = after[k];
    if (Math.abs(b.minX - c.minX) > 1e-6 || Math.abs(b.maxX - c.maxX) > 1e-6 || Math.abs(b.minY - c.minY) > 1e-6 || Math.abs(b.maxY - c.maxY) > 1e-6) {
      problems.push(`${name}: optimizer changed the geometry of element #${k + 1}`);
    }
  });
  return { data: problems.length ? null : data, problems };
}

/** Reads every icon in `dir`, sorted by name. Throws with all problems. */
export function readIcons(dir) {
  const files = existsSync(dir) ? readdirSync(dir) : [];
  const names = [...new Set(files.filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)))].sort();
  const icons = [];
  const problems = [];
  for (const name of names) {
    const r = readIcon(dir, name);
    if (r.data) icons.push(r.data);
    problems.push(...r.problems);
  }
  return { icons, problems };
}
