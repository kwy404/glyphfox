// Connects glyphfox universe to the glyphfox packages: every universe prefix
// is registered as a glyphfox icon source, so <Icon name="mdi:home" />,
// <glyph-fox name="ph:rocket">, Fusion and modifiers resolve prefixed names.
//
//   import 'glyphfox-universe/glyphfox';
//
// Stroke based icons keep their strokes (the weight axis, the draw animation
// and Fusion work on them); filled icons are marked mode "fill".

import { registerIconSource } from 'glyphfox';
import { getIcon, getIconSync } from './index.js';
import { PREFIXES } from './prefixes.js';

export { PREFIXES };

/** The icon data glyphfox expects for an icon source. */
export function toGlyphfox(icon) {
  if (!icon) return null;
  const out = { body: icon.body, viewBox: icon.viewBox, set: icon.prefix };
  if (!icon.stroke) out.mode = 'fill';
  if (icon.license) {
    out.license = icon.license.spdx;
    out.author = icon.license.author;
  }
  return out;
}

/** An icon source for one prefix: get() from memory, load() on demand. */
export function universeSource(prefix) {
  return {
    get: (name) => toGlyphfox(getIconSync(`${prefix}:${name}`)),
    load: async (name) => toGlyphfox(await getIcon(`${prefix}:${name}`).catch(() => null)),
  };
}

/** Registers the given prefixes (all of them by default) with a registerIconSource function. */
export function registerUniverse(register = registerIconSource, prefixes = PREFIXES) {
  for (const prefix of prefixes) register(prefix, universeSource(prefix));
  return prefixes.length;
}

registerUniverse();
