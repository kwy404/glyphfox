// glyphfox for Qwik: lightweight icon components with the shared props,
// Icon and Fusion. They render on the server and resume without shipping
// JavaScript: living states and morphTo run on CSS, `active` switches state
// triggers and the click trigger uses a tiny inline handler.

import { jsx } from '@qwik.dev/core';
import { fuse } from '../core/compose.js';
import { splitProps } from '../core/controller.js';
import { lookupIcon, registerIcons } from '../core/lookup.js';
import { strokeWidth } from '../core/render.js';
import { EMPTY_ICON, resolveStatic, staticNode, styleText } from '../core/static.js';

export { registerIcons };

function toJsx(node) {
  const [tag, attrs, children] = node;
  const props = {};
  for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== false) props[k] = attrs[k];
  if (tag === 'style') return jsx('style', { ...props, dangerouslySetInnerHTML: children || '' });
  if (typeof children === 'string') return jsx(tag, { ...props, children });
  return jsx(tag, { ...props, children: (children || []).map(toJsx) });
}

function glyph(icon, input = {}, gap) {
  const { glyph: g, rest } = splitProps(input);
  const { class: cls, className, style, children: _children, ...attrs } = rest;
  const labelled = attrs['aria-label'] !== undefined || attrs['aria-labelledby'] !== undefined;
  const text = [cls, className].filter((c) => typeof c === 'string' && c).join(' ') || undefined;
  const [tag, rootAttrs, kids] = staticNode(icon, { ...g, class: text }, { labelled, gap });
  const props = { ...rootAttrs, ...attrs };
  if (cls && typeof cls !== 'string') props.class = [rootAttrs.class, cls];
  if (style !== undefined && style !== null) props.style = typeof style === 'string' ? style : styleText(style);
  props.children = kids.map(toJsx);
  return jsx(tag, props);
}

/** Creates a lightweight component for icon data. */
export function createIcon(icon) {
  registerIcons([icon]);
  return (props) => glyph(icon, props);
}

/** Renders icon data (`icon`) or a spec of registered icons (`name`, such as "file+check@tr"). */
export function Icon(props) {
  const { icon, name, gap, ...rest } = props;
  const res = resolveStatic(icon || name, { weight: strokeWidth(rest), gap });
  return glyph(res ? res.icon : EMPTY_ICON, { ...rest, variant: rest.variant ?? (res && res.variant) }, gap);
}

/** Fuses 2 to 10 icons into one: <Fusion icons={['cloud', 'lock']} layout="overlap" />. */
export function Fusion(props) {
  const { icons = [], layout, gap, scale, offsets, ...rest } = props;
  const sw = strokeWidth(rest);
  const parts = icons.map((spec) => resolveStatic(spec, { weight: sw, gap, lookup: lookupIcon }));
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
  return glyph(fused, rest, gap);
}
