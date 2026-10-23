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
import { hasIconSource, loadIcon, lookupIcon, registerIconSource } from './core/lookup.js';
import { normalizeIcon } from './core/external.js';
import { attachTriggers } from './core/player.js';
import { normalizeTimeline, sampleTimeline, timelineCss } from './core/timeline.js';
import { searchIcons } from './search/index.js';

export { icons };
export const iconNames = Object.keys(icons);
export const categories = [...new Set(iconNames.flatMap((n) => icons[n].categories))].sort();

/**
 * Icon data for a plain name, or null. Prefixed names ("mdi:home") come from
 * a registered icon source once they are loaded (see registerIconSource).
 */
export function getIcon(name) {
  if (Object.prototype.hasOwnProperty.call(icons, name)) return icons[name];
  return typeof name === 'string' && name.indexOf(':') > 0 ? lookupIcon(name) : null;
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

const iconList = iconNames.map((n) => icons[n]);

/**
 * Ranks icons for a query by name, tag and category, with synonyms in English,
 * Portuguese, Spanish, French and German, accent folding and simple plurals.
 */
export function search(query, options = {}) {
  return searchIcons(iconList, query, options);
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
  attachTriggers,
  componentName,
  createMorph,
  dataName,
  frameState,
  hasIconSource,
  isComposite,
  loadIcon,
  normalizeIcon,
  normalizeTimeline,
  nodesToString,
  parseBody,
  parseSpec,
  propsFromAttributes,
  registerIconSource,
  renderIcon,
  renderToString,
  sampleTimeline,
  searchIcons,
  sizeToPx,
  snippet,
  strokeWidth,
  timelineCss,
  toDataUri,
  withModifier,
};

// smart icons hook (src/smart): data icons, locale aware icons, StatusIcon and
// IconGroup. The bound functions resolve names from the full icon set.
import { createSmart } from './smart/index.js';
export * from './smart/index.js';
export const { smartIcon, smartNode, smartSvg, groupSvg } = createSmart(getIcon);
