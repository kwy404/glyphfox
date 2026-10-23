// Sketch search core: turns strokes into a compact shape signature and
// ranks icons against a precomputed index. Pure functions without the DOM,
// shared by the studio page and scripts/labs/sketch-index.mjs.
//
// A shape is fitted into a GRID x GRID frame (bounding box, aspect kept,
// centered) and described by:
//   mask    the cells its center lines cross; the distance field used for
//           chamfer matching is expanded from it (an exact Euclidean
//           transform, a few milliseconds for the whole set)
//   dir     a stroke direction histogram, CELLS x CELLS regions with ORIENT
//           soft binned orientations each, weighted by stroke length
//   zm      magnitudes of Zernike moments of the strokes (rotation invariant
//           hints about roundness and symmetry)
//   aspect  (width - height) / max(width, height)

export const GRID = 32;
export const MARGIN = 3;
export const CELLS = 3;
export const ORIENT = 4;
export const MOMENTS = [
  [2, 0],
  [2, 2],
  [3, 1],
  [3, 3],
  [4, 0],
  [4, 2],
  [4, 4],
  [5, 1],
  [5, 3],
  [5, 5],
  [6, 0],
  [6, 2],
  [6, 4],
  [6, 6],
];
export const INDEX_VERSION = 1;

const AREA = GRID * GRID;
const MASK_BYTES = AREA / 8;
const DIR_LEN = CELLS * CELLS * ORIENT;
/** Bytes per icon in the index. */
export const RECORD = MASK_BYTES + DIR_LEN + MOMENTS.length + 1;

/** Scoring weights: chamfer terms are in grid cells, the others are scaled to match. */
export const WEIGHTS = { cap: 6, forward: 0.55, dir: 3.5, zm: 3, aspect: 1.2 };

const STEP = 0.5;
const MIN_LENGTH = 3;

function fit(polylines) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const pl of polylines) {
    for (const [x, y] of pl) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (!Number.isFinite(minX)) return null;
  const w = maxX - minX;
  const h = maxY - minY;
  const span = Math.max(w, h, 1e-9);
  const s = (GRID - 2 * MARGIN) / span;
  const ox = (GRID - w * s) / 2 - minX * s;
  const oy = (GRID - h * s) / 2 - minY * s;
  return {
    lines: polylines.map((pl) => pl.map(([x, y]) => [x * s + ox, y * s + oy])),
    aspect: (w - h) / span,
  };
}

/** Short pieces along the strokes: [midX, midY, length, angle in 0 to PI). */
function pieces(lines) {
  const out = [];
  for (const pl of lines) {
    if (pl.length === 1) out.push([pl[0][0], pl[0][1], 0, 0]);
    for (let i = 1; i < pl.length; i++) {
      const [x0, y0] = pl[i - 1];
      const [x1, y1] = pl[i];
      const len = Math.hypot(x1 - x0, y1 - y0);
      let ang = Math.atan2(y1 - y0, x1 - x0);
      if (ang < 0) ang += Math.PI;
      if (ang >= Math.PI) ang -= Math.PI;
      const n = Math.max(1, Math.ceil(len / STEP));
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, len / n, ang]);
      }
    }
  }
  return out;
}

const cell = (v) => Math.min(GRID - 1, Math.max(0, Math.floor(v)));

function rasterize(lines) {
  const mask = new Uint8Array(AREA);
  for (const pl of lines) {
    for (let i = 0; i < pl.length; i++) {
      const [x1, y1] = pl[i];
      mask[cell(y1) * GRID + cell(x1)] = 1;
      if (!i) continue;
      const [x0, y0] = pl[i - 1];
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (STEP / 2));
      for (let k = 1; k < n; k++) {
        const t = k / n;
        mask[cell(y0 + (y1 - y0) * t) * GRID + cell(x0 + (x1 - x0) * t)] = 1;
      }
    }
  }
  return mask;
}

function directions(list) {
  const hist = new Float32Array(DIR_LEN);
  const size = GRID / CELLS;
  const bin = Math.PI / ORIENT;
  let total = 0;
  for (const [x, y, len, ang] of list) {
    if (!len) continue;
    const b = ang / bin;
    const b0 = Math.floor(b) % ORIENT;
    const fb = b - Math.floor(b);
    const b1 = (b0 + 1) % ORIENT;
    const u = x / size - 0.5;
    const v = y / size - 0.5;
    const i0 = Math.floor(u);
    const j0 = Math.floor(v);
    const fu = u - i0;
    const fv = v - j0;
    for (let dj = 0; dj < 2; dj++) {
      const j = Math.min(CELLS - 1, Math.max(0, j0 + dj));
      const wv = dj ? fv : 1 - fv;
      for (let di = 0; di < 2; di++) {
        const i = Math.min(CELLS - 1, Math.max(0, i0 + di));
        const w = len * wv * (di ? fu : 1 - fu);
        const o = (j * CELLS + i) * ORIENT;
        hist[o + b0] += w * (1 - fb);
        hist[o + b1] += w * fb;
      }
    }
    total += len;
  }
  if (total) for (let i = 0; i < DIR_LEN; i++) hist[i] /= total;
  return hist;
}

const fact = (n) => (n < 2 ? 1 : n * fact(n - 1));
const RADIAL = MOMENTS.map(([n, m]) => {
  const terms = [];
  for (let k = 0; k <= (n - m) / 2; k++) {
    terms.push([((k % 2 ? -1 : 1) * fact(n - k)) / (fact(k) * fact((n + m) / 2 - k) * fact((n - m) / 2 - k)), n - 2 * k]);
  }
  return terms;
});

function zernike(list) {
  const out = new Float32Array(MOMENTS.length);
  let total = 0;
  let cx = 0;
  let cy = 0;
  for (const [x, y, len] of list) {
    total += len;
    cx += x * len;
    cy += y * len;
  }
  if (!total) return out;
  cx /= total;
  cy /= total;
  let r = 0;
  for (const [x, y, len] of list) if (len) r = Math.max(r, Math.hypot(x - cx, y - cy));
  if (r < 1e-6) return out;
  const re = new Float64Array(MOMENTS.length);
  const im = new Float64Array(MOMENTS.length);
  for (const [x, y, len] of list) {
    if (!len) continue;
    const rho = Math.min(1, Math.hypot(x - cx, y - cy) / r);
    const theta = Math.atan2(y - cy, x - cx);
    MOMENTS.forEach(([, m], k) => {
      let radial = 0;
      for (const [c, p] of RADIAL[k]) radial += c * rho ** p;
      re[k] += len * radial * Math.cos(m * theta);
      im[k] -= len * radial * Math.sin(m * theta);
    });
  }
  for (let k = 0; k < MOMENTS.length; k++) out[k] = Math.min(1, Math.hypot(re[k], im[k]) / total);
  return out;
}

/** Exact Euclidean distance field (in cells) to the nearest set cell of a mask. */
export function distanceField(mask) {
  const INF = 1e10;
  const f = new Float64Array(AREA);
  for (let i = 0; i < AREA; i++) f[i] = mask[i] ? 0 : INF;
  const line = new Float64Array(GRID);
  const d = new Float64Array(GRID);
  const v = new Int32Array(GRID);
  const z = new Float64Array(GRID + 1);
  const pass = () => {
    let k = 0;
    v[0] = 0;
    z[0] = -Infinity;
    z[1] = Infinity;
    for (let q = 1; q < GRID; q++) {
      let s = (line[q] + q * q - (line[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {
        k--;
        s = (line[q] + q * q - (line[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < GRID; q++) {
      while (z[k + 1] < q) k++;
      d[q] = (q - v[k]) ** 2 + line[v[k]];
    }
  };
  for (let x = 0; x < GRID; x++) {
    for (let y = 0; y < GRID; y++) line[y] = f[y * GRID + x];
    pass();
    for (let y = 0; y < GRID; y++) f[y * GRID + x] = d[y];
  }
  const out = new Float32Array(AREA);
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) line[x] = f[y * GRID + x];
    pass();
    for (let x = 0; x < GRID; x++) out[y * GRID + x] = Math.sqrt(d[x]);
  }
  return out;
}

function withField(sig) {
  const pts = [];
  for (let i = 0; i < AREA; i++) if (sig.mask[i]) pts.push(i);
  return { ...sig, pts: Uint16Array.from(pts), dt: distanceField(sig.mask) };
}

/**
 * Shape signature of polylines ([[x, y], ...] in any units, y down), or null
 * when there is too little to match (empty or a single tap).
 */
export function extract(polylines) {
  const f = fit(polylines.filter((pl) => pl && pl.length));
  if (!f) return null;
  const list = pieces(f.lines);
  let length = 0;
  for (const p of list) length += p[2];
  if (length < MIN_LENGTH) return null;
  return withField({ mask: rasterize(f.lines), dir: directions(list), zm: zernike(list), aspect: f.aspect });
}

/** Packs a signature into RECORD bytes. */
export function encode(sig) {
  const out = new Uint8Array(RECORD);
  for (let i = 0; i < AREA; i++) if (sig.mask[i]) out[i >> 3] |= 1 << (i & 7);
  let max = 0;
  for (const v of sig.dir) max = Math.max(max, v);
  for (let i = 0; i < DIR_LEN; i++) out[MASK_BYTES + i] = max ? Math.round((sig.dir[i] / max) * 255) : 0;
  const zo = MASK_BYTES + DIR_LEN;
  for (let i = 0; i < MOMENTS.length; i++) out[zo + i] = Math.round(Math.min(1, Math.max(0, sig.zm[i])) * 255);
  out[RECORD - 1] = Math.round(((sig.aspect + 1) / 2) * 255);
  return out;
}

/** Unpacks RECORD bytes (at offset) into a signature ready for ranking. */
export function decode(bytes, offset = 0) {
  const mask = new Uint8Array(AREA);
  for (let i = 0; i < AREA; i++) mask[i] = (bytes[offset + (i >> 3)] >> (i & 7)) & 1;
  const dir = new Float32Array(DIR_LEN);
  let sum = 0;
  for (let i = 0; i < DIR_LEN; i++) sum += dir[i] = bytes[offset + MASK_BYTES + i];
  if (sum) for (let i = 0; i < DIR_LEN; i++) dir[i] /= sum;
  const zm = new Float32Array(MOMENTS.length);
  for (let i = 0; i < MOMENTS.length; i++) zm[i] = bytes[offset + MASK_BYTES + DIR_LEN + i] / 255;
  return withField({ mask, dir, zm, aspect: (bytes[offset + RECORD - 1] / 255) * 2 - 1 });
}

/** Dissimilarity of two signatures (0 for identical shapes). */
export function distance(a, b, w = WEIGHTS) {
  let ab = 0;
  for (const p of a.pts) ab += Math.min(w.cap, b.dt[p]);
  ab /= Math.max(1, a.pts.length);
  let ba = 0;
  for (const p of b.pts) ba += Math.min(w.cap, a.dt[p]);
  ba /= Math.max(1, b.pts.length);
  let dir = 0;
  for (let i = 0; i < DIR_LEN; i++) dir += Math.abs(a.dir[i] - b.dir[i]);
  let zm = 0;
  for (let i = 0; i < MOMENTS.length; i++) zm += Math.abs(a.zm[i] - b.zm[i]);
  zm /= MOMENTS.length;
  return w.forward * ab + (1 - w.forward) * ba + w.dir * dir + w.zm * zm + w.aspect * Math.abs(a.aspect - b.aspect);
}

/** The closest entries ({ name, sig }) to a sketch signature, best first. */
export function rank(sketch, entries, limit = 24, w = WEIGHTS) {
  if (!sketch) return [];
  const out = entries.map((e) => ({ name: e.name, score: distance(sketch, e.sig, w) }));
  out.sort((a, b) => a.score - b.score || (a.name < b.name ? -1 : 1));
  return out.slice(0, limit);
}

function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(text) {
  const s = atob(text);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** The JSON index for [{ name, sig }]. */
export function packIndex(entries) {
  const data = new Uint8Array(entries.length * RECORD);
  entries.forEach((e, i) => data.set(encode(e.sig), i * RECORD));
  return { version: INDEX_VERSION, grid: GRID, cells: CELLS, orient: ORIENT, moments: MOMENTS.length, record: RECORD, count: entries.length, names: entries.map((e) => e.name), data: toBase64(data) };
}

/** Entries ({ name, sig }) of a JSON index. */
export function unpackIndex(index) {
  if (index.version !== INDEX_VERSION || index.grid !== GRID || index.record !== RECORD) throw new Error('the sketch index was built with another layout');
  const data = fromBase64(index.data);
  return index.names.map((name, i) => ({ name, sig: decode(data, i * RECORD) }));
}
