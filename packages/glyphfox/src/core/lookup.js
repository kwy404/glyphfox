// Name lookup used by the framework packages for morphTo, Icon name and
// Fusion. Icon modules register themselves when they are used; names that
// are not registered yet are loaded on demand with a dynamic import, which
// bundlers split into one small chunk per icon.
//
// Names with a prefix ("mdi:home", "ph:rocket") come from icon sources that
// other packages register with registerIconSource(), for example the
// glyphfox universe sets.

import { normalizeIcon } from './external.js';

// Shared through globalThis so the ESM and CommonJS builds (and the
// framework entry points bundled from them) see the same icons and sources.
const shared = (globalThis[Symbol.for('glyphfox.lookup')] ||= { registry: new Map(), pending: new Map(), sources: new Map() });
const { registry, pending, sources } = shared;

const PREFIX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The collections shipped with the package and their grids. Their icons are named "id/name". */
export const COLLECTIONS = Object.freeze({ display: 48, isometric: 24 });
const COLLECTION_NAME = /^(display|isometric)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const NAME = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

/** Registers icon data objects (an array or a name keyed record). */
export function registerIcons(list) {
  const items = Array.isArray(list) ? list : Object.values(list || {});
  for (const icon of items) if (icon && icon.name && typeof icon.body === 'string') registry.set(icon.name, icon);
}

function splitName(name) {
  const i = name.indexOf(':');
  return i > 0 ? [name.slice(0, i), name.slice(i + 1)] : null;
}

/**
 * Registers an icon source for a prefix. Names written "prefix:name" are
 * then resolved by the source: `get(name)` returns icon data synchronously
 * (or null), `load(name)` returns a promise of it. A function is taken as
 * `load`. The data may carry a `viewBox` and `mode: "fill"` for filled sets;
 * it is normalized onto the 24 grid. Pass null to remove a source.
 */
export function registerIconSource(prefix, source) {
  const p = String(prefix ?? '')
    .trim()
    .toLowerCase();
  if (!PREFIX.test(p)) throw new TypeError(`invalid icon source prefix "${prefix}"`);
  if (source === null || source === undefined) {
    sources.delete(p);
    return;
  }
  const src = typeof source === 'function' ? { load: source } : source;
  if (typeof src.get !== 'function' && typeof src.load !== 'function') throw new TypeError('an icon source needs a get(name) or a load(name) function');
  sources.set(p, src);
}

/** True when a source is registered for the prefix. */
export function hasIconSource(prefix) {
  return sources.has(
    String(prefix ?? '')
      .trim()
      .toLowerCase(),
  );
}

function fromSource(full, icon) {
  const data = normalizeIcon(icon, full);
  if (data) registry.set(full, data);
  return data;
}

/** Registered icon data for a name, or null. Prefixed names also ask their source's get(). */
export function lookupIcon(name) {
  const key = String(name ?? '');
  const hit = registry.get(key);
  if (hit) return hit;
  const parts = splitName(key);
  if (!parts) return null;
  const src = sources.get(parts[0]);
  if (!src || typeof src.get !== 'function' || !NAME.test(parts[1])) return null;
  const icon = src.get(parts[1]);
  return icon ? fromSource(key, icon) : null;
}

// One import pattern per folder, so bundlers split each icon into its own
// chunk. Kept on one line: the studio build swaps this line for a stub.
let loader = (name, c = COLLECTION_NAME.exec(name)) => (!c ? import(`../icons/${name}.js`) : c[1] === 'display' ? import(`../icons/display/${c[2]}.js`) : import(`../icons/isometric/${c[2]}.js`)).then((m) => m.default);

/** Replaces the loader used for names that are not registered. */
export function setIconLoader(fn) {
  loader = fn;
}

/** Loads (and registers) an icon by name. Resolves to null when it does not exist. */
export function loadIcon(name) {
  const key = String(name ?? '');
  const hit = lookupIcon(key);
  if (hit) return Promise.resolve(hit);
  const parts = splitName(key);
  if (parts) {
    const src = sources.get(parts[0]);
    if (!src || !NAME.test(parts[1])) return Promise.resolve(null);
    let p = pending.get(key);
    if (!p) {
      p = Promise.resolve()
        .then(() => (typeof src.load === 'function' ? src.load(parts[1]) : src.get(parts[1])))
        .then((icon) => (icon ? fromSource(key, icon) : null))
        .catch(() => null)
        .finally(() => pending.delete(key));
      pending.set(key, p);
    }
    return p;
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key) && !COLLECTION_NAME.test(key)) return Promise.resolve(null);
  let p = pending.get(key);
  if (!p) {
    p = Promise.resolve()
      .then(() => loader(key))
      .then((icon) => {
        if (icon) registry.set(key, icon);
        return icon || null;
      })
      .catch(() => null);
    pending.set(key, p);
  }
  return p;
}
