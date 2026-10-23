import { describe, expect, it } from 'vitest';
import { getIcon, iconNames, resolve, toSvg } from 'glyphfox';
import { CORNERS, LAYOUTS, MODIFIER_NAMES, fuse, withModifier } from '../packages/glyphfox/dist/core/compose.js';
import { createMorph, prepareMorph } from '../packages/glyphfox/dist/core/morph.js';
import { lintBody } from '../packages/glyphfox/dist/core/lint.js';
import { distToPolylines, flattenNode, segmentsBounds, shapeToSegments } from '../packages/glyphfox/dist/core/geometry.js';
import { parseBody, splitLayers } from '../packages/glyphfox/dist/core/nodes.js';

const icon = (n) => getIcon(n);
const polys = (nodes) => nodes.flatMap((n) => flattenNode(n, 0.1));

describe('modifiers', () => {
  it('pass the icon lint for every modifier and corner', () => {
    for (const base of ['file', 'cloud', 'heart', 'lock']) {
      for (const m of MODIFIER_NAMES) {
        for (const c of CORNERS) {
          const out = withModifier(icon(base), m, c);
          expect(lintBody(out.body), `${base}+${m}@${c}`).toEqual([]);
        }
      }
    }
  });

  it('keep an even knockout gap around the badge at every weight', () => {
    for (const weight of [1, 2, 3]) {
      const out = withModifier(icon('file'), 'plus', 'bottom-right', { weight, gap: 1 });
      const nodes = splitLayers(parseBody(out.body)).primary;
      const badge = nodes.slice(-1);
      const base = nodes.slice(0, -1);
      const badgePolys = polys(badge);
      let min = Infinity;
      for (const p of polys(base)) for (const pt of p.points) min = Math.min(min, distToPolylines(pt, badgePolys));
      // Visible gap = centerline distance minus both half strokes.
      expect(min - weight, `weight ${weight}`).toBeGreaterThan(0.95);
    }
  });

  it('cut the duotone layer and keep the solid fill masked', () => {
    const duo = { name: 'box', body: '<rect class="gf-secondary" x="4" y="4" width="16" height="16" fill="currentColor" stroke="none" opacity="0.3"/><rect x="4" y="4" width="16" height="16" rx="2"/>', tags: [], categories: [] };
    const out = withModifier(duo, 'check', 'bottom-right');
    expect(lintBody(out.body)).toEqual([]);
    expect(out.body).toMatch(/^<path class="gf-secondary"/);
    expect(out.layers.solid.groups[0].mask.some((n) => n[0] === 'circle')).toBe(true);
    expect(toSvg('file+check', { variant: 'solid' })).toContain('<circle');
  });
});

describe('fusion', () => {
  const sets = {
    overlap: ['cloud', 'lock'],
    side: ['cloud', 'lock', 'heart'],
    stack: ['cloud', 'lock'],
    grid: ['heart', 'plus', 'check', 'x'],
    orbit: ['heart', 'plus', 'check', 'x', 'lock', 'cloud'],
    badge: ['file', 'lock'],
    inside: ['file', 'heart'],
  };

  it('passes the lint for every layout', () => {
    for (const layout of LAYOUTS) {
      const out = fuse(sets[layout].map(icon), { layout });
      expect(lintBody(out.body), layout).toEqual([]);
      expect(out.name).toBe(`${sets[layout].join('&')}:${layout}`);
    }
  });

  it('handles 2 to 10 icons in grid and orbit layouts', () => {
    const names = iconNames.slice(0, 10);
    for (let n = 2; n <= 10; n++) {
      for (const layout of ['grid', 'orbit', 'overlap', 'side']) {
        const out = fuse(names.slice(0, n).map(icon), { layout });
        expect(lintBody(out.body), `${layout} ${n}`).toEqual([]);
      }
    }
    expect(() => fuse([icon('file')])).toThrow();
    expect(() => fuse(names.slice(0, 10).concat(['file']).map(icon))).toThrow();
    expect(() => fuse(['file', 'heart', 'lock'].map(icon), { layout: 'inside' })).toThrow();
  });

  it('trims the back part around the front part (knockout)', () => {
    const weight = 2;
    const gap = 1;
    const out = fuse([icon('cloud'), icon('lock')], { layout: 'overlap', weight, gap });
    const nodes = splitLayers(parseBody(out.body)).primary;
    // The lock is drawn last, with all its stroke elements.
    const lockCount = splitLayers(parseBody(icon('lock').body)).primary.length;
    const front = nodes.slice(-lockCount);
    const back = nodes.slice(0, -lockCount);
    const frontPolys = polys(front);
    for (const p of polys(back)) {
      for (const pt of p.points) expect(distToPolylines(pt, frontPolys)).toBeGreaterThan(weight + gap - 0.05);
    }
  });

  it('keeps each part inside its own box and the padding box', () => {
    const out = fuse([icon('cloud'), icon('lock'), icon('heart'), icon('file')], { layout: 'grid' });
    for (const n of parseBody(out.body)) {
      const b = segmentsBounds(shapeToSegments(n));
      expect(b.minX).toBeGreaterThanOrEqual(2 - 1e-3);
      expect(b.maxY).toBeLessThanOrEqual(22 + 1e-3);
    }
    expect(out.parts).toHaveLength(4);
  });

  it('places the inner icon inside a closed container', () => {
    const out = fuse([icon('file'), icon('heart')], { layout: 'inside' });
    const [container, inner] = out.parts;
    expect(container.size).toBe(20);
    expect(inner.size).toBeLessThan(12);
  });

  it('accepts scale and offsets per part', () => {
    const a = fuse([icon('cloud'), icon('lock')], { layout: 'side' });
    const b = fuse([icon('cloud'), icon('lock')], { layout: 'side', scale: [0.8, 1], offsets: [[0, -1], [0, 1]] });
    expect(b.parts[0].size).toBeLessThan(a.parts[0].size);
    expect(b.parts[1].y).not.toBe(a.parts[1].y);
    expect(lintBody(b.body)).toEqual([]);
  });

  it('merges duotone layers into one element', () => {
    const duo = { name: 'box', body: '<rect class="gf-secondary" x="4" y="4" width="16" height="16" fill="currentColor" stroke="none" opacity="0.3"/><rect x="4" y="4" width="16" height="16" rx="2"/>', tags: [], categories: [] };
    const out = fuse([duo, duo, icon('heart')], { layout: 'side' });
    expect(lintBody(out.body)).toEqual([]);
    expect((out.body.match(/gf-secondary/g) || []).length).toBe(1);
  });

  it('renders every layout in the solid style', () => {
    for (const layout of LAYOUTS) {
      const svg = toSvg(`${sets[layout].join('&')}:${layout}`, { variant: 'solid' });
      expect(svg, layout).toContain('class="gf-fill"');
    }
  });
});

describe('morph engine', () => {
  it('matches strands and keeps exact end frames', () => {
    for (const [a, b] of [
      ['menu', 'x'],
      ['play', 'pause'],
      ['plus', 'check'],
      ['heart', 'lock'],
      ['file', 'cloud'],
    ]) {
      const m = createMorph(icon(a), icon(b));
      expect(m.frame(0)).toBe(icon(a));
      expect(m.frame(1)).toBe(icon(b));
      for (const t of [0.25, 0.5, 0.75]) {
        const f = m.frame(t);
        for (const n of parseBody(f.body)) expect(n[1].d).toMatch(/^M[\d.]+ [\d.]+(L-?[\d.]+ -?[\d.]+)+Z?$/);
      }
    }
  });

  it('uses the hand tuned hints', () => {
    const p = prepareMorph(icon('menu'), icon('x'));
    expect(p.pairs).toHaveLength(3);
    expect(p.pairs.filter((x) => x.fade < 0)).toHaveLength(1);
    expect(p.pairs.some((x) => x.theta !== 0)).toBe(true);
    const split = prepareMorph(icon('play'), icon('pause'));
    expect(split.pairs).toHaveLength(2);
    const back = prepareMorph(icon('pause'), icon('play'));
    expect(back.pairs).toHaveLength(2);
  });

  it('morphs styles too (heart to a filled heart)', () => {
    const m = createMorph(icon('heart'), icon('heart'), { fromVariant: 'outline', toVariant: 'solid' });
    const mid = m.frame(0.5);
    expect(mid.morph.toVariant).toBe('solid');
    const svg = toSvg(mid, {});
    expect(svg).toContain('gf-fill');
  });

  it('interpolates between arbitrary icons', () => {
    const names = iconNames.slice(0, 8);
    for (const a of names) {
      for (const b of names) {
        const f = createMorph(icon(a), icon(b)).frame(0.5);
        expect(() => parseBody(f.body)).not.toThrow();
      }
    }
  });

  it('keeps the strand split of fused and modified icons', () => {
    const m = createMorph(resolve('file+check'), resolve('cloud&lock'));
    expect(splitLayers(parseBody(m.frame(0.4).body)).primary.length).toBeGreaterThan(1);
  });
});

describe('fusion quality', () => {
  const CURATED = [
    ['cloud', 'lock', 'overlap'],
    ['file', 'check', 'badge'],
    ['user', 'shield', 'badge'],
    ['message-circle', 'heart', 'overlap'],
    ['shopping-cart', 'clock', 'badge'],
    ['shield', 'heart', 'inside'],
    ['folder', 'search', 'overlap'],
    ['calendar', 'bell', 'side'],
  ];
  for (const [a, b, layout] of CURATED) {
    it(`keeps ${a} and ${b} readable in ${layout}`, () => {
      for (const [weight, gap] of [
        [2, 1],
        [1.3, 3],
        [3, 0.5],
      ]) {
        const f = fuse([getIcon(a), getIcon(b)], { layout, weight, gap });
        for (const part of f.parts) {
          expect(part.kept, `${a}&${b}:${layout} w${weight} g${gap}`).toBeGreaterThanOrEqual(0.45);
          if (part.shortest !== null) expect(part.shortest, `${a}&${b}:${layout} w${weight} g${gap}`).toBeGreaterThanOrEqual(1.5);
        }
      }
    });
  }

  it('puts the back part large at the top left and the front part small at the bottom right', () => {
    const f = fuse([getIcon('cloud'), getIcon('lock')], { layout: 'overlap' });
    expect(f.parts[0]).toMatchObject({ x: 2, y: 2, size: 17 });
    expect(f.parts[1]).toMatchObject({ x: 10, y: 10, size: 12, kept: 1 });
  });

  it('cuts only inside the filled outline of the front part', () => {
    // A lock in front of a long line: the line is cut where the lock is, the
    // rest of it stays.
    const line = { name: 'line', body: '<path d="M2 18H22"/>', tags: [], categories: [] };
    const f = fuse([line, getIcon('lock')], { layout: 'overlap', gap: 1 });
    expect(f.parts[0].kept).toBeGreaterThan(0.3);
    expect(f.parts[0].kept).toBeLessThan(0.7);
    // What stays of the line is left of the lock.
    const y = 2 + 16 * (17 / 20);
    const pieces = parseBody(f.body)
      .map((n) => {
        const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
        segmentsBounds(shapeToSegments(n), b);
        return b;
      })
      .filter((b) => Math.abs(b.minY - y) < 0.05 && Math.abs(b.maxY - y) < 0.05);
    expect(pieces.length).toBeGreaterThan(0);
    for (const b of pieces) expect(b.maxX).toBeLessThan(10);
  });
});

