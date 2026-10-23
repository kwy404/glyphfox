// Maps kebab-case HTML attributes (web component, data-glyph runtime) to props.

import { bool } from './render.js';

/** Attribute names, in the same order as the props. */
export const ATTRIBUTES = {
  size: 'size',
  color: 'color',
  secondaryColor: 'secondary-color',
  secondaryOpacity: 'secondary-opacity',
  weight: 'weight',
  absoluteWeight: 'absolute-weight',
  corners: 'corners',
  variant: 'variant',
  rotate: 'rotate',
  flipX: 'flip-x',
  flipY: 'flip-y',
  mirrorRtl: 'mirror-rtl',
  animate: 'animate',
  trigger: 'trigger',
  active: 'active',
  duration: 'duration',
  delay: 'delay',
  loop: 'loop',
  modifier: 'modifier',
  modifierCorner: 'modifier-corner',
  morphTo: 'morph-to',
  title: 'title',
  decorative: 'decorative',
  animation: 'animation',
  triggerParent: 'trigger-parent',
  disabled: 'disabled',
};

const NUMBERS = new Set(['secondaryOpacity', 'weight', 'rotate', 'duration', 'delay']);
const BOOLEANS = new Set(['absoluteWeight', 'flipX', 'flipY', 'mirrorRtl', 'active', 'decorative', 'triggerParent', 'disabled']);

/** Reads props from an attribute getter (returns null for missing attributes). */
export function propsFromAttributes(get, prefix = '') {
  const props = {};
  for (const [prop, attr] of Object.entries(ATTRIBUTES)) {
    const v = get(prefix + attr);
    if (v === null || v === undefined) continue;
    if (prop === 'size') {
      props.size = /^\d*\.?\d+$/.test(v.trim()) ? Number(v) : v;
    } else if (NUMBERS.has(prop)) {
      const n = Number(v);
      if (v !== '' && Number.isFinite(n)) props[prop] = n;
    } else if (BOOLEANS.has(prop)) {
      props[prop] = bool(v);
    } else if (prop === 'animation') {
      // An empty attribute selects the icon's own animation; JSON is a timeline.
      props.animation = v === '' ? true : v === 'false' ? false : v;
    } else if (prop === 'loop') {
      const n = Number(v);
      props.loop = v !== '' && Number.isFinite(n) && n >= 1 ? n : bool(v);
    } else {
      props[prop] = v;
    }
  }
  return props;
}
