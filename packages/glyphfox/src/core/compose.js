// Modifiers and Fusion. Both compose icons into a new icon that follows the
// same rules as the source set (padding box, one stroke weight, no
// transforms, no fills outside the duotone layer). Where shapes meet, the
// shape behind is trimmed so a clean knockout gap separates the lines.

import {
  distToPolylines,
  flattenNode,
  isClosedNode,
  pointInPolygon,
  polygonArea,
  segmentsBounds,
  serializePath,
  shapeToSegments,
  transformNode,
  trimSegments,
} from './geometry.js';
import { iconNodes, nodesToString, roundNode, splitLayers } from './nodes.js';
import { solidLayers } from './solid.js';

export const CORNERS = ['bottom-right', 'top-right', 'bottom-left', 'top-left'];
const CORNER_ALIASES = { br: 'bottom-right', tr: 'top-right', bl: 'bottom-left', tl: 'top-left' };

/** Accepts tl, tr, bl, br or the long names; defaults to bottom-right. */
export function normalizeCorner(corner) {
  if (!corner) return 'bottom-right';
  const c = String(corner).toLowerCase();
  if (CORNERS.includes(c)) return c;
  if (CORNER_ALIASES[c]) return CORNER_ALIASES[c];
  throw new RangeError(`unknown corner "${corner}" (use ${CORNERS.join(', ')})`);
}

/** Badge glyphs, drawn around (0, 0) with the same stroke as the icons. */
export const MODIFIERS = {
  plus: [['path', { d: 'M0-3.5v7M-3.5 0h7' }]],
  minus: [['path', { d: 'M-3.5 0h7' }]],
  check: [['path', { d: 'M-3.5.5-1 3l4.5-5.5' }]],
  x: [['path', { d: 'M-2.75-2.75l5.5 5.5M2.75-2.75l-5.5 5.5' }]],
  alert: [['path', { d: 'M0-3.75v4' }], ['path', { d: 'M0 3.5h.01' }]],
  lock: [
    ['rect', { x: -3.25, y: -0.5, width: 6.5, height: 4.5, rx: 1 }],
    ['path', { d: 'M-1.75-.5V-2a1.75 1.75 0 0 1 3.5 0v1.5' }],
  ],
  clock: [
    ['circle', { cx: 0, cy: 0, r: 3.75 }],
    ['path', { d: 'M0-1.75V0l1.25 1.25' }],
  ],
  sync: [
    ['path', { d: 'M-3.5 0a3.5 3.5 0 0 1 6.1-2.35' }],
    ['path', { d: 'M3-4.25v2.25H.75' }],
    ['path', { d: 'M3.5 0a3.5 3.5 0 0 1-6.1 2.35' }],
    ['path', { d: 'M-3 4.25V2h2.25' }],
  ],
  'arrow-up': [['path', { d: 'M0 3.75v-7.5M-3-.75l3-3 3 3' }]],
  'arrow-down': [['path', { d: 'M0-3.75v7.5M-3 .75l3 3 3-3' }]],
  dot: [
    ['circle', { cx: 0, cy: 0, r: 2 }],
    ['path', { d: 'M0 0h.01' }],
  ],
};
export const MODIFIER_NAMES = Object.keys(MODIFIERS);

const radiusCache = new Map();
function glyphRadius(name) {
  if (radiusCache.has(name)) return radiusCache.get(name);
  let r = 0;
  for (const n of MODIFIERS[name]) for (const poly of flattenNode(n, 0.1)) for (const [x, y] of poly.points) r = Math.max(r, Math.hypot(x, y));
  radiusCache.set(name, r);
  return r;
}

function cornerCenter(corner, rb) {
  const lo = 2 + rb;
  const hi = 22 - rb;
  switch (corner) {
    case 'top-left':
      return [lo, lo];
    case 'top-right':
      return [hi, lo];
    case 'bottom-left':
      return [lo, hi];
    default:
      return [hi, hi];
  }
}

/** Trims stroke nodes where `excluded(point)` is true; untouched nodes keep their form. */
export function trimNodes(nodes, excluded) {
  const out = [];
  for (const n of nodes) {
    const { segs, changed } = trimSegments(shapeToSegments(n), excluded);
    if (!changed) out.push(n);
    else if (segs.length) out.push(['path', { d: serializePath(segs, 3) }]);
  }
  return out;
}

function diskExcluder(c, r) {
  const r2 = r * r;
  return (p) => (p[0] - c[0]) * (p[0] - c[0]) + (p[1] - c[1]) * (p[1] - c[1]) < r2;
}

function segCircle(a, b, c, r) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const fx = a[0] - c[0];
  const fy = a[1] - c[1];
  const A = dx * dx + dy * dy;
  const B = 2 * (fx * dx + fy * dy);
  const C = fx * fx + fy * fy - r * r;
  const disc = B * B - 4 * A * C;
  if (disc < 0 || A === 0) return [];
  const sq = Math.sqrt(disc);
  return [(-B - sq) / (2 * A), (-B + sq) / (2 * A)].filter((t) => t > 1e-9 && t < 1 - 1e-9).sort((p, q) => p - q);
}

function arcPoints(c, r, a0, a1, dir) {
  let delta = a1 - a0;
  if (dir > 0) while (delta <= 0) delta += Math.PI * 2;
  else while (delta >= 0) delta -= Math.PI * 2;
  const steps = Math.max(2, Math.ceil((Math.abs(delta) * r) / 0.4));
  const pts = [];
  for (let k = 1; k < steps; k++) {
    const a = a0 + (delta * k) / steps;
    pts.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
  }
  return pts;
}

/** Removes a disk from a closed polygon. Returns a list of rings. */
export function subtractDisk(points, c, r) {
  let pts = points;
  if (pts.length > 1 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 1e-9) pts = pts.slice(0, -1);
  const n = pts.length;
  const inD = (p) => Math.hypot(p[0] - c[0], p[1] - c[1]) < r;
  const ring = [];
  let crossings = 0;
  for (let k = 0; k < n; k++) {
    const a = pts[k];
    const b = pts[(k + 1) % n];
    ring.push({ p: a, inside: inD(a) });
    for (const t of segCircle(a, b, c, r)) {
      ring.push({ p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], cross: true });
      crossings++;
    }
  }
  if (!crossings) {
    if (pts.every(inD)) return [];
    if (pointInPolygon(c, pts)) {
      const orient = Math.sign(polygonArea(pts)) || 1;
      const hole = [];
      const steps = Math.max(12, Math.ceil((Math.PI * 2 * r) / 0.4));
      for (let k = 0; k < steps; k++) {
        const a = (-orient * (Math.PI * 2 * k)) / steps;
        hole.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
      }
      return [pts, hole];
    }
    return [pts];
  }
  let start = ring.findIndex((v) => !v.cross && !v.inside);
  if (start < 0) start = ring.findIndex((v, k) => v.cross && !ring[(k + 1) % ring.length].inside);
  const out = [];
  let k = 0;
  const m = ring.length;
  let inside = false;
  let exit = null;
  while (k < m) {
    const v = ring[(start + k) % m];
    if (v.cross) {
      if (!inside) {
        out.push(v.p);
        exit = v.p;
        inside = true;
      } else {
        const a0 = Math.atan2(exit[1] - c[1], exit[0] - c[0]);
        const a1 = Math.atan2(v.p[1] - c[1], v.p[0] - c[0]);
        const cw = arcPoints(c, r, a0, a1, 1);
        const ccw = arcPoints(c, r, a0, a1, -1);
        const midIn = (arc) => arc.length && pointInPolygon(arc[Math.floor(arc.length / 2)], pts);
        let arc = cw;
        if (midIn(cw) && midIn(ccw)) arc = cw.length <= ccw.length ? cw : ccw;
        else if (midIn(ccw)) arc = ccw;
        out.push(...arc, v.p);
        inside = false;
      }
    } else if (!inside) {
      out.push(v.p);
    }
    k++;
  }
  return out.length > 2 ? [out] : [];
}

function ringsToPath(rings) {
  let d = '';
  for (const ring of rings) {
    if (ring.length < 3) continue;
    const segs = [['M', ring[0][0], ring[0][1]], ...ring.slice(1).map((p) => ['L', p[0], p[1]]), ['Z']];
    d += serializePath(segs, 2);
  }
  return d;
}

function subtractDiskFromNode(node, c, r) {
  const polys = flattenNode(node, 0.3).filter((p) => p.closed);
  const rings = [];
  for (const p of polys) rings.push(...subtractDisk(p.points, c, r));
  const d = ringsToPath(rings);
  if (!d) return null;
  const { class: cls, fill, stroke, opacity } = node[1];
  return ['path', { class: cls, d, fill, stroke, opacity }];
}

function finish(nodes) {
  return nodes.map((n) => roundNode(n, 2));
}

/**
 * Adds a modifier badge to an icon. Returns a new icon data object.
 * `weight` is the stroke width the icon will be rendered with, so the gap
 * stays even at every weight.
 */
export function withModifier(icon, modifier, corner, { weight = 2, gap = 1 } = {}) {
  const glyph = MODIFIERS[modifier];
  if (!glyph) throw new RangeError(`unknown modifier "${modifier}" (use ${MODIFIER_NAMES.join(', ')})`);
  const where = normalizeCorner(corner);
  const rb = glyphRadius(modifier);
  const c = cornerCenter(where, rb);
  const w = Number(weight) || 2;
  const g = Math.max(0, Number(gap) || 0);
  const cut = diskExcluder(c, rb + w + g);
  const { secondary, primary } = splitLayers(iconNodes(icon));
  const badge = glyph.map((n) => transformNode(n, 1, c[0], c[1]));
  const sec = secondary ? subtractDiskFromNode(secondary, c, rb + w / 2 + g) : null;
  const nodes = finish([...(sec ? [sec] : []), ...trimNodes(primary, cut), ...badge]);
  const base = solidLayers(icon);
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const disk = ['circle', { cx: r3(c[0]), cy: r3(c[1]), r: r3(rb + w / 2 + g), fill: '#000', stroke: 'none' }];
  const solid = base
    ? {
        groups: base.groups.map((gr) => ({ fill: gr.fill, mask: [...gr.mask, disk] })),
        strokes: finish([...trimNodes(base.strokes, cut), ...badge]),
      }
    : null;
  return {
    name: `${icon.name}+${modifier}${where === 'bottom-right' ? '' : '@' + cornerCode(where)}`,
    body: nodesToString(nodes),
    tags: [...(icon.tags || []), modifier],
    categories: [...(icon.categories || [])],
    layers: { solid },
  };
}

function cornerCode(c) {
  return { 'bottom-right': 'br', 'top-right': 'tr', 'bottom-left': 'bl', 'top-left': 'tl' }[c];
}

// Fusion.

export const LAYOUTS = ['overlap', 'side', 'stack', 'grid', 'orbit', 'badge', 'inside'];

const snap = (v, step = 0.25) => Math.round(v / step) * step;

function box(x, y, size) {
  return { x: snap(x), y: snap(y), size: snap(size, 0.5) };
}

function silhouette(nodes) {
  const strokes = [];
  const closed = [];
  const bb = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const n of nodes) {
    const polys = flattenNode(n, 0.25);
    strokes.push(...polys);
    if (isClosedNode(n)) for (const p of polys) if (p.closed) closed.push(p.points);
    segmentsBounds(shapeToSegments(n), bb);
  }
  return { strokes, closed, bb };
}

function silhouetteExcluder(sil, dist) {
  const { bb } = sil;
  return (p) => {
    if (p[0] < bb.minX - dist || p[0] > bb.maxX + dist || p[1] < bb.minY - dist || p[1] > bb.maxY + dist) return false;
    for (const poly of sil.closed) if (pointInPolygon(p, poly)) return true;
    return distToPolylines(p, sil.strokes) < dist;
  };
}

function geometryRadius(nodes, cx, cy) {
  let r = 0;
  for (const n of nodes) for (const poly of flattenNode(n, 0.2)) for (const [x, y] of poly.points) r = Math.max(r, Math.hypot(x - cx, y - cy));
  return r;
}

function inscribedCircle(nodes) {
  const sil = silhouette(nodes);
  if (!sil.closed.length) return null;
  const main = sil.closed.reduce((a, b) => (Math.abs(polygonArea(b)) > Math.abs(polygonArea(a)) ? b : a));
  let best = null;
  const probe = (x, y) => {
    const p = [x, y];
    if (!pointInPolygon(p, main)) return;
    const d = distToPolylines(p, sil.strokes);
    if (!best || d > best.d) best = { x, y, d };
  };
  for (let y = 2.5; y < 22; y += 0.5) for (let x = 2.5; x < 22; x += 0.5) probe(x, y);
  if (!best) return null;
  const { x: bx, y: by } = best;
  for (let y = by - 0.5; y <= by + 0.5; y += 0.1) for (let x = bx - 0.5; x <= bx + 0.5; x += 0.1) probe(x, y);
  return best;
}

function layoutBoxes(layout, parts, { weight, gap }) {
  const n = parts.length;
  switch (layout) {
    case 'overlap': {
      const step = Math.min(5, 8 / (n - 1));
      const size = 20 - step * (n - 1);
      return parts.map((_, i) => box(2 + i * step, 2 + i * step, size));
    }
    case 'side':
    case 'stack': {
      const sp = 1;
      const size = (20 - (n - 1) * sp) / n;
      return parts.map((_, i) => {
        const a = 2 + i * (size + sp);
        const b = 12 - size / 2;
        return layout === 'side' ? box(a, b, size) : box(b, a, size);
      });
    }
    case 'grid': {
      const rows = n <= 4 ? (n <= 2 ? [n] : [2, n - 2]) : n <= 9 ? chunk(n, 3) : [3, 4, 3];
      const cols = Math.max(...rows);
      const sp = 1;
      const size = (20 - (cols - 1) * sp) / cols;
      const totalH = rows.length * size + (rows.length - 1) * sp;
      const out = [];
      rows.forEach((count, r) => {
        const rowW = count * size + (count - 1) * sp;
        for (let c = 0; c < count; c++) out.push(box(12 - rowW / 2 + c * (size + sp), 12 - totalH / 2 + r * (size + sp), size));
      });
      return out;
    }
    case 'orbit': {
      const k = n - 1;
      let ss = 8;
      let rho = 10 - ss / 2;
      while (ss > 3) {
        rho = 10 - ss / 2;
        const chord = k > 1 ? 2 * rho * Math.sin(Math.PI / k) : Infinity;
        if (chord >= ss + 0.5 && 2 * (rho - ss / 2) - 2 * gap - weight >= 6) break;
        ss -= 0.5;
      }
      const sc = Math.min(12, 2 * (rho - ss / 2) - 2 * gap - weight);
      const out = [box(12 - sc / 2, 12 - sc / 2, sc)];
      for (let i = 0; i < k; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / k;
        out.push(box(12 + rho * Math.cos(a) - ss / 2, 12 + rho * Math.sin(a) - ss / 2, ss));
      }
      return out;
    }
    case 'badge': {
      const order = ['bottom-right', 'top-right', 'bottom-left', 'top-left'];
      const size = 9.5;
      const out = [box(2, 2, 20)];
      for (let i = 1; i < n; i++) {
        const corner = order[(i - 1) % 4];
        const x = corner.endsWith('right') ? 22 - size : 2;
        const y = corner.startsWith('bottom') ? 22 - size : 2;
        out.push(box(x, y, size));
      }
      return out;
    }
    case 'inside': {
      const out = [box(2, 2, 20)];
      const circle = inscribedCircle(parts[0].primary);
      if (!circle) {
        out.push(box(7, 7, 10));
        return out;
      }
      const inner = parts[1].primary;
      const bb = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
      for (const node of inner) segmentsBounds(shapeToSegments(node), bb);
      const icx = (bb.minX + bb.maxX) / 2;
      const icy = (bb.minY + bb.maxY) / 2;
      const ri = Math.max(1, geometryRadius(inner, icx, icy));
      const s = Math.max(0.15, (circle.d - weight - gap) / ri);
      // Box such that the inner geometry center lands on the circle center.
      const size = 20 * s;
      out.push({ x: circle.x - (icx - 2) * s, y: circle.y - (icy - 2) * s, size, exact: true });
      return out;
    }
    default:
      throw new RangeError(`unknown layout "${layout}" (use ${LAYOUTS.join(', ')})`);
  }
}

function chunk(n, size) {
  const rows = [];
  for (let left = n; left > 0; left -= size) rows.push(Math.min(size, left));
  return rows;
}

function clampBox(b) {
  const size = Math.min(20, Math.max(1, b.size));
  return { ...b, size, x: Math.min(22 - size, Math.max(2, b.x)), y: Math.min(22 - size, Math.max(2, b.y)) };
}

/**
 * Fuses 2 to 10 icons into one icon.
 * Options: layout, gap (knockout gap in grid units), weight (render stroke),
 * scale (number or one per part), offsets ([[dx, dy], ...]).
 */
export function fuse(icons, options = {}) {
  const parts = icons.map((icon) => ({ icon, ...splitLayers(iconNodes(icon)) }));
  const n = parts.length;
  if (n < 2 || n > 10) throw new RangeError('fuse needs 2 to 10 icons');
  const layout = options.layout || (n === 2 ? 'overlap' : 'grid');
  if (!LAYOUTS.includes(layout)) throw new RangeError(`unknown layout "${layout}" (use ${LAYOUTS.join(', ')})`);
  if (layout === 'inside' && n !== 2) throw new RangeError('the inside layout takes exactly 2 icons');
  if (layout === 'badge' && n > 5) throw new RangeError('the badge layout takes 2 to 5 icons');
  const weight = Number(options.weight) || 2;
  const gap = Math.max(0, options.gap === undefined ? 1 : Number(options.gap) || 0);
  const offsets = options.offsets || [];
  let boxes = layoutBoxes(layout, parts, { weight, gap });
  boxes = boxes.map((b, i) => {
    const sc = Array.isArray(options.scale) ? Number(options.scale[i] ?? 1) : Number(options.scale ?? 1);
    const size = b.size * (Number.isFinite(sc) && sc > 0 ? sc : 1);
    const off = offsets[i] || [0, 0];
    const cx = b.x + b.size / 2 + (Number(off[0]) || 0);
    const cy = b.y + b.size / 2 + (Number(off[1]) || 0);
    const nb = { x: cx - size / 2, y: cy - size / 2, size };
    return b.exact && size === b.size && !off[0] && !off[1] ? b : clampBox({ x: snap(nb.x), y: snap(nb.y), size: snap(nb.size, 0.25) });
  });

  const placed = parts.map((p, i) => {
    const b = boxes[i];
    const s = b.size / 20;
    const ox = b.x - 2 * s;
    const oy = b.y - 2 * s;
    const tf = (node) => transformNode(node, s, ox, oy);
    const solid = solidLayers(p.icon);
    return {
      box: b,
      primary: p.primary.map(tf),
      secondary: p.secondary ? tf(p.secondary) : null,
      solid: solid ? { groups: solid.groups.map((g) => ({ fill: g.fill.map(tf), mask: g.mask.map(tf) })), strokes: solid.strokes.map(tf) } : null,
    };
  });

  // Knockouts: every part is trimmed by the parts in front of it.
  const cutters = [];
  const masks = placed.map(() => []);
  if (layout === 'badge') {
    for (let j = 1; j < n; j++) {
      const b = placed[j].box;
      const c = [b.x + b.size / 2, b.y + b.size / 2];
      const rb = geometryRadius(placed[j].primary, c[0], c[1]);
      cutters.push({ j, ex: diskExcluder(c, rb + weight + gap) });
      const r3 = (v) => Math.round(v * 1000) / 1000;
      for (let i = 0; i < j; i++) masks[i].push(['circle', { cx: r3(c[0]), cy: r3(c[1]), r: r3(rb + weight / 2 + gap), fill: '#000', stroke: 'none' }]);
    }
  } else {
    const boxes2 = placed.map((p) => silhouette(p.primary).bb);
    const overlaps = (a, b) => a.minX < b.maxX && b.minX < a.maxX && a.minY < b.maxY && b.minY < a.maxY;
    for (let j = 1; j < n; j++) {
      const sil = silhouette(placed[j].primary);
      const behind = [];
      for (let i = 0; i < j; i++) if (overlaps(boxes2[i], boxes2[j])) behind.push(i);
      if (!behind.length) continue;
      cutters.push({ j, ex: silhouetteExcluder(sil, weight + gap), only: new Set(behind) });
      for (const i of behind) {
        for (const node of placed[j].primary) {
          masks[i].push([node[0], { ...node[1], fill: isClosedNode(node) ? '#000' : 'none', stroke: '#000', 'stroke-width': weight + 2 * gap }]);
        }
      }
    }
  }
  const trimFor = (i, nodes) => {
    let out = nodes;
    for (const { j, ex, only } of cutters) if (j > i && (!only || only.has(i))) out = trimNodes(out, ex);
    return out;
  };
  const strokes = [];
  placed.forEach((p, i) => strokes.push(...trimFor(i, p.primary)));

  // One duotone layer for the whole fusion (merged subpaths).
  let secondary = null;
  const secD = placed
    .filter((p) => p.secondary)
    .map((p) => serializePath(shapeToSegments(p.secondary), 2))
    .join('');
  if (secD) secondary = ['path', { class: 'gf-secondary', d: secD, fill: 'currentColor', stroke: 'none', opacity: '0.3' }];

  const nodes = finish([...(secondary ? [secondary] : []), ...strokes]);
  const groups = [];
  const solidStrokes = [];
  placed.forEach((p, i) => {
    if (p.solid) {
      for (const g of p.solid.groups) groups.push({ fill: g.fill, mask: [...g.mask, ...masks[i]] });
      solidStrokes.push(...trimFor(i, p.solid.strokes));
    } else {
      solidStrokes.push(...trimFor(i, p.primary));
    }
  });
  const names = icons.map((ic) => ic.name);
  return {
    name: names.join('&') + (options.layout ? `:${layout}` : ''),
    body: nodesToString(nodes),
    tags: [...new Set(icons.flatMap((ic) => ic.tags || []))],
    categories: [...new Set(icons.flatMap((ic) => ic.categories || []))],
    layers: { solid: groups.length ? { groups, strokes: finish(solidStrokes) } : null },
    parts: boxes.map((b) => ({ x: b.x, y: b.y, size: b.size })),
  };
}

