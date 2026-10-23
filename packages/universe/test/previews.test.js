// Preview strips of the sets gallery: the same concepts in every set, found
// by synonyms, and the lazily loaded previews file.
import { describe, expect, it } from 'vitest';
import { CONCEPTS, previewStrip } from '../../../scripts/universe/lib/previews.mjs';
import * as U from '../src/core.js';
import { strokeSet } from './fixtures.js';

const classes = new Map(Object.keys(strokeSet.icons).map((n) => [n, { style: n.includes('filled') ? 'solid' : 'outline', brand: false, stroke: !n.includes('filled') }]));
const names = Object.keys(strokeSet.icons).filter((n) => !strokeSet.icons[n].hidden);

describe('preview strips', () => {
  it('finds the concepts of a set through synonyms', () => {
    const strip = previewStrip({ data: { ...strokeSet, info: {} }, names, classes, tags: null, aliases: [['back', 'arrow-left']], dominant: 'outline' });
    const byConcept = Object.fromEntries(strip.icons.filter((i) => i[3] >= 0).map((i) => [CONCEPTS[i[3]], i[0]]));
    expect(byConcept.home).toBe('home');
    expect(byConcept.heart).toBe('heart-duotone');
    expect(byConcept['arrow-right']).toBe('arrow-right');
    expect(strip.box).toEqual([0, 0, 24, 24]);
    expect(strip.icons.length).toBeLessThanOrEqual(12);
    expect(new Set(strip.icons.map((i) => i[0])).size).toBe(strip.icons.length);
    expect(strip.icons.every((i) => typeof i[1] === 'string' && /^[0-9a-f]$/.test(i[2]))).toBe(true);
  });

  it('loads the previews file once, with the catalog and index data', async () => {
    U.reset();
    const requests = [];
    U.configure({
      dataUrl: 'https://data.test/',
      caches: null,
      offline: false,
      fetch: async (url) => {
        requests.push(url);
        return new Response(JSON.stringify({ concepts: CONCEPTS, sets: {} }), { status: 200 });
      },
    });
    const [a, b] = await Promise.all([U.loadPreviews(), U.loadPreviews()]);
    expect(a).toBe(b);
    expect(a.concepts).toEqual(CONCEPTS);
    expect(requests).toEqual(['https://data.test/previews.json']);
  });
});
