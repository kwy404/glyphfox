// Plotter (single line SVG and G-code) and STL exports.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { resolve } from '../packages/glyphfox/dist/index.js';
import { plotPaths, toGcode, toPlotSvg } from '../packages/glyphfox/src/export/plotter.js';
import { meshStats, stlMesh, toStl } from '../packages/glyphfox/src/export/stl.js';

const icon = (body, name = 'test') => ({ name, body, tags: [], categories: [] });
const len = (pts) => pts.slice(1).reduce((s, p, k) => s + Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]), 0);

describe('plotter paths', () => {
  it('keeps strokes only: no duotone layer, no fills', () => {
    const fenn = resolve('fenn');
    expect(fenn.body).toContain('gf-secondary');
    const plan = plotPaths(fenn);
    expect(plan.lifts).toBe(3);
    const filled = icon('<path d="M4 4h16v16H4Z" fill="currentColor" stroke="none"/><path d="M6 12h12"/>');
    const p = plotPaths(filled);
    expect(p.lifts).toBe(1);
    expect(p.draw).toBeCloseTo((12 * 50) / 24, 6);
  });

  it('works in millimetres inside the drawing area', () => {
    for (const name of ['heart', 'settings', 'sun', 'cloud&lock:side', 'file+check']) {
      const plan = plotPaths(resolve(name), { size: 30 });
      expect(plan.size).toBe(30);
      for (const pts of plan.paths) {
        expect(pts.length, name).toBeGreaterThanOrEqual(2);
        for (const [x, y] of pts) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(30);
          expect(y).toBeLessThanOrEqual(30);
        }
      }
      expect(plan.draw).toBeCloseTo(plan.paths.reduce((s, p) => s + len(p), 0), 6);
    }
  });

  it('joins strokes that touch into one pen down', () => {
    const touching = icon('<path d="M4 4h8"/><path d="M12 12V4"/><path d="M12 12H4"/><path d="M4 4v8"/>');
    expect(plotPaths(touching, { optimize: false }).lifts).toBe(4);
    const joined = plotPaths(touching);
    expect(joined.lifts).toBe(1);
    const pts = joined.paths[0];
    expect(Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1])).toBeLessThan(1e-9);
    const loopAndLine = icon('<circle cx="12" cy="12" r="6"/><path d="M12 6V2"/>');
    expect(plotPaths(loopAndLine).lifts).toBe(1);
  });

  it('orders strokes for less pen travel', () => {
    for (const name of ['heart', 'fenn', 'settings', 'grid', 'sun', 'calendar', 'cloud&lock:side', 'file+check']) {
      const plan = plotPaths(resolve(name));
      expect(plan.travel, name).toBeLessThanOrEqual(plan.travelBefore + 1e-9);
      expect(plotPaths(resolve(name), { optimize: false }).travel, name).toBeCloseTo(plan.travelBefore, 9);
    }
    const sun = plotPaths(resolve('sun'));
    expect(sun.lifts).toBeGreaterThan(5);
    expect(sun.travel).toBeLessThan(sun.travelBefore - 1);
    const scattered = icon(['M2 2h1', 'M20 20h1', 'M3 3h1', 'M19 19h1', 'M2 20h1', 'M20 2h1', 'M3 19h1', 'M19 3h1'].map((d) => `<path d="${d}"/>`).join(''));
    const s = plotPaths(scattered);
    expect(s.travel).toBeLessThan(s.travelBefore * 0.75);
  });

  it('keeps dots as short strokes and follows the tolerance', () => {
    const dots = plotPaths(resolve('fenn')).paths.filter((p) => len(p) < 0.1);
    expect(dots.length).toBe(2);
    const coarse = plotPaths(resolve('heart'), { tolerance: 0.5 }).paths[0].length;
    const fine = plotPaths(resolve('heart'), { tolerance: 0.01 }).paths[0].length;
    expect(fine).toBeGreaterThan(coarse);
  });
});

describe('single line SVG', () => {
  it('has one stroked path per pen down and nothing else', () => {
    const fenn = resolve('fenn');
    const svg = toPlotSvg(fenn, { size: 40, penWidth: 0.5 });
    const plan = plotPaths(fenn, { size: 40 });
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="40mm" height="40mm" viewBox="0 0 40 40">/);
    expect((svg.match(/<path /g) || []).length).toBe(plan.lifts);
    for (const m of svg.matchAll(/fill="([^"]*)"/g)) expect(m[1]).toBe('none');
    expect(svg).not.toContain('transform');
    expect(svg).toContain('stroke-width="0.5"');
    const tags = new Set([...svg.matchAll(/<([a-z]+)/g)].map((m) => m[1]));
    expect([...tags].sort()).toEqual(['path', 'svg', 'title']);
    for (const m of svg.matchAll(/ d="([^"]*)"/g)) expect(m[1]).toMatch(/^M[\d.]+ [\d.]+(L[\d.]+ [\d.]+)+$/);
  });
});

describe('G-code', () => {
  const bar = icon('<path d="M2 2h20"/>', 'bar');

  it('writes the setup, the stats and every pen move', () => {
    const g = toGcode(resolve('fenn'));
    const lines = g.trimEnd().split('\n');
    expect(g.endsWith('\n')).toBe(true);
    expect(lines[0]).toBe('; glyphfox plotter export: fenn');
    expect(lines[1]).toMatch(/^; 3 paths, draw [\d.]+ mm, travel [\d.]+ mm$/);
    expect(lines).toContain('G21');
    expect(lines).toContain('G90');
    expect(lines.filter((l) => l === 'G0 Z5').length).toBe(4);
    expect(lines.filter((l) => l === 'G1 Z0 F500').length).toBe(3);
    expect(lines.filter((l) => /^G1 X[-\d.]+ Y[-\d.]+ F1500$/.test(l)).length).toBe(3);
    expect(lines.filter((l) => /^G0 X[-\d.]+ Y[-\d.]+ F3000$/.test(l)).length).toBe(4);
    expect(lines[lines.length - 1]).toBe('G0 X0 Y0 F3000');
  });

  it('takes feed rates, pen commands, dwell, origin and the Y flip', () => {
    const g = toGcode(bar, { size: 24, feed: 1200, travelFeed: 2400, penUp: 'M3 S90', penDown: ['M3 S30', 'G4 P0.1'], dwell: 0.25, origin: [10, 5], header: ['G28'], footer: 'M2' });
    const lines = g.trimEnd().split('\n');
    expect(lines).toContain('G28');
    expect(lines.filter((l) => l === 'M3 S90').length).toBe(2);
    expect(lines.filter((l) => l === 'M3 S30').length).toBe(1);
    expect(lines.filter((l) => l === 'G4 P0.25').length).toBe(3);
    expect(lines).toContain('G0 X12 Y27 F2400');
    expect(lines).toContain('G1 X32 Y27 F1200');
    expect(lines[lines.length - 2]).toBe('G0 X10 Y5 F2400');
    expect(lines[lines.length - 1]).toBe('M2');
    const plain = toGcode(bar, { size: 24, flipY: false, decimals: 1 });
    expect(plain).toContain('G0 X2 Y2 F3000');
    expect(plain).toContain('G1 X22 Y2 F1500');
    expect(toGcode(bar, { size: 48 })).toContain('G0 X4 Y44 F3000');
  });
});

describe('STL', () => {
  it('builds watertight meshes for many icons in both variants', () => {
    for (const name of ['heart', 'settings', 'fenn', 'sun', 'cloud&lock:side', 'file+check']) {
      for (const variant of ['outline', 'solid']) {
        const s = meshStats(stlMesh(resolve(name), { variant }));
        expect(s.watertight, `${name} ${variant}`).toBe(true);
        expect(s.volume, `${name} ${variant}`).toBeGreaterThan(0);
        expect(s.triangles, `${name} ${variant}`).toBeLessThan(60000);
      }
    }
  });

  it('matches the area times the thickness', () => {
    const disk = icon('<circle cx="12" cy="12" r="8"/>', 'disk');
    const scale = 48 / 24;
    const solid = meshStats(stlMesh(disk, { variant: 'solid' }));
    expect(solid.volume / (Math.PI * 81 * scale * scale * 3)).toBeCloseTo(1, 2);
    const ring = meshStats(stlMesh(disk, { size: 24, thickness: 2 }));
    expect(ring.volume / (Math.PI * (81 - 49) * 2)).toBeCloseTo(1, 2);
    const solidHeart = meshStats(stlMesh(resolve('heart'), { variant: 'solid' })).volume;
    expect(solidHeart).toBeGreaterThan(meshStats(stlMesh(resolve('heart'))).volume * 1.5);
  });

  it('bevels the top edge, chamfered or round', () => {
    const disk = icon('<circle cx="12" cy="12" r="8"/>', 'disk');
    const flat = meshStats(stlMesh(disk, { variant: 'solid' }));
    const chamfer = meshStats(stlMesh(disk, { variant: 'solid', bevel: 1 }));
    const round = meshStats(stlMesh(disk, { variant: 'solid', bevel: 1, bevelStyle: 'round' }));
    for (const s of [chamfer, round]) {
      expect(s.watertight).toBe(true);
      expect(s.volume).toBeLessThan(flat.volume);
      expect(s.bounds.max[2]).toBeCloseTo(3, 5);
    }
    expect(round.volume).toBeGreaterThan(chamfer.volume);
    expect(Math.abs(round.volume - chamfer.volume)).toBeGreaterThan(1);
    const outline = meshStats(stlMesh(resolve('settings'), { bevel: 0.8, bevelStyle: 'round' }));
    expect(outline.watertight).toBe(true);
    const capped = meshStats(stlMesh(disk, { thickness: 2, bevel: 5 }));
    expect(capped.watertight).toBe(true);
    expect(capped.bounds.min[2]).toBe(0);
  });

  it('fits the size and thickness and reads correctly from above', () => {
    const square = meshStats(stlMesh(icon('<rect x="2" y="2" width="20" height="20"/>'), { size: 48, thickness: 4 }));
    expect(square.bounds.min[0]).toBeCloseTo(2, 1);
    expect(square.bounds.max[0]).toBeCloseTo(46, 1);
    expect(square.bounds.min[1]).toBeCloseTo(2, 1);
    expect(square.bounds.max[1]).toBeCloseTo(46, 1);
    expect(square.bounds.min[2]).toBe(0);
    expect(square.bounds.max[2]).toBe(4);
    const top = meshStats(stlMesh(icon('<path d="M4 4h4"/>'), { size: 24 }));
    expect(top.bounds.min[1]).toBeCloseTo(19, 1);
    expect(top.bounds.max[1]).toBeCloseTo(21, 1);
    expect(top.bounds.min[0]).toBeCloseTo(3, 1);
    expect(top.bounds.max[0]).toBeCloseTo(9, 1);
  });

  it('follows the resolution and handles empty icons', () => {
    const heart = resolve('heart');
    const low = stlMesh(heart, { resolution: 3 }).triangleCount;
    const high = stlMesh(heart, { resolution: 12 }).triangleCount;
    expect(high).toBeGreaterThan(low * 4);
    expect(stlMesh(heart, { resolution: 100 }).triangleCount).toBe(stlMesh(heart, { resolution: 16 }).triangleCount);
    const empty = stlMesh(icon(''));
    expect(empty.triangleCount).toBe(0);
    expect(meshStats(empty).watertight).toBe(true);
  });

  it('writes binary and ASCII STL', () => {
    const heart = resolve('heart');
    const mesh = stlMesh(heart);
    const bin = toStl(heart);
    expect(bin).toBeInstanceOf(Uint8Array);
    expect(bin.length).toBe(84 + 50 * mesh.triangleCount);
    const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
    expect(view.getUint32(80, true)).toBe(mesh.triangleCount);
    expect(String.fromCharCode(...bin.slice(0, 14))).toBe('glyphfox heart');
    for (let k = 0; k < mesh.triangleCount; k++) {
      const o = 84 + 50 * k;
      const n = Math.hypot(view.getFloat32(o, true), view.getFloat32(o + 4, true), view.getFloat32(o + 8, true));
      expect(Math.abs(n - 1)).toBeLessThan(1e-5);
      expect(view.getUint16(o + 48, true)).toBe(0);
    }
    const ascii = toStl(heart, { format: 'ascii', resolution: 3 });
    expect(typeof ascii).toBe('string');
    expect(ascii.startsWith('solid heart\n')).toBe(true);
    expect(ascii.endsWith('endsolid heart\n')).toBe(true);
    expect((ascii.match(/facet normal/g) || []).length).toBe(stlMesh(heart, { resolution: 3 }).triangleCount);
    expect(ascii).toMatch(/vertex [-\d.e]+ [-\d.e]+ [-\d.e]+/);
  });

  it('stays fast and browser safe', () => {
    const t0 = performance.now();
    for (const name of ['heart', 'settings', 'fenn']) toStl(resolve(name), { bevel: 0.5 });
    expect(performance.now() - t0).toBeLessThan(5000);
    for (const f of ['plotter.js', 'stl.js']) {
      const src = readFileSync(resolvePath('packages/glyphfox/src/export', f), 'utf8');
      expect(src, f).not.toMatch(/from 'node:|require\(|\bBuffer\b/);
    }
  });
});
