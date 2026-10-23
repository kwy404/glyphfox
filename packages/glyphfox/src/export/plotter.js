// Plotter export: the strokes of an icon as pen paths for a pen plotter or a
// drawing machine. Fills and the duotone layer are dropped, curves are
// flattened within a tolerance, strokes that touch are joined into one pen
// down, and the order is optimized (nearest neighbour, then 2-opt with
// reversal) so the pen travels as little as possible with the pen up.
// Output: point lists in millimetres, a single line SVG and G-code.

import { distToSegment, shapeToSegments, toCubics } from '../core/geometry.js';
import { iconNodes, splitLayers } from '../core/nodes.js';

const GRID = 24;
const JOIN_EPS = 0.01;
const SHAPES = new Set(['path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon']);

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function subdivide(p0, p1, p2, p3, tol, out, depth) {
  const flat = Math.max(distToSegment(p1, p0, p3), distToSegment(p2, p0, p3));
  if (depth >= 18 || flat <= tol) {
    out.push(p3);
    return;
  }
  const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const a = m(p0, p1);
  const b = m(p1, p2);
  const c = m(p2, p3);
  const d = m(a, b);
  const e = m(b, c);
  const f = m(d, e);
  subdivide(p0, a, d, f, tol, out, depth + 1);
  subdivide(f, e, c, p3, tol, out, depth + 1);
}

/**
 * Flattens absolute path segments into polylines [{ points, closed }] whose
 * distance to the true curve stays within `tol` (adaptive subdivision of the
 * cubics, so tight curves get more points than gentle ones).
 */
export function flattenSegments(segs, tol = 0.02) {
  const out = [];
  let cur = null;
  let p = [0, 0];
  let start = [0, 0];
  for (const s of toCubics(segs)) {
    if (s[0] === 'M') {
      if (cur && cur.points.length > 1) out.push(cur);
      p = [s[1], s[2]];
      start = p;
      cur = { points: [p], closed: false };
    } else if (s[0] === 'L') {
      p = [s[1], s[2]];
      if (cur) cur.points.push(p);
    } else if (s[0] === 'C') {
      if (cur) subdivide(p, [s[1], s[2]], [s[3], s[4]], [s[5], s[6]], tol, cur.points, 0);
      p = [s[5], s[6]];
    } else if (s[0] === 'Z') {
      if (cur) {
        if (dist(p, start) > 1e-9) cur.points.push(start);
        cur.closed = cur.points.length > 2;
        if (cur.points.length > 1) out.push(cur);
        cur = { points: [start], closed: false };
      }
      p = start;
    }
  }
  if (cur && cur.points.length > 1) out.push(cur);
  for (const sp of out) {
    const n = sp.points.length;
    if (!sp.closed && n > 2 && dist(sp.points[0], sp.points[n - 1]) < 1e-6) sp.closed = true;
  }
  return out;
}

/**
 * Stroke elements of an icon: the duotone layer, fill only elements
 * (stroke="none") and the generated fill layers are left out. Groups are
 * walked so composed bodies work too.
 */
export function strokeNodes(nodes) {
  const out = [];
  const visit = (n) => {
    if (!Array.isArray(n)) return;
    const [tag, a = {}, kids] = n;
    if (Array.isArray(kids) && kids.length && Array.isArray(kids[0])) {
      if (a.stroke !== 'none') for (const k of kids) visit(k);
      return;
    }
    if (!SHAPES.has(tag) || a.stroke === 'none') return;
    if (typeof a.class === 'string' && /(^|\s)gf-(secondary|fill)(\s|$)/.test(a.class)) return;
    out.push(n);
  };
  for (const n of nodes) visit(n);
  return out;
}

/** Stroke polylines of an icon in grid units, in source order. */
export function iconPolylines(icon, tol = 0.02) {
  const { primary } = splitLayers(iconNodes(icon));
  const out = [];
  for (const node of strokeNodes(primary)) {
    let polys = [];
    try {
      polys = flattenSegments(shapeToSegments(node), tol);
    } catch {
      polys = [];
    }
    for (const p of polys) out.push(p);
  }
  return out;
}

function pathLength(points) {
  let len = 0;
  for (let k = 1; k < points.length; k++) len += dist(points[k - 1], points[k]);
  return len;
}

function dedupe(points) {
  const out = [points[0]];
  for (let k = 1; k < points.length; k++) if (dist(points[k], out[out.length - 1]) > 1e-9) out.push(points[k]);
  if (out.length === 1) out.push([points[0][0], points[0][1]]);
  return out;
}

// A closed loop as a ring of distinct vertices (no repeated closing point).
function ringOf(points) {
  const n = points.length;
  return dist(points[0], points[n - 1]) < 1e-9 ? points.slice(0, n - 1) : points.slice();
}

function rotateRing(ring, at) {
  const r = ring.slice(at).concat(ring.slice(0, at));
  r.push(r[0]);
  return r;
}

function closeIfMeets(points) {
  const n = points.length;
  if (n > 2 && dist(points[0], points[n - 1]) <= JOIN_EPS) {
    const pts = points.slice();
    pts[n - 1] = pts[0];
    return { points: pts, closed: true };
  }
  return { points, closed: false };
}

// Joins B into the open path A when they touch at an end (or, for a closed
// loop B, at any of its vertices). Returns the joined path or null.
function tryJoin(A, B) {
  const a0 = A.points[0];
  const a1 = A.points[A.points.length - 1];
  if (B.closed) {
    const ring = ringOf(B.points);
    for (let v = 0; v < ring.length; v++) {
      if (dist(a1, ring[v]) <= JOIN_EPS) return closeIfMeets(A.points.concat(rotateRing(ring, v).slice(1)));
      if (dist(a0, ring[v]) <= JOIN_EPS) return closeIfMeets(rotateRing(ring, v).concat(A.points.slice(1)));
    }
    return null;
  }
  const b0 = B.points[0];
  const b1 = B.points[B.points.length - 1];
  if (dist(a1, b0) <= JOIN_EPS) return closeIfMeets(A.points.concat(B.points.slice(1)));
  if (dist(a1, b1) <= JOIN_EPS) return closeIfMeets(A.points.concat(B.points.slice().reverse().slice(1)));
  if (dist(a0, b1) <= JOIN_EPS) return closeIfMeets(B.points.concat(A.points.slice(1)));
  if (dist(a0, b0) <= JOIN_EPS) return closeIfMeets(B.points.slice().reverse().concat(A.points.slice(1)));
  return null;
}

function joinPaths(list) {
  const items = list.map((p) => ({ points: p.points.slice(), closed: p.closed }));
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let a = 0; a < items.length; a++) {
      if (items[a].closed) continue;
      for (let b = 0; b < items.length; b++) {
        if (b === a) continue;
        const r = tryJoin(items[a], items[b]);
        if (r) {
          items[a] = r;
          items.splice(b, 1);
          merged = true;
          break outer;
        }
      }
    }
  }
  return items;
}

// Tour elements: { item, rev, at, entry, exit } where open strokes may run
// backwards (rev) and closed loops start and end at vertex `at`.
function element(item, rev, at) {
  if (item.closed) {
    const v = item.ring[at];
    return { item, rev: false, at, entry: v, exit: v };
  }
  const p = item.points;
  return rev ? { item, rev, at: 0, entry: p[p.length - 1], exit: p[0] } : { item, rev, at: 0, entry: p[0], exit: p[p.length - 1] };
}

function tourTravel(tour, start) {
  let cur = start;
  let total = 0;
  for (const e of tour) {
    total += dist(cur, e.entry);
    cur = e.exit;
  }
  return total + dist(cur, start);
}

function nearestNeighbour(items, start) {
  const used = new Uint8Array(items.length);
  const tour = [];
  let cur = start;
  for (let k = 0; k < items.length; k++) {
    let best = Infinity;
    let pick = null;
    for (let i = 0; i < items.length; i++) {
      if (used[i]) continue;
      const it = items[i];
      if (it.closed) {
        for (let v = 0; v < it.ring.length; v++) {
          const d = dist(cur, it.ring[v]);
          if (d < best) {
            best = d;
            pick = [i, false, v];
          }
        }
      } else {
        const p = it.points;
        const d0 = dist(cur, p[0]);
        const d1 = dist(cur, p[p.length - 1]);
        if (d0 < best) {
          best = d0;
          pick = [i, false, 0];
        }
        if (d1 < best) {
          best = d1;
          pick = [i, true, 0];
        }
      }
    }
    used[pick[0]] = 1;
    const e = element(items[pick[0]], pick[1], pick[2]);
    tour.push(e);
    cur = e.exit;
  }
  return tour;
}

function flip(e) {
  return e.item.closed ? e : element(e.item, !e.rev, 0);
}

// 2-opt with reversal: reversing tour[i..j] reverses the order and the
// direction of every stroke in it. Closed loops are re-anchored at the
// vertex closest to their neighbours between passes.
function improve(tour, start) {
  const n = tour.length;
  const prevExit = (i) => (i === 0 ? start : tour[i - 1].exit);
  const nextEntry = (j) => (j === n - 1 ? start : tour[j + 1].entry);
  for (let round = 0; round < 60; round++) {
    let changed = false;
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        if (i === j && tour[i].item.closed) continue;
        const a = prevExit(i);
        const b = nextEntry(j);
        const before = dist(a, tour[i].entry) + dist(tour[j].exit, b);
        const after = dist(a, tour[j].exit) + dist(tour[i].entry, b);
        if (after < before - 1e-9) {
          const seg = tour.slice(i, j + 1).reverse().map(flip);
          tour.splice(i, j - i + 1, ...seg);
          changed = true;
        }
      }
    }
    for (let k = 0; k < n; k++) {
      const e = tour[k];
      if (!e.item.closed) continue;
      const a = prevExit(k);
      const b = nextEntry(k);
      let best = dist(a, e.entry) + dist(e.exit, b);
      let at = e.at;
      e.item.ring.forEach((v, idx) => {
        const d = dist(a, v) + dist(v, b);
        if (d < best - 1e-9) {
          best = d;
          at = idx;
        }
      });
      if (at !== e.at) {
        tour[k] = element(e.item, false, at);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return tour;
}

function pointsOf(e) {
  if (e.item.closed) return rotateRing(e.item.ring, e.at);
  return e.rev ? e.item.points.slice().reverse() : e.item.points.slice();
}

/**
 * Pen paths of an icon for a plotter, in millimetres (SVG space: y down,
 * origin at the top left of the 24 grid). Options: size (mm across the
 * grid, default 50), tolerance (mm, default 0.05), optimize (join and order
 * strokes, default true) and start (pen position before and after, default
 * [0, 0]). Returns { paths, lifts, draw, travel, travelBefore, size }.
 */
export function plotPaths(icon, { size = 50, tolerance = 0.05, optimize = true, start = [0, 0] } = {}) {
  const mm = Number(size) > 0 ? Number(size) : 50;
  const scale = mm / GRID;
  const tol = Math.max(0.001, Number(tolerance) || 0.05) / scale;
  const origin = [Number(start[0]) || 0, Number(start[1]) || 0];
  const source = iconPolylines(icon, tol).map((p) => ({
    points: dedupe(p.points.map(([x, y]) => [x * scale, y * scale])),
    closed: p.closed,
  }));
  const sourcePaths = source.map((p) => p.points);
  let travelBefore = 0;
  let cur = origin;
  for (const pts of sourcePaths) {
    travelBefore += dist(cur, pts[0]);
    cur = pts[pts.length - 1];
  }
  travelBefore += dist(cur, origin);
  const result = (paths, travel) => ({
    paths,
    lifts: paths.length,
    draw: paths.reduce((s, p) => s + pathLength(p), 0),
    travel,
    travelBefore,
    size: mm,
  });
  if (!optimize || source.length === 0) return result(sourcePaths, travelBefore);
  const items = joinPaths(source).map((it) => (it.closed ? { ...it, ring: ringOf(it.points) } : it));
  const tour = improve(nearestNeighbour(items, origin), origin);
  const travel = tourTravel(tour, origin);
  if (travel > travelBefore + 1e-9) return result(sourcePaths, travelBefore);
  return result(tour.map(pointsOf), travel);
}

function fixed(v, decimals = 3) {
  const p = 10 ** decimals;
  const r = Math.round(v * p) / p;
  return Object.is(r, -0) || r === 0 ? '0' : String(r);
}

const escXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Single line SVG for pen plotters: one <path> per pen down in drawing
 * order, strokes only (fill none, no transforms), sized in millimetres.
 * Options: the plotPaths options plus penWidth (mm, default 0.3).
 */
export function toPlotSvg(icon, options = {}) {
  const plan = plotPaths(icon, options);
  const pen = Number(options.penWidth) > 0 ? Number(options.penWidth) : 0.3;
  const s = fixed(plan.size);
  const paths = plan.paths.map((pts) => {
    const d = pts.map(([x, y], k) => `${k ? 'L' : 'M'}${fixed(x)} ${fixed(y)}`).join('');
    return `<path d="${d}" fill="none" stroke="#000" stroke-width="${fixed(pen)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  });
  const title = icon && icon.name ? `\n<title>${escXml(icon.name)}</title>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}mm" height="${s}mm" viewBox="0 0 ${s} ${s}">${title}\n${paths.join('\n')}${paths.length ? '\n' : ''}</svg>\n`;
}

const lines = (v) => (Array.isArray(v) ? v : v === undefined || v === null || v === '' ? [] : String(v).split(/\r?\n/)).map((l) => String(l).trim()).filter(Boolean);

/**
 * G-code for a pen plotter (millimetres, absolute coordinates). Options:
 * size (mm, default 50), feed (draw feed rate in mm/min, default 1500),
 * travelFeed (default 3000), penUp (default 'G0 Z5') and penDown (default
 * 'G1 Z0 F500') as a string or an array of lines (servo plotters use for
 * example 'M3 S30'), dwell (seconds after each pen move, default 0), origin
 * ([x, y] offset in mm), flipY (machine Y points up, default true),
 * decimals (default 3), header and footer (extra lines).
 */
export function toGcode(icon, options = {}) {
  const {
    size = 50,
    feed = 1500,
    travelFeed = 3000,
    penUp = 'G0 Z5',
    penDown = 'G1 Z0 F500',
    dwell = 0,
    origin = [0, 0],
    flipY = true,
    decimals = 3,
    header = [],
    footer = [],
  } = options;
  const mm = Number(size) > 0 ? Number(size) : 50;
  const ox = Number(origin && origin[0]) || 0;
  const oy = Number(origin && origin[1]) || 0;
  const flipped = flipY !== false;
  const plan = plotPaths(icon, { ...options, size: mm, start: flipped ? [0, mm] : [0, 0] });
  const dec = Number.isFinite(Number(decimals)) ? Math.max(0, Math.min(6, Math.round(Number(decimals)))) : 3;
  const f = (v) => fixed(v, dec);
  const X = (x) => f(x + ox);
  const Y = (y) => f((flipped ? mm - y : y) + oy);
  const up = lines(penUp);
  const down = lines(penDown);
  const wait = Number(dwell) > 0 ? [`G4 P${fixed(Number(dwell), 3)}`] : [];
  const name = icon && icon.name ? String(icon.name).replace(/[\r\n]+/g, ' ') : 'icon';
  const out = [
    `; glyphfox plotter export: ${name}`,
    `; ${plan.paths.length} path${plan.paths.length === 1 ? '' : 's'}, draw ${fixed(plan.draw, 2)} mm, travel ${fixed(plan.travel, 2)} mm`,
    `; size ${fixed(mm)} mm, feed ${fixed(Number(feed))} mm/min, travel feed ${fixed(Number(travelFeed))} mm/min`,
    'G21',
    'G90',
    ...lines(header),
    ...up,
    ...wait,
  ];
  for (const pts of plan.paths) {
    out.push(`G0 X${X(pts[0][0])} Y${Y(pts[0][1])} F${fixed(Number(travelFeed))}`);
    out.push(...down, ...wait);
    pts.slice(1).forEach(([x, y], k) => out.push(`G1 X${X(x)} Y${Y(y)}${k === 0 ? ` F${fixed(Number(feed))}` : ''}`));
    out.push(...up, ...wait);
  }
  out.push(`G0 X${f(ox)} Y${f(oy)} F${fixed(Number(travelFeed))}`);
  out.push(...lines(footer));
  return out.join('\n') + '\n';
}
