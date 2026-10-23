// Rasterizer for glyphfox icons: anti aliased RGBA pixels from the exact
// distance to the strokes (round caps and joins, like the icon rules) and
// supersampled even odd fills, plus a dependency free PNG encoder. There is
// no canvas involved, so the same pixels come out in Node and in browsers.

import { flattenNode } from '../core/geometry.js';
import { iconNodes, splitLayers } from '../core/nodes.js';
import { strokeWidth } from '../core/render.js';
import { solidLayers } from '../core/solid.js';

const NAMED = {
  black: [0, 0, 0, 255],
  white: [255, 255, 255, 255],
  transparent: [0, 0, 0, 0],
  none: [0, 0, 0, 0],
  currentcolor: [0, 0, 0, 255],
};

const clampByte = (v) => Math.max(0, Math.min(255, Math.round(Number(v))));
const clamp01 = (v) => (v <= 0 ? 0 : v >= 1 ? 1 : v);

/**
 * Parses a CSS color into [r, g, b, a] from 0 to 255. Accepts #rgb, #rgba,
 * #rrggbb, #rrggbbaa, rgb() and rgba(), black, white, transparent, none and
 * currentColor (black, since a raster has no surrounding text color).
 */
export function parseColor(css) {
  if (Array.isArray(css) && css.length >= 3) return [css[0], css[1], css[2], css[3] ?? 255].map(clampByte);
  const s = String(css ?? '')
    .trim()
    .toLowerCase();
  if (Object.prototype.hasOwnProperty.call(NAMED, s)) return NAMED[s].slice();
  let m = /^#([0-9a-f]+)$/.exec(s);
  if (m && [3, 4, 6, 8].includes(m[1].length)) {
    const h = m[1];
    const parts = h.length <= 4 ? h.split('').map((c) => parseInt(c + c, 16)) : h.match(/../g).map((p) => parseInt(p, 16));
    if (parts.length === 3) parts.push(255);
    return parts;
  }
  m = /^rgba?\(([^)]*)\)$/.exec(s);
  if (m) {
    const v = m[1].split(/[\s,/]+/).filter(Boolean);
    if (v.length === 3 || v.length === 4) {
      const ch = v.slice(0, 3).map((x) => (x.endsWith('%') ? (parseFloat(x) * 255) / 100 : parseFloat(x)));
      const a = v.length === 4 ? (v[3].endsWith('%') ? parseFloat(v[3]) / 100 : parseFloat(v[3])) : 1;
      if ([...ch, a].every(Number.isFinite)) return [...ch.map(clampByte), clampByte(a * 255)];
    }
  }
  throw new RangeError(`unsupported color "${css}" (use #rgb, #rrggbb, #rrggbbaa, rgb(), black, white or transparent)`);
}

function polysOf(node, step) {
  try {
    return flattenNode(node, step).map((p) => p.points);
  } catch {
    return [];
  }
}

/** Fill layers and stroke nodes for a variant, the same choice the SVG renderer makes. */
function layersOf(icon, variant, secondaryOpacity) {
  const { secondary, primary } = splitLayers(iconNodes(icon));
  const override = secondaryOpacity !== undefined && secondaryOpacity !== null && secondaryOpacity !== '' && Number.isFinite(Number(secondaryOpacity));
  const pick = (def) => clamp01(override ? Number(secondaryOpacity) : def);
  if (variant === 'duotone') {
    if (secondary) {
      const own = secondary[1].opacity !== undefined ? Number(secondary[1].opacity) : 0.3;
      return { fills: [{ nodes: [secondary], mask: [], opacity: pick(Number.isFinite(own) ? own : 0.3) }], strokes: primary };
    }
    const sl = solidLayers(icon);
    if (sl) return { fills: sl.groups.map((g) => ({ nodes: g.fill, mask: g.mask || [], opacity: pick(0.3) })), strokes: primary };
  } else if (variant === 'solid') {
    const sl = solidLayers(icon);
    if (sl) return { fills: sl.groups.map((g) => ({ nodes: g.fill, mask: g.mask || [], opacity: pick(1) })), strokes: sl.strokes };
  }
  return { fills: [], strokes: primary };
}

/** Stroke polylines grouped by node opacity (morph frames fade some strands). */
function strokeGroups(nodes, step) {
  const map = new Map();
  for (const n of nodes) {
    const raw = n[1] && n[1].opacity !== undefined ? Number(n[1].opacity) : 1;
    const op = Number.isFinite(raw) ? clamp01(raw) : 1;
    if (!map.has(op)) map.set(op, []);
    map.get(op).push(...polysOf(n, step));
  }
  return [...map].map(([opacity, polys]) => ({ opacity, polys }));
}

/**
 * Distance in pixels from every pixel center to the nearest segment of the
 * polylines (grid units scaled by s). Pixels farther than `reach` keep
 * Infinity: each segment only visits the pixels of its own padded box.
 */
function distanceField(polys, s, W, H, reach) {
  const dist = new Float32Array(W * H).fill(Infinity);
  const seg = (ax, ay, bx, by) => {
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - reach));
    const x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx) + reach));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by) - reach));
    const y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by) + reach));
    if (x0 > x1 || y0 > y1) return;
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy;
    for (let y = y0; y <= y1; y++) {
      const py = y + 0.5;
      const row = y * W;
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5;
        let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const ex = px - ax - t * dx;
        const ey = py - ay - t * dy;
        const d = Math.sqrt(ex * ex + ey * ey);
        if (d < dist[row + x]) dist[row + x] = d;
      }
    }
  };
  for (const pts of polys) {
    if (pts.length === 1) seg(pts[0][0] * s, pts[0][1] * s, pts[0][0] * s, pts[0][1] * s);
    for (let k = 1; k < pts.length; k++) seg(pts[k - 1][0] * s, pts[k - 1][1] * s, pts[k][0] * s, pts[k][1] * s);
  }
  return dist;
}

/** Closed rings (grid units) of a fill node; SVG closes open subpaths when filling. */
function ringsOf(node, step) {
  return polysOf(node, step)
    .filter((pts) => pts.length > 2)
    .map((pts) => {
      const a = pts[0];
      const b = pts[pts.length - 1];
      return a[0] === b[0] && a[1] === b[1] ? pts : [...pts, a];
    });
}

/**
 * Even odd coverage of one fill node: pixel centers from sorted scanline
 * crossings, and 4 x 4 supersampling for the pixels near the outline.
 */
function ringCoverage(rings, s, W, H, near) {
  const cov = new Float32Array(W * H);
  const edges = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const ring of rings) {
    for (let k = 1; k < ring.length; k++) {
      const ax = ring[k - 1][0] * s;
      const ay = ring[k - 1][1] * s;
      const bx = ring[k][0] * s;
      const by = ring[k][1] * s;
      minX = Math.min(minX, ax, bx);
      maxX = Math.max(maxX, ax, bx);
      minY = Math.min(minY, ay, by);
      maxY = Math.max(maxY, ay, by);
      if (ay !== by) edges.push(ax, ay, bx, by);
    }
  }
  if (!edges.length) return cov;
  const x0 = Math.max(0, Math.floor(minX) - 1);
  const x1 = Math.min(W - 1, Math.ceil(maxX) + 1);
  const y0 = Math.max(0, Math.floor(minY) - 1);
  const y1 = Math.min(H - 1, Math.ceil(maxY) + 1);
  const inside = (px, py) => {
    let c = false;
    for (let e = 0; e < edges.length; e += 4) {
      const ay = edges[e + 1];
      const by = edges[e + 3];
      if (ay > py !== by > py) {
        const ax = edges[e];
        if (px < ax + ((py - ay) * (edges[e + 2] - ax)) / (by - ay)) c = !c;
      }
    }
    return c;
  };
  const xs = [];
  for (let y = y0; y <= y1; y++) {
    const py = y + 0.5;
    xs.length = 0;
    for (let e = 0; e < edges.length; e += 4) {
      const ay = edges[e + 1];
      const by = edges[e + 3];
      if (ay > py !== by > py) xs.push(edges[e] + ((py - ay) * (edges[e + 2] - edges[e])) / (by - ay));
    }
    xs.sort((a, b) => a - b);
    const row = y * W;
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const from = Math.max(x0, Math.ceil(xs[k] - 0.5));
      const to = Math.min(x1, Math.ceil(xs[k + 1] - 0.5) - 1);
      for (let x = from; x <= to; x++) cov[row + x] = 1;
    }
    for (let x = x0; x <= x1; x++) {
      if (!(near[row + x] < 0.75)) continue;
      let n = 0;
      for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) if (inside(x + (sx + 0.5) / 4, y + (sy + 0.5) / 4)) n++;
      cov[row + x] = n / 16;
    }
  }
  return cov;
}

/** Coverage of a rounded square that fills the whole image. */
function roundedRect(W, H, radius) {
  const cov = new Float32Array(W * H);
  const rr = Math.max(0, Math.min(Number(radius) || 0, W / 2, H / 2));
  const hx = W / 2;
  const hy = H / 2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const qx = Math.abs(x + 0.5 - hx) - (hx - rr);
      const qy = Math.abs(y + 0.5 - hy) - (hy - rr);
      const d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rr;
      cov[y * W + x] = clamp01(0.5 - d);
    }
  }
  return cov;
}

/** Composites a coverage layer in one color over the image (premultiplied). */
function paint(img, cov, rgba, opacity) {
  const a = (rgba[3] / 255) * opacity;
  if (!(a > 0)) return;
  const [r, g, b] = rgba;
  const { R, G, B, A } = img;
  for (let i = 0; i < cov.length; i++) {
    const c = cov[i];
    if (!(c > 0)) continue;
    const sa = c * a;
    const k = 1 - sa;
    R[i] = r * sa + R[i] * k;
    G[i] = g * sa + G[i] * k;
    B[i] = b * sa + B[i] * k;
    A[i] = sa + A[i] * k;
  }
}

/**
 * Rasterizes an icon data object into RGBA pixels: { width, height, data }.
 * Options: size (px, 32), color, weight, absoluteWeight, variant (outline,
 * duotone, solid), secondaryColor, secondaryOpacity, background, radius (px
 * corner radius of the background), outline (a halo color under the icon)
 * and outlineWidth (px added around strokes and fills, 1.5).
 */
export function rasterize(icon, options = {}) {
  if (!icon || typeof icon.body !== 'string') throw new TypeError('rasterize expects an icon data object');
  const {
    size = 32,
    color = '#000000',
    weight = 2,
    absoluteWeight = false,
    variant = 'outline',
    secondaryColor,
    secondaryOpacity,
    background = null,
    radius = 0,
    outline = null,
    outlineWidth = 1.5,
  } = options;
  const W = Math.max(1, Math.min(4096, Math.round(Number(size) || 32)));
  const H = W;
  const n = W * H;
  const s = W / 24;
  const sw = strokeWidth({ size: W, weight, absoluteWeight });
  const r = (sw / 2) * s;
  const halo = outline ? Math.max(0, Number(outlineWidth) || 0) : 0;
  const step = Math.max(0.02, 0.4 / s);
  const img = { R: new Float32Array(n), G: new Float32Array(n), B: new Float32Array(n), A: new Float32Array(n) };
  const main = parseColor(color);
  const second = secondaryColor ? parseColor(secondaryColor) : main;
  const layers = layersOf(icon, variant, secondaryOpacity);

  if (background) paint(img, roundedRect(W, H, radius), parseColor(background), 1);

  const groups = strokeGroups(layers.strokes, step);
  const fills = layers.fills.map((f) => {
    const nodes = f.nodes.map((node) => {
      const rings = ringsOf(node, step);
      const edge = distanceField(rings, s, W, H, Math.max(0.75, halo + 1));
      return { cov: ringCoverage(rings, s, W, H, edge), edge };
    });
    const cov = new Float32Array(n);
    for (const x of nodes) for (let i = 0; i < n; i++) if (x.cov[i] > cov[i]) cov[i] = x.cov[i];
    if (f.mask.length) {
      const kd = distanceField(f.mask.flatMap((m) => polysOf(m, step)), s, W, H, r + 1);
      for (let i = 0; i < n; i++) cov[i] *= 1 - clamp01(r - kd[i] + 0.5);
    }
    return { cov, nodes, opacity: f.opacity };
  });

  if (halo) {
    const d = distanceField(
      groups.flatMap((g) => g.polys),
      s,
      W,
      H,
      r + halo + 1,
    );
    const cov = new Float32Array(n);
    for (let i = 0; i < n; i++) cov[i] = clamp01(r + halo - d[i] + 0.5);
    for (const f of fills) {
      for (const x of f.nodes) {
        for (let i = 0; i < n; i++) {
          const v = Math.max(x.cov[i], clamp01(halo + 0.5 - x.edge[i]));
          if (v > cov[i]) cov[i] = v;
        }
      }
    }
    paint(img, cov, parseColor(outline), 1);
  }
  for (const f of fills) paint(img, f.cov, second, f.opacity);
  for (const g of groups) {
    const d = distanceField(g.polys, s, W, H, r + 1);
    const cov = new Float32Array(n);
    for (let i = 0; i < n; i++) cov[i] = clamp01(r - d[i] + 0.5);
    paint(img, cov, main, g.opacity);
  }

  const data = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const a = img.A[i];
    if (!(a > 0)) continue;
    data[i * 4] = img.R[i] / a;
    data[i * 4 + 1] = img.G[i] / a;
    data[i * 4 + 2] = img.B[i] / a;
    data[i * 4 + 3] = a * 255;
  }
  return { width: W, height: H, data };
}

// PNG.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let k = 0; k < 256; k++) {
    let c = k;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[k] = c >>> 0;
  }
  return t;
})();

function crc32(bytes, start = 0, end = bytes.length) {
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(bytes) {
  let a = 1;
  let b = 0;
  for (let i = 0; i < bytes.length; ) {
    const end = Math.min(i + 4096, bytes.length);
    for (; i < end; i++) {
      a += bytes[i];
      b += a;
    }
    a %= 65521;
    b %= 65521;
  }
  return ((b << 16) | a) >>> 0;
}

/** A zlib stream made of stored (uncompressed) deflate blocks. */
function storedZlib(raw) {
  const blocks = Math.max(1, Math.ceil(raw.length / 65535));
  const out = new Uint8Array(2 + raw.length + blocks * 5 + 4);
  out[0] = 0x78;
  out[1] = 0x01;
  let o = 2;
  for (let k = 0; k < blocks; k++) {
    const start = k * 65535;
    const len = Math.min(65535, raw.length - start);
    out[o++] = k === blocks - 1 ? 1 : 0;
    out[o++] = len & 0xff;
    out[o++] = (len >>> 8) & 0xff;
    out[o++] = ~len & 0xff;
    out[o++] = (~len >>> 8) & 0xff;
    out.set(raw.subarray(start, start + len), o);
    o += len;
  }
  const ad = adler32(raw);
  out[o++] = ad >>> 24;
  out[o++] = (ad >>> 16) & 0xff;
  out[o++] = (ad >>> 8) & 0xff;
  out[o] = ad & 0xff;
  return out;
}

function u32(out, o, v) {
  out[o] = v >>> 24;
  out[o + 1] = (v >>> 16) & 0xff;
  out[o + 2] = (v >>> 8) & 0xff;
  out[o + 3] = v & 0xff;
}

/**
 * Encodes RGBA pixels ({ width, height, data }) as a PNG file. `deflate`
 * is an optional (bytes) => zlib bytes compressor, such as deflateSync from
 * node:zlib; without it the image data is stored uncompressed, which every
 * PNG reader accepts and needs no dependency.
 */
export function encodePng(image, { deflate } = {}) {
  const { width, height, data } = image;
  if (!(width > 0 && height > 0) || !data || data.length < width * height * 4) throw new TypeError('encodePng expects { width, height, data } with RGBA pixels');
  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) raw.set(data.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  let z = deflate ? deflate(raw) : storedZlib(raw);
  if (!(z instanceof Uint8Array)) z = new Uint8Array(z);
  const ihdr = new Uint8Array(13);
  u32(ihdr, 0, width);
  u32(ihdr, 4, height);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const chunks = [
    ['IHDR', ihdr],
    ['IDAT', z],
    ['IEND', new Uint8Array(0)],
  ];
  const total = 8 + chunks.reduce((t, [, d]) => t + 12 + d.length, 0);
  const out = new Uint8Array(total);
  out.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  let o = 8;
  for (const [type, d] of chunks) {
    u32(out, o, d.length);
    for (let k = 0; k < 4; k++) out[o + 4 + k] = type.charCodeAt(k);
    out.set(d, o + 8);
    u32(out, o + 8 + d.length, crc32(out, o + 4, o + 8 + d.length));
    o += 12 + d.length;
  }
  return out;
}

/** Rasterizes an icon and encodes it as PNG bytes (options of rasterize plus deflate). */
export function toPng(icon, options = {}) {
  return encodePng(rasterize(icon, options), { deflate: options.deflate });
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64(bytes) {
  const out = [];
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const v = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out.push(B64[(v >> 18) & 63] + B64[(v >> 12) & 63] + B64[(v >> 6) & 63] + B64[v & 63]);
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const v = bytes[i] << 16;
    out.push(B64[(v >> 18) & 63] + B64[(v >> 12) & 63] + '==');
  } else if (rest === 2) {
    const v = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out.push(B64[(v >> 18) & 63] + B64[(v >> 12) & 63] + B64[(v >> 6) & 63] + '=');
  }
  return out.join('');
}

/** Base64 data URI for bytes (or a string, encoded as UTF-8). */
export function dataUri(bytes, type = 'image/png') {
  const b = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return `data:${type};base64,${base64(b)}`;
}
