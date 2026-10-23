// Backdrops of the 3D view. The same painter fills the live background layer
// and the exported PNG, so what you see is what you download.

export const BACKGROUNDS = ['transparent', 'glow', 'dark', 'light', 'studio', 'midnight'];

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  const n = m ? parseInt(m[1], 16) : 0xff7a1a;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const rgba = ([r, g, b], a = 1) => `rgba(${r},${g},${b},${a})`;
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/** CSS preview of a backdrop for the swatch buttons. */
export function swatchCss(kind, color) {
  const c = hexToRgb(color);
  switch (kind) {
    case 'glow':
      return `radial-gradient(circle at 50% 45%, ${rgba(mix(c, [12, 10, 16], 0.55))}, #0b0a10 70%)`;
    case 'dark':
      return 'radial-gradient(circle at 50% 40%, #1a1a22, #08080b 75%)';
    case 'light':
      return 'radial-gradient(circle at 50% 40%, #ffffff, #e9e6df 80%)';
    case 'studio':
      return 'linear-gradient(#d9dbe0, #f7f7f8 62%, #c9cbd1)';
    case 'midnight':
      return 'radial-gradient(circle at 50% 30%, #23305e, #0a0e22 75%)';
    default:
      return 'repeating-conic-gradient(#9a9aa3 0 25%, #d4d4da 0 50%) 0 0 / 10px 10px';
  }
}

/** Paints a backdrop into a 2D context of size w by h (nothing for transparent). */
export function paintBackground(ctx, w, h, kind, color) {
  ctx.clearRect(0, 0, w, h);
  if (kind === 'transparent' || !kind) return;
  const c = hexToRgb(color);
  const radial = (cx, cy, r, stops) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    for (const [at, col] of stops) g.addColorStop(at, col);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };
  const big = Math.hypot(w, h) * 0.62;
  if (kind === 'glow') {
    ctx.fillStyle = '#0b0a10';
    ctx.fillRect(0, 0, w, h);
    radial(w / 2, h * 0.45, big, [
      [0, rgba(mix(c, [12, 10, 16], 0.5))],
      [0.55, rgba(mix(c, [11, 10, 16], 0.86))],
      [1, '#0b0a10'],
    ]);
  } else if (kind === 'dark') {
    radial(w / 2, h * 0.4, big, [
      [0, '#1c1c25'],
      [1, '#07070a'],
    ]);
  } else if (kind === 'light') {
    radial(w / 2, h * 0.4, big, [
      [0, '#ffffff'],
      [1, '#e6e3db'],
    ]);
  } else if (kind === 'studio') {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#d6d8de');
    g.addColorStop(0.62, '#f7f7f8');
    g.addColorStop(1, '#c6c8cf');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else if (kind === 'midnight') {
    radial(w / 2, h * 0.3, big, [
      [0, '#25325f'],
      [1, '#090c1f'],
    ]);
  }
}

/** True when the backdrop is light (the stage hint switches to dark text). */
export function isLightBackground(kind) {
  return kind === 'light' || kind === 'studio';
}
