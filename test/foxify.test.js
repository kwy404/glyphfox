import { describe, expect, it } from 'vitest';
import { canonicalSvg, foxify, lintBody, lintSvg, parseTransform, parseXml } from 'glyphfox/tools';
import { segmentsBounds, parsePath, shapeToSegments } from '../packages/glyphfox/dist/core/geometry.js';
import { parseBody } from '../packages/glyphfox/dist/core/nodes.js';

const bounds = (body) => {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const n of parseBody(body)) segmentsBounds(shapeToSegments(n), b);
  return b;
};

describe('Fox-ify', () => {
  it('maps filled icons from any grid into the padding box as strokes', () => {
    const r = foxify('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#111" d="M256 32 480 448H32z"/></svg>');
    expect(r.problems).toEqual([]);
    expect(lintSvg(r.svg)).toEqual([]);
    expect(r.notes.join(' ')).toContain('outline');
    const b = bounds(r.body);
    expect(b.minX).toBeGreaterThanOrEqual(2);
    expect(b.maxY).toBeLessThanOrEqual(22);
  });

  it('bakes nested transforms, use and symbols', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100">
      <defs><symbol id="dot"><circle cx="5" cy="5" r="5"/></symbol></defs>
      <g transform="translate(10 10) scale(2)"><rect x="0" y="0" width="20" height="10" rx="2" stroke="#000" fill="none"/></g>
      <g transform="rotate(45 50 50)"><line x1="20" y1="50" x2="80" y2="50" stroke="black"/></g>
      <use xlink:href="#dot" x="70" y="70"/>
      <text x="0" y="0">ignored</text>
    </svg>`;
    const r = foxify(svg);
    expect(r.problems).toEqual([]);
    expect(r.body).not.toContain('transform');
    expect(parseBody(r.body).length).toBe(3);
    expect(r.notes.join(' ')).toContain('text');
  });

  it('keeps stroke icons drawn on a 24 grid where they are', () => {
    const src = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><circle cx="12" cy="12" r="9"/></svg>';
    const r = foxify(src);
    expect(r.problems).toEqual([]);
    expect(r.body).toContain('<circle cx="12" cy="12" r="9"/>');
    expect(r.body).toMatch(/M5 12(H19|h14)/);
  });

  it('snaps points to the grid', () => {
    const r = foxify('<svg viewBox="0 0 24 24" fill="none" stroke="#000"><path d="M5.13 12.07L18.91 11.94"/></svg>', { snap: 0.5 });
    expect(r.body).toMatch(/M5 12(H19|h14)/);
  });

  it('reports drawings with nothing to draw', () => {
    const r = foxify('<svg viewBox="0 0 24 24"><path d="M2 2h20" fill="none" stroke="none"/></svg>');
    expect(r.problems[0].rule).toBe('empty');
    expect(() => foxify('<div></div>')).toThrow();
  });

  it('exposes the parser, transforms and canonical output', () => {
    expect(parseXml('<?xml version="1.0"?><!DOCTYPE svg><svg a="1"><g><path d="M0 0"/></g></svg>').children[0].name).toBe('g');
    expect(parseTransform('translate(2 3) scale(2)')).toEqual([2, 0, 0, 2, 2, 3]);
    const c = canonicalSvg('<path d="M5 12h14"/>');
    expect(lintSvg(c)).toEqual([]);
    expect(lintBody('<path d="M0 0h30"/>')[0].rule).toBe('padding');
    expect(parsePath('M2 2h20').length).toBe(2);
  });

  it('resolves percentages and units against the viewport', () => {
    const r = foxify('<svg viewBox="0 0 24 24"><rect x="10%" y="10%" width="80%" height="80%" fill="none" stroke="#000"/></svg>');
    expect(r.problems).toEqual([]);
    const b = bounds(r.body);
    expect(b.minX).toBeGreaterThanOrEqual(2);
    expect(b.maxX).toBeLessThanOrEqual(22);
    expect(foxify('<svg width="48px" height="48px"><circle cx="24px" cy="24px" r="18px" fill="none" stroke="#000"/></svg>').problems).toEqual([]);
  });

  it('applies the viewBox of nested svg elements', () => {
    const r = foxify('<svg viewBox="0 0 48 48"><svg x="8" y="8" width="32" height="32" viewBox="0 0 24 24"><path d="M2 12h20" stroke="#000"/></svg></svg>', { fit: 'viewbox' });
    const b = bounds(r.body);
    expect(b.minX).toBeCloseTo(5, 0);
    expect(b.maxX).toBeCloseTo(19, 0);
  });
});
