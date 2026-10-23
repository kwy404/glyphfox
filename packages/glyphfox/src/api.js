// Public API of the glyphfox core package.

import { icons } from './registry.js';
import { ANIMATION_NAMES, ANIMATIONS, TRIGGERS, animationLength, frameState } from './core/animate.js';
import { propsFromAttributes, ATTRIBUTES } from './core/attributes.js';
import { CORNERS, LAYOUTS, MODIFIER_NAMES, fuse as fuseIcons, withModifier } from './core/compose.js';
import { FORMATS, componentName, dataName, snippet, toDataUri } from './core/formats.js';
import { MORPH_PAIRS, createMorph } from './core/morph.js';
import { CORNER_STYLES, DEFAULTS, PROPS, VARIANTS, renderIcon, renderToString, sizeToPx, strokeWidth } from './core/render.js';
import { isComposite, parseSpec, resolveSpec } from './core/spec.js';
import { nodesToString, parseBody } from './core/nodes.js';
import { analyzeSolid } from './core/solid.js';
import { replaceGlyphs as replaceWith } from './core/runtime.js';

export { icons };
export const iconNames = Object.keys(icons);
export const categories = [...new Set(iconNames.flatMap((n) => icons[n].categories))].sort();

/** Icon data for a plain name, or null. */
export function getIcon(name) {
  return Object.prototype.hasOwnProperty.call(icons, name) ? icons[name] : null;
}

/**
 * Resolves any icon spec (name, name+modifier@corner, a&b:layout, /variant)
 * into an icon data object.
 */
export function resolve(spec, options = {}) {
  return resolveSpec(spec, getIcon, { weight: strokeWidth(options), gap: options.gap }).icon;
}

function prepare(spec, options) {
  const sw = strokeWidth(options);
  const { icon, variant } = resolveSpec(spec, getIcon, { weight: sw, gap: options.gap });
  let morphTo = options.morphTo;
  let morphVariant;
  if (typeof morphTo === 'string' && morphTo) {
    const r = resolveSpec(morphTo, getIcon, { weight: sw, gap: options.gap });
    morphTo = r.icon;
    morphVariant = r.variant;
  }
  return { icon, props: { ...options, variant: options.variant ?? variant, morphTo, morphVariant } };
}

/** Renders any icon spec to an SVG string with the shared props. */
export function toSvg(spec, options = {}) {
  const { icon, props } = prepare(spec, options);
  return renderToString(icon, props);
}

/** Renders any icon spec to a node tree ['svg', attrs, children]. */
export function toNode(spec, options = {}) {
  const { icon, props } = prepare(spec, options);
  return renderIcon(icon, props);
}

/** Fuses icons given by name or data. Options: layout, gap, weight, scale, offsets. */
export function fuse(list, options = {}) {
  const parts = list.map((x) => {
    if (x && typeof x === 'object') return x;
    const ic = resolve(x, options);
    return ic;
  });
  return fuseIcons(parts, { ...options, weight: options.weight === undefined ? 2 : strokeWidth(options) });
}

/** Ranks icons for a query by name, tag and category. */
export function search(query, { limit = 50, category } = {}) {
  const words = String(query || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const out = [];
  for (const name of iconNames) {
    const ic = icons[name];
    if (category && !ic.categories.includes(category)) continue;
    let score = 0;
    let ok = true;
    for (const w of words) {
      let s = 0;
      if (name === w) s = 100;
      else if (name.startsWith(w)) s = 60;
      else if (name.includes(w)) s = 40;
      else if (ic.tags.some((t) => t === w)) s = 30;
      else if (ic.tags.some((t) => t.startsWith(w))) s = 20;
      else if (ic.categories.some((c) => c.startsWith(w))) s = 10;
      else if (ic.tags.some((t) => t.includes(w))) s = 5;
      if (!s) {
        ok = false;
        break;
      }
      score += s;
    }
    if (ok) out.push({ name, score });
  }
  out.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return out.slice(0, limit).map((r) => icons[r.name]);
}

/** Replaces <i data-glyph="name"> elements (or any element with data-glyph) with SVG. */
export function replaceGlyphs(root, options) {
  return replaceWith(root, (spec, props) => toSvg(spec, props), options);
}

export {
  ANIMATIONS,
  ANIMATION_NAMES,
  ATTRIBUTES,
  CORNERS,
  CORNER_STYLES,
  DEFAULTS,
  FORMATS,
  LAYOUTS,
  MODIFIER_NAMES,
  MORPH_PAIRS,
  PROPS,
  TRIGGERS,
  VARIANTS,
  analyzeSolid,
  animationLength,
  componentName,
  createMorph,
  dataName,
  frameState,
  isComposite,
  nodesToString,
  parseBody,
  parseSpec,
  propsFromAttributes,
  renderIcon,
  renderToString,
  sizeToPx,
  snippet,
  strokeWidth,
  toDataUri,
  withModifier,
};
