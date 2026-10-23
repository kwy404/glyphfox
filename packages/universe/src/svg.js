// SVG output of universe icons with the glyphfox style transforms on top:
// size, color, secondary color for duotone layers, weight and corners for
// stroke based icons, any rotation, flips, animations (spin, pulse, draw)
// that respect prefers-reduced-motion, and an accessible title.

const round = (n) => Math.round(n * 1000) / 1000;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function sizePx(size) {
  if (typeof size === 'number') return size;
  const m = /^(\d+(?:\.\d+)?)(px)?$/.exec(String(size || '').trim());
  return m ? Number(m[1]) : null;
}

/** True when the body draws with currentColor strokes (weight and draw apply). */
export const isStroke = (body) => /stroke="currentColor"/.test(body || '');

/** The most used stroke width of a body (1 when it sets none, the SVG default). */
export function baseStrokeWidth(body) {
  const count = new Map();
  for (const m of String(body).matchAll(/stroke-width="([\d.]+)"/g)) count.set(m[1], (count.get(m[1]) || 0) + 1);
  let best = null;
  let top = 0;
  for (const [w, n] of count) {
    if (n > top) {
      top = n;
      best = Number(w);
    }
  }
  return best || 1;
}

/**
 * Sets the stroke weight on the glyphfox scale: `weight` is the stroke width
 * on a 24 unit grid (glyphfox icons use 2), scaled to the icon box, with the
 * same optical compensation as glyphfox below 24 px. Relative widths inside
 * the icon are kept.
 */
export function applyWeight(body, { weight, size, boxHeight = 24, absoluteWeight = false }) {
  let w = Math.min(4, Math.max(0.25, Number(weight)));
  if (!Number.isFinite(w)) return body;
  const px = sizePx(size);
  if (absoluteWeight && px) w = (w * 24) / px;
  else if (px && px < 24) w *= Math.min(1.3, Math.pow(24 / px, 0.3));
  const target = (w * boxHeight) / 24;
  const base = baseStrokeWidth(body);
  const k = target / base;
  if (!/stroke-width="/.test(body)) return `<g stroke-width="${round(target)}">${body}</g>`;
  return body.replace(/stroke-width="([\d.]+)"/g, (m, v) => `stroke-width="${round(Number(v) * k)}"`);
}

/** Round or sharp caps and joins for stroke based icons. */
export function applyCorners(body, corners) {
  const sharp = corners === 'sharp';
  const cap = sharp ? 'square' : 'round';
  const join = sharp ? 'miter' : 'round';
  let out = body.replace(/stroke-linecap="[^"]*"/g, `stroke-linecap="${cap}"`).replace(/stroke-linejoin="[^"]*"/g, `stroke-linejoin="${join}"`);
  if (!/stroke-linecap="/.test(out) || !/stroke-linejoin="/.test(out)) out = `<g stroke-linecap="${cap}" stroke-linejoin="${join}">${out}</g>`;
  return out;
}

/** Paints the translucent layers (the duotone part) with a second color. */
export function applySecondary(body, color, opacity) {
  return body.replace(/<([a-zA-Z]+)\b([^>]*?\s(?:fill-)?opacity="[^"]*"[^>]*)>/g, (m, tag, attrs) => {
    let a = attrs.replace(/currentColor/g, esc(color));
    if (!/\s(?:fill|stroke)="/.test(a)) a += ` fill="${esc(color)}"`;
    if (opacity !== undefined && opacity !== null) a = a.replace(/(\s(?:fill-)?opacity=")[^"]*"/g, `$1${round(Number(opacity))}"`);
    return `<${tag}${a}>`;
  });
}

const ANIMATIONS = {
  spin: '.gfu-spin{animation:gfu-spin 1s linear infinite;transform-box:fill-box;transform-origin:center}@keyframes gfu-spin{to{transform:rotate(360deg)}}',
  pulse: '.gfu-pulse{animation:gfu-pulse 1.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes gfu-pulse{50%{opacity:.45;transform:scale(.92)}}',
  draw: '.gfu-draw [pathLength]{stroke-dasharray:1;stroke-dashoffset:1;animation:gfu-draw 1.1s cubic-bezier(.2,.8,.2,1) forwards}@keyframes gfu-draw{to{stroke-dashoffset:0}}',
};

function withAnimation(body, animate, stroke) {
  if (!ANIMATIONS[animate]) return { body, style: '' };
  if (animate === 'draw') {
    if (!stroke) return { body, style: '' };
    body = body.replace(/<(path|line|polyline|polygon|circle|ellipse|rect)\b(?![^>]*pathLength)/g, '<$1 pathLength="1"');
  }
  return {
    body: `<g class="gfu-${animate}">${body}</g>`,
    style: `<style>@media (prefers-reduced-motion:no-preference){${ANIMATIONS[animate]}}</style>`,
  };
}

/**
 * SVG markup of an icon object (from getIcon). Options: size, color,
 * secondaryColor, secondaryOpacity, weight, absoluteWeight, corners
 * ("round" or "sharp"), rotate (degrees), flipX, flipY, animate ("spin",
 * "pulse", "draw"), title, class, attrs (extra root attributes).
 */
export function iconToSvg(icon, options = {}) {
  if (!icon) return '';
  const { left = 0, top = 0, width = 16, height = 16 } = icon;
  let body = icon.body || '';
  const stroke = icon.stroke ?? isStroke(body);
  if (stroke && options.weight !== undefined && options.weight !== null && options.weight !== '') {
    body = applyWeight(body, { weight: options.weight, size: options.size, boxHeight: height, absoluteWeight: options.absoluteWeight });
  }
  if (stroke && (options.corners === 'sharp' || options.corners === 'round')) body = applyCorners(body, options.corners);
  if (options.secondaryColor) body = applySecondary(body, options.secondaryColor, options.secondaryOpacity);
  const rotate = Number(options.rotate) || 0;
  const flipX = Boolean(options.flipX);
  const flipY = Boolean(options.flipY);
  if (rotate % 360 || flipX || flipY) {
    const cx = round(left + width / 2);
    const cy = round(top + height / 2);
    const t = [];
    if (rotate % 360) t.push(`rotate(${round(rotate)} ${cx} ${cy})`);
    if (flipX || flipY) t.push(`translate(${cx} ${cy}) scale(${flipX ? -1 : 1} ${flipY ? -1 : 1}) translate(${-cx} ${-cy})`);
    body = `<g transform="${t.join(' ')}">${body}</g>`;
  }
  const anim = withAnimation(body, options.animate, stroke);
  body = anim.body;
  const size = options.size ?? 24;
  const px = sizePx(size);
  const h = px ?? size;
  const w = px ? round((px * width) / height) : size;
  const attrs = [`xmlns="http://www.w3.org/2000/svg"`, `width="${esc(w)}"`, `height="${esc(h)}"`, `viewBox="${round(left)} ${round(top)} ${round(width)} ${round(height)}"`];
  if (options.color) attrs.push(`color="${esc(options.color)}"`);
  const cls = ['gfu', icon.prefix ? `gfu-${icon.prefix}` : '', options.class || ''].filter(Boolean).join(' ');
  attrs.push(`class="${esc(cls)}"`);
  if (options.title) attrs.push('role="img"', `aria-label="${esc(options.title)}"`);
  else attrs.push('aria-hidden="true"');
  for (const [k, v] of Object.entries(options.attrs || {})) if (/^[a-zA-Z_:][\w:.-]*$/.test(k)) attrs.push(`${k}="${esc(v)}"`);
  const title = options.title ? `<title>${esc(options.title)}</title>` : '';
  return `<svg ${attrs.join(' ')}>${title}${anim.style}${body}</svg>`;
}

/** A data URI of the SVG markup (for CSS backgrounds and img tags). */
export function svgToDataUri(svg) {
  return `data:image/svg+xml,${encodeURIComponent(svg).replace(/%20/g, ' ').replace(/%3D/g, '=').replace(/%3A/g, ':').replace(/%2F/g, '/')}`;
}
