// Small fixture data in the real formats: an Iconify set, a catalog and a
// search index built with the same encoders as the build.

import { encodeAliases, encodeFlags, encodeNames, encodeRanges } from '../src/format.js';

export const strokeSet = {
  prefix: 'tst',
  width: 24,
  height: 24,
  icons: {
    'arrow-left': { body: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5m7 7l-7-7l7-7"/>' },
    'arrow-right': { body: '<path fill="none" stroke="currentColor" stroke-width="2" d="M5 12h14m-7-7l7 7l-7 7"/>' },
    home: { body: '<g fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10l9-7l9 7v10H3z"/><path d="M9 20v-6h6v6"/></g>' },
    'home-filled': { body: '<path fill="currentColor" d="M3 10l9-7l9 7v10H3z"/>' },
    'heart-duotone': { body: '<path fill="currentColor" opacity=".3" d="M12 20l-8-8a5 5 0 0 1 8-6a5 5 0 0 1 8 6z"/><path fill="none" stroke="currentColor" stroke-width="2" d="M12 20l-8-8a5 5 0 0 1 8-6a5 5 0 0 1 8 6z"/>' },
    old: { body: '<path d="M1 1h2"/>', hidden: true },
  },
  aliases: {
    back: { parent: 'arrow-left' },
    house: { parent: 'home' },
    'arrow-up': { parent: 'arrow-left', rotate: 1 },
    'arrow-mirror': { parent: 'arrow-left', hFlip: true },
  },
  categories: { Arrows: ['arrow-left', 'arrow-right'], Buildings: ['home', 'home-filled'] },
};

export const fillSet = {
  prefix: 'fil',
  width: 16,
  height: 16,
  icons: {
    star: { body: '<path fill="currentColor" d="M8 1l2 5h5l-4 3l2 6l-5-4l-5 4l2-6l-4-3h5z"/>' },
    logo: { body: '<path fill="currentColor" d="M2 2h12v12H2z"/>', width: 32 },
  },
  categories: { 'Brand Logos': ['logo'] },
};

const record = (prefix, name, spdx, kind, attribution, extra = {}) => ({
  prefix,
  name,
  total: 0,
  aliases: 0,
  author: { name: `${name} Authors`, url: `https://example.com/${prefix}` },
  license: { title: spdx, spdx, url: `https://example.com/${prefix}/LICENSE`, kind, attribution, file: `LICENSES/${prefix}.license` },
  category: '',
  palette: false,
  height: 24,
  styles: { outline: 0, solid: 0, duotone: 0, color: 0 },
  brand: 0,
  stroke: 0,
  npm: { name: `@iconify-json/${prefix}`, version: '1.2.3' },
  cdn: true,
  ...extra,
});

export function fixtureCatalog() {
  const tst = record('tst', 'Test Strokes', 'MIT', 'permissive', false, { total: 5, strokeWidth: 2 });
  const fil = record('fil', 'Fill Brands', 'CC-BY-4.0', 'attribution', true, { total: 2, height: 16 });
  return { format: 1, source: { package: '@iconify/json', version: '0.0.0' }, total: 7, sets: 2, list: [tst, fil], excluded: [{ prefix: 'nc', name: 'Non Commercial', total: 3, license: 'CC-BY-NC-4.0', reason: 'CC-BY-NC-4.0 does not allow commercial use or modification' }] };
}

/** Index entries: [name, style, brand, stroke] per set. */
export function fixtureIndex() {
  const tst = [
    ['arrow-left', 'outline', false, true],
    ['arrow-right', 'outline', false, true],
    ['heart-duotone', 'duotone', false, true],
    ['home', 'outline', false, true],
    ['home-filled', 'solid', false, false],
  ];
  const fil = [
    ['logo', 'solid', true, false],
    ['star', 'solid', false, false],
  ];
  const enc = (list, aliases, cats, tags) => {
    const pos = new Map(list.map((e, i) => [e[0], i]));
    return {
      n: encodeNames(list.map((e) => e[0])),
      f: list.map(([, style, brand, stroke]) => encodeFlags({ style, brand, stroke })).join(''),
      a: encodeAliases(aliases.map(([a, p]) => [a, pos.get(p)])),
      c: cats.map(([name, names]) => [name, encodeRanges(names.map((n) => pos.get(n)))]),
      ...(tags ? { t: tags } : {}),
    };
  };
  return {
    format: 1,
    total: 7,
    sets: ['tst', 'fil'],
    data: {
      // Tags: 0 dwelling, 1 navigation, 2 love; home and home-filled share a line (=).
      tst: enc(tst, [['back', 'arrow-left'], ['house', 'home']], [['Arrows', ['arrow-left', 'arrow-right']], ['Buildings', ['home', 'home-filled']]], { d: 'dwelling\nnavigation\nlove', r: '1\n1\n2\n0\n=' }),
      fil: enc(fil, [], [['Brand Logos', ['logo']]]),
    },
  };
}
