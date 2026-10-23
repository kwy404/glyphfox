// Static rendering for the server first packages (Astro, Qwik, Ember):
// every shared prop maps to markup without a client runtime. morphTo becomes
// the CSS only morph, `active` switches it on, and the click trigger gets a
// tiny inline handler that replays animations and toggles morphs.

import { splitProps } from './controller.js';
import { lookupIcon } from './lookup.js';
import { nodesToString } from './nodes.js';
import { bool, renderIcon, strokeWidth } from './render.js';
import { parseSpec, resolveSpec } from './spec.js';

export const EMPTY_ICON = Object.freeze({ name: 'empty', body: '', tags: [], categories: [] });

/** Inline click handler used when trigger is "click" (replays animations, toggles morphs). */
export const CLICK_HANDLER = "var r=this.getAttribute('data-gf-run');this.setAttribute('data-gf-run',r==='1'?'2':'1');this.classList.toggle('gf-on')";

const kebab = (k) => k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());

/** CSS text for a style value: a string stays as is, an object becomes declarations. */
export function styleText(style) {
  if (style === undefined || style === null || style === false) return undefined;
  if (typeof style === 'string') return style || undefined;
  if (typeof style !== 'object') return String(style);
  const out = [];
  for (const k in style) {
    const v = style[k];
    if (v === undefined || v === null || v === false || v === '') continue;
    out.push(`${k.startsWith('--') ? k : kebab(k)}:${v}`);
  }
  return out.length ? out.join(';') : undefined;
}

/**
 * Resolves a spec (name, file+check@tr, cloud&lock:side, heart/solid) or icon
 * data into { icon, variant } with `lookup` for plain names. Returns null
 * when a name is unknown or the spec is invalid.
 */
export function resolveStatic(spec, { weight = 2, gap, lookup = lookupIcon } = {}) {
  if (!spec) return null;
  if (typeof spec === 'object') return spec.body === undefined ? null : { icon: spec, variant: undefined };
  let names;
  try {
    names = parseSpec(spec).names;
  } catch {
    return null;
  }
  if (!names.length || names.some((n) => !lookup(n))) {
    if (typeof console !== 'undefined') console.warn(`glyphfox: unknown icon in "${spec}" (import its component or call registerIcons first)`);
    return null;
  }
  try {
    return resolveSpec(spec, lookup, { weight, gap });
  } catch (err) {
    if (typeof console !== 'undefined') console.warn(`glyphfox: ${err.message}`);
    return null;
  }
}

/**
 * Renders icon data with the shared props into a node tree
 * ['svg', attrs, children]. `props` holds the shared props plus `class`
 * and `style`. Options: `lookup` for names in morphTo, `labelled` when the
 * caller sets aria-label itself, `gap` for modifiers.
 */
export function staticNode(icon, props = {}, { lookup = lookupIcon, labelled = false, gap } = {}) {
  const o = { ...props };
  const sw = strokeWidth(o);
  const trigger = o.trigger || 'mount';
  let morph = false;
  if (o.morphTo) {
    const target = resolveStatic(o.morphTo, { weight: sw, gap, lookup });
    if (target) {
      o.morphTo = target.icon;
      if (target.variant) o.morphVariant = target.variant;
      morph = true;
    } else o.morphTo = undefined;
  }
  if (o.decorative === undefined || o.decorative === null) o.decorative = o.title ? false : !labelled;
  else o.decorative = bool(o.decorative);
  o.style = styleText(o.style);
  const node = renderIcon(icon || EMPTY_ICON, o);
  const attrs = node[1];
  if (morph && trigger === 'state' && bool(o.active)) attrs.class += ' gf-on';
  if (trigger === 'click' && (o.animate || morph)) attrs.onclick = CLICK_HANDLER;
  return node;
}

const SKIP = new Set(['children', 'ref', 'key', 'icon', 'name', 'gap', 'class', 'className', 'style']);

/**
 * Renders icon data with any mix of shared props and extra attributes (id,
 * data-*, aria-*...) into an SVG string. Functions and false values are
 * dropped; class (or className) and style are merged into the <svg>.
 */
export function staticSvg(icon, input = {}, { lookup = lookupIcon, gap } = {}) {
  const { glyph, rest } = splitProps(input);
  const extra = {};
  for (const k in rest) {
    const v = rest[k];
    if (SKIP.has(k) || v === undefined || v === null || v === false || typeof v === 'function' || typeof v === 'object') continue;
    extra[k] = v === true ? '' : String(v);
  }
  const cls = [input.class, input.className].filter(Boolean).join(' ') || undefined;
  const labelled = extra['aria-label'] !== undefined || extra['aria-labelledby'] !== undefined;
  const node = staticNode(icon, { ...glyph, class: cls, style: input.style }, { lookup, labelled, gap: gap ?? input.gap });
  Object.assign(node[1], extra);
  return nodesToString(node);
}
