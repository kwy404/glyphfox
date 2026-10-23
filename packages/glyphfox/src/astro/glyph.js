// Shared logic of the Astro components: icons render to static SVG on the
// server, so every icon of the set is available to `name`, `morphTo` and
// Fusion without shipping JavaScript to the browser.

import { icons } from '../registry.js';
import { fuse } from '../core/compose.js';
import { lookupIcon } from '../core/lookup.js';
import { strokeWidth } from '../core/render.js';
import { EMPTY_ICON, resolveStatic, staticSvg } from '../core/static.js';

const lookup = (name) => (Object.prototype.hasOwnProperty.call(icons, name) ? icons[name] : lookupIcon(name));

/** SVG markup for icon data and Astro props (shared props, class, style and attributes). */
export function renderIcon(icon, props = {}) {
  return staticSvg(icon, props, { lookup });
}

/** SVG markup for `icon` (data) or `name` (any spec, such as "file+check@tr"). */
export function renderSpec({ icon, name, gap, ...props } = {}) {
  const res = resolveStatic(icon || name, { weight: strokeWidth(props), gap, lookup });
  return staticSvg(res ? res.icon : EMPTY_ICON, { ...props, variant: props.variant ?? (res && res.variant) }, { lookup, gap });
}

/** SVG markup for a fusion of 2 to 10 icons. */
export function renderFusion({ icons: list = [], layout, gap, scale, offsets, ...props } = {}) {
  const sw = strokeWidth(props);
  const parts = list.map((spec) => resolveStatic(spec, { weight: sw, gap, lookup }));
  let fused = EMPTY_ICON;
  if (parts.length >= 2 && parts.every(Boolean)) {
    try {
      fused = fuse(
        parts.map((p) => p.icon),
        { layout, gap: gap === undefined ? undefined : Number(gap), scale, offsets, weight: sw },
      );
    } catch (err) {
      if (typeof console !== 'undefined') console.warn(`glyphfox: ${err.message}`);
    }
  }
  return staticSvg(fused, props, { lookup, gap });
}
