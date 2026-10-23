// glyphfox for React Server Components: hook free Icon and Fusion that render
// static SVG on the server and ship no JavaScript. Every icon of the set is
// available by name. Living states, hover and state morphs run on CSS; the
// click trigger needs the client components from glyphfox/react.

import { createElement } from 'react';
import { icons } from '../registry.js';
import { fuse } from '../core/compose.js';
import { splitProps } from '../core/controller.js';
import { lookupIcon } from '../core/lookup.js';
import { strokeWidth } from '../core/render.js';
import { EMPTY_ICON, resolveStatic, staticNode } from '../core/static.js';

const lookup = (name) => (Object.prototype.hasOwnProperty.call(icons, name) ? icons[name] : lookupIcon(name));

const ATTR = {
  class: 'className',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'stroke-miterlimit': 'strokeMiterlimit',
  'stroke-opacity': 'strokeOpacity',
  'fill-opacity': 'fillOpacity',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
  'clip-path': 'clipPath',
};

function mapAttrs(attrs, key) {
  const out = key === undefined ? {} : { key };
  for (const k in attrs) {
    const v = attrs[k];
    if (v === undefined || v === null || v === false || k === 'onclick') continue;
    out[ATTR[k] || k] = v;
  }
  return out;
}

function toElement(node, key) {
  const [tag, attrs, children] = node;
  const props = mapAttrs(attrs, key);
  if (tag === 'style') {
    props.dangerouslySetInnerHTML = { __html: children || '' };
    return createElement('style', props);
  }
  if (typeof children === 'string') return createElement(tag, props, children);
  return createElement(tag, props, ...(children || []).map((c, i) => toElement(c, i)));
}

function render(icon, input, gap) {
  const { glyph, rest } = splitProps(input);
  const { className, style, children, ...svgRest } = rest;
  const labelled = svgRest['aria-label'] !== undefined || svgRest['aria-labelledby'] !== undefined;
  const [, attrs, kids] = staticNode(icon, { ...glyph, class: className }, { lookup, labelled, gap });
  const props = { ...mapAttrs(attrs), ...svgRest };
  if (style !== undefined) props.style = style;
  return createElement('svg', props, ...kids.map((c, i) => toElement(c, i)), children);
}

/** Server component for icon data (`icon`) or any spec (`name`, such as "file+check@tr"). */
export function Icon({ icon, name, gap, ...props }) {
  const res = resolveStatic(icon || name, { weight: strokeWidth(props), gap, lookup });
  return render(res ? res.icon : EMPTY_ICON, { ...props, variant: props.variant ?? (res && res.variant) }, gap);
}

/** Server component that fuses 2 to 10 icons: <Fusion icons={['cloud', 'lock']} layout="overlap" />. */
export function Fusion({ icons: list = [], layout, gap, scale, offsets, ...props }) {
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
  return render(fused, props, gap);
}
