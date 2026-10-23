import { describe, expect, it } from 'vitest';
import {
  flatten,
  minifyPath,
  nodeBounds,
  parsePath,
  pointInPolygon,
  resample,
  segmentsBounds,
  serializePath,
  shapeToSegments,
  transformNode,
  transformSegments,
  trimSegments,
} from '../packages/glyphfox/src/core/geometry.js';
import { parseBody, nodesToString, roundNode } from '../packages/glyphfox/src/core/nodes.js';
import { subtractDisk } from '../packages/glyphfox/src/core/compose.js';
import { analyzeSolid } from '../packages/glyphfox/src/core/solid.js';

const box = (d) => segmentsBounds(parsePath(d));
const close = (a, b, eps = 1e-6) => {
  for (const k of ['minX', 'minY', 'maxX', 'maxY']) expect(Math.abs(a[k] - b[k]), k).toBeLessThan(eps);
};

describe('path data', () => {
  it('parses every command, relative and absolute', () => {
    const segs = parsePath('M2 2h4v4H2V2zm10 0l2 2-2 2c1 1 2 1 3 0s2-1 3 0q1-2 2 0t2 0a2 2 0 0 1 0 4');
    expect(segs[0]).toEqual(['M', 2, 2]);
    expect(segs.filter((s) => s[0] === 'Z')).toHaveLength(1);
    expect(segs.some((s) => s[0] === 'C')).toBe(true);
    expect(segs.some((s) => s[0] === 'Q')).toBe(true);
    expect(segs.some((s) => s[0] === 'A')).toBe(true);
  });

  it('reads compact arc flags and numbers', () => {
    const segs = parsePath('M2 12a10 10 0 1020 0');
    expect(segs[1]).toEqual(['A', 10, 10, 0, 1, 0, 22, 12]);
    expect(parsePath('M.5.5L1e1-2e0')).toEqual([
      ['M', 0.5, 0.5],
      ['L', 10, -2],
    ]);
  });

  it('rejects broken data', () => {
    expect(() => parsePath('L2 2')).toThrow();
    expect(() => parsePath('M2')).toThrow();
    expect(() => parsePath('M2 2 A1 1 0 2 0 3 3')).toThrow();
  });

  it('round trips through the serializer without changing the bounds', () => {
    for (const d of ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z', 'M12 20L5.35 11.46A4 4 0 1 1 12 7.06A4 4 0 1 1 18.65 11.46Z', 'M3 12c3-5 15-5 18 0s-15 5-18 0', 'M4 4q8 8 16 0t0 16']) {
      close(box(serializePath(parsePath(d))), box(d), 0.01);
    }
  });

  it('minifies losslessly', () => {
    const d = 'M 14.50 3.00 H 7 A 2 2 0 0 0 5 5 V 19';
    expect(minifyPath(d)).toBe('M14.5 3H7A2 2 0 0 0 5 5V19');
    close(box(minifyPath(d)), box(d));
  });

  it('computes exact bounds for arcs and curves', () => {
    close(box('M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0'), { minX: 2, minY: 2, maxX: 22, maxY: 22 });
    close(box('M2 12C2 2 22 2 22 12'), { minX: 2, minY: 4.5, maxX: 22, maxY: 12 });
    close(nodeBounds(['circle', { cx: '12', cy: '12', r: '10' }]), { minX: 2, minY: 2, maxX: 22, maxY: 22 });
    close(nodeBounds(['rect', { x: '3', y: '4', width: '18', height: '16', rx: '2' }]), { minX: 3, minY: 4, maxX: 21, maxY: 20 });
  });
});

describe('shapes and transforms', () => {
  it('converts every shape to segments', () => {
    for (const node of [
      ['line', { x1: '2', y1: '2', x2: '22', y2: '22' }],
      ['polyline', { points: '2 2 12 22 22 2' }],
      ['polygon', { points: '2 2 12 22 22 2' }],
      ['ellipse', { cx: '12', cy: '12', rx: '10', ry: '5' }],
      ['rect', { x: '2', y: '2', width: '20', height: '20' }],
    ]) {
      expect(shapeToSegments(node).length, node[0]).toBeGreaterThan(1);
    }
  });

  it('keeps primitives under uniform scale and translation', () => {
    expect(transformNode(['circle', { cx: '12', cy: '12', r: '10' }], 0.5, 1, 1)).toEqual(['circle', { cx: 7, cy: 7, r: 5 }]);
    const p = transformNode(['path', { d: 'M2 2h20' }], 0.5, 1, 1);
    expect(p[0]).toBe('path');
    close(box(p[1].d), { minX: 2, minY: 2, maxX: 12, maxY: 2 });
  });

  it('mirrors arcs correctly', () => {
    const d = 'M2 12a10 10 0 0 1 20 0';
    const mirrored = transformSegments(parsePath(d), [-1, 0, 0, 1, 24, 0]);
    close(segmentsBounds(mirrored), segmentsBounds(parsePath(d)));
  });
});

describe('flattening, trimming and clipping', () => {
  it('flattens closed and open subpaths', () => {
    const polys = flatten(parsePath('M2 2h20v20H2z M4 4l4 4'));
    expect(polys).toHaveLength(2);
    expect(polys[0].closed).toBe(true);
    expect(polys[1].closed).toBe(false);
    expect(pointInPolygon([12, 12], polys[0].points)).toBe(true);
    expect(pointInPolygon([30, 12], polys[0].points)).toBe(false);
  });

  it('resamples by arc length', () => {
    const pts = resample(
      [
        [0, 0],
        [10, 0],
      ],
      11,
    );
    expect(pts).toHaveLength(11);
    expect(pts[5][0]).toBeCloseTo(5);
  });

  it('trims segments exactly at the excluded region', () => {
    const { segs, changed } = trimSegments(parsePath('M2 12h20'), (p) => Math.abs(p[0] - 12) < 3);
    expect(changed).toBe(true);
    const subs = flatten(segs);
    expect(subs).toHaveLength(2);
    expect(subs[0].points.at(-1)[0]).toBeCloseTo(9, 3);
    expect(subs[1].points[0][0]).toBeCloseTo(15, 3);
    expect(trimSegments(parsePath('M2 12h20'), () => false).changed).toBe(false);
  });

  it('subtracts a disk from a polygon', () => {
    const square = [
      [2, 2],
      [22, 2],
      [22, 22],
      [2, 22],
    ];
    const rings = subtractDisk(square, [22, 22], 6);
    expect(rings).toHaveLength(1);
    for (const p of rings[0]) expect(Math.hypot(p[0] - 22, p[1] - 22)).toBeGreaterThan(5.9);
    expect(subtractDisk(square, [12, 12], 3)).toHaveLength(2);
    expect(subtractDisk(square, [12, 12], 40)).toHaveLength(0);
  });
});

describe('nodes', () => {
  it('parses and serializes icon bodies', () => {
    const body = '<path d="M2 2h20"/><g class="a"><circle cx="12" cy="12" r="4"/></g><style>.a{b:c}</style>';
    const nodes = parseBody(body);
    expect(nodes).toHaveLength(3);
    expect(nodes[1][2][0][0]).toBe('circle');
    expect(nodes[2][2]).toBe('.a{b:c}');
    expect(nodesToString(nodes)).toBe(body);
  });

  it('rounds geometry for output', () => {
    expect(roundNode(['circle', { cx: 12.3456, cy: 1, r: 0.125 }], 2)).toEqual(['circle', { cx: '12.35', cy: '1', r: '0.13' }]);
  });
});

describe('solid analysis', () => {
  it('fills closed outer shapes and knocks out the lines inside them', () => {
    const nodes = parseBody('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8 13h8"/>');
    expect(analyzeSolid(nodes)).toEqual({ fill: [0], knock: [1, 2] });
  });

  it('returns null when nothing is closed', () => {
    expect(analyzeSolid(parseBody('<path d="M5 12h14"/><path d="M12 5v14"/>'))).toBeNull();
  });

  it('leaves strokes outside the filled shapes alone', () => {
    const r = analyzeSolid(parseBody('<circle cx="8" cy="12" r="5"/><path d="M16 6v12"/>'));
    expect(r).toEqual({ fill: [0], knock: [] });
  });
});
