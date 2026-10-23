// STL export: an icon extruded into a printable solid. The shape is a signed
// field on a grid (distance to the strokes minus half the stroke width, so
// round caps and joins come for free; the solid variant adds its filled
// shapes minus the knockout lines). Marching squares turns the field into
// convex cell polygons that share their edge vertices, which gives a
// watertight, manifold mesh without any polygon booleans: a flat bottom,
// walls along the outline and a top height field with an optional chamfer
// or round bevel. Units are millimetres, Z up, and the icon reads correctly
// from above. Runs in Node and in browsers.

import { distToSegment, pointInPolygon, shapeToSegments } from '../core/geometry.js';
import { iconNodes, splitLayers } from '../core/nodes.js';
import { solidLayers } from '../core/solid.js';
import { flattenSegments, strokeNodes } from './plotter.js';

const GRID = 24;

function polylinesOf(nodes, tol) {
  const out = [];
  for (const node of nodes) {
    try {
      for (const p of flattenSegments(shapeToSegments(node), tol)) out.push(p);
    } catch {
      // unreadable geometry draws nothing
    }
  }
  return out;
}

// Segments bucketed on a 1 unit grid. Each segment is registered in every
// bucket its box, grown by `reach`, overlaps, so one bucket answers every
// distance query up to `reach`.
function segmentIndex(polys, reach) {
  const B = GRID;
  const buckets = Array.from({ length: B * B }, () => []);
  const ax = [];
  const ay = [];
  const bx = [];
  const by = [];
  const add = (a, b) => {
    const k = ax.length;
    ax.push(a[0]);
    ay.push(a[1]);
    bx.push(b[0]);
    by.push(b[1]);
    const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0]) - reach));
    const x1 = Math.min(B - 1, Math.floor(Math.max(a[0], b[0]) + reach));
    const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1]) - reach));
    const y1 = Math.min(B - 1, Math.floor(Math.max(a[1], b[1]) + reach));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) buckets[y * B + x].push(k);
  };
  for (const p of polys) {
    const pts = p.points;
    if (pts.length === 1) add(pts[0], pts[0]);
    for (let k = 1; k < pts.length; k++) add(pts[k - 1], pts[k]);
  }
  return { buckets, ax, ay, bx, by, reach, empty: ax.length === 0 };
}

function nearest(index, x, y) {
  if (index.empty) return index.reach;
  const bxi = Math.min(GRID - 1, Math.max(0, Math.floor(x)));
  const byi = Math.min(GRID - 1, Math.max(0, Math.floor(y)));
  const list = index.buckets[byi * GRID + bxi];
  let best = index.reach;
  for (let n = 0; n < list.length; n++) {
    const k = list[n];
    const dx = index.bx[k] - index.ax[k];
    const dy = index.by[k] - index.ay[k];
    const l2 = dx * dx + dy * dy;
    let t = l2 ? ((x - index.ax[k]) * dx + (y - index.ay[k]) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = x - (index.ax[k] + t * dx);
    const ey = y - (index.ay[k] + t * dy);
    const d = Math.sqrt(ex * ex + ey * ey);
    if (d < best) best = d;
  }
  return best;
}

function boxOf(polys) {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const p of polys) {
    for (const [x, y] of p.points) {
      if (x < b.minX) b.minX = x;
      if (y < b.minY) b.minY = y;
      if (x > b.maxX) b.maxX = x;
      if (y > b.maxY) b.maxY = y;
    }
  }
  return b;
}

/**
 * The signed field of an icon sampled on the grid corners, in grid units
 * (positive inside). Returns { f, n, h }.
 */
function sampleField(icon, { variant, weight, res, reach }) {
  const h = 1 / res;
  const n = GRID * res + 1;
  const half = weight / 2;
  const tol = Math.min(0.02, h / 4);
  const { primary } = splitLayers(iconNodes(icon));
  let strokes = strokeNodes(primary);
  let groups = [];
  if (variant === 'solid') {
    const sl = solidLayers(icon);
    if (sl) {
      strokes = strokeNodes(sl.strokes);
      groups = sl.groups.map((g) => {
        const fills = g.fill.map((node) => polylinesOf([node], tol).filter((p) => p.closed));
        const flat = fills.flat();
        return {
          fills,
          box: boxOf(flat),
          edges: segmentIndex(flat, reach),
          knock: segmentIndex(polylinesOf(strokeNodes(g.mask || []), tol), reach),
        };
      });
    }
  }
  const lines = segmentIndex(polylinesOf(strokes, tol), reach);
  const f = new Float64Array(n * n);
  for (let j = 0; j < n; j++) {
    const y = j * h;
    for (let i = 0; i < n; i++) {
      const x = i * h;
      let v = half - nearest(lines, x, y);
      for (const g of groups) {
        let inside = false;
        if (x >= g.box.minX && x <= g.box.maxX && y >= g.box.minY && y <= g.box.maxY) {
          for (const node of g.fills) {
            let odd = false;
            for (const p of node) if (pointInPolygon([x, y], p.points)) odd = !odd;
            if (odd) {
              inside = true;
              break;
            }
          }
        }
        const fill = (inside ? 1 : -1) * nearest(g.edges, x, y);
        const cut = nearest(g.knock, x, y) - half;
        const w = Math.min(fill, cut);
        if (w > v) v = w;
      }
      // The outer ring stays outside so every outline closes on the grid.
      if (i === 0 || j === 0 || i === n - 1 || j === n - 1) v = Math.min(v, -h);
      else if (v === 0) v = 1e-9;
      f[j * n + i] = v;
    }
  }
  return { f, n, h };
}

/**
 * Builds the mesh of an extruded icon. Options: size (mm across the 24 grid,
 * default 48), thickness (mm, default 3), bevel (mm, default 0, at most 0.9
 * of the thickness), bevelStyle ('chamfer' or 'round'), variant ('outline'
 * or 'solid'), resolution (cells per grid unit, 2 to 16, default 6) and
 * weight (stroke width on the grid, default 2). Returns { positions
 * (Float32Array xyz), triangles (Uint32Array), triangleCount, size,
 * thickness }.
 */
export function stlMesh(icon, options = {}) {
  const size = Number(options.size) > 0 ? Number(options.size) : 48;
  const thickness = Number(options.thickness) > 0 ? Number(options.thickness) : 3;
  const bevel = Math.max(0, Math.min(Number(options.bevel) || 0, thickness * 0.9));
  const round = options.bevelStyle === 'round';
  const variant = options.variant === 'solid' ? 'solid' : 'outline';
  const res = Math.max(2, Math.min(16, Math.round(Number(options.resolution) || 6)));
  const weight = Math.max(0.5, Math.min(4, Number(options.weight) || 2));
  const scale = size / GRID;
  const bevelU = bevel / scale;
  const reach = Math.max(weight / 2, bevelU) + 2 / res + 0.25;
  const { f, n, h } = sampleField(icon, { variant, weight, res, reach });

  const pos = [];
  const tris = [];
  const wall = thickness - bevel;
  const topZ = (v) => {
    if (!bevel) return thickness;
    const u = Math.min(Math.max(v * scale, 0), bevel);
    return wall + (round ? Math.sqrt(Math.max(0, bevel * bevel - (bevel - u) * (bevel - u))) : u);
  };
  const vertex = (x, y, z) => {
    pos.push(x * scale, (GRID - y) * scale, z);
    return pos.length / 3 - 1;
  };
  const cornerTop = new Int32Array(n * n).fill(-1);
  const cornerBot = new Int32Array(n * n).fill(-1);
  const edgeTop = new Int32Array(2 * n * n).fill(-1);
  const edgeBot = new Int32Array(2 * n * n).fill(-1);
  const corner = (i, j, top) => {
    const k = j * n + i;
    const table = top ? cornerTop : cornerBot;
    if (table[k] < 0) table[k] = vertex(i * h, j * h, top ? topZ(f[k]) : 0);
    return table[k];
  };
  // Edge from grid point (i, j) along x (dir 0) or y (dir 1).
  const edge = (i, j, dir, top) => {
    const k = (j * n + i) * 2 + dir;
    const table = top ? edgeTop : edgeBot;
    if (table[k] < 0) {
      const a = f[j * n + i];
      const b = dir ? f[(j + 1) * n + i] : f[j * n + i + 1];
      let t = a / (a - b);
      t = t < 0.01 ? 0.01 : t > 0.99 ? 0.99 : t;
      table[k] = vertex((i + (dir ? 0 : t)) * h, (j + (dir ? t : 0)) * h, top ? wall : 0);
    }
    return table[k];
  };

  // Corners of a cell in walking order and the edges between them.
  const CI = [0, 1, 1, 0];
  const CJ = [0, 0, 1, 1];
  const EDGE = [
    [0, 0, 0],
    [1, 0, 1],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const fan = (poly, top) => {
    // poly: [{ c } | { e }] in walking order (clockwise seen from above).
    const ids = poly.map((p) => (p.c !== undefined ? corner(p.i, p.j, top) : edge(p.i, p.j, p.dir, top)));
    if (top) ids.reverse();
    for (let k = 1; k + 1 < ids.length; k++) tris.push(ids[0], ids[k], ids[k + 1]);
    return ids;
  };
  const walls = (poly) => {
    // Walk the polygon counter clockwise; two edge points in a row are a
    // piece of the outline with the inside on the left.
    const ccw = poly.slice().reverse();
    for (let k = 0; k < ccw.length; k++) {
      const p = ccw[k];
      const q = ccw[(k + 1) % ccw.length];
      if (p.e === undefined || q.e === undefined) continue;
      const aBot = edge(p.i, p.j, p.dir, false);
      const bBot = edge(q.i, q.j, q.dir, false);
      const aTop = edge(p.i, p.j, p.dir, true);
      const bTop = edge(q.i, q.j, q.dir, true);
      tris.push(aBot, bBot, bTop, aBot, bTop, aTop);
    }
  };

  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const v = [f[j * n + i], f[j * n + i + 1], f[(j + 1) * n + i + 1], f[(j + 1) * n + i]];
      const inside = v.map((x) => x >= 0);
      if (!inside[0] && !inside[1] && !inside[2] && !inside[3]) continue;
      const walk = [];
      for (let c = 0; c < 4; c++) {
        const d = (c + 1) % 4;
        if (inside[c]) walk.push({ c, i: i + CI[c], j: j + CJ[c] });
        if (inside[c] !== inside[d]) {
          const [di, dj, dir] = EDGE[c];
          walk.push({ e: c, i: i + di, j: j + dj, dir });
        }
      }
      let polys = [walk];
      const saddle = (inside[0] && inside[2] && !inside[1] && !inside[3]) || (inside[1] && inside[3] && !inside[0] && !inside[2]);
      if (saddle && (v[0] + v[1] + v[2] + v[3]) / 4 < 0) {
        polys = [];
        walk.forEach((p, k) => {
          if (p.c !== undefined) polys.push([walk[(k + walk.length - 1) % walk.length], p, walk[(k + 1) % walk.length]]);
        });
      }
      for (const poly of polys) {
        fan(poly, true);
        fan(poly, false);
        walls(poly);
      }
    }
  }
  const triangles = Uint32Array.from(tris);
  return { positions: Float32Array.from(pos), triangles, triangleCount: triangles.length / 3, size, thickness };
}

function normalOf(p, a, b, c) {
  const ux = p[b * 3] - p[a * 3];
  const uy = p[b * 3 + 1] - p[a * 3 + 1];
  const uz = p[b * 3 + 2] - p[a * 3 + 2];
  const vx = p[c * 3] - p[a * 3];
  const vy = p[c * 3 + 1] - p[a * 3 + 1];
  const vz = p[c * 3 + 2] - p[a * 3 + 2];
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz);
  return len > 0 ? [nx / len, ny / len, nz / len] : [0, 0, 1];
}

const num = (v) => {
  const r = Math.round(v * 1e5) / 1e5;
  return r === 0 || Object.is(r, -0) ? '0' : String(r);
};

/**
 * STL of an extruded icon: a binary file (Uint8Array, the default) or an
 * ASCII file (a string) with format: 'ascii'. Takes the stlMesh options plus
 * name (written in the header, default the icon name).
 */
export function toStl(icon, options = {}) {
  const mesh = stlMesh(icon, options);
  const name = String(options.name || (icon && icon.name) || 'glyphfox').replace(/[^\x20-\x7e]/g, '?');
  const p = mesh.positions;
  const t = mesh.triangles;
  const count = mesh.triangleCount;
  if (options.format === 'ascii') {
    const id = name.replace(/\s+/g, '-') || 'glyphfox';
    const out = [`solid ${id}`];
    for (let k = 0; k < count; k++) {
      const a = t[k * 3];
      const b = t[k * 3 + 1];
      const c = t[k * 3 + 2];
      const nrm = normalOf(p, a, b, c);
      out.push(`  facet normal ${nrm.map(num).join(' ')}`, '    outer loop');
      for (const v of [a, b, c]) out.push(`      vertex ${num(p[v * 3])} ${num(p[v * 3 + 1])} ${num(p[v * 3 + 2])}`);
      out.push('    endloop', '  endfacet');
    }
    out.push(`endsolid ${id}`);
    return out.join('\n') + '\n';
  }
  const buf = new ArrayBuffer(84 + 50 * count);
  const bytes = new Uint8Array(buf);
  const view = new DataView(buf);
  const head = `glyphfox ${name}`.slice(0, 80);
  for (let k = 0; k < 80; k++) bytes[k] = k < head.length ? head.charCodeAt(k) : 32;
  view.setUint32(80, count, true);
  let o = 84;
  for (let k = 0; k < count; k++) {
    const a = t[k * 3];
    const b = t[k * 3 + 1];
    const c = t[k * 3 + 2];
    for (const v of normalOf(p, a, b, c)) {
      view.setFloat32(o, v, true);
      o += 4;
    }
    for (const v of [a, b, c]) {
      view.setFloat32(o, p[v * 3], true);
      view.setFloat32(o + 4, p[v * 3 + 1], true);
      view.setFloat32(o + 8, p[v * 3 + 2], true);
      o += 12;
    }
    view.setUint16(o, 0, true);
    o += 2;
  }
  return bytes;
}

/**
 * Checks a mesh: { triangles, vertices, watertight (every edge is used by
 * exactly two triangles in opposite directions), volume (mm3, positive when
 * the faces point outward), bounds: { min, max } }.
 */
export function meshStats(mesh) {
  const p = mesh.positions;
  const t = mesh.triangles;
  const nv = p.length / 3;
  const count = t.length / 3;
  const edges = new Map();
  let volume = 0;
  for (let k = 0; k < count; k++) {
    const ids = [t[k * 3], t[k * 3 + 1], t[k * 3 + 2]];
    for (let e = 0; e < 3; e++) {
      const key = ids[e] * nv + ids[(e + 1) % 3];
      edges.set(key, (edges.get(key) || 0) + 1);
    }
    const [a, b, c] = ids;
    const ax = p[a * 3];
    const ay = p[a * 3 + 1];
    const az = p[a * 3 + 2];
    const bx = p[b * 3];
    const by = p[b * 3 + 1];
    const bz = p[b * 3 + 2];
    const cx = p[c * 3];
    const cy = p[c * 3 + 1];
    const cz = p[c * 3 + 2];
    volume += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  let watertight = true;
  for (const [key, k] of edges) {
    const a = Math.floor(key / nv);
    const b = key - a * nv;
    if (k !== 1 || edges.get(b * nv + a) !== 1) {
      watertight = false;
      break;
    }
  }
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let k = 0; k < nv; k++) {
    for (let d = 0; d < 3; d++) {
      const v = p[k * 3 + d];
      if (v < min[d]) min[d] = v;
      if (v > max[d]) max[d] = v;
    }
  }
  if (!nv) {
    min.fill(0);
    max.fill(0);
  }
  return { triangles: count, vertices: nv, watertight, volume, bounds: { min, max } };
}
