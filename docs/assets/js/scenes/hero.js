// Hero: a scattered field of icons in depth flows into the glyphfox mark,
// holds, then flows on into Fenn. Every particle is a real icon of the set,
// pre-rendered once into a sprite atlas and moved by a damped spring, so the
// whole flight costs a few hundred drawImage calls per frame. The loop sleeps
// once everything settles and only runs while the hero is on screen.

import { gf, reduced } from '../app.js';
import { alongPolys, bake, clamp, el, onTheme, polylines, random, token } from './util.js';

const FENN_HEAD = 'M4 2.5 9 7 15 7 20 2.5 20.5 9.5 22 13.5 15 16.5 12 21.5 9 16.5 2 13.5 3.5 9.5Z';
// The mark: Fenn's head on the rounded tile of the favicon, in stage units (0 to 64).
const TILE = { x: 11, y: 11, s: 42, r: 11 };
const MARK_SCALE = (TILE.s * 0.75) / 24;
const MARK_OFF = TILE.x + TILE.s * (4 / 32);
const POOL = ['home', 'search', 'heart', 'bell', 'camera', 'cloud', 'lock', 'folder', 'star', 'mail', 'user', 'settings', 'music', 'image', 'calendar', 'sun', 'moon', 'zap', 'gift', 'globe', 'compass', 'terminal', 'package', 'sparkles', 'map-pin', 'shopping-cart', 'message-circle', 'download', 'send', 'bookmark', 'shield', 'key', 'wifi', 'code', 'database', 'cpu', 'headphones', 'video', 'mic', 'phone', 'clock', 'file', 'layers', 'activity', 'leaf', 'flame', 'feather', 'rocket', 'droplet', 'paw', 'fox', 'fenn'];
const CELL = 64;

function rectPath({ x, y, s, r }) {
  return `M${x + r} ${y}H${x + s - r}A${r} ${r} 0 0 1 ${x + s} ${y + r}V${y + s - r}A${r} ${r} 0 0 1 ${x + s - r} ${y + s}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + s - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

/** Target points of the mark: the tile, then the head, then the eyes. */
function markTargets(n) {
  const headD = bake(FENN_HEAD, MARK_SCALE, MARK_OFF, MARK_OFF);
  const tile = alongPolys(polylines(rectPath(TILE)), Math.round(n * 0.42));
  const head = alongPolys(polylines(headD), n - tile.length - 8);
  const eyes = [];
  for (let i = 0; i < 8; i++) {
    const ex = MARK_OFF + (i < 4 ? 9 : 15) * MARK_SCALE;
    const ey = MARK_OFF + 12 * MARK_SCALE;
    const a = (i % 4) * (Math.PI / 2) + 0.4;
    eyes.push([ex + Math.cos(a) * 0.55, ey + Math.sin(a) * 0.55]);
  }
  return [...tile.map((p) => [...p, 0]), ...head.map((p) => [...p, 1]), ...eyes.map((p) => [...p, 1])];
}

/** Target points of Fenn sitting, read from the mascot drawing in the page. */
function fennTargets(svgEl, n) {
  const strokes = [...svgEl.querySelectorAll('path:not(.fill)')].map((p) => p.getAttribute('d')).filter((d) => d && !/h\.0\d/.test(d));
  const eyes = [...svgEl.querySelectorAll('path:not(.fill)')].map((p) => p.getAttribute('d')).filter((d) => d && /h\.0\d/.test(d));
  const polys = strokes.flatMap((d, i) => polylines(d).map((p) => ({ ...p, head: i === 0 })));
  const eyeCount = eyes.length * 4;
  let total = 0;
  for (const p of polys) total += gf.geometry.polylineLength(p.points);
  const out = [];
  for (const p of polys) {
    const len = gf.geometry.polylineLength(p.points);
    const k = Math.max(2, Math.round(((n - eyeCount) * len) / total));
    const pts = gf.geometry.resample(p.points, k + (p.closed ? 1 : 0));
    if (p.closed) pts.pop();
    for (const q of pts) out.push([q[0], q[1], p.head ? 1 : 0]);
  }
  for (const d of eyes) {
    const m = /M\s*([\d.]+)[ ,]([\d.]+)/.exec(d);
    if (!m) continue;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + 0.4;
      out.push([Number(m[1]) + Math.cos(a) * 0.45, Number(m[2]) + Math.sin(a) * 0.45, 1]);
    }
  }
  return out;
}

function atlas(names, color, blur) {
  const cols = 8;
  const rows = Math.ceil(names.length / cols);
  const c = document.createElement('canvas');
  c.width = cols * CELL;
  c.height = rows * CELL;
  const ctx = c.getContext('2d');
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const pad = CELL * 0.14;
  const k = (CELL - pad * 2) / 24;
  names.forEach((name, i) => {
    const icon = gf.lookupIcon(name);
    if (!icon) return;
    const { primary } = gf.splitLayers(gf.iconNodes(icon));
    let d = '';
    for (const node of primary) d += gf.geometry.serializePath(gf.geometry.shapeToSegments(node), 2);
    ctx.setTransform(k, 0, 0, k, (i % cols) * CELL + pad, Math.floor(i / cols) * CELL + pad);
    ctx.lineWidth = 2.6;
    ctx.stroke(new Path2D(d));
  });
  if (!blur) return c;
  const b = document.createElement('canvas');
  b.width = c.width;
  b.height = c.height;
  const bctx = b.getContext('2d');
  bctx.filter = 'blur(3px)';
  bctx.drawImage(c, 0, 0);
  return b;
}

export function hero() {
  const stage = document.querySelector('[data-hero-flow]');
  const canvas = document.querySelector('[data-flow-canvas]');
  if (!stage || !canvas) return;
  const section = stage.closest('.hero') || stage;
  const mascot = stage.querySelector('.hero-mascot');
  const names = POOL.filter((n) => gf.lookupIcon(n));
  if (!names.length || !mascot) return;

  // The crisp mark drawn under the particles.
  const mark = el('svg', { class: 'flow-mark', viewBox: '0 0 64 64', fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' });
  el('path', { class: 'flow-tile', d: rectPath(TILE), pathLength: 1 }, mark);
  el('path', { class: 'flow-head-fill', d: bake(FENN_HEAD, MARK_SCALE, MARK_OFF, MARK_OFF) }, mark);
  el('path', { class: 'flow-head', d: bake(FENN_HEAD, MARK_SCALE, MARK_OFF, MARK_OFF), pathLength: 1 }, mark);
  stage.insertBefore(mark, mascot);

  const small = window.innerWidth < 700;
  const N = small ? 160 : 250;
  const rnd = random(7);
  const mt = markTargets(N);
  const ft = fennTargets(mascot, N);
  const order = (list, i) => i / Math.max(1, list.length - 1);
  const parts = [];
  for (let i = 0; i < N; i++) {
    const m = mt[i % mt.length];
    const f = ft[i % ft.length];
    const z = rnd() * 2 - 1;
    const k = 55 + rnd() * 45;
    parts.push({
      sprite: Math.floor(rnd() * names.length),
      size: 0.85 + rnd() * 0.3,
      // Field position, filled in by layout() in stage units.
      fx: rnd(),
      fy: rnd(),
      x: 0,
      y: 0,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      a: (rnd() - 0.5) * 2.6,
      va: 0,
      tx: 0,
      ty: 0,
      tz: z,
      ta: 0,
      k,
      c: 2 * 0.5 * Math.sqrt(k),
      swirl: (rnd() < 0.5 ? -1 : 1) * (0.6 + rnd() * 0.9),
      mark: [m[0], m[1]],
      markAccent: m[2] === 1 || rnd() < 0.08,
      fenn: [f[0], f[1]],
      fennAccent: f[2] === 1 || rnd() < 0.12,
      tMark: 0.3 + order(mt, i % mt.length) * 0.9 + rnd() * 0.12,
      tFenn: 2.5 + order(ft, i % ft.length) * 1.0 + rnd() * 0.12,
      accent: rnd() < 0.18,
      seed: rnd() * Math.PI * 2,
    });
  }

  const ctx = canvas.getContext('2d');
  let W = 0;
  let H = 0;
  let dpr = 1;
  let sx = 0;
  let sy = 0;
  let unit = 1;
  let bounds = [0, 0, 64, 64];
  let sheets = null;
  const paint = () => {
    const text = token('--text', '#f5f5f6');
    const accent = token('--accent', '#ff7a1a');
    sheets = { text: atlas(names, text, false), accent: atlas(names, accent, false), textBlur: atlas(names, text, true), accentBlur: atlas(names, accent, true) };
  };
  paint();

  let placed = false;
  function layout() {
    const hr = section.getBoundingClientRect();
    const r = stage.getBoundingClientRect();
    dpr = Math.min(window.innerWidth > 1600 ? 1.5 : 2, window.devicePixelRatio || 1);
    W = hr.width;
    H = hr.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    sx = r.left - hr.left;
    sy = r.top - hr.top;
    unit = r.width / 64;
    bounds = [-sx / unit, -sy / unit, (W - sx) / unit, (H - sy) / unit];
    if (!placed) {
      placed = true;
      for (const p of parts) {
        p.x = bounds[0] + p.fx * (bounds[2] - bounds[0]);
        p.y = bounds[1] + p.fy * (bounds[3] - bounds[1]);
        p.tx = p.x;
        p.ty = p.y;
      }
    }
  }

  let pointer = null;
  let pointerAt = 0;
  let tilt = [0, 0];
  section.addEventListener('pointermove', (e) => {
    const hr = section.getBoundingClientRect();
    pointerAt = performance.now();
    pointer = [(e.clientX - hr.left - sx) / unit, (e.clientY - hr.top - sy) / unit];
    tilt = [(e.clientX - hr.left) / Math.max(1, W) - 0.5, (e.clientY - hr.top) / Math.max(1, H) - 0.5];
    wake();
  });
  section.addEventListener('pointerleave', () => {
    pointer = null;
    tilt = [0, 0];
    wake();
  });

  const start = performance.now();
  let raf = 0;
  let visible = true;
  let lastT = 0;
  let calm = 0;
  let stageState = '';
  let view = [0, 0];
  const H_STEP = 1 / 120;

  function setState(s) {
    if (s === stageState) return;
    stageState = s;
    stage.classList.toggle('is-mark', s === 'mark');
    stage.classList.toggle('is-fenn', s === 'fenn');
  }

  function step(t, h) {
    let energy = 0;
    for (const p of parts) {
      let free = false;
      if (t < p.tMark) {
        free = true;
      } else if (t < p.tFenn) {
        p.tx = p.mark[0];
        p.ty = p.mark[1];
        p.tz = 0;
        p.ta = 0;
      } else {
        p.tx = p.fenn[0];
        p.ty = p.fenn[1];
        p.tz = Math.sin(p.seed) * 0.12;
        p.ta = 0;
      }
      if (free) {
        // Slow drift through the field before the flight.
        p.vx += Math.sin(t * 0.7 + p.seed) * 0.6 * h;
        p.vy += Math.cos(t * 0.6 + p.seed * 1.3) * 0.6 * h;
        p.x += p.vx * h;
        p.y += p.vy * h;
        p.a += 0.25 * h * p.swirl;
        continue;
      }
      const since = t - (t < p.tFenn ? p.tMark : p.tFenn);
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const sw = p.swirl * p.k * 0.45 * Math.exp(-since * 2.2);
      let ax = p.k * dx - p.c * p.vx - sw * dy;
      let ay = p.k * dy - p.c * p.vy + sw * dx;
      if (pointer) {
        const qx = p.x - pointer[0];
        const qy = p.y - pointer[1];
        const d2 = qx * qx + qy * qy;
        if (d2 < 36 && d2 > 0.0001) {
          const d = Math.sqrt(d2);
          const f = (1 - d / 6) * 520;
          ax += (qx / d) * f;
          ay += (qy / d) * f;
        }
      }
      p.vx += ax * h;
      p.vy += ay * h;
      p.vz += (p.k * (p.tz - p.z) - p.c * p.vz) * h;
      p.va += (p.k * (p.ta - p.a) - p.c * p.va) * h;
      p.x += p.vx * h;
      p.y += p.vy * h;
      p.z += p.vz * h;
      p.a += p.va * h;
      energy += Math.abs(p.vx) + Math.abs(p.vy);
    }
    return energy / parts.length;
  }

  function draw(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const vpx = 32;
    const vpy = 32;
    view[0] += (tilt[0] - view[0]) * 0.08;
    view[1] += (tilt[1] - view[1]) * 0.08;
    const base = (small ? 2.2 : 1.85) * unit * dpr;
    const fieldIn = clamp(t / 0.6);
    // Scroll parallax: nearer icons drift further as the hero scrolls away.
    const lift = Math.min(window.scrollY, H) / unit;
    for (const p of parts) {
      const persp = 1 / (1 - (t >= p.tMark ? 0.32 : 0.42) * p.z);
      const x = vpx + (p.x - vpx) * persp + view[0] * p.z * 3;
      const y = vpy + (p.y - vpy) * persp + view[1] * p.z * 3 - lift * 0.3 * p.z;
      const size = base * p.size * persp;
      const flying = t >= p.tMark;
      const accent = t < p.tMark ? p.accent : t < p.tFenn ? p.markAccent : p.fennAccent;
      const far = Math.abs(p.z) > 0.45;
      const sheet = accent ? (far ? sheets.accentBlur : sheets.accent) : far ? sheets.textBlur : sheets.text;
      let alpha = flying ? 0.55 + 0.45 * (1 - Math.min(1, Math.abs(p.z))) : 0.2 + 0.45 * (0.5 + 0.5 * p.z);
      alpha *= fieldIn;
      if (!accent) alpha *= 0.9;
      if (alpha <= 0.01) continue;
      ctx.globalAlpha = alpha;
      const px = (sx + x * unit) * dpr;
      const py = (sy + y * unit) * dpr;
      const c = Math.cos(p.a);
      const s = Math.sin(p.a);
      const k = size / CELL;
      ctx.setTransform(c * k, s * k, -s * k, c * k, px, py);
      const col = p.sprite % 8;
      const row = Math.floor(p.sprite / 8);
      ctx.drawImage(sheet, col * CELL, row * CELL, CELL, CELL, -CELL / 2, -CELL / 2, CELL, CELL);
    }
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    raf = 0;
    const t = (now - start) / 1000;
    const dt = lastT ? Math.min(0.05, t - lastT) : 1 / 60;
    lastT = t;
    let energy = 0;
    const n = Math.max(1, Math.round(dt / H_STEP));
    for (let i = 0; i < n; i++) energy = step(t - dt + ((i + 1) * dt) / n, dt / n);
    draw(t);
    if (t > 1.1 && t < 2.6) setState('mark');
    else if (t >= 2.6) setState('fenn');
    const moving = pointer && now - pointerAt < 1200;
    const settled = t > 4.8 && energy < 0.02 && !moving && Math.abs(view[0] - tilt[0]) + Math.abs(view[1] - tilt[1]) < 0.002;
    calm = settled ? calm + dt : 0;
    if (visible && calm < 0.6) raf = requestAnimationFrame(loop);
  }

  function wake() {
    calm = 0;
    if (!raf && visible && !reduced) {
      lastT = (performance.now() - start) / 1000;
      raf = requestAnimationFrame(loop);
    }
  }

  function still() {
    for (const p of parts) {
      p.x = p.fenn[0];
      p.y = p.fenn[1];
      p.z = Math.sin(p.seed) * 0.12;
      p.a = 0;
    }
    setState('fenn');
    draw(1e6);
  }

  layout();
  new ResizeObserver(() => {
    layout();
    if (reduced) still();
    else {
      draw((performance.now() - start) / 1000);
      wake();
    }
  }).observe(section);
  onTheme(() => {
    paint();
    if (reduced) still();
    else {
      draw((performance.now() - start) / 1000);
      wake();
    }
  });
  new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible) wake();
  }).observe(section);
  window.addEventListener(
    'scroll',
    () => {
      if (visible) wake();
    },
    { passive: true },
  );
  if (reduced) still();
  else wake();
}
