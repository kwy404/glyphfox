// Tiny node tree used by every renderer: [tag, attrs, children?]
// children is an array of nodes or a string (text content).

import { fmt, minifyPath, parsePath, serializePath, shapeToSegments } from './geometry.js';

const TOKEN = /<(\/?)([a-zA-Z][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
const ATTR = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

export function decodeEntities(s) {
  if (s.indexOf('&') < 0) return s;
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[e];
  });
}

function parseAttrs(src) {
  const attrs = {};
  if (!src) return attrs;
  ATTR.lastIndex = 0;
  let m;
  while ((m = ATTR.exec(src))) attrs[m[1]] = decodeEntities(m[2] !== undefined ? m[2] : m[3]);
  return attrs;
}

/** Parses an icon body (the markup inside <svg>) into nodes. */
export function parseBody(body) {
  const root = [];
  const stack = [{ children: root, node: null }];
  TOKEN.lastIndex = 0;
  let m;
  while ((m = TOKEN.exec(body))) {
    const top = stack[stack.length - 1];
    if (m[5] !== undefined) {
      const text = m[5];
      if (top.node && text.trim()) top.text = (top.text || '') + decodeEntities(text);
      continue;
    }
    if (m[1]) {
      if (stack.length > 1) {
        const done = stack.pop();
        if (done.text !== undefined && !done.children.length) done.node[2] = done.text;
        else if (!done.children.length) done.node.length = 2;
      }
      continue;
    }
    const node = [m[2], parseAttrs(m[3])];
    top.children.push(node);
    if (!m[4]) {
      node[2] = [];
      stack.push({ children: node[2], node });
    }
  }
  return root;
}

const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escText = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Serializes a node (or an array of nodes) into markup. */
export function nodesToString(node) {
  if (Array.isArray(node) && (node.length === 0 || Array.isArray(node[0]))) return node.map(nodesToString).join('');
  const [tag, attrs = {}, children] = node;
  let s = '<' + tag;
  for (const k in attrs) {
    const v = attrs[k];
    if (v === undefined || v === null || v === false) continue;
    s += ` ${k}="${esc(v === true ? '' : v)}"`;
  }
  if (children === undefined || children === null || (Array.isArray(children) && children.length === 0)) return s + '/>';
  if (typeof children === 'string') return s + '>' + (tag === 'style' ? children : escText(children)) + `</${tag}>`;
  return s + '>' + children.map(nodesToString).join('') + `</${tag}>`;
}

/** Formats a number for an attribute value (keeps the leading zero). */
export function attrNum(v, prec = 2) {
  const s = fmt(v, prec);
  if (s[0] === '.') return '0' + s;
  if (s.startsWith('-.')) return '-0' + s.slice(1);
  return s;
}

const NUMERIC = new Set(['x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r', 'x1', 'y1', 'x2', 'y2', 'opacity']);

/** Rounds the geometry of a node to `prec` decimals (paths are re-serialized). */
export function roundNode(node, prec = 2) {
  const [tag, a, children] = node;
  const out = {};
  for (const k in a) {
    const v = a[k];
    if (k === 'd') out.d = typeof v === 'string' ? serializePath(parsePath(v), prec) : serializePath(v, prec);
    else if (k === 'points') {
      out.points = String(v)
        .trim()
        .split(/[\s,]+/)
        .map((n) => attrNum(Number(n), prec))
        .join(' ');
    } else if (NUMERIC.has(k) && typeof v !== 'boolean' && v !== '' && Number.isFinite(Number(v))) {
      out[k] = attrNum(Number(v), prec);
    } else out[k] = v;
  }
  return children === undefined ? [tag, out] : [tag, out, children];
}

/** Normalizes the path data of a node without changing its commands. */
export function minifyNode(node) {
  const [tag, a] = node;
  if (tag === 'path' && typeof a.d === 'string') return [tag, { ...a, d: minifyPath(a.d) }];
  return node;
}

/** Converts any shape node into a path node with the same extra attributes. */
export function nodeToPath(node, prec = 3) {
  const a = node[1];
  const keep = {};
  for (const k in a) if (!['d', 'x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r', 'x1', 'y1', 'x2', 'y2', 'points'].includes(k)) keep[k] = a[k];
  const d = serializePath(shapeToSegments(node), prec);
  return ['path', { ...pickClass(keep), d, ...omitClass(keep) }];
}

function pickClass(a) {
  return a.class !== undefined ? { class: a.class } : {};
}
function omitClass(a) {
  const { class: _c, ...rest } = a;
  return rest;
}

/** FNV-1a 32 bit hash in base 36. */
export function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/** Splits icon nodes into the optional duotone layer and the stroke elements. */
export function splitLayers(nodes) {
  let secondary = null;
  const primary = [];
  for (const n of nodes) {
    if (!secondary && n[1] && typeof n[1].class === 'string' && n[1].class.split(/\s+/).includes('gf-secondary')) secondary = n;
    else primary.push(n);
  }
  return { secondary, primary };
}

const nodeCache = new WeakMap();

/** Parsed nodes of an icon data object (cached per object). */
export function iconNodes(icon) {
  let nodes = nodeCache.get(icon);
  if (!nodes) {
    nodes = parseBody(icon.body || '');
    nodeCache.set(icon, nodes);
  }
  return nodes;
}
