// Search over the compact index: names, aliases and categories, ranking,
// filters by set, style, brand and license, and the index encodings.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { UniverseIndex } from '../src/search.js';
import { decodeNames, decodeRanges, encodeNames, encodeRanges, encodeFlags, decodeFlags } from '../src/format.js';
import { fixtureCatalog, fixtureIndex } from './fixtures.js';

const index = new UniverseIndex(fixtureIndex(), fixtureCatalog());
const names = (q, o) => index.search(q, o).map((r) => r.name);

describe('index encodings', () => {
  it('round trips front coded names, ranges and flags', () => {
    const list = ['account', 'account-box', 'account-box-outline', 'arrow', 'zoom'];
    expect(encodeNames(list)).toBe('0account\n7-box\nb-outline\n1rrow\n0zoom');
    expect(decodeNames(encodeNames(list))).toEqual(list);
    expect(encodeRanges([5, 1, 2, 3, 9, 40])).toBe('1-3,5,9,14');
    expect(decodeRanges('1-3,5,9,14')).toEqual([1, 2, 3, 5, 9, 40]);
    expect(decodeFlags(encodeFlags({ style: 'duotone', brand: true, stroke: true }))).toEqual({ style: 'duotone', brand: true, stroke: true });
  });
});

describe('search', () => {
  it('ranks exact names first and matches every word', () => {
    expect(names('home')[0]).toBe('tst:home');
    expect(names('home')).toContain('tst:home-filled');
    expect(names('arrow left')).toEqual(['tst:arrow-left']);
    expect(names('arrow-right')).toEqual(['tst:arrow-right']);
  });

  it('finds icons by alias and by category (tags)', () => {
    expect(names('house')).toEqual(['tst:home']);
    expect(names('back')).toEqual(['tst:arrow-left']);
    expect(names('buildings')).toEqual(expect.arrayContaining(['tst:home', 'tst:home-filled']));
    expect(names('brand')).toEqual(['fil:logo']);
  });

  it('narrows to a set with prefix: and filters by style, brand and license', () => {
    expect(names('fil:')).toEqual(['fil:logo', 'fil:star']);
    expect(names('home', { styles: ['solid'] })).toEqual(['tst:home-filled']);
    expect(names('', { brand: true })).toEqual(['fil:logo']);
    expect(names('', { styles: ['duotone'] })).toEqual(['tst:heart-duotone']);
    expect(names('', { licenses: ['attribution'] })).toEqual(['fil:logo', 'fil:star']);
    expect(names('', { licenses: ['MIT'], stroke: true })).toEqual(['tst:arrow-left', 'tst:arrow-right', 'tst:heart-duotone', 'tst:home']);
    expect(names('', { sets: ['fil'] })).toHaveLength(2);
  });

  it('browses every icon in set order and reports entries, tags and aliases', () => {
    const ids = index.browse();
    expect(ids.length).toBe(7);
    expect(index.entry(ids[0])).toMatchObject({ prefix: 'tst', name: 'arrow-left', style: 'outline', stroke: true });
    expect(index.entry(ids[5])).toMatchObject({ prefix: 'fil', name: 'logo', brand: true });
    expect(index.find('tst', 'home')).toBe(3);
    expect(index.find('tst', 'nope')).toBe(-1);
    expect(index.categoriesOf('tst', 3)).toEqual(['Buildings']);
    expect(index.aliasesOf('tst', 3)).toEqual(['house']);
  });

  it('finds icons by their upstream tags', () => {
    expect(names('dwelling')).toEqual(['tst:home', 'tst:home-filled']);
    expect(names('love')).toEqual(['tst:heart-duotone']);
    expect(names('navigation left')).toEqual(['tst:arrow-left']);
    expect(index.tagsOf('tst', 4)).toEqual(['dwelling']);
    expect(index.tagsOf('fil', 0)).toEqual([]);
  });

  it('returns nothing for words that do not match', () => {
    expect(names('zebra')).toEqual([]);
    expect(names('arrow zebra')).toEqual([]);
  });
});

const built = new URL('../dist/index.json', import.meta.url);
describe.skipIf(!existsSync(built))('the built index', () => {
  it('searches every set fast and finds the classics', () => {
    const big = new UniverseIndex(JSON.parse(readFileSync(built, 'utf8')), JSON.parse(readFileSync(new URL('../dist/catalog.json', import.meta.url), 'utf8')));
    expect(big.total).toBeGreaterThan(200000);
    big.searchIds('warm up');
    const t0 = performance.now();
    const hits = big.search('arrow left', { limit: 400 }).map((r) => r.name);
    expect(performance.now() - t0).toBeLessThan(500);
    for (const n of ['lucide:arrow-left', 'mdi:arrow-left', 'tabler:arrow-left', 'material-symbols:arrow-left']) expect(hits).toContain(n);
    expect(big.search('home', { sets: ['lucide'] })[0].name).toBe('lucide:house');
    expect(big.search('garbage', { sets: ['lucide'] }).map((r) => r.name)).toContain('lucide:trash');
  });
});
