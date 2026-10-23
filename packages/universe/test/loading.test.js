// Lazy loading: the catalog and the index from the data URL, one JSON chunk
// per set from the CDN (pinned @iconify-json versions), the set cache, a
// local install first in Node, and offline mode.
import { beforeEach, describe, expect, it } from 'vitest';
import * as U from '../src/core.js';
import { fixtureCatalog, fixtureIndex, strokeSet, fillSet } from './fixtures.js';

let requests = [];
function fakeFetch(routes) {
  return async (url) => {
    requests.push(String(url));
    const body = routes[String(url)];
    return body ? new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } }) : new Response('not found', { status: 404 });
  };
}

const CDN = 'https://cdn.test/npm/';
const routes = {
  'https://data.test/catalog.json': fixtureCatalog(),
  'https://data.test/index.json': fixtureIndex(),
  [`${CDN}@iconify-json/tst@1.2.3/icons.json`]: strokeSet,
  [`${CDN}@iconify-json/fil@1.2.3/icons.json`]: fillSet,
};

beforeEach(() => {
  U.reset();
  U.setLocalSource(null);
  requests = [];
  U.configure({ cdn: CDN, dataUrl: 'https://data.test/', fetch: fakeFetch(routes), offline: false, maxSets: 24, persist: true, caches: null });
});

describe('chunk loading', () => {
  it('loads the catalog once and each set once, from the pinned package', async () => {
    const [a, b] = await Promise.all([U.getIcon('tst:home'), U.getIcon('tst:arrow-left')]);
    expect(a.name).toBe('tst:home');
    expect(b.name).toBe('tst:arrow-left');
    expect(requests).toEqual(['https://data.test/catalog.json', `${CDN}@iconify-json/tst@1.2.3/icons.json`]);
    await U.getIcon('fil:star');
    expect(requests).toHaveLength(3);
    expect(U.setUrl(fixtureCatalog().list[0])).toBe(`${CDN}@iconify-json/tst@1.2.3/icons.json`);
  });

  it('loads the search index lazily, only for search', async () => {
    await U.getIcon('tst:home');
    expect(requests.some((u) => u.endsWith('index.json'))).toBe(false);
    const hits = await U.search('house');
    expect(hits.map((h) => h.name)).toEqual(['tst:home']);
    expect(requests.filter((u) => u.endsWith('index.json'))).toHaveLength(1);
    await U.search('arrow');
    expect(requests.filter((u) => u.endsWith('index.json'))).toHaveLength(1);
  });

  it('keeps at most maxSets sets in memory', async () => {
    U.configure({ maxSets: 1 });
    await U.loadSet('tst');
    await U.loadSet('fil');
    await U.loadSet('tst');
    expect(requests.filter((u) => u.includes('@iconify-json/tst'))).toHaveLength(2);
  });

  it('prefers a local install and works offline with registered data', async () => {
    const local = [];
    U.setLocalSource({
      readData: async (file) => (file === 'catalog.json' ? fixtureCatalog() : null),
      readSet: async (prefix) => {
        local.push(prefix);
        return prefix === 'tst' ? strokeSet : null;
      },
    });
    U.configure({ offline: true });
    expect((await U.getIcon('tst:home')).name).toBe('tst:home');
    expect(local).toEqual(['tst']);
    expect(requests).toEqual([]);
    await expect(U.getIcon('fil:star')).rejects.toThrow(/offline/);
  });

  it('reports sets that are not on the CDN and failed requests', async () => {
    const catalog = fixtureCatalog();
    catalog.list[1].cdn = false;
    U.setCatalog(catalog);
    await expect(U.getIcon('fil:star')).rejects.toThrow(/not on the CDN/);
    U.configure({ dataUrl: 'https://missing.test/' });
    U.reset();
    await expect(U.loadCatalog()).rejects.toThrow(/HTTP 404/);
  });
});

// A Cache Storage stand in with the parts of the API the runtime uses.
function fakeCaches() {
  const stores = new Map();
  const key = (req) => (typeof req === 'string' ? req : req.url);
  return {
    stores,
    async open(name) {
      if (!stores.has(name)) {
        const entries = new Map();
        stores.set(name, {
          entries,
          match: async (req) => (entries.has(key(req)) ? new Response(entries.get(key(req))) : undefined),
          put: async (req, res) => void entries.set(key(req), await res.text()),
          keys: async () => [...entries.keys()].map((url) => ({ url })),
          delete: async (req) => entries.delete(key(req)),
        });
      }
      return stores.get(name);
    },
    delete: async (name) => stores.delete(name),
  };
}

const TST = `${CDN}@iconify-json/tst@1.2.3/icons.json`;

describe('persistent cache', () => {
  it('keeps downloaded sets in Cache Storage for the next visit', async () => {
    const caches = fakeCaches();
    U.configure({ caches });
    await U.getIcon('tst:home');
    expect([...caches.stores.get('glyphfox-universe').entries.keys()]).toEqual([TST]);
    await U.clear({ persistent: false });
    expect((await U.getIcon('tst:arrow-left')).name).toBe('tst:arrow-left');
    expect(requests.filter((u) => u === TST)).toHaveLength(1);
  });

  it('caches the versioned catalog and index of the package too', async () => {
    const caches = fakeCaches();
    const data = `${CDN}glyphfox-universe@${U.VERSION}/dist/`;
    U.configure({ caches, dataUrl: null, fetch: fakeFetch({ ...routes, [`${data}catalog.json`]: fixtureCatalog(), [`${data}index.json`]: fixtureIndex() }) });
    await U.search('house');
    await U.clear({ persistent: false });
    await U.search('house');
    expect(requests.filter((u) => u.startsWith(data)).sort()).toEqual([`${data}catalog.json`, `${data}index.json`]);
  });

  it('fetches a new version once and drops the old one', async () => {
    const caches = fakeCaches();
    U.configure({ caches });
    await U.getIcon('tst:home');
    const next = fixtureCatalog();
    next.list[0].npm.version = '1.2.4';
    U.configure({ fetch: fakeFetch({ ...routes, [`${CDN}@iconify-json/tst@1.2.4/icons.json`]: strokeSet }) });
    await U.clear({ persistent: false });
    U.setCatalog(next);
    await U.getIcon('tst:home');
    await new Promise((r) => setTimeout(r, 10));
    expect([...caches.stores.get('glyphfox-universe').entries.keys()]).toEqual([`${CDN}@iconify-json/tst@1.2.4/icons.json`]);
  });

  it('serves cached sets offline', async () => {
    const caches = fakeCaches();
    U.configure({ caches });
    await U.getIcon('tst:home');
    await U.clear({ persistent: false });
    U.configure({ offline: true });
    U.setCatalog(fixtureCatalog());
    expect((await U.getIcon('tst:home')).name).toBe('tst:home');
  });

  it('can be turned off, and falls back to memory when Cache Storage fails', async () => {
    const caches = fakeCaches();
    U.configure({ caches, persist: false });
    await U.getIcon('tst:home');
    expect(caches.stores.size).toBe(0);
    U.reset();
    U.configure({ persist: true, caches: { open: async () => Promise.reject(new Error('denied')) } });
    expect((await U.getIcon('tst:home')).name).toBe('tst:home');
    await U.getIcon('tst:back');
    expect(requests.filter((u) => u === TST)).toHaveLength(2);
  });

  it('clear() empties the persistent and the memory caches', async () => {
    const caches = fakeCaches();
    U.configure({ caches });
    await U.getIcon('tst:home');
    U.registerIcons({ sets: {}, icons: { 'tst:dot': { body: '<circle r="2"/>' } } });
    await U.clear();
    expect(caches.stores.has('glyphfox-universe')).toBe(false);
    expect(U.getIconSync('tst:home')).toBeUndefined();
    expect(U.getIconSync('tst:dot')).toBeDefined();
    await U.getIcon('tst:home');
    expect(requests.filter((u) => u === TST)).toHaveLength(2);
  });
});
