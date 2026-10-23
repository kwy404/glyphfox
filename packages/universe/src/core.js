// glyphfox universe runtime: one API over every shipped set. Names are
// "prefix:name". The catalog (sets, licenses, CDN versions) and the search
// index are loaded lazily; icon sets are loaded on demand, one JSON file per
// set, from the @iconify-json/<prefix> packages on jsDelivr or from a local
// install (Node), and kept in a small cache.

import { iconData, bakeTransforms } from './iconify.js';
import { iconToSvg, isStroke } from './svg.js';
import { licenseOf, attributionLine } from './license.js';
import { UniverseIndex } from './search.js';
import { VERSION } from './version.js';

export { VERSION };
export { iconToSvg, svgToDataUri, applyWeight, applyCorners, applySecondary, isStroke, baseStrokeWidth, uniqueIds } from './svg.js';
export { licenseOf, attributionLine, checkCatalog, TRADEMARK_NOTICE } from './license.js';
export { licenseDecision, LICENSE_KINDS, KIND_LABELS, STYLES } from './policy.js';
export { UniverseIndex, parseQuery } from './search.js';
export { iconData, bakeTransforms } from './iconify.js';
export { PREFIXES } from './prefixes.js';

const NAME = /^([a-z0-9]+(?:-[a-z0-9]+)*):([a-z0-9_]+(?:-[a-z0-9_]+)*)$/;

/** "mdi:home" to { prefix: "mdi", name: "home" }, or null. */
export function parseName(input) {
  if (typeof input !== 'string') return null;
  const m = NAME.exec(input.trim().toLowerCase());
  return m ? { prefix: m[1], name: m[2] } : null;
}

/** True for names that belong to glyphfox universe (they have a prefix). */
export const isUniverseName = (name) => parseName(name) !== null;

const state = {
  cdn: 'https://cdn.jsdelivr.net/npm/',
  dataUrl: null,
  fetch: null,
  local: null,
  offline: false,
  maxSets: 24,
  persist: true,
  cacheName: 'glyphfox-universe',
  caches: undefined,
};

/**
 * Options: cdn (base URL of an npm CDN), dataUrl (folder with catalog.json
 * and index.json), fetch (a fetch function), offline (never use the
 * network), maxSets (sets kept in memory), persist (keep downloads in the
 * Cache Storage of the browser, default true), cacheName, caches (a
 * CacheStorage, for tests and workers).
 */
export function configure(options = {}) {
  for (const k of Object.keys(state)) if (k in options) state[k] = options[k];
  if ('dataUrl' in options || 'cdn' in options) {
    catalogPromise = null;
    indexPromise = null;
  }
  return { ...state };
}

/** Used by the Node entry: reads the package data and locally installed sets from disk. */
export function setLocalSource(local) {
  state.local = local;
}

const dataUrl = () => state.dataUrl || `${state.cdn}glyphfox-universe@${VERSION}/dist/`;

// Persistent cache. Only exact versioned package URLs are stored (they never
// change); storing a version drops the other versions of the same package.
const VERSIONED = /\/npm\/((?:@[^/@]+\/)?[^/@]+)@(\d+\.\d+\.\d+[^/]*)\//;

function cacheStorage() {
  const store = state.caches !== undefined ? state.caches : globalThis.caches;
  return store && typeof store.open === 'function' ? store : null;
}

async function persistentCache() {
  if (state.persist === false) return null;
  const store = cacheStorage();
  if (!store) return null;
  try {
    return await store.open(state.cacheName);
  } catch {
    return null;
  }
}

async function dropOtherVersions(cache, name, version) {
  try {
    for (const req of await cache.keys()) {
      const m = VERSIONED.exec(typeof req === 'string' ? req : req.url);
      if (m && m[1] === name && m[2] !== version) await cache.delete(req);
    }
  } catch {
    // the cache stays as it is
  }
}

async function fetchJson(url) {
  const versioned = VERSIONED.exec(url);
  const cache = versioned ? await persistentCache() : null;
  if (cache) {
    try {
      const hit = await cache.match(url);
      if (hit) return await hit.json();
    } catch {
      // a broken entry is fetched again
    }
  }
  if (state.offline) throw new Error(`glyphfox universe: offline, cannot load ${url}`);
  const f = state.fetch || globalThis.fetch;
  if (!f) throw new Error('glyphfox universe: no fetch available; pass one to configure({ fetch })');
  const res = await f(url);
  if (!res.ok) throw new Error(`glyphfox universe: ${url}: HTTP ${res.status}`);
  if (cache && typeof res.clone === 'function') {
    try {
      await cache.put(url, res.clone());
      dropOtherVersions(cache, versioned[1], versioned[2]);
    } catch {
      // quota or private mode: the memory cache still works
    }
  }
  return res.json();
}

/**
 * Clears downloaded data: the persistent cache (Cache Storage) and the
 * memory caches (sets, catalog, index, icons resolved from them). Icons
 * registered offline stay.
 */
export async function clear({ persistent = true, memory = true } = {}) {
  if (memory) {
    setCache.clear();
    for (const key of downloaded) registry.delete(key);
    downloaded.clear();
    catalogPromise = null;
    catalogValue = null;
    indexPromise = null;
  }
  if (persistent) {
    const store = cacheStorage();
    if (store && typeof store.delete === 'function') {
      try {
        await store.delete(state.cacheName);
      } catch {
        // nothing stored
      }
    }
  }
}

async function packageData(file) {
  if (state.local && state.local.readData) {
    const d = await state.local.readData(file);
    if (d) return d;
  }
  return fetchJson(new URL(file, dataUrl()).href);
}

let catalogPromise = null;
let catalogValue = null;
let indexPromise = null;
const registry = new Map();
const downloaded = new Set();
const setCache = new Map();
const setInfoExtra = new Map();

/** The catalog: { total, list: [set], excluded: [...] }. */
export function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = packageData('catalog.json').then((c) => {
      catalogValue = c;
      return c;
    });
    catalogPromise.catch(() => {
      catalogPromise = null;
    });
  }
  return catalogPromise;
}

/** Uses a catalog object directly (offline bundles, tests). */
export function setCatalog(catalog) {
  catalogValue = catalog;
  catalogPromise = Promise.resolve(catalog);
}

/** The search index (an UniverseIndex), loaded once. */
export function loadIndex() {
  if (!indexPromise) {
    indexPromise = Promise.all([packageData('index.json'), loadCatalog()]).then(([raw, catalog]) => new UniverseIndex(raw, catalog));
    indexPromise.catch(() => {
      indexPromise = null;
    });
  }
  return indexPromise;
}

/** Uses an index object directly (tests, custom hosting). */
export function setIndex(raw, catalog = catalogValue) {
  indexPromise = Promise.resolve(new UniverseIndex(raw, catalog));
  return indexPromise;
}

const setOf = (prefix) => (catalogValue && catalogValue.list.find((s) => s.prefix === prefix)) || setInfoExtra.get(prefix) || null;

/** Catalog record of a set (name, total, author, license, styles, npm package), or null. */
export async function getSet(prefix) {
  await loadCatalog().catch(() => null);
  return setOf(prefix);
}

/** Every shipped set. */
export async function listSets() {
  const c = await loadCatalog();
  return c.list.slice();
}

/** URL of the Iconify JSON of a set on the CDN. */
export function setUrl(set) {
  if (!set || !set.npm) return null;
  return `${state.cdn}${set.npm.name}@${set.npm.version}/icons.json`;
}

/** Loads the Iconify JSON of a set (local install first, then the CDN). */
export async function loadSet(prefix) {
  if (setCache.has(prefix)) {
    const p = setCache.get(prefix);
    setCache.delete(prefix);
    setCache.set(prefix, p);
    return p;
  }
  const promise = (async () => {
    const set = await getSet(prefix);
    if (!set) throw new Error(`glyphfox universe: unknown icon set "${prefix}"`);
    if (state.local && state.local.readSet) {
      const local = await state.local.readSet(prefix);
      if (local) return local;
    }
    const url = setUrl(set);
    if (!url || set.cdn === false) throw new Error(`glyphfox universe: the set "${prefix}" is not on the CDN; install @iconify-json/${prefix} or @iconify/json`);
    return fetchJson(url);
  })();
  setCache.set(prefix, promise);
  promise.catch(() => setCache.delete(prefix));
  while (setCache.size > state.maxSets) setCache.delete(setCache.keys().next().value);
  return promise;
}

/** Puts the Iconify JSON of a set in the cache (tests, preloaded data). */
export function addSetData(prefix, data) {
  setCache.set(prefix, Promise.resolve(data));
}

function makeIcon(prefix, name, raw, set) {
  const baked = bakeTransforms(raw);
  const stroke = isStroke(baked.body) && !(set && set.palette);
  return {
    name: `${prefix}:${name}`,
    prefix,
    icon: name,
    body: baked.body,
    left: baked.left,
    top: baked.top,
    width: baked.width,
    height: baked.height,
    viewBox: `${baked.left} ${baked.top} ${baked.width} ${baked.height}`,
    stroke,
    hidden: Boolean(raw.hidden),
    license: licenseOf(set),
  };
}

/**
 * Registers icons for offline use (the output of the bundler plugin and of
 * add()): { sets: { prefix: catalog record }, icons: { "prefix:name": { body, width, height, left, top } } }.
 */
export function registerIcons(bundle) {
  for (const [prefix, info] of Object.entries((bundle && bundle.sets) || {})) if (!setOf(prefix)) setInfoExtra.set(prefix, info);
  for (const [full, data] of Object.entries((bundle && bundle.icons) || {})) {
    const p = parseName(full);
    if (!p) continue;
    const set = setOf(p.prefix);
    registry.set(`${p.prefix}:${p.name}`, makeIcon(p.prefix, p.name, { left: 0, top: 0, width: 16, height: 16, ...data }, set));
  }
}

/** An icon already in memory (registered, or from a loaded set), else undefined. */
export function getIconSync(name) {
  const p = parseName(name);
  if (!p) return undefined;
  const key = `${p.prefix}:${p.name}`;
  if (registry.has(key)) return registry.get(key);
  return undefined;
}

/**
 * The icon `prefix:name` as { name, body, viewBox, width, height, stroke,
 * license, ... }, loading its set when needed. Resolves to null when the
 * icon does not exist; rejects for sets that are not shipped.
 */
export async function getIcon(name) {
  const p = parseName(name);
  if (!p) return null;
  const key = `${p.prefix}:${p.name}`;
  if (registry.has(key)) return registry.get(key);
  const data = await loadSet(p.prefix);
  const raw = iconData(data, p.name);
  if (!raw) return null;
  const icon = makeIcon(p.prefix, p.name, { ...raw, left: raw.left, top: raw.top }, setOf(p.prefix));
  registry.set(key, icon);
  downloaded.add(key);
  return icon;
}

/** Loads many icons at once (one request per set). */
export async function getIcons(names) {
  return Promise.all(names.map((n) => getIcon(n).catch(() => null)));
}

/** SVG markup of `prefix:name` with the glyphfox options (see iconToSvg). */
export async function toSvg(name, options = {}) {
  const icon = await getIcon(name);
  if (!icon) throw new Error(`glyphfox universe: no icon named "${name}"`);
  return iconToSvg(icon, options);
}

/** Synchronous SVG markup for icons already in memory, else an empty string. */
export function toSvgSync(name, options = {}) {
  const icon = getIconSync(name);
  return icon ? iconToSvg(icon, options) : '';
}

/**
 * Search across every set (names, aliases, categories). Options: limit,
 * sets, styles (outline, solid, duotone, color), brand, stroke, licenses
 * (SPDX ids or kinds: public-domain, permissive, attribution, share-alike).
 */
export async function search(query, options = {}) {
  const index = await loadIndex();
  return index.search(query, options);
}

/** Attribution text of the set of an icon (CC BY sets), or "" when none is needed. */
export async function attributionFor(name) {
  const p = parseName(name);
  if (!p) return '';
  const set = await getSet(p.prefix);
  return set && set.license.attribution ? attributionLine(set) : '';
}

/** Clears caches (tests). */
export function reset() {
  registry.clear();
  downloaded.clear();
  setCache.clear();
  setInfoExtra.clear();
  catalogPromise = null;
  catalogValue = null;
  indexPromise = null;
}
