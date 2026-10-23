// Outlines of the Hero 3D view: strokes offset by half the stroke width,
// merged into closed rings with holes (docs/assets/js/hero3d/outline.js).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { outlineParts, ringArea } from '../docs/assets/js/hero3d/outline.js';
import { iconParts, resolveIcon } from '../docs/assets/js/hero3d/parts.js';
import * as gf from '../docs/vendor/glyphfox.js';

const area = (shapes) => shapes.reduce((s, sh) => s + ringArea(sh.outer) + sh.holes.reduce((q, h) => q + ringArea(h), 0), 0);
const line = (...points) => ({ points, closed: false });
const circle = (cx, cy, r, n = 96) => ({ points: Array.from({ length: n + 1 }, (_, k) => [cx + r * Math.cos((k / n) * 2 * Math.PI), cy + r * Math.sin((k / n) * 2 * Math.PI)]), closed: true });

const data = JSON.parse(readFileSync('docs/data/icons.json', 'utf8'));
gf.registerIcons(data.icons.map(([name, body, tags, categories, solid]) => ({ name, body, tags, categories, solid })));

describe('hero 3D outlines', () => {
  it('offsets a stroke by half its width with round caps', () => {
    const { main } = outlineParts({ strokes: [line([4, 12], [20, 12])] }, { radius: 1 });
    expect(main).toHaveLength(1);
    expect(main[0].holes).toHaveLength(0);
    expect(area(main)).toBeCloseTo(32 + Math.PI, 0);
  });

  it('keeps the hole of a closed stroke and shrinks it by the inset', () => {
    const { main } = outlineParts({ strokes: [circle(12, 12, 8)] }, { radius: 1, inset: 0.25 });
    expect(main).toHaveLength(1);
    expect(main[0].holes).toHaveLength(1);
    expect(area(main)).toBeCloseTo(Math.PI * (8.75 ** 2 - 7.25 ** 2), 0);
  });

  it('merges crossing strokes into one shape', () => {
    const { main } = outlineParts({ strokes: [line([6, 6], [18, 18]), line([18, 6], [6, 18])] }, { radius: 1 });
    expect(main).toHaveLength(1);
    expect(main[0].holes).toHaveLength(0);
  });

  it('fills closed shapes and cuts knockout lines out of them', () => {
    const square = { points: [[4, 4], [20, 4], [20, 20], [4, 20], [4, 4]], closed: true };
    const plain = outlineParts({ strokes: [square], areas: [[square]] }, { radius: 1 });
    expect(plain.main).toHaveLength(1);
    expect(plain.main[0].holes).toHaveLength(0);
    expect(area(plain.main)).toBeGreaterThan(16 * 16);
    const cut = outlineParts({ strokes: [square], areas: [[square]], knocks: [circle(12, 12, 3)] }, { radius: 1 });
    // The band around the circle becomes a hole, the disk inside stays as an island.
    expect(cut.main).toHaveLength(2);
    expect(cut.main.some((sh) => sh.holes.length === 1)).toBe(true);
    expect(area(cut.main)).toBeLessThan(area(plain.main));
  });

  it('outlines every icon, fusions and modifiers in every style', () => {
    for (const [k, [name]] of data.icons.entries()) {
      const icon = gf.lookupIcon(name);
      for (const variant of k % 9 ? ['outline'] : ['outline', 'duotone', 'solid']) {
        const out = outlineParts(iconParts(icon, variant), { radius: 1, inset: 0.25 });
        expect(out.main.length, `${name}/${variant}`).toBeGreaterThan(0);
      }
    }
    for (const spec of ['cloud&lock:overlap', 'file+check', 'user&shield:badge']) {
      const r = resolveIcon(spec);
      expect(r, spec).not.toBeNull();
      expect(outlineParts(iconParts(r.icon, 'outline'), { radius: 1 }).main.length, spec).toBeGreaterThan(0);
    }
    expect(resolveIcon('no-such-icon')).toBeNull();
  });
});
