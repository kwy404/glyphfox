// Name syntax shared by the CDN, the web component, Tailwind and the CLI:
//   name                      a single icon
//   name+modifier@corner      a modifier badge (corner: tl, tr, bl, br)
//   a&b&c:layout              a fusion of 2 to 10 icons
//   any of the above/variant  a style override (outline, duotone, solid)

import { fuse, normalizeCorner, withModifier } from './compose.js';

/** Splits a spec string into its parts. */
export function parseSpec(spec) {
  let s = String(spec ?? '').trim();
  let variant;
  let corner;
  let modifier;
  let layout;
  const slash = s.lastIndexOf('/');
  if (slash >= 0) {
    variant = s.slice(slash + 1).trim() || undefined;
    s = s.slice(0, slash);
  }
  const at = s.lastIndexOf('@');
  if (at >= 0) {
    corner = normalizeCorner(s.slice(at + 1).trim());
    s = s.slice(0, at);
  }
  const plus = s.indexOf('+');
  if (plus >= 0) {
    modifier = s.slice(plus + 1).trim() || undefined;
    s = s.slice(0, plus);
  }
  const colon = s.indexOf(':');
  if (colon >= 0) {
    layout = s.slice(colon + 1).trim() || undefined;
    s = s.slice(0, colon);
  }
  const names = s
    .split('&')
    .map((n) => n.trim())
    .filter(Boolean);
  return { names, layout, modifier, corner, variant };
}

/** True when the spec needs composition (a modifier or a fusion). */
export function isComposite(spec) {
  return typeof spec === 'string' && /[+&:@/]/.test(spec);
}

const cache = new Map();

/**
 * Resolves a spec (or an icon data object) into { icon, variant } using
 * `lookup(name)` for plain names. `weight` is the stroke width the result
 * will be drawn with, so knockout gaps stay even.
 */
export function resolveSpec(spec, lookup, { weight = 2, gap } = {}) {
  if (spec && typeof spec === 'object') return { icon: spec, variant: undefined };
  const key = `${spec}|${weight}|${gap}`;
  const hit = cache.get(key);
  if (hit && hit.lookup === lookup) return hit.value;
  const p = parseSpec(spec);
  if (!p.names.length) throw new Error(`empty icon name "${spec}"`);
  const icons = p.names.map((n) => {
    const ic = lookup(n);
    if (!ic) throw new Error(`unknown icon "${n}"`);
    return ic;
  });
  let icon = icons.length > 1 ? fuse(icons, { layout: p.layout, weight, gap }) : icons[0];
  if (p.modifier) icon = withModifier(icon, p.modifier, p.corner, { weight, gap });
  const value = { icon, variant: p.variant, parts: p };
  cache.set(key, { lookup, value });
  if (cache.size > 300) cache.delete(cache.keys().next().value);
  return value;
}
