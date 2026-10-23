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
    return body ? { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(body)) } : { ok: false, status: 404, json: async () => ({}) };
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
  U.configure({ cdn: CDN, dataUrl: 'https://data.test/', fetch: fakeFetch(routes), offline: false, maxSets: 24 });
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
