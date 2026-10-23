// Outlines for the 3D view. Every stroke is offset by half the stroke width:
// the exact distance to the center lines is sampled on a fine grid and its
// iso line is traced with marching squares. Round caps, round joins,
// crossings and overlapping parts merge into clean closed contours (outer
// rings with their holes) that can be extruded. Filled areas use a signed
// distance to their edges, and knockout lines cut a band out of the fills.
// Pure functions on polylines ({ points: [[x, y], ...], closed }), no DOM.

const FAR = 1e6;

function boundsOf(lists) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const polys of lists) {
    for (const p of polys) {
      for (const [x, y] of p.points) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : null;
}

/** A sampling grid that covers the box plus `pad` on every side. */
export function createGrid(box, pad, cells = 600) {
  const w = box.maxX - box.minX + 2 * pad;
  const h = box.maxY - box.minY + 2 * pad;
  const step = Math.max(Math.max(w, h) / cells, 0.02);
  return { x0: box.minX - pad, y0: box.minY - pad, step, nx: Math.ceil(w / step) + 2, ny: Math.ceil(h / step) + 2 };
}

function segmentsOf(poly) {
  const pts = poly.points;
  const out = [];
  if (pts.length === 1) out.push([pts[0], pts[0]]);
  for (let k = 0; k + 1 < pts.length; k++) out.push([pts[k], pts[k + 1]]);
  if (poly.closed && pts.length > 2) {
    const a = pts[pts.length - 1];
    const b = pts[0];
    if (a[0] !== b[0] || a[1] !== b[1]) out.push([a, b]);
  }
  return out;
}

/** Distance from every grid sample to the polylines (exact within `reach`, FAR beyond). */
export function distanceField(grid, polys, reach) {
  const { x0, y0, step, nx, ny } = grid;
  const d2 = new Float32Array(nx * ny).fill(FAR);
  for (const poly of polys) {
    for (const [[ax, ay], [bx, by]] of segmentsOf(poly)) {
      const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - reach - x0) / step));
      const i1 = Math.min(nx - 1, Math.ceil((Math.max(ax, bx) + reach - x0) / step));
      const j0 = Math.max(0, Math.floor((Math.min(ay, by) - reach - y0) / step));
      const j1 = Math.min(ny - 1, Math.ceil((Math.max(ay, by) + reach - y0) / step));
      const dx = bx - ax;
      const dy = by - ay;
      const len2 = dx * dx + dy * dy;
      for (let j = j0; j <= j1; j++) {
        const py = y0 + j * step;
        let idx = j * nx + i0;
        for (let i = i0; i <= i1; i++, idx++) {
          const px = x0 + i * step;
          let t = len2 > 1e-12 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const qx = ax + t * dx - px;
          const qy = ay + t * dy - py;
          const q = qx * qx + qy * qy;
          if (q < d2[idx]) d2[idx] = q;
        }
      }
    }
  }
  for (let k = 0; k < d2.length; k++) d2[k] = d2[k] >= FAR ? FAR : Math.sqrt(d2[k]);
  return d2;
}

/** 1 for samples inside the polygons (even odd rule), 0 outside. */
export function insideMask(grid, polys, mask = new Uint8Array(grid.nx * grid.ny)) {
  const { x0, y0, step, nx, ny } = grid;
  const own = new Uint8Array(nx * ny);
  const xs = [];
  for (let j = 0; j < ny; j++) {
    const y = y0 + j * step;
    xs.length = 0;
    for (const poly of polys) {
      const pts = poly.points;
      const n = pts.length;
      if (n < 3) continue;
      for (let k = 0; k < n; k++) {
        const p = pts[k];
        const q = pts[(k + 1) % n];
        if (p[1] <= y !== q[1] <= y) xs.push(p[0] + ((y - p[1]) / (q[1] - p[1])) * (q[0] - p[0]));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const ia = Math.max(0, Math.ceil((xs[k] - x0) / step));
      const ib = Math.min(nx - 1, Math.floor((xs[k + 1] - x0) / step));
      for (let i = ia; i <= ib; i++) own[j * nx + i] ^= 1;
    }
  }
  for (let k = 0; k < own.length; k++) if (own[k]) mask[k] = 1;
  return mask;
}

// Marching squares. Corners of a cell: a top left, b top right, c bottom
// right, d bottom left (bits 8, 4, 2, 1). Edges: T, R, B, L. Every segment
// keeps the inside on its left, so outer rings come out with a positive
// signed area and holes with a negative one.
const T = 0;
const R = 1;
const B = 2;
const L = 3;
const CASES = {
  1: [[L, B]],
  2: [[B, R]],
  3: [[L, R]],
  4: [[R, T]],
  6: [[B, T]],
  7: [[L, T]],
  8: [[T, L]],
  9: [[T, B]],
  11: [[T, R]],
  12: [[R, L]],
  13: [[R, B]],
  14: [[B, L]],
};
const SADDLE = {
  // a and c inside
  10: { joined: [[T, R], [B, L]], split: [[T, L], [B, R]] },
  // b and d inside
  5: { joined: [[L, T], [R, B]], split: [[R, T], [L, B]] },
};

/** Closed contours of the region where values > 0, in grid space coordinates. */
export function traceContours(grid, values) {
  const { x0, y0, step, nx, ny } = grid;
  // The border is outside, so every contour closes.
  for (let i = 0; i < nx; i++) {
    values[i] = -1;
    values[(ny - 1) * nx + i] = -1;
  }
  for (let j = 0; j < ny; j++) {
    values[j * nx] = -1;
    values[j * nx + nx - 1] = -1;
  }
  const next = new Map();
  const edgeKey = (i, j, e) => (e === T ? (j * nx + i) * 2 : e === B ? ((j + 1) * nx + i) * 2 : e === L ? (j * nx + i) * 2 + 1 : (j * nx + i + 1) * 2 + 1);
  for (let j = 0; j + 1 < ny; j++) {
    for (let i = 0; i + 1 < nx; i++) {
      const idx = j * nx + i;
      const va = values[idx];
      const vb = values[idx + 1];
      const vc = values[idx + nx + 1];
      const vd = values[idx + nx];
      const code = (va > 0 ? 8 : 0) | (vb > 0 ? 4 : 0) | (vc > 0 ? 2 : 0) | (vd > 0 ? 1 : 0);
      if (code === 0 || code === 15) continue;
      let segs = CASES[code];
      if (!segs) {
        const s = SADDLE[code];
        segs = (va + vb + vc + vd) / 4 > 0 ? s.joined : s.split;
      }
      for (const [from, to] of segs) next.set(edgeKey(i, j, from), edgeKey(i, j, to));
    }
  }
  const pointOf = (key) => {
    const base = Math.floor(key / 2);
    const i = base % nx;
    const j = (base - i) / nx;
    const v0 = values[base];
    if (key % 2) {
      const v1 = values[base + nx];
      const t = v0 / (v0 - v1);
      return [x0 + i * step, y0 + (j + t) * step];
    }
    const v1 = values[base + 1];
    const t = v0 / (v0 - v1);
    return [x0 + (i + t) * step, y0 + j * step];
  };
  const loops = [];
  const seen = new Set();
  for (const start of next.keys()) {
    if (seen.has(start)) continue;
    const pts = [];
    let k = start;
    let closed = false;
    for (let guard = 0; guard < 1e7; guard++) {
      seen.add(k);
      pts.push(pointOf(k));
      const n = next.get(k);
      if (n === undefined) break;
      if (n === start) {
        closed = true;
        break;
      }
      if (seen.has(n)) break;
      k = n;
    }
    if (closed && pts.length > 2) loops.push(pts);
  }
  return loops;
}

/** Signed area (shoelace) of a closed ring. */
export function ringArea(pts) {
  let a = 0;
  for (let k = 0, n = pts.length; k < n; k++) {
    const p = pts[k];
    const q = pts[(k + 1) % n];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

function pointInRing(pt, ring) {
  let c = false;
  const [x, y] = pt;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function simplifyOpen(pts, eps) {
  const n = pts.length;
  if (n < 3) return pts.slice();
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const stack = [[0, n - 1]];
  const e2 = eps * eps;
  while (stack.length) {
    const [s, e] = stack.pop();
    const [ax, ay] = pts[s];
    const [bx, by] = pts[e];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let best = -1;
    let at = -1;
    for (let k = s + 1; k < e; k++) {
      const [px, py] = pts[k];
      let d;
      if (len2 < 1e-18) d = (px - ax) ** 2 + (py - ay) ** 2;
      else {
        const cr = dx * (py - ay) - dy * (px - ax);
        d = (cr * cr) / len2;
      }
      if (d > best) {
        best = d;
        at = k;
      }
    }
    if (best > e2) {
      keep[at] = 1;
      stack.push([s, at], [at, e]);
    }
  }
  return pts.filter((_, k) => keep[k]);
}

/** Douglas Peucker on a closed ring. */
export function simplifyRing(pts, eps) {
  if (pts.length < 8 || eps <= 0) return pts;
  let far = 0;
  let best = -1;
  for (let k = 1; k < pts.length; k++) {
    const d = (pts[k][0] - pts[0][0]) ** 2 + (pts[k][1] - pts[0][1]) ** 2;
    if (d > best) {
      best = d;
      far = k;
    }
  }
  const a = simplifyOpen(pts.slice(0, far + 1), eps);
  const b = simplifyOpen([...pts.slice(far), pts[0]], eps);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

/** Groups rings into shapes: [{ outer, holes }] (outer rings have a positive area). */
export function shapesFromRings(rings, minArea = 1e-3) {
  const outers = [];
  const holes = [];
  for (const r of rings) {
    const a = ringArea(r);
    if (Math.abs(a) < minArea) continue;
    (a > 0 ? outers : holes).push({ ring: r, area: Math.abs(a) });
  }
  outers.sort((p, q) => p.area - q.area);
  const shapes = outers.map((o) => ({ outer: o.ring, holes: [], area: o.area }));
  for (const h of holes) {
    const probe = h.ring[0];
    const host = shapes.find((s) => s.area > h.area && pointInRing(probe, s.outer));
    if (host) host.holes.push(h.ring);
  }
  return shapes.map(({ outer, holes: hs }) => ({ outer, holes: hs }));
}

function trace(grid, values, eps) {
  const rings = traceContours(grid, values).map((r) => simplifyRing(r, eps));
  return shapesFromRings(rings);
}

/**
 * Contours of the icon parts, shrunk by `inset` (the bevel grows them back).
 * parts: { strokes: polylines, areas: [polylines per node], knocks: polylines, plate: [polylines per node] }
 * Returns { main: shapes, plate: shapes, box } in icon coordinates (y down).
 */
export function outlineParts(parts, { radius = 1, inset = 0, cells = 600, tolerance } = {}) {
  const strokes = parts.strokes || [];
  const areas = parts.areas || [];
  const knocks = parts.knocks || [];
  const plate = parts.plate || [];
  const box = boundsOf([strokes, ...areas, knocks, ...plate]);
  if (!box) return { main: [], plate: [], box: null };
  const grid = createGrid(box, radius + inset + 1, cells);
  const reach = radius + inset + 4 * grid.step;
  const eps = tolerance ?? grid.step * 0.12;
  const n = grid.nx * grid.ny;

  const main = new Float32Array(n).fill(-FAR);
  if (strokes.length) {
    const d = distanceField(grid, strokes, reach);
    for (let k = 0; k < n; k++) main[k] = radius - d[k];
  }
  const areaPolys = areas.flat();
  if (areaPolys.length) {
    const d = distanceField(grid, areaPolys, reach);
    const mask = new Uint8Array(n);
    for (const node of areas) insideMask(grid, node, mask);
    const dk = knocks.length ? distanceField(grid, knocks, reach) : null;
    for (let k = 0; k < n; k++) {
      let f = mask[k] ? d[k] : -d[k];
      if (dk) f = Math.min(f, dk[k] - radius);
      if (f > main[k]) main[k] = f;
    }
  }
  for (let k = 0; k < n; k++) main[k] -= inset;
  const out = { main: trace(grid, main, eps), plate: [], box };

  const platePolys = plate.flat();
  if (platePolys.length) {
    const d = distanceField(grid, platePolys, reach);
    const mask = new Uint8Array(n);
    for (const node of plate) insideMask(grid, node, mask);
    const f = new Float32Array(n);
    for (let k = 0; k < n; k++) f[k] = (mask[k] ? d[k] : -d[k]) - inset;
    out.plate = trace(grid, f, eps);
  }
  return out;
}
