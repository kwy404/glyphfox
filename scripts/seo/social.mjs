// Social images of the guides (1200 by 630 PNG), drawn at build time with
// no dependencies: the guide icon from the set, a single stroke capital
// font on the same round caps and joins as the icons, a small rasterizer
// with analytic anti aliasing and a PNG encoder on node:zlib.

import { deflateSync, inflateSync } from 'node:zlib';
import { flattenNode } from '../../packages/glyphfox/src/core/geometry.js';

const W = 1200;
const H = 630;
const BG_TOP = [0x0d, 0x0d, 0x12];
const BG_BOTTOM = [0x07, 0x07, 0x0a];
const ACCENT = [0xff, 0x7a, 0x1a];
const TEXT = [0xf5, 0xf5, 0xf6];
const TEXT_3 = [0x8c, 0x8c, 0x97];

// Capitals on a 10 unit cap height (y grows down). p: polylines, a: arcs [cx, cy, r, from, to] in degrees.
const FONT = {
  A: { w: 8, p: [[[0, 10], [4, 0], [8, 10]], [[1.5, 6.3], [6.5, 6.3]]] },
  B: { w: 6.4, p: [[[0, 10], [0, 0], [3.5, 0]], [[0, 5], [3.5, 5]], [[0, 10], [3.9, 10]]], a: [[3.5, 2.5, 2.5, -90, 90], [3.9, 7.5, 2.5, -90, 90]] },
  C: { w: 8.6, a: [[5, 5, 5, 45, 315]] },
  D: { w: 7.5, p: [[[2.5, 0], [0, 0], [0, 10], [2.5, 10]]], a: [[2.5, 5, 5, -90, 90]] },
  E: { w: 6, p: [[[6, 0], [0, 0], [0, 10], [6, 10]], [[0, 5], [5, 5]]] },
  F: { w: 6, p: [[[6, 0], [0, 0], [0, 10]], [[0, 5], [5, 5]]] },
  G: { w: 10, a: [[5, 5, 5, -45, -360]], p: [[[10, 5], [5.6, 5]]] },
  H: { w: 7, p: [[[0, 0], [0, 10]], [[7, 0], [7, 10]], [[0, 5], [7, 5]]] },
  I: { w: 0, p: [[[0, 0], [0, 10]]] },
  J: { w: 5.5, p: [[[5.5, 0], [5.5, 7.25]]], a: [[2.75, 7.25, 2.75, 0, 180]] },
  K: { w: 7, p: [[[0, 0], [0, 10]], [[6.8, 0], [0, 6.4]], [[2.4, 4.4], [7, 10]]] },
  L: { w: 6, p: [[[0, 0], [0, 10], [6, 10]]] },
  M: { w: 9, p: [[[0, 10], [0, 0], [4.5, 7], [9, 0], [9, 10]]] },
  N: { w: 7.5, p: [[[0, 10], [0, 0], [7.5, 10], [7.5, 0]]] },
  O: { w: 10, a: [[5, 5, 5, 0, 360]] },
  P: { w: 6.5, p: [[[0, 10], [0, 0], [3.75, 0]], [[0, 5.5], [3.75, 5.5]]], a: [[3.75, 2.75, 2.75, -90, 90]] },
  Q: { w: 10, a: [[5, 5, 5, 0, 360]], p: [[[6.6, 6.6], [10, 10]]] },
  R: { w: 6.75, p: [[[0, 10], [0, 0], [3.75, 0]], [[0, 5.5], [3.75, 5.5]], [[3.4, 5.5], [6.75, 10]]], a: [[3.75, 2.75, 2.75, -90, 90]] },
  S: { w: 6, a: [[3.3, 2.5, 2.5, -15, -270], [3.3, 7.5, 2.5, -90, 165]] },
  T: { w: 7, p: [[[0, 0], [7, 0]], [[3.5, 0], [3.5, 10]]] },
  U: { w: 7, p: [[[0, 0], [0, 6.5]], [[7, 0], [7, 6.5]]], a: [[3.5, 6.5, 3.5, 180, 0]] },
  V: { w: 8, p: [[[0, 0], [4, 10], [8, 0]]] },
  W: { w: 11, p: [[[0, 0], [2.75, 10], [5.5, 2.5], [8.25, 10], [11, 0]]] },
  X: { w: 7, p: [[[0, 0], [7, 10]], [[7, 0], [0, 10]]] },
  Y: { w: 7, p: [[[0, 0], [3.5, 5.2], [7, 0]], [[3.5, 5.2], [3.5, 10]]] },
  Z: { w: 7, p: [[[0, 0], [7, 0], [0, 10], [7, 10]]] },
  0: { w: 7, p: [[[0, 3.5], [0, 6.5]], [[7, 3.5], [7, 6.5]]], a: [[3.5, 3.5, 3.5, 180, 360], [3.5, 6.5, 3.5, 0, 180]] },
  4: { w: 7, p: [[[5.5, 10], [5.5, 0], [0, 7], [7, 7]]] },
  '.': { w: 0, p: [[[0, 10], [0, 10]]] },
  '/': { w: 5, p: [[[0, 10], [5, 0]]] },
  '-': { w: 4, p: [[[0, 5.5], [4, 5.5]]] },
  ' ': { w: 2.5 },
};
const GAP = 2.7;

function arcPoints([cx, cy, r, a0, a1]) {
  const n = Math.max(8, Math.ceil((Math.abs(a1 - a0) / 360) * 48));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

export function textWidth(str) {
  let w = 0;
  const chars = [...str.toUpperCase()].filter((c) => FONT[c]);
  chars.forEach((c, i) => (w += FONT[c].w + (i < chars.length - 1 ? GAP : 0)));
  return w;
}

/** Polylines of a string in units (cap height 10), starting at x = 0. */
function textLines(str) {
  const out = [];
  let x = 0;
  for (const c of str.toUpperCase()) {
    const g = FONT[c];
    if (!g) continue;
    for (const pl of g.p || []) out.push(pl.map(([px, py]) => [px + x, py]));
    for (const a of g.a || []) out.push(arcPoints(a).map(([px, py]) => [px + x, py]));
    x += g.w + GAP;
  }
  return out;
}

class Canvas {
  constructor() {
    this.px = new Float32Array(W * H * 3);
    this.cov = new Float32Array(W * H);
  }
  background(glowX, glowY) {
    for (let y = 0; y < H; y++) {
      const ty = y / (H - 1);
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 3;
        const d2 = ((x - glowX) ** 2 + (y - glowY) ** 2) / (330 * 330);
        const glow = 0.2 * Math.exp(-d2 * 1.6);
        for (let c = 0; c < 3; c++) {
          const base = (BG_TOP[c] + (BG_BOTTOM[c] - BG_TOP[c]) * ty) / 255;
          this.px[i + c] = base + (ACCENT[c] / 255 - base) * glow;
        }
      }
    }
  }
  /** Adds a round capped segment of radius r to the coverage layer. */
  segment(x1, y1, x2, y2, r) {
    const minX = Math.max(0, Math.floor(Math.min(x1, x2) - r - 1));
    const maxX = Math.min(W - 1, Math.ceil(Math.max(x1, x2) + r + 1));
    const minY = Math.max(0, Math.floor(Math.min(y1, y2) - r - 1));
    const maxY = Math.min(H - 1, Math.ceil(Math.max(y1, y2) + r + 1));
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        let t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const d = Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
        const c = r + 0.5 - d;
        if (c <= 0) continue;
        const k = y * W + x;
        const v = c > 1 ? 1 : c;
        if (v > this.cov[k]) this.cov[k] = v;
      }
    }
  }
  polyline(points, r) {
    if (points.length === 1) points = [points[0], points[0]];
    for (let i = 1; i < points.length; i++) this.segment(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1], r);
  }
  /** Fills closed polygons (even odd) into the coverage layer, 4x4 supersampled. */
  fill(polys) {
    let minX = W;
    let minY = H;
    let maxX = 0;
    let maxY = 0;
    for (const p of polys) for (const [x, y] of p) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    const inside = (x, y) => {
      let c = false;
      for (const p of polys) for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const [xi, yi] = p[i];
        const [xj, yj] = p[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(H - 1, Math.ceil(maxY)); y++) {
      for (let x = Math.max(0, Math.floor(minX)); x <= Math.min(W - 1, Math.ceil(maxX)); x++) {
        let n = 0;
        for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) if (inside(x + (sx + 0.5) / 4, y + (sy + 0.5) / 4)) n++;
        const v = n / 16;
        const k = y * W + x;
        if (v > this.cov[k]) this.cov[k] = v;
      }
    }
  }
  /** Paints the coverage layer in a color and clears it. */
  paint(color, alpha = 1) {
    for (let k = 0; k < W * H; k++) {
      const c = this.cov[k] * alpha;
      if (c <= 0) continue;
      const i = k * 3;
      for (let j = 0; j < 3; j++) this.px[i + j] += (color[j] / 255 - this.px[i + j]) * c;
      this.cov[k] = 0;
    }
  }
  text(str, x, y, cap, r) {
    const s = cap / 10;
    for (const pl of textLines(str)) this.polyline(pl.map(([px, py]) => [x + px * s, y + py * s]), r);
  }
  rgb() {
    const out = Buffer.alloc(W * H * 3);
    for (let i = 0; i < out.length; i++) out[i] = Math.max(0, Math.min(255, Math.round(this.px[i] * 255)));
    return out;
  }
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** Filtered scanlines (per row the cheapest of none, sub and up). */
function filtered(rgb) {
  const stride = W * 3;
  const out = Buffer.alloc((stride + 1) * H);
  for (let y = 0; y < H; y++) {
    const row = rgb.subarray(y * stride, (y + 1) * stride);
    const prev = y ? rgb.subarray((y - 1) * stride, y * stride) : null;
    const cands = [0, 1, 2].map((type) => {
      const f = Buffer.alloc(stride);
      for (let i = 0; i < stride; i++) {
        const left = i >= 3 ? row[i - 3] : 0;
        const up = prev ? prev[i] : 0;
        f[i] = (row[i] - (type === 1 ? left : type === 2 ? up : 0)) & 0xff;
      }
      let cost = 0;
      for (let i = 0; i < stride; i++) cost += f[i] < 128 ? f[i] : 256 - f[i];
      return [cost, type, f];
    });
    cands.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    out[y * (stride + 1)] = cands[0][1];
    cands[0][2].copy(out, y * (stride + 1) + 1);
  }
  return out;
}

function encodePng(rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(filtered(rgb), { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/** True when two PNG files hold the same header and image data (zlib output may differ between versions). */
export function samePng(a, b) {
  const parts = (buf) => {
    const out = { ihdr: null, idat: [] };
    let i = 8;
    while (i + 8 <= buf.length) {
      const len = buf.readUInt32BE(i);
      const type = buf.toString('ascii', i + 4, i + 8);
      const data = buf.subarray(i + 8, i + 8 + len);
      if (type === 'IHDR') out.ihdr = data;
      if (type === 'IDAT') out.idat.push(data);
      i += 12 + len;
    }
    return out;
  };
  try {
    const pa = parts(a);
    const pb = parts(b);
    return !!pa.ihdr && !!pb.ihdr && pa.ihdr.equals(pb.ihdr) && inflateSync(Buffer.concat(pa.idat)).equals(inflateSync(Buffer.concat(pb.idat)));
  } catch {
    return false;
  }
}

/** Splits a title into at most two lines that fit `max` units at the largest size. */
function layoutTitle(title, maxWidth, maxCap) {
  const wordsOf = title.split(/\s+/);
  let best = { lines: [title], cap: Math.min(maxCap, (maxWidth / textWidth(title)) * 10) };
  for (let i = 1; i < wordsOf.length; i++) {
    const lines = [wordsOf.slice(0, i).join(' '), wordsOf.slice(i).join(' ')];
    const cap = Math.min(maxCap * 0.86, (maxWidth / Math.max(...lines.map(textWidth))) * 10);
    if (cap > best.cap + 4) best = { lines, cap };
  }
  return best;
}

/** The social image of a guide as a PNG buffer. */
export function socialImage(guide, api) {
  const cv = new Canvas();
  const box = { x: 772, y: 147, size: 336 };
  const cx = box.x + box.size / 2;
  const cy = box.y + box.size / 2;
  cv.background(cx, cy);
  const unit = box.size / 24;
  // The 24 grid behind the icon.
  for (let k = 0; k <= 24; k += 2) {
    cv.segment(box.x + k * unit, box.y, box.x + k * unit, box.y + box.size, 0.5);
    cv.segment(box.x, box.y + k * unit, box.x + box.size, box.y + k * unit, 0.5);
  }
  cv.paint(TEXT, 0.06);
  // The guide icon.
  const nodes = api.parseBody(api.getIcon(guide.icon).body);
  const at = (pts) => pts.map(([x, y]) => [box.x + x * unit, box.y + y * unit]);
  for (const n of nodes.filter((nd) => nd[1].class === 'gf-secondary')) cv.fill(flattenNode(n, 0.2).map((pl) => at(pl.points)));
  cv.paint(ACCENT, 0.28);
  for (const n of nodes.filter((nd) => nd[1].class !== 'gf-secondary')) for (const pl of flattenNode(n, 0.2)) cv.polyline(at(pl.points), unit);
  cv.paint(ACCENT);
  // Brand: Fenn and the name.
  const fenn = api.parseBody(api.getIcon('fenn').body);
  const fu = 2.1;
  for (const n of fenn.filter((nd) => nd[1].class !== 'gf-secondary')) for (const pl of flattenNode(n, 0.2)) cv.polyline(pl.points.map(([x, y]) => [76 + x * fu, 66 + y * fu]), fu);
  cv.paint(ACCENT);
  cv.text('glyphfox', 138, 80, 22, 2.1);
  cv.paint(TEXT);
  // Title and labels.
  const { lines, cap } = layoutTitle(guide.short, 600, 92);
  const lh = cap * 1.42;
  const top = 315 - ((lines.length - 1) * lh + cap) / 2 + 12;
  cv.text('Guide', 80, top - 64, 18, 1.9);
  cv.paint(ACCENT);
  lines.forEach((ln, i) => cv.text(ln, 80, top + i * lh, cap, Math.max(3.2, cap * 0.085)));
  cv.paint(TEXT);
  cv.text('kwy404.github.io/glyphfox', 80, 532, 15, 1.5);
  cv.paint(TEXT_3);
  return encodePng(cv.rgb());
}
