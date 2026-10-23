// glyphfox for Ember: icon helpers with the shared props as named
// arguments. They are plain function helpers (Ember 4.5 and newer), so they
// work in .gjs and .gts templates and in classic templates without any
// addon setup, and return trusted markup:
//
//   {{FileIcon size=20 weight=1.5 class="toolbar-icon"}}
//   {{Glyph "file+check@tr" variant="duotone"}}
//   {{Fusion "cloud" "lock" layout="overlap"}}

import { fuse } from '../core/compose.js';
import { registerIcons } from '../core/lookup.js';
import { strokeWidth } from '../core/render.js';
import { EMPTY_ICON, resolveStatic, staticSvg } from '../core/static.js';

export { registerIcons };

/** Trusted markup: Glimmer renders any object with toHTML() without escaping, like htmlSafe. */
export class GlyphMarkup {
  constructor(html) {
    this.html = html;
  }

  toHTML() {
    return this.html;
  }

  toString() {
    return this.html;
  }
}

const isData = (v) => v && typeof v === 'object' && typeof v.body === 'string';

/** Splits helper arguments into positional values and the named arguments object. */
function args(list) {
  const items = [...list];
  const last = items[items.length - 1];
  const named = last && typeof last === 'object' && !Array.isArray(last) && !isData(last) ? items.pop() : {};
  return { positional: items, named };
}

/** Creates the helper for icon data: {{FileIcon size=20}}. */
export function createIcon(icon) {
  registerIcons([icon]);
  return function glyphIcon(...list) {
    const { named } = args(list);
    return new GlyphMarkup(staticSvg(icon, named));
  };
}

/** Any spec or icon data: {{Glyph "file+check@tr"}} or {{Glyph this.iconData size=32}}. */
export function Glyph(...list) {
  const { positional, named } = args(list);
  const { name, icon, gap, ...props } = named;
  const spec = positional[0] ?? icon ?? name;
  const res = resolveStatic(spec, { weight: strokeWidth(props), gap });
  return new GlyphMarkup(staticSvg(res ? res.icon : EMPTY_ICON, { ...props, variant: props.variant ?? (res && res.variant) }, { gap }));
}

/** Fuses 2 to 10 icons: {{Fusion "cloud" "lock" layout="overlap"}} or icons=(array "cloud" "lock"). */
export function Fusion(...list) {
  const { positional, named } = args(list);
  const { icons, layout, gap, scale, offsets, ...props } = named;
  const specs = positional.length ? positional : icons || [];
  const sw = strokeWidth(props);
  const parts = specs.map((spec) => resolveStatic(spec, { weight: sw, gap }));
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
  return new GlyphMarkup(staticSvg(fused, props, { gap }));
}
