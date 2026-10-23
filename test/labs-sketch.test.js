// Sketch search of the studio: shape signatures, the precomputed index
// and the ranking of rough drawings.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CELLS, GRID, MOMENTS, ORIENT, RECORD, decode, distanceField, encode, extract, packIndex, rank, unpackIndex } from '../docs/assets/js/labs/sketch-core.js';
import { DATA, INDEX, buildIndex, iconPolylines } from '../scripts/labs/sketch-index.mjs';

const data = JSON.parse(readFileSync(DATA, 'utf8'));
const indexText = readFileSync(INDEX, 'utf8');
const entries = unpackIndex(JSON.parse(indexText));

const line = (x0, y0, x1, y1, n = 20) => Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
const ring = (cx, cy, r, n = 48) => Array.from({ length: n + 1 }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * r, cy + Math.sin((i / n) * Math.PI * 2) * r]);
const path = (pts) => pts.slice(1).flatMap((p, i) => line(...pts[i], ...p, 12).slice(i ? 1 : 0));
// A shaky hand: smooth wobble of a few pixels on a 300 px canvas.
const shaky = (pts, a = 3) => pts.map(([x, y], i) => [x + Math.sin(i * 0.7) * a, y + Math.cos(i * 0.5) * a]);
const orientation = (sig, bin) => {
  let s = 0;
  for (let c = 0; c < CELLS * CELLS; c++) s += sig.dir[c * ORIENT + bin];
  return s;
};

describe('sketch signatures', () => {
  it('computes an exact Euclidean distance field', () => {
    const mask = new Uint8Array(GRID * GRID);
    mask[7 * GRID + 5] = 1;
    mask[20 * GRID + 25] = 1;
    const dt = distanceField(mask);
    for (const [x, y] of [
      [5, 7],
      [0, 0],
      [31, 31],
      [12, 3],
      [24, 18],
    ]) {
      expect(dt[y * GRID + x]).toBeCloseTo(Math.min(Math.hypot(x - 5, y - 7), Math.hypot(x - 25, y - 20)), 5);
    }
  });

  it('needs something to match and ignores position and scale', () => {
    expect(extract([])).toBe(null);
    expect(extract([[[10, 10]]])).toBe(null);
    const shape = [path([[0, 0], [10, 0], [10, 6], [0, 6]]), line(2, 2, 8, 4)];
    const a = extract(shape);
    const b = extract(shape.map((pl) => pl.map(([x, y]) => [x * 7.5 + 40, y * 7.5 - 13])));
    expect(Array.from(b.mask)).toEqual(Array.from(a.mask));
    expect(b.aspect).toBeCloseTo(a.aspect, 6);
    for (let i = 0; i < a.dir.length; i++) expect(b.dir[i]).toBeCloseTo(a.dir[i], 4);
    for (let i = 0; i < a.zm.length; i++) expect(b.zm[i]).toBeCloseTo(a.zm[i], 4);
    expect(a.aspect).toBeCloseTo(0.4, 6);
  });

  it('bins stroke directions by orientation', () => {
    expect(orientation(extract([line(0, 5, 20, 5)]), 0)).toBeCloseTo(1, 5);
    expect(orientation(extract([line(5, 0, 5, 20)]), 2)).toBeCloseTo(1, 5);
    expect(orientation(extract([line(0, 0, 20, 20)]), 1)).toBeCloseTo(1, 5);
    expect(orientation(extract([line(20, 0, 0, 20)]), 3)).toBeCloseTo(1, 5);
    const total = extract([ring(0, 0, 10)]).dir.reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it('gives rotation invariant moments that tell a circle from a square', () => {
    const at = (n, m) => MOMENTS.findIndex(([a, b]) => a === n && b === m);
    const circle = extract([ring(0, 0, 10, 96)]);
    expect(circle.zm[at(2, 0)]).toBeGreaterThan(0.95);
    expect(circle.zm[at(4, 4)]).toBeLessThan(0.02);
    const square = extract([path([[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]])]);
    expect(square.zm[at(4, 4)]).toBeGreaterThan(0.1);
    const l = [path([[0, 0], [0, 12], [7, 12]])];
    const turned = l.map((pl) => pl.map(([x, y]) => [-y, x]));
    const a = extract(l).zm;
    const b = extract(turned).zm;
    for (let i = 0; i < a.length; i++) expect(Math.abs(a[i] - b[i])).toBeLessThan(0.03);
  });

  it('packs a signature into a fixed size record', () => {
    const sig = extract([ring(0, 0, 10), line(-10, 0, 10, 0)]);
    const bytes = encode(sig);
    expect(bytes.length).toBe(RECORD);
    const back = decode(bytes);
    expect(Array.from(back.mask)).toEqual(Array.from(sig.mask));
    expect(Array.from(back.pts)).toEqual(Array.from(sig.pts));
    expect(Array.from(back.dt)).toEqual(Array.from(sig.dt));
    let err = 0;
    for (let i = 0; i < sig.dir.length; i++) err += Math.abs(back.dir[i] - sig.dir[i]);
    expect(err).toBeLessThan(0.02);
    for (let i = 0; i < sig.zm.length; i++) expect(Math.abs(back.zm[i] - sig.zm[i])).toBeLessThanOrEqual(0.5 / 255 + 1e-6);
    expect(Math.abs(back.aspect - sig.aspect)).toBeLessThan(0.01);
    const index = packIndex([{ name: 'a', sig }]);
    expect(unpackIndex(JSON.parse(JSON.stringify(index)))[0].name).toBe('a');
    expect(() => unpackIndex({ ...index, record: RECORD + 1 })).toThrow(/layout/);
  });
});

describe('sketch index', () => {
  it('is up to date with docs/data/icons.json and covers every icon', () => {
    expect(buildIndex(data) === indexText, 'docs/data/sketch-index.json is out of date, run npm run build:labs').toBe(true);
    expect(entries.map((e) => e.name)).toEqual(data.icons.map((i) => i[0]));
    expect(indexText.length / data.icons.length).toBeLessThan(RECORD * 1.4 + 24);
  });

  it('finds the icon for rough drawings', () => {
    const drawings = {
      circle: [ring(150, 150, 100)],
      plus: [line(150, 40, 150, 260), line(40, 150, 260, 150)],
      minus: [line(40, 150, 260, 150)],
      x: [line(50, 50, 250, 250), line(250, 50, 50, 250)],
      square: [path([[50, 50], [250, 50], [250, 250], [50, 250], [50, 50]])],
      triangle: [path([[150, 40], [270, 250], [30, 250], [150, 40]])],
      heart: [path([[150, 260], [40, 140], [60, 70], [110, 50], [150, 90], [190, 50], [240, 70], [260, 140], [150, 260]])],
      'arrow-right': [line(40, 150, 260, 150), path([[180, 70], [260, 150], [180, 230]])],
      check: [path([[50, 160], [120, 230], [260, 80]])],
      menu: [line(40, 70, 260, 70), line(40, 150, 260, 150), line(40, 230, 260, 230)],
    };
    for (const [name, strokes] of Object.entries(drawings)) {
      const top = rank(extract(strokes.map((s) => shaky(s))), entries, 24).map((r) => r.name);
      expect(top.length).toBe(24);
      expect(top.slice(0, 3), name).toContain(name);
    }
  });

  it('ranks distorted icons near the top for the whole set, fast', () => {
    let seed = 1;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    let hits = 0;
    let total = 0;
    let time = 0;
    for (const [name, body] of data.icons.filter((_, i) => i % 4 === 0)) {
      const turn = (rnd() - 0.5) * 0.3;
      const sx = 1 + (rnd() - 0.5) * 0.25;
      const ph = rnd() * 6;
      const strokes = iconPolylines(body).map((pl) =>
        pl.map(([x, y], i) => {
          const px = (x - 12) * sx + Math.sin(i * 0.4 + ph) * 0.5;
          const py = y - 12 + Math.cos(i * 0.3 + ph) * 0.5;
          return [px * Math.cos(turn) - py * Math.sin(turn), px * Math.sin(turn) + py * Math.cos(turn)];
        }),
      );
      const t0 = performance.now();
      const top = rank(extract(strokes), entries, 24);
      time += performance.now() - t0;
      total++;
      if (top.some((r) => r.name === name)) hits++;
    }
    expect(hits / total).toBeGreaterThan(0.95);
    expect(time / total).toBeLessThan(20);
  });
});
