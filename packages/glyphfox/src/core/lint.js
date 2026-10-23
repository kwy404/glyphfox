// The icon rules as a library (the studio and the CLI use it; the source
// set is checked by tools/icons/lint.mjs with the same rules).

import { nodeBounds, parsePath } from './geometry.js';
import { parseBody } from './nodes.js';

export const ROOT_ATTRS = {
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

export const ELEMENT_ATTRS = {
  path: ['d'],
  circle: ['cx', 'cy', 'r'],
  ellipse: ['cx', 'cy', 'rx', 'ry'],
  rect: ['x', 'y', 'width', 'height', 'rx'],
  line: ['x1', 'y1', 'x2', 'y2'],
  polyline: ['points'],
  polygon: ['points'],
};

const REQUIRED = {
  path: ['d'],
  circle: ['cx', 'cy', 'r'],
  ellipse: ['cx', 'cy', 'rx', 'ry'],
  rect: ['x', 'y', 'width', 'height'],
  line: ['x1', 'y1', 'x2', 'y2'],
  polyline: ['points'],
  polygon: ['points'],
};

const NUMBER_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const NUMS_RE = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;
const MAX_DECIMALS = 2;
const EPS = 0.001;

function decimals(s) {
  const m = /\.(\d+)/.exec(s.replace(/[eE].*$/, ''));
  return m ? m[1].replace(/0+$/, '').length : 0;
}

/** Lints the inner markup of an icon (as if wrapped in the canonical root). */
export function lintBody(body) {
  const problems = [];
  const report = (rule, message) => problems.push({ rule, message });
  let nodes;
  try {
    if (/<!--|<\?|<!\[CDATA/.test(body)) report('xml', 'comments and processing instructions are not allowed');
    nodes = parseBody(body);
  } catch (err) {
    report('xml', err.message);
    return problems;
  }
  if (!nodes.length) report('empty', 'the icon has no elements');
  let strokes = 0;
  let secondary = 0;
  nodes.forEach((node, index) => {
    const [tag, a, children] = node;
    const where = `<${tag}> #${index + 1}`;
    const allowed = ELEMENT_ATTRS[tag];
    if (!allowed) {
      report('element', `${where} is not allowed (use path, circle, rect, line, polyline, polygon or ellipse)`);
      return;
    }
    if (children && children.length) report('element', `${where} must be empty`);
    const isSecondary = a.class !== undefined;
    if (isSecondary) {
      secondary++;
      if (a.class !== 'gf-secondary') report('secondary', `${where}: class must be "gf-secondary"`);
      if (index !== 0) report('secondary', `${where}: the duotone layer must be the first element`);
      if (a.fill !== 'currentColor') report('secondary', `${where}: the duotone layer needs fill="currentColor"`);
      if (a.stroke !== 'none') report('secondary', `${where}: the duotone layer needs stroke="none"`);
      if (a.opacity !== '0.3') report('secondary', `${where}: the duotone layer needs opacity="0.3"`);
      if (tag === 'line' || tag === 'polyline') report('secondary', `${where}: the duotone layer must be a closed shape`);
    } else strokes++;
    for (const k of Object.keys(a)) {
      if (k === 'transform') report('no-transform', `${where} has a transform`);
      else if (allowed.includes(k)) continue;
      else if (isSecondary && ['class', 'fill', 'stroke', 'opacity'].includes(k)) continue;
      else if (['fill', 'stroke', 'opacity', 'fill-opacity'].includes(k)) report('no-fill', `${where}: ${k}="${a[k]}" is only allowed on the "gf-secondary" layer`);
      else report('attribute', `${where}: attribute "${k}" is not allowed`);
    }
    for (const k of REQUIRED[tag]) if (a[k] === undefined) report('attribute', `${where}: missing "${k}"`);
    let numbers = [];
    let ok = true;
    for (const k of allowed) {
      if (a[k] === undefined || k === 'd' || k === 'points') continue;
      if (!NUMBER_RE.test(a[k])) {
        report('number', `${where}: ${k}="${a[k]}" is not a plain number`);
        ok = false;
      } else numbers.push(a[k]);
    }
    try {
      if (a.d !== undefined) {
        const segs = parsePath(a.d);
        if (!segs.some((s) => s[0] !== 'M')) report('path', `${where}: the path draws nothing`);
        numbers = numbers.concat(a.d.match(NUMS_RE) || []);
      }
      if (a.points !== undefined) numbers = numbers.concat(a.points.match(NUMS_RE) || []);
    } catch (err) {
      report('path', `${where}: ${err.message}`);
      ok = false;
    }
    for (const v of numbers) if (decimals(v) > MAX_DECIMALS) report('precision', `${where}: ${v} has more than ${MAX_DECIMALS} decimals`);
    const n = (k) => parseFloat(a[k]);
    if (ok) {
      if (tag === 'circle' && !(n('r') > 0)) report('geometry', `${where}: r must be positive`);
      if (tag === 'ellipse' && !(n('rx') > 0 && n('ry') > 0)) report('geometry', `${where}: rx and ry must be positive`);
      if (tag === 'rect' && !(n('width') > 0 && n('height') > 0)) report('geometry', `${where}: width and height must be positive`);
      if (REQUIRED[tag].every((k) => a[k] !== undefined)) {
        const b = nodeBounds(node);
        const out = [];
        if (b.minX < 2 - EPS) out.push(`left ${round(b.minX)}`);
        if (b.minY < 2 - EPS) out.push(`top ${round(b.minY)}`);
        if (b.maxX > 22 + EPS) out.push(`right ${round(b.maxX)}`);
        if (b.maxY > 22 + EPS) out.push(`bottom ${round(b.maxY)}`);
        if (out.length) report('padding', `${where} leaves the 2 to 22 box (${out.join(', ')})`);
      }
    }
  });
  if (secondary > 1) report('secondary', 'only one duotone element is allowed (merge the shapes into one path)');
  if (nodes.length && !strokes) report('empty', 'the icon has no stroke elements');
  return problems;
}

const round = (v) => Math.round(v * 1000) / 1000;

/** Lints a full SVG document: the canonical root plus the body rules. */
export function lintSvg(text) {
  const problems = [];
  const m = /^\s*<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/.exec(String(text).replace(/^﻿/, ''));
  if (!m) return [{ rule: 'xml', message: 'the file must be a single <svg> element' }];
  const attrs = {};
  const re = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let a;
  while ((a = re.exec(m[1]))) attrs[a[1]] = a[2] !== undefined ? a[2] : a[3];
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'transform') problems.push({ rule: 'no-transform', message: 'the <svg> element has a transform' });
    else if (!(k in ROOT_ATTRS)) problems.push({ rule: 'root', message: `unexpected attribute "${k}" on <svg>` });
    else if (ROOT_ATTRS[k] !== v) problems.push({ rule: 'root', message: `${k}="${v}" must be ${k}="${ROOT_ATTRS[k]}"` });
  }
  for (const [k, v] of Object.entries(ROOT_ATTRS)) if (attrs[k] === undefined) problems.push({ rule: 'root', message: `missing ${k}="${v}" on <svg>` });
  return problems.concat(lintBody(m[2]));
}

/** Canonical file text for a body (one element per line). */
export function canonicalSvg(body) {
  const head = Object.entries(ROOT_ATTRS)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
  const lines = parseBody(body).map((n) => {
    const [tag, attrs] = n;
    const keys = Object.keys(attrs);
    const order = [...(attrs.class !== undefined ? ['class'] : []), ...(ELEMENT_ATTRS[tag] || []), 'fill', 'stroke', 'opacity'];
    const sorted = [...order.filter((k) => keys.includes(k)), ...keys.filter((k) => !order.includes(k))];
    return `  <${tag}${sorted.map((k) => ` ${k}="${attrs[k]}"`).join('')}/>`;
  });
  return `<svg ${head}>\n${lines.join('\n')}\n</svg>\n`;
}
