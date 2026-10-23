// Shared logic for the Svelte components (plain JS, so it works in any
// Svelte 5 setup without compiling runes inside dependencies).

import { fuse } from '../core/compose.js';
import { morphFrame, morphGoal, tween } from '../core/controller.js';
import { loadIcon, lookupIcon, registerIcons } from '../core/lookup.js';
import { nodesToString } from '../core/nodes.js';
import { bool, renderIcon, strokeWidth } from '../core/render.js';
import { parseSpec, resolveSpec } from '../core/spec.js';

export { bool, fuse, morphFrame, morphGoal, registerIcons, strokeWidth, tween };

export const EMPTY = { name: 'empty', body: '', tags: [], categories: [] };

function namesOf(spec) {
  try {
    return parseSpec(spec).names;
  } catch {
    return [];
  }
}

/** Resolves a spec now; returns { value, missing } where missing lists names to load. */
export function resolveNow(spec, weight, gap) {
  if (!spec) return { value: null, missing: [] };
  if (typeof spec === 'object') return { value: { icon: spec }, missing: [] };
  const missing = namesOf(spec).filter((n) => !lookupIcon(n));
  if (missing.length) return { value: null, missing };
  try {
    return { value: resolveSpec(spec, lookupIcon, { weight, gap }), missing: [] };
  } catch (err) {
    if (typeof console !== 'undefined') console.warn(`glyphfox: ${err.message}`);
    return { value: null, missing: [] };
  }
}

export function loadAll(names) {
  return Promise.all(names.map(loadIcon));
}

/** Root attributes and inner markup for icon data and props. */
export function view(icon, props) {
  const [, attrs, kids] = renderIcon(icon, props);
  return { attrs, inner: nodesToString(kids) };
}

/**
 * A Svelte store that morphs whenever set(spec) is called:
 *   const icon = morphStore('menu'); icon.set('x'); then read $icon.icon
 */
export function morphStore(initial, options = {}) {
  const subs = new Set();
  let from = null;
  let to = null;
  let p = 1;
  let cancel = () => {};
  let value = null;
  const emit = () => {
    value = to ? morphFrame(from ? from.icon : to.icon, to.icon, p, { variant: from && from.variant, targetVariant: to.variant }) : null;
    for (const fn of subs) fn(value);
  };
  const set = (spec) => {
    const { value: r, missing } = resolveNow(spec, strokeWidth(options), options.gap);
    if (!r) {
      if (missing.length) loadAll(missing).then(() => set(spec));
      return;
    }
    if (to && to.icon === r.icon && to.variant === r.variant) return;
    cancel();
    from = to || r;
    to = r;
    p = from === r ? 1 : 0;
    emit();
    cancel = tween(p, 1, { duration: options.duration ?? 450, delay: options.delay ?? 0 }, (v) => {
      p = v;
      emit();
    });
  };
  if (initial) set(initial);
  return {
    set,
    subscribe(fn) {
      subs.add(fn);
      fn(value);
      return () => {
        subs.delete(fn);
        if (!subs.size) cancel();
      };
    },
  };
}
