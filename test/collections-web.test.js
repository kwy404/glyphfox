// @vitest-environment jsdom
// Collection names in <glyph-fox> and in the CDN build, straight from this
// checkout's dist.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import '../packages/glyphfox/dist/web/index.js';

const wait = (ms = 30) => new Promise((r) => setTimeout(r, ms));

describe('collections in the web component and the CDN build', () => {
  it('<glyph-fox> takes collection names', async () => {
    const node = document.createElement('glyph-fox');
    node.setAttribute('name', 'display/calendar-clock');
    node.setAttribute('size', '64');
    node.setAttribute('weight', '1.5');
    document.body.appendChild(node);
    await wait();
    const svg = node.shadowRoot.querySelector('svg');
    expect(svg.getAttribute('viewBox')).toBe('0 0 48 48');
    expect(svg.getAttribute('width')).toBe('64');
    expect(svg.getAttribute('stroke-width')).toBe('1.5');
    node.setAttribute('name', 'isometric/cube');
    await wait();
    expect(node.shadowRoot.innerHTML).toContain('glyphfox-isometric-cube');
  });

  it('the CDN build carries the collections under the same names', async () => {
    const code = readFileSync(resolve('packages/glyphfox/dist/web/glyphfox.min.js'), 'utf8');
    expect(code).not.toMatch(/\bimport\s*\(/);
    const dom = new JSDOM('<!doctype html><body><glyph-fox name="display/calendar-clock"></glyph-fox><i data-glyph="isometric/cube"></i></body>', { runScripts: 'outside-only', pretendToBeVisual: true });
    dom.window.eval(code);
    await wait(50);
    const { document: doc, glyphfox } = dom.window;
    expect(glyphfox.toSvg('isometric/cube')).toContain('glyphfox-isometric-cube');
    expect(doc.querySelector('glyph-fox').shadowRoot.innerHTML).toContain('viewBox="0 0 48 48"');
    expect(doc.querySelector('svg[data-glyph-done="isometric/cube"]')).toBeTruthy();
  });
});
