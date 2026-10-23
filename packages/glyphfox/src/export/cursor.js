// CSS cursors from any icon: PNG at 32 and 64 px (1x and 2x) with a halo so
// the cursor reads on light and dark pages, a hotspot in CSS pixels, and the
// cursor CSS with url() and image-set() declarations that fall back cleanly.

import { dataUri, toPng } from './raster.js';

export const HOTSPOTS = ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];

const PRESETS = {
  center: [12, 12],
  'top-left': [2, 2],
  'top-right': [22, 2],
  'bottom-left': [2, 22],
  'bottom-right': [22, 22],
  tl: [2, 2],
  tr: [22, 2],
  bl: [2, 22],
  br: [22, 22],
};

/**
 * Hotspot in whole pixels of a cursor image of `size` px. Takes a preset
 * (center, top-left, top-right, bottom-left, bottom-right, or tl, tr, bl,
 * br), an [x, y] pair or an "x,y" string in grid units (0 to 24).
 */
export function resolveHotspot(hotspot = 'center', size = 32) {
  let xy = null;
  if (Array.isArray(hotspot)) xy = hotspot.map(Number);
  else if (hotspot && typeof hotspot === 'object' && 'x' in hotspot) xy = [Number(hotspot.x), Number(hotspot.y)];
  else if (typeof hotspot === 'string') {
    const key = hotspot.trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(PRESETS, key)) xy = PRESETS[key];
    else {
      const m = /^(-?\d*\.?\d+)\s*[,\s]\s*(-?\d*\.?\d+)$/.exec(key);
      if (m) xy = [Number(m[1]), Number(m[2])];
    }
  }
  if (!xy || xy.length !== 2 || !xy.every(Number.isFinite)) {
    throw new RangeError(`unknown hotspot "${hotspot}" (use ${HOTSPOTS.join(', ')}, tl, tr, bl, br or x,y on the 24 grid)`);
  }
  const px = Math.max(1, Math.round(Number(size) || 32));
  const at = (v) => Math.min(px - 1, Math.max(0, Math.round((v / 24) * px)));
  return [at(xy[0]), at(xy[1])];
}

function fileName(name) {
  return (
    String(name || 'cursor')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'cursor'
  );
}

/**
 * Builds a cursor from an icon: { files, css, hotspot }. files holds
 * NAME-32.png, NAME-64.png and NAME.css; css is the same rule as text and
 * hotspot the [x, y] point in 32 px CSS space (used by both images). With
 * inline: true the CSS embeds the PNG files as data URIs.
 */
export function cursorKit(icon, options = {}) {
  if (!icon || typeof icon.body !== 'string') throw new TypeError('cursorKit expects an icon data object');
  const {
    name = icon.name,
    hotspot = 'center',
    color = '#111111',
    outline = '#ffffff',
    outlineWidth = 1.5,
    weight = 2,
    variant = 'outline',
    fallback = 'auto',
    inline = false,
    deflate,
  } = options;
  const id = fileName(name);
  const [x, y] = resolveHotspot(hotspot, 32);
  const halo = Math.max(0, Number(outlineWidth) || 0);
  const base = { color, outline: outline || null, weight, variant, deflate };
  const png32 = toPng(icon, { ...base, size: 32, outlineWidth: halo });
  const png64 = toPng(icon, { ...base, size: 64, outlineWidth: halo * 2 });
  const f32 = `${id}-32.png`;
  const f64 = `${id}-64.png`;
  const u32 = inline ? dataUri(png32) : f32;
  const u64 = inline ? dataUri(png64) : f64;
  const fb = /^[a-z-]+$/.test(String(fallback)) ? String(fallback) : 'auto';
  const set = `url("${u32}") 1x, url("${u64}") 2x`;
  const css = [
    `/* glyphfox cursor: ${id}, hotspot ${x} ${y} in CSS pixels */`,
    `.gf-cursor-${id} {`,
    `  cursor: url("${u32}") ${x} ${y}, ${fb};`,
    `  cursor: -webkit-image-set(${set}) ${x} ${y}, ${fb};`,
    `  cursor: image-set(${set}) ${x} ${y}, ${fb};`,
    '}',
    '',
  ].join('\n');
  return { files: { [f32]: png32, [f64]: png64, [`${id}.css`]: css }, css, hotspot: [x, y] };
}
