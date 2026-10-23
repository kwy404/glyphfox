// Shared pieces of the native exports: icon specs resolved into plain
// geometry (fill and stroke layers as absolute path segments), number and
// color formats, and the names each platform accepts.

import { parseSpec, resolve, sizeToPx, strokeWidth, withModifier } from '../index.js';
import { bool } from '../core/render.js';
import { normalizeCorner } from '../core/compose.js';
import { shapeToSegments } from '../core/geometry.js';
import { attrNum, iconNodes, splitLayers } from '../core/nodes.js';
import { solidLayers } from '../core/solid.js';

export const SITE = 'https://kwy404.github.io/glyphfox/';

/** Styles a native vector can draw. Solid cuts lines out with masks, which VectorDrawable and ImageVector lack. */
export const NATIVE_STYLES = ['outline', 'duotone'];

/** A number for generated files: at most 3 decimals, with the leading zero. */
export const num = (v) => attrNum(v, 3);

const round3 = (v) => Math.round(v * 1000) / 1000;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** Size in dp, points or logical pixels. Defaults to 24. */
export function nativeSize(size) {
  if (size === undefined || size === null || size === '') return 24;
  const px = sizeToPx(size);
  if (!px) throw new RangeError(`size must be a positive number for native exports, got "${size}"`);
  return px;
}

/** File friendly name of a spec: file+check@tr becomes file-check-tr. */
export function baseName(spec) {
  const s = String(spec)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!s) throw new Error(`cannot make a name for the icon "${spec}"`);
  return s;
}

export function pascalCase(base) {
  return base
    .split('-')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('');
}

export function camelCase(base) {
  const p = pascalCase(base);
  return p[0].toLowerCase() + p.slice(1);
}

/** Throws when two icons end up with the same name on a platform (compared without case, like most file systems). */
export function assertUnique(items, key, what) {
  const seen = new Map();
  for (const it of items) {
    const k = key(it);
    const low = k.toLowerCase();
    if (seen.has(low)) throw new Error(`"${seen.get(low)}" and "${it.spec}" both export as the ${what} ${k}; export one of them on its own`);
    seen.set(low, it.spec);
  }
}

/** Parses #rgb, #rgba, #rrggbb or #rrggbbaa (the # is optional) into { r, g, b, a } with a from 0 to 1, or null. */
export function parseHex(value) {
  const m = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(String(value ?? '').trim());
  if (!m) return null;
  let h = m[1];
  if (h.length <= 4) h = [...h].map((c) => c + c).join('');
  const at = (i) => parseInt(h.slice(i, i + 2), 16);
  return { r: at(0), g: at(2), b: at(4), a: h.length === 8 ? round3(at(6) / 255) : 1 };
}

/** True when no color was given (or currentColor, the web default). */
export const noColor = (c) => c === undefined || c === null || c === '' || c === true || /^currentcolor$/i.test(String(c));

export const hex2 = (n) => Math.round(n).toString(16).padStart(2, '0').toUpperCase();

/** A hex color for SVG files: { color: '#rrggbb', opacity }. */
export function svgColor(value, platform, fallback = '#000000') {
  if (noColor(value)) return { color: fallback, opacity: 1 };
  const c = parseHex(value);
  if (!c) throw new RangeError(`${platform} takes a hex color such as #ff7a1a, got "${value}"`);
  return { color: `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`.toLowerCase(), opacity: c.a };
}

/**
 * Resolves a spec (name, name+modifier@corner, a&b:layout, /style) into the
 * layers every native format draws:
 * { spec, size, strokeWidth, cap, join, fills: [{ segs, opacity, evenOdd }],
 *   strokes: [segs], rotate, flipX, flipY, mirror }.
 */
export function iconGeometry(spec, options = {}) {
  const style = String(options.variant || parseSpec(spec).variant || 'outline');
  if (style === 'solid') throw new RangeError(`the solid style of "${spec}" cuts its inner lines out with masks, which native vectors cannot draw; use outline or duotone`);
  if (!NATIVE_STYLES.includes(style)) throw new RangeError(`unknown style "${style}" (use ${NATIVE_STYLES.join(' or ')})`);
  const size = nativeSize(options.size);
  const weight = { size, weight: options.weight, absoluteWeight: bool(options.absoluteWeight) };
  const sw = strokeWidth(weight);
  let icon = resolve(spec, { ...weight, gap: options.gap });
  if (options.modifier) icon = withModifier(icon, String(options.modifier), normalizeCorner(options.modifierCorner), { weight: sw });
  const { secondary, primary } = splitLayers(iconNodes(icon));
  const override = options.secondaryOpacity;
  const opacity = (fallback) => (override !== undefined && override !== null && override !== '' && Number.isFinite(Number(override)) ? clamp01(Number(override)) : fallback);
  const fills = [];
  if (style === 'duotone') {
    if (secondary) {
      const own = secondary[1].opacity !== undefined ? clamp01(Number(secondary[1].opacity)) : 0.3;
      fills.push({ segs: shapeToSegments(secondary), opacity: opacity(own), evenOdd: secondary[1]['fill-rule'] === 'evenodd' });
    } else {
      // No hand drawn layer: a translucent fill of the closed shapes, as on the web.
      const layers = solidLayers(icon);
      if (layers) for (const g of layers.groups) for (const n of g.fill) fills.push({ segs: shapeToSegments(n), opacity: opacity(0.3), evenOdd: false });
    }
  }
  const strokes = primary.map((n) => shapeToSegments(n)).filter((segs) => segs.length > 1);
  const sharp = options.corners === 'sharp';
  const rotate = (Number(options.rotate) || 0) % 360;
  return {
    spec,
    name: icon.name,
    size,
    strokeWidth: sw,
    cap: sharp ? 'square' : 'round',
    join: sharp ? 'miter' : 'round',
    fills: fills.filter((f) => f.segs.length > 1),
    strokes,
    rotate: round3(rotate),
    flipX: bool(options.flipX),
    flipY: bool(options.flipY),
    mirror: bool(options.mirrorRtl),
  };
}

/**
 * Walks absolute segments and reports each command with absolute numbers:
 * M, L, H, V, C, Q, A (flags as 0 or 1) and Z. Axis aligned lines become H or V.
 */
export function walkPath(segs, emit) {
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  for (const s of segs) {
    switch (s[0]) {
      case 'M':
        cx = sx = round3(s[1]);
        cy = sy = round3(s[2]);
        emit('M', [cx, cy]);
        break;
      case 'L': {
        const x = round3(s[1]);
        const y = round3(s[2]);
        if (y === cy && x !== cx) emit('H', [x]);
        else if (x === cx && y !== cy) emit('V', [y]);
        else emit('L', [x, y]);
        cx = x;
        cy = y;
        break;
      }
      case 'C':
        emit('C', s.slice(1, 7).map(round3));
        cx = round3(s[5]);
        cy = round3(s[6]);
        break;
      case 'Q':
        emit('Q', s.slice(1, 5).map(round3));
        cx = round3(s[3]);
        cy = round3(s[4]);
        break;
      case 'A':
        emit('A', [round3(s[1]), round3(s[2]), round3(s[3]), s[4] ? 1 : 0, s[5] ? 1 : 0, round3(s[6]), round3(s[7])]);
        cx = round3(s[6]);
        cy = round3(s[7]);
        break;
      case 'Z':
        emit('Z', []);
        cx = sx;
        cy = sy;
        break;
      default:
        break;
    }
  }
}

/** Path data with explicit absolute commands, read the same way by VectorDrawable and SVG. */
export function pathData(segs) {
  const out = [];
  walkPath(segs, (cmd, nums) => out.push(cmd + nums.map((v) => num(v)).join(',')));
  return out.join(' ');
}

/** SVG transform for rotate and flips, applied around the center of the grid (same as the web renderer). */
export function svgTransform(g) {
  const parts = [];
  if (g.rotate) parts.push(`rotate(${num(g.rotate)} 12 12)`);
  if (g.flipX && g.flipY) parts.push('matrix(-1 0 0 -1 24 24)');
  else if (g.flipX) parts.push('matrix(-1 0 0 1 24 0)');
  else if (g.flipY) parts.push('matrix(1 0 0 -1 0 24)');
  return parts.join(' ');
}

const escAttr = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Text that is safe inside an XML comment. */
export const commentText = (s) => String(s).replace(/-{2,}/g, '-').replace(/[<>]/g, '');

/**
 * A standalone SVG file with concrete colors (asset catalogs and flutter_svg
 * do not need currentColor: both tint the alpha of the drawing).
 */
export function svgDocument(g, { color, secondaryColor, platform }) {
  const main = svgColor(color, platform);
  const second = noColor(secondaryColor) ? main : svgColor(secondaryColor, platform);
  const s = num(g.size);
  const body = [];
  for (const f of g.fills) {
    const op = f.opacity * second.opacity;
    body.push(`<path d="${pathData(f.segs)}" fill="${second.color}"${op < 1 ? ` fill-opacity="${num(op)}"` : ''}${f.evenOdd ? ' fill-rule="evenodd"' : ''}/>`);
  }
  if (g.strokes.length) {
    const op = main.opacity < 1 ? ` stroke-opacity="${num(main.opacity)}"` : '';
    body.push(`<g fill="none" stroke="${main.color}"${op} stroke-width="${num(g.strokeWidth)}" stroke-linecap="${g.cap}" stroke-linejoin="${g.join}">`);
    for (const segs of g.strokes) body.push(`  <path d="${pathData(segs)}"/>`);
    body.push('</g>');
  }
  const tf = svgTransform(g);
  const inner = tf ? [`<g transform="${escAttr(tf)}">`, ...body.map((l) => '  ' + l), '</g>'] : body;
  return [`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24">`, `  <!-- glyphfox ${commentText(g.spec)}, MIT license, ${SITE} -->`, ...inner.map((l) => '  ' + l), '</svg>', ''].join('\n');
}
