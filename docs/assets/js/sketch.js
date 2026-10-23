// Sketch search: draw a rough shape and rank icons by shape similarity.
// Both the sketch and every icon are rasterized to a normalized 32 x 32
// grid; the score mixes a symmetric chamfer distance with a stroke
// direction histogram. Runs entirely in the page.

import { gf } from './app.js';

const N = 32;
const features = new Map();

function distanceTransform(on) {
  const INF = 1e6;
  const d = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) d[i] = on[i] ? 0 : INF;
  const a = 1;
  const b = Math.SQRT2;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + a);
      if (y > 0) v = Math.min(v, d[i - N] + a);
      if (x > 0 && y > 0) v = Math.min(v, d[i - N - 1] + b);
      if (x < N - 1 && y > 0) v = Math.min(v, d[i - N + 1] + b);
      d[i] = v;
    }
  }
  for (let y = N - 1; y >= 0; y--) {
    for (let x = N - 1; x >= 0; x--) {
      const i = y * N + x;
      let v = d[i];
      if (x < N - 1) v = Math.min(v, d[i + 1] + a);
      if (y < N - 1) v = Math.min(v, d[i + N] + a);
      if (x < N - 1 && y < N - 1) v = Math.min(v, d[i + N + 1] + b);
      if (x > 0 && y < N - 1) v = Math.min(v, d[i + N - 1] + b);
      d[i] = v;
    }
  }
  return d;
}

/** Rasterizes polylines (in any units) into a normalized feature set. */
export function featuresOf(polylines) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const pl of polylines) {
    for (const [x, y] of pl) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (!Number.isFinite(minX)) return null;
  const span = Math.max(maxX - minX, maxY - minY, 1e-6);
  const s = (N - 6) / span;
  const ox = (N - (maxX - minX) * s) / 2;
  const oy = (N - (maxY - minY) * s) / 2;
  const on = new Uint8Array(N * N);
  const hist = new Float32Array(8);
  const plot = (x, y) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const px = Math.round(x + dx * 0.5);
        const py = Math.round(y + dy * 0.5);
        if (px >= 0 && py >= 0 && px < N && py < N) on[py * N + px] = 1;
      }
    }
  };
  for (const pl of polylines) {
    for (let i = 0; i < pl.length; i++) {
      const x = ox + (pl[i][0] - minX) * s;
      const y = oy + (pl[i][1] - minY) * s;
      if (i === 0) {
        plot(x, y);
        continue;
      }
      const x0 = ox + (pl[i - 1][0] - minX) * s;
      const y0 = oy + (pl[i - 1][1] - minY) * s;
      const len = Math.hypot(x - x0, y - y0);
      const steps = Math.max(1, Math.ceil(len * 2));
      for (let k = 1; k <= steps; k++) plot(x0 + ((x - x0) * k) / steps, y0 + ((y - y0) * k) / steps);
      if (len > 0.01) {
        let ang = Math.atan2(y - y0, x - x0);
        if (ang < 0) ang += Math.PI;
        hist[Math.min(7, Math.floor((ang / Math.PI) * 8))] += len;
      }
    }
  }
  let total = 0;
  for (const v of hist) total += v;
  if (total) for (let i = 0; i < 8; i++) hist[i] /= total;
  const pts = [];
  for (let i = 0; i < N * N; i++) if (on[i]) pts.push(i);
  return { on, dt: distanceTransform(on), pts, hist, aspect: (maxX - minX) / span - (maxY - minY) / span };
}

function iconFeatures(icon) {
  let f = features.get(icon.name);
  if (!f) {
    const nodes = gf.splitLayers(gf.iconNodes(icon)).primary;
    const polys = [];
    for (const n of nodes) for (const p of gf.geometry.flattenNode(n, 0.3)) polys.push(p.points);
    f = featuresOf(polys);
    features.set(icon.name, f);
  }
  return f;
}

function chamfer(a, b) {
  let s1 = 0;
  for (const i of a.pts) s1 += b.dt[i];
  let s2 = 0;
  for (const i of b.pts) s2 += a.dt[i];
  return s1 / Math.max(1, a.pts.length) + s2 / Math.max(1, b.pts.length);
}

/** Ranks icons for sketch strokes (arrays of [x, y] points). */
export function rank(strokes, icons, limit = 48) {
  const sk = featuresOf(strokes.filter((s) => s.length));
  if (!sk || sk.pts.length < 4) return [];
  const out = [];
  for (const icon of icons) {
    const f = iconFeatures(icon);
    if (!f) continue;
    let hd = 0;
    for (let i = 0; i < 8; i++) hd += Math.abs(sk.hist[i] - f.hist[i]);
    const score = chamfer(sk, f) + hd * 2.2 + Math.abs(sk.aspect - f.aspect) * 1.5;
    out.push({ icon, score });
  }
  out.sort((a, b) => a.score - b.score);
  return out.slice(0, limit);
}

/** Wires a canvas for drawing; calls onChange(strokes) while drawing. */
export function sketchPad(canvas, onChange) {
  const ctx = canvas.getContext('2d');
  let strokes = [];
  let current = null;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    redraw();
  };
  const color = () => getComputedStyle(canvas).color || '#fff';
  function redraw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = color();
    for (const s of strokes) {
      ctx.beginPath();
      s.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      if (s.length === 1) ctx.lineTo(s[0][0] + 0.1, s[0][1]);
      ctx.stroke();
    }
  }
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    current = [pos(e)];
    strokes.push(current);
    redraw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!current) return;
    const p = pos(e);
    const last = current[current.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 2) return;
    current.push(p);
    redraw();
    onChange(strokes);
  });
  const end = () => {
    if (!current) return;
    current = null;
    onChange(strokes);
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  new ResizeObserver(resize).observe(canvas);
  return {
    clear() {
      strokes = [];
      redraw();
      onChange(strokes);
    },
    undo() {
      strokes.pop();
      redraw();
      onChange(strokes);
    },
    get strokes() {
      return strokes;
    },
  };
}
