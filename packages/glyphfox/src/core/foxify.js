// Fox-ify: converts any SVG into the glyphfox style. Transforms are baked,
// groups and <use> are flattened, the drawing is mapped onto the 24 grid
// inside the padding box, fills become strokes, points snap to the grid and
// the result is cleaned until it passes the icon lint.

import { parseXml, localName } from './xml.js';
import { segmentsBounds, serializePath, shapeToSegments, transformSegments } from './geometry.js';
import { attrNum, nodesToString } from './nodes.js';
import { canonicalSvg, lintBody } from './lint.js';

const SKIP = new Set(['defs', 'clipPath', 'mask', 'pattern', 'marker', 'symbol', 'linearGradient', 'radialGradient', 'filter', 'metadata', 'title', 'desc', 'style', 'script', 'foreignObject', 'image', 'switch']);
const SHAPES = new Set(['path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon']);
const INHERIT = ['fill', 'stroke', 'stroke-width', 'fill-opacity', 'stroke-opacity', 'visibility'];

const I = [1, 0, 0, 1, 0, 0];
function mul(m, n) {
  return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
}

/** Parses an SVG transform attribute into a matrix. */
export function parseTransform(str) {
  let m = I;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let t;
  while ((t = re.exec(String(str || '')))) {
    const v = t[2]
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    let n = I;
    switch (t[1]) {
      case 'matrix':
        if (v.length === 6) n = v;
        break;
      case 'translate':
        n = [1, 0, 0, 1, v[0] || 0, v[1] || 0];
        break;
      case 'scale':
        n = [v[0] ?? 1, 0, 0, v[1] ?? v[0] ?? 1, 0, 0];
        break;
      case 'rotate': {
        const a = ((v[0] || 0) * Math.PI) / 180;
        const r = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
        n = v.length >= 3 ? mul(mul([1, 0, 0, 1, v[1], v[2]], r), [1, 0, 0, 1, -v[1], -v[2]]) : r;
        break;
      }
      case 'skewX':
        n = [1, 0, Math.tan(((v[0] || 0) * Math.PI) / 180), 1, 0, 0];
        break;
      case 'skewY':
        n = [1, Math.tan(((v[0] || 0) * Math.PI) / 180), 0, 1, 0, 0];
        break;
      default:
        break;
    }
    m = mul(m, n);
  }
  return m;
}

function styleOf(el) {
  const out = {};
  for (const k of [...INHERIT, 'display', 'opacity']) if (el.attrs[k] !== undefined) out[k] = el.attrs[k];
  if (el.attrs.style) {
    for (const decl of el.attrs.style.split(';')) {
      const c = decl.indexOf(':');
      if (c < 0) continue;
      const k = decl.slice(0, c).trim();
      const v = decl.slice(c + 1).trim();
      if (k) out[k] = v;
    }
  }
  return out;
}

const isNone = (v) => v === undefined || v === null || /^(none|transparent)$/i.test(String(v).trim());

function collect(el, matrix, inherited, ids, out, depth = 0) {
  if (depth > 32) return;
  const name = localName(el.name);
  if (SKIP.has(name)) return;
  const st = styleOf(el);
  if (st.display === 'none' || (st.opacity !== undefined && Number(st.opacity) === 0)) return;
  const style = { ...inherited };
  for (const k of INHERIT) if (st[k] !== undefined) style[k] = st[k];
  let m = el.attrs.transform ? mul(matrix, parseTransform(el.attrs.transform)) : matrix;
  if (name === 'use') {
    const href = el.attrs.href || el.attrs['xlink:href'] || '';
    const ref = href.startsWith('#') ? ids.get(href.slice(1)) : null;
    if (ref) {
      const mm = mul(m, [1, 0, 0, 1, Number(el.attrs.x) || 0, Number(el.attrs.y) || 0]);
      const target = localName(ref.name) === 'symbol' ? { ...ref, name: 'g' } : ref;
      collect(target, mm, style, ids, out, depth + 1);
    }
    return;
  }
  if (name === 'svg' && depth > 0) {
    const x = Number(el.attrs.x) || 0;
    const y = Number(el.attrs.y) || 0;
    m = mul(m, [1, 0, 0, 1, x, y]);
  }
  if (SHAPES.has(name)) {
    if (style.visibility === 'hidden') return;
    const filled = !isNone(style.fill ?? 'black') && Number(style['fill-opacity'] ?? 1) > 0;
    const stroked = !isNone(style.stroke) && Number(style['stroke-opacity'] ?? 1) > 0;
    if (!filled && !stroked) return;
    let segs;
    try {
      segs = shapeToSegments([name, el.attrs]);
    } catch {
      return;
    }
    if (!segs.length) return;
    out.push({ tag: name, attrs: el.attrs, matrix: m, segs: transformSegments(segs, m), filled, stroked });
    return;
  }
  if (name === 'text') {
    out.skippedText = (out.skippedText || 0) + 1;
    return;
  }
  for (const c of el.children) collect(c, m, style, ids, out, depth + 1);
}

function indexIds(el, ids) {
  if (el.attrs && el.attrs.id) ids.set(el.attrs.id, el);
  for (const c of el.children || []) indexIds(c, ids);
}

function snapSegs(segs, step) {
  const s = (v) => Math.round(v / step) * step;
  const r = (v) => Math.round(v * 100) / 100;
  return segs.map((seg) => {
    switch (seg[0]) {
      case 'M':
      case 'L':
        return [seg[0], s(seg[1]), s(seg[2])];
      case 'C':
        return ['C', r(seg[1]), r(seg[2]), r(seg[3]), r(seg[4]), s(seg[5]), s(seg[6])];
      case 'Q':
        return ['Q', r(seg[1]), r(seg[2]), s(seg[3]), s(seg[4])];
      case 'A':
        return ['A', r(seg[1]), r(seg[2]), r(seg[3]), seg[4], seg[5], s(seg[6]), s(seg[7])];
      default:
        return seg;
    }
  });
}

function simplify(segs) {
  const out = [];
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  for (const seg of segs) {
    const t = seg[0];
    if (t === 'M') {
      if (out.length && out[out.length - 1][0] === 'M') out.pop();
      out.push(seg);
      cx = sx = seg[1];
      cy = sy = seg[2];
      continue;
    }
    if (t === 'Z') {
      out.push(seg);
      cx = sx;
      cy = sy;
      continue;
    }
    const ex = t === 'C' ? seg[5] : t === 'Q' ? seg[3] : t === 'A' ? seg[6] : seg[1];
    const ey = t === 'C' ? seg[6] : t === 'Q' ? seg[4] : t === 'A' ? seg[7] : seg[2];
    if (t === 'L' && Math.abs(ex - cx) < 1e-6 && Math.abs(ey - cy) < 1e-6) continue;
    if (t === 'L') {
      const prev = out[out.length - 1];
      if (prev && prev[0] === 'L' && out.length >= 2) {
        const before = out[out.length - 2];
        const px = before[0] === 'C' ? before[5] : before[0] === 'Q' ? before[3] : before[0] === 'A' ? before[6] : before[1];
        const py = before[0] === 'C' ? before[6] : before[0] === 'Q' ? before[4] : before[0] === 'A' ? before[7] : before[2];
        const cross = (prev[1] - px) * (ey - py) - (prev[2] - py) * (ex - px);
        const dot = (prev[1] - px) * (ex - prev[1]) + (prev[2] - py) * (ey - prev[2]);
        if (Math.abs(cross) < 1e-6 && dot >= 0) {
          out[out.length - 1] = ['L', ex, ey];
          cx = ex;
          cy = ey;
          continue;
        }
      }
    }
    out.push(seg);
    cx = ex;
    cy = ey;
  }
  if (out.length && out[out.length - 1][0] === 'M') out.pop();
  return out;
}

function isUniform(m) {
  return Math.abs(m[0] - m[3]) < 1e-9 && Math.abs(m[1]) < 1e-9 && Math.abs(m[2]) < 1e-9 && m[0] > 0;
}

/**
 * Converts any SVG text into a glyphfox icon. Options: snap (grid step,
 * default 0.25), fit ("auto", "viewbox" or "content"), padding (default 2).
 * Returns { svg, body, problems, notes }.
 */
export function foxify(svgText, { snap = 0.25, fit = 'auto', padding = 2 } = {}) {
  const root = parseXml(svgText);
  const ids = new Map();
  indexIds(root, ids);
  const shapes = [];
  collect(root, I, { fill: 'black' }, ids, shapes);
  const notes = [];
  if (shapes.skippedText) notes.push(`${shapes.skippedText} text element(s) skipped (convert text to paths first)`);
  if (!shapes.length) return { svg: '', body: '', problems: [{ rule: 'empty', message: 'no drawable shapes found' }], notes };

  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const s of shapes) segmentsBounds(s.segs, box);
  let vb = null;
  if (root.attrs.viewBox) {
    const v = root.attrs.viewBox.trim().split(/[\s,]+/).map(Number);
    if (v.length === 4 && v.every(Number.isFinite) && v[2] > 0 && v[3] > 0) vb = v;
  }
  if (!vb && Number(root.attrs.width) > 0 && Number(root.attrs.height) > 0) vb = [0, 0, Number(root.attrs.width), Number(root.attrs.height)];
  const lo = padding;
  const hi = 24 - padding;
  const span = hi - lo;
  const fitContent = () => {
    const w = Math.max(box.maxX - box.minX, 1e-6);
    const h = Math.max(box.maxY - box.minY, 1e-6);
    const s = span / Math.max(w, h);
    return [s, 0, 0, s, 12 - ((box.minX + box.maxX) / 2) * s, 12 - ((box.minY + box.maxY) / 2) * s];
  };
  let map;
  if (fit === 'content' || !vb) {
    map = fitContent();
  } else {
    const s = 24 / Math.max(vb[2], vb[3]);
    map = [s, 0, 0, s, -vb[0] * s + (24 - vb[2] * s) / 2, -vb[1] * s + (24 - vb[3] * s) / 2];
    const mx = (x) => x * map[0] + map[4];
    const my = (y) => y * map[3] + map[5];
    const out = mx(box.minX) < lo - 0.01 || my(box.minY) < lo - 0.01 || mx(box.maxX) > hi + 0.01 || my(box.maxY) > hi + 0.01;
    const tiny = (box.maxX - box.minX) * s < 4 && (box.maxY - box.minY) * s < 4;
    if (out || tiny) {
      map = fitContent();
      notes.push(out ? 'the drawing was scaled into the 2 to 22 padding box' : 'the drawing was enlarged to the padding box');
    }
  }

  let filledOnly = 0;
  const build = (m) => {
    const nodes = [];
    const seen = new Set();
    for (const s of shapes) {
      if (s.filled && !s.stroked) filledOnly++;
      const total = mul(m, s.matrix);
      let node;
      if ((s.tag === 'circle' || s.tag === 'ellipse' || s.tag === 'rect') && isUniform(total)) {
        const k = total[0];
        const X = (v) => Math.round(((Number(v) || 0) * k + total[4]) / snap) * snap;
        const Y = (v) => Math.round(((Number(v) || 0) * k + total[5]) / snap) * snap;
        const L = (v) => Math.max(snap, Math.round(((Number(v) || 0) * k) / (snap / 2)) * (snap / 2));
        const a = s.attrs;
        if (s.tag === 'circle') node = ['circle', { cx: attrNum(X(a.cx)), cy: attrNum(Y(a.cy)), r: attrNum(L(a.r)) }];
        else if (s.tag === 'ellipse') node = ['ellipse', { cx: attrNum(X(a.cx)), cy: attrNum(Y(a.cy)), rx: attrNum(L(a.rx)), ry: attrNum(L(a.ry)) }];
        else {
          const r = { x: attrNum(X(a.x)), y: attrNum(Y(a.y)), width: attrNum(L(a.width)), height: attrNum(L(a.height)) };
          const rx = a.rx ?? a.ry;
          if (rx !== undefined && Number(rx) > 0) r.rx = attrNum(Math.min(L(rx), Number(r.width) / 2, Number(r.height) / 2));
          node = ['rect', r];
        }
      } else {
        const segs = simplify(snapSegs(transformSegments(shapeToSegments([s.tag, s.attrs]), total), snap));
        if (!segs.some((g) => g[0] !== 'M')) continue;
        node = ['path', { d: serializePath(segs, 2) }];
      }
      const key = JSON.stringify(node);
      if (seen.has(key)) continue;
      seen.add(key);
      nodes.push(node);
    }
    return nodes;
  };

  let nodes = build(map);
  let body = nodesToString(nodes);
  let problems = lintBody(body);
  for (let k = 0; k < 4 && problems.some((p) => p.rule === 'padding'); k++) {
    const f = 0.97;
    map = [map[0] * f, 0, 0, map[3] * f, 12 + (map[4] - 12) * f, 12 + (map[5] - 12) * f];
    filledOnly = 0;
    nodes = build(map);
    body = nodesToString(nodes);
    problems = lintBody(body);
  }
  if (filledOnly) notes.push(`${filledOnly} filled shape(s) became outlines`);
  return { svg: canonicalSvg(body), body, problems, notes };
}
