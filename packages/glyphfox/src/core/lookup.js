// Name lookup used by the framework packages for morphTo, Icon name and
// Fusion. Icon modules register themselves when they are used; names that
// are not registered yet are loaded on demand with a dynamic import, which
// bundlers split into one small chunk per icon.

const registry = new Map();
const pending = new Map();

/** Registers icon data objects (an array or a name keyed record). */
export function registerIcons(list) {
  const items = Array.isArray(list) ? list : Object.values(list || {});
  for (const icon of items) if (icon && icon.name && typeof icon.body === 'string') registry.set(icon.name, icon);
}

/** Registered icon data for a plain name, or null. */
export function lookupIcon(name) {
  return registry.get(name) || null;
}

let loader = (name) => import(`../icons/${name}.js`).then((m) => m.default);

/** Replaces the loader used for names that are not registered. */
export function setIconLoader(fn) {
  loader = fn;
}

/** Loads (and registers) an icon by name. Resolves to null when it does not exist. */
export function loadIcon(name) {
  const hit = registry.get(name);
  if (hit) return Promise.resolve(hit);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(name))) return Promise.resolve(null);
  let p = pending.get(name);
  if (!p) {
    p = Promise.resolve()
      .then(() => loader(name))
      .then((icon) => {
        if (icon) registry.set(name, icon);
        return icon || null;
      })
      .catch(() => null);
    pending.set(name, p);
  }
  return p;
}
