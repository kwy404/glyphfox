// @vitest-environment jsdom
// glyphfox/preact rendered with preact-render-to-string and in the DOM.
import { afterEach, describe, expect, it } from 'vitest';
import { createRef, h, render } from 'preact';
import { act } from 'preact/test-utils';
import { renderToString } from 'preact-render-to-string';
import * as P from 'glyphfox/preact';
import { iconNames } from 'glyphfox';
import { componentName } from '../packages/glyphfox/dist/core/formats.js';
import { PROP_CASES, checkDefault } from './fixtures/props.js';

const comp = (name) => P[componentName(name)];
const html = (C, props = {}) => renderToString(h(C, props));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let roots = [];
afterEach(() => {
  for (const r of roots) render(null, r);
  roots = [];
  document.body.innerHTML = '';
});

function mount(el) {
  const div = document.createElement('div');
  document.body.appendChild(div);
  roots.push(div);
  act(() => render(el, div));
  return div;
}

describe('glyphfox/preact', () => {
  it('exports one component per icon, named NameIcon', () => {
    for (const n of iconNames) {
      const C = comp(n);
      expect(typeof C, n).toBe('function');
      expect(C.displayName).toBe(componentName(n));
    }
  });

  it('keeps the plain use simple', () => {
    checkDefault(html(P.FileIcon));
  });

  for (const c of PROP_CASES) {
    it(`supports the ${c.prop} prop`, () => c.check(html(comp(c.icon), c.props)));
  }

  it('passes class, style and svg props through', () => {
    const out = html(P.FileIcon, { class: 'extra', style: { color: 'red' }, id: 'x1', 'data-test': 'y' });
    expect(out).toMatch(/class="glyphfox glyphfox-file extra"/);
    expect(out).toMatch(/style="color: ?red;?"/);
    expect(out).toContain('id="x1"');
    expect(out).toContain('data-test="y"');
    expect(html(P.FileIcon, { className: 'other' })).toMatch(/class="glyphfox glyphfox-file other"/);
  });

  it('labels with aria-label when given and stays decorative otherwise', () => {
    expect(html(P.FileIcon, { 'aria-label': 'Doc' })).not.toContain('aria-hidden');
    expect(html(P.FileIcon)).toContain('aria-hidden="true"');
  });

  it('renders specs with Icon and fusions with Fusion', () => {
    expect(html(P.Icon, { name: 'file+check@tr' })).toContain('glyphfox-file-check-tr');
    expect(html(P.Icon, { name: 'heart/solid' })).toContain('class="gf-fill"');
    expect(html(P.Fusion, { icons: ['cloud', 'lock'], layout: 'side' })).toContain('glyphfox-cloud-lock-side');
    expect(html(P.Fusion, { icons: ['cloud', 'lock'], layout: 'overlap', variant: 'solid' })).toContain('class="gf-fill"');
  });

  it('forwards the ref to the svg element', () => {
    const ref = createRef();
    mount(h(P.HeartIcon, { ref }));
    expect(ref.current).toBeInstanceOf(SVGSVGElement);
    expect(ref.current.getAttribute('class')).toContain('glyphfox-heart');
  });

  it('replays click animations', () => {
    const div = mount(h(P.HeartIcon, { animate: 'pop', trigger: 'click' }));
    const svg = () => div.querySelector('svg');
    expect(svg().hasAttribute('data-gf-run')).toBe(false);
    act(() => svg().dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(svg().getAttribute('data-gf-run')).toBe('1');
    act(() => svg().dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(svg().getAttribute('data-gf-run')).toBe('2');
  });

  it('morphs with morphTo and MorphIcon', async () => {
    const div = mount(h('div', null, h(P.MenuIcon, { morphTo: 'x', duration: 40 }), h(P.MorphIcon, { name: 'menu', duration: 40 })));
    act(() => render(h('div', null, h(P.MenuIcon, { morphTo: 'x', duration: 40 }), h(P.MorphIcon, { name: 'x', duration: 40 })), div));
    await act(() => wait(250));
    const classes = [...div.querySelectorAll('svg')].map((s) => s.getAttribute('class'));
    expect(classes[0]).toContain('glyphfox-x');
    expect(classes[1]).toContain('glyphfox-x');
    expect(typeof P.useMorph).toBe('function');
  });
});
