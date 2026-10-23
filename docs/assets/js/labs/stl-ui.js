// STL panel: extrudes an icon into a watertight mesh (outline or solid,
// thickness, bevel and its style, size, resolution), draws it on a canvas
// with flat shading (orthographic view, back faces culled, painter sort),
// turns it with the pointer or the arrow keys, and downloads binary STL.

import { $, $$, download, t, toast } from '../app.js';
import { meshStats, stlMesh, toStl } from '../../../vendor/glyphfox-labs.js';
import { bytes, esc, frameThrottle, rangeFill, sourceControl, statsHtml } from './shared.js';

const state = { variant: 'outline', thickness: 3, bevel: 0, bevelStyle: 'chamfer', size: 48, resolution: 6 };
const view = { yaw: -0.5, pitch: 0.95 };
const SHADES = 48;
let src;
let mesh = null;
let normals = null;
let palette = [];
let timer = 0;

function options() {
  return { variant: state.variant, thickness: state.thickness, bevel: state.bevel, bevelStyle: state.bevelStyle, size: state.size, resolution: state.resolution };
}

function makePalette() {
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff7a1a';
  const m = /^#?([0-9a-f]{6})$/i.exec(accent);
  const hex = m ? m[1] : 'ff7a1a';
  const rgb = [0, 2, 4].map((k) => parseInt(hex.slice(k, k + 2), 16));
  palette = [];
  for (let k = 0; k < SHADES; k++) {
    const s = 0.22 + (0.78 * k) / (SHADES - 1);
    const c = rgb.map((v) => Math.round(Math.min(255, v * s + 18 * s * s)));
    palette.push(`rgb(${c[0]},${c[1]},${c[2]})`);
  }
}

function faceNormals(m) {
  const p = m.positions;
  const tr = m.triangles;
  const n = m.triangleCount;
  const out = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) {
    const a = tr[k * 3] * 3;
    const b = tr[k * 3 + 1] * 3;
    const c = tr[k * 3 + 2] * 3;
    const ux = p[b] - p[a];
    const uy = p[b + 1] - p[a + 1];
    const uz = p[b + 2] - p[a + 2];
    const vx = p[c] - p[a];
    const vy = p[c + 1] - p[a + 1];
    const vz = p[c + 2] - p[a + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    out[k * 3] = nx / l;
    out[k * 3 + 1] = ny / l;
    out[k * 3 + 2] = nz / l;
  }
  return out;
}

function draw() {
  const canvas = $('[data-st-canvas]');
  if (!mesh || !canvas || canvas.closest('[hidden]')) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  const p = mesh.positions;
  const tr = mesh.triangles;
  const n = mesh.triangleCount;
  const nv = p.length / 3;
  const cy = Math.cos(view.yaw);
  const sy = Math.sin(view.yaw);
  const cp = Math.cos(view.pitch);
  const sp = Math.sin(view.pitch);
  const half = mesh.size / 2;
  const mid = mesh.thickness / 2;
  // Screen x, screen y (up) and depth (toward the viewer) of every vertex.
  const X = new Float32Array(nv);
  const Y = new Float32Array(nv);
  const Z = new Float32Array(nv);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < nv; i++) {
    const x = p[i * 3] - half;
    const y = p[i * 3 + 1] - half;
    const z = p[i * 3 + 2] - mid;
    const x1 = x * cy - y * sy;
    const y1 = x * sy + y * cy;
    X[i] = x1;
    Y[i] = y1 * cp + z * sp;
    Z[i] = -y1 * sp + z * cp;
    if (X[i] < minX) minX = X[i];
    if (X[i] > maxX) maxX = X[i];
    if (Y[i] < minY) minY = Y[i];
    if (Y[i] > maxY) maxY = Y[i];
  }
  const scale = Math.min(w / (maxX - minX || 1), h / (maxY - minY || 1)) * 0.82;
  const ox = w / 2 - ((minX + maxX) / 2) * scale;
  const oy = h / 2 + ((minY + maxY) / 2) * scale;
  // Light from the upper left, a little in front.
  const L = [-0.35, 0.6, 0.72];
  const ll = Math.hypot(...L);
  const lx = L[0] / ll;
  const ly = L[1] / ll;
  const lz = L[2] / ll;
  const visible = [];
  const depth = new Float32Array(n);
  const shade = new Uint8Array(n);
  for (let k = 0; k < n; k++) {
    const nx = normals[k * 3];
    const ny = normals[k * 3 + 1];
    const nz = normals[k * 3 + 2];
    const nx1 = nx * cy - ny * sy;
    const ny1 = nx * sy + ny * cy;
    const vz = -ny1 * sp + nz * cp;
    if (vz <= 0) continue;
    const vy = ny1 * cp + nz * sp;
    const lit = Math.max(0, nx1 * lx + vy * ly + vz * lz);
    shade[k] = Math.min(SHADES - 1, Math.round((0.15 + 0.85 * lit) * (SHADES - 1)));
    const a = tr[k * 3];
    const b = tr[k * 3 + 1];
    const c = tr[k * 3 + 2];
    depth[k] = Z[a] + Z[b] + Z[c];
    visible.push(k);
  }
  const order = Uint32Array.from(visible).sort((a, b) => depth[a] - depth[b]);
  const edge = order.length < 40000;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 0.6 * dpr;
  for (let j = 0; j < order.length; j++) {
    const k = order[j];
    const a = tr[k * 3];
    const b = tr[k * 3 + 1];
    const c = tr[k * 3 + 2];
    ctx.beginPath();
    ctx.moveTo(ox + X[a] * scale, oy - Y[a] * scale);
    ctx.lineTo(ox + X[b] * scale, oy - Y[b] * scale);
    ctx.lineTo(ox + X[c] * scale, oy - Y[c] * scale);
    ctx.closePath();
    const color = palette[shade[k]];
    ctx.fillStyle = color;
    ctx.fill();
    if (edge) {
      ctx.strokeStyle = color;
      ctx.stroke();
    }
  }
}

const redraw = frameThrottle(draw);

function render() {
  const icon = src.icon();
  if (!icon) {
    mesh = null;
    $('[data-st-stats]').innerHTML = '';
    const canvas = $('[data-st-canvas]');
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  try {
    mesh = stlMesh(icon, options());
  } catch (err) {
    mesh = null;
    $('[data-st-stats]').innerHTML = `<p class="lab-error">${esc(t('labs.error', { message: err.message }))}</p>`;
    return;
  }
  normals = faceNormals(mesh);
  const stats = meshStats(mesh);
  $('[data-st-stats]').innerHTML = statsHtml([
    [t('labs.stl.triangles'), stats.triangles.toLocaleString()],
    [t('labs.stl.watertight'), t(stats.watertight ? 'labs.stl.yes' : 'labs.stl.no')],
    [t('labs.stl.volume'), `${(stats.volume / 1000).toFixed(2)} cm³`],
    [t('labs.stl.file'), bytes(84 + 50 * stats.triangles)],
  ]);
  redraw();
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(render, 90);
}

export function init() {
  makePalette();
  src = sourceControl('stl', render);
  for (const seg of $$('[data-st-seg]')) {
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      state[seg.dataset.stSeg] = b.value;
      for (const x of $$('button', seg)) x.setAttribute('aria-pressed', String(x === b));
      render();
    });
  }
  for (const input of $$('[data-st]')) {
    rangeFill(input);
    input.addEventListener('input', () => {
      state[input.dataset.st] = Number(input.value);
      $(`[data-st-o="${input.dataset.st}"]`).textContent = input.value;
      rangeFill(input);
      schedule();
    });
  }
  const canvas = $('[data-st-canvas]');
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, yaw: view.yaw, pitch: view.pitch };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    view.yaw = drag.yaw + (e.clientX - drag.x) * 0.01;
    view.pitch = Math.max(0, Math.min(1.5, drag.pitch + (e.clientY - drag.y) * 0.01));
    redraw();
  });
  const end = () => {
    drag = null;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 0.3 : 0.1;
    if (e.key === 'ArrowLeft') view.yaw -= step;
    else if (e.key === 'ArrowRight') view.yaw += step;
    else if (e.key === 'ArrowUp') view.pitch = Math.max(0, view.pitch - step);
    else if (e.key === 'ArrowDown') view.pitch = Math.min(1.5, view.pitch + step);
    else return;
    e.preventDefault();
    redraw();
  });
  window.addEventListener('resize', redraw);
  new MutationObserver(() => {
    makePalette();
    redraw();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  $('[data-st-act="download"]').addEventListener('click', () => {
    const icon = src.icon();
    if (!icon) return;
    try {
      download(toStl(icon, options()), `${src.name()}.stl`, 'model/stl');
      toast(t('toast.downloaded'));
    } catch (err) {
      toast(t('labs.error', { message: err.message }));
    }
  });
  render();
}

export function shown() {
  redraw();
}
