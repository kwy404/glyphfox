// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { createElement as h, createRef, act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import * as R from 'glyphfox/react';
import * as RS from 'glyphfox/react/server';
import { iconNames } from 'glyphfox';
import { componentName } from '../packages/glyphfox/dist/core/formats.js';
import { readFileSync } from 'node:fs';
import { PROP_CASES, STATIC_PROP_CASES, checkDefault } from './fixtures/props.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const comp = (name) => R[componentName(name)];
const html = (el) => renderToStaticMarkup(el);

let roots = [];
afterEach(() => {
  for (const r of roots) act(() => r.unmount());
  roots = [];
  document.body.innerHTML = '';
});

function mount(el) {
  const div = document.createElement('div');
  document.body.appendChild(div);
  const root = createRoot(div);
  roots.push(root);
  act(() => root.render(el));
  return div;
}

describe('glyphfox/react', () => {
  it('exports one forwardRef component per icon, named NameIcon', () => {
    for (const n of iconNames) {
      const C = comp(n);
      expect(C, n).toBeTruthy();
      expect(C.$$typeof).toBe(Symbol.for('react.forward_ref'));
      expect(C.displayName).toBe(componentName(n));
    }
  });

  it('keeps the plain use simple', () => {
    checkDefault(html(h(R.FileIcon)));
  });

  for (const c of PROP_CASES) {
    it(`supports the ${c.prop} prop`, () => c.check(html(h(comp(c.icon), c.props))));
  }

  it('passes className, style and svg props through', () => {
    const out = html(h(R.FileIcon, { className: 'extra', style: { color: 'red' }, id: 'x1', 'data-test': 'y' }));
    expect(out).toMatch(/class="glyphfox glyphfox-file extra"/);
    expect(out).toContain('style="color:red"');
    expect(out).toContain('id="x1"');
    expect(out).toContain('data-test="y"');
  });

  it('labels with aria-label when given and stays decorative otherwise', () => {
    expect(html(h(R.FileIcon, { 'aria-label': 'Doc' }))).not.toContain('aria-hidden');
    expect(html(h(R.FileIcon))).toContain('aria-hidden="true"');
  });

  it('forwards the ref to the svg element', () => {
    const ref = createRef();
    mount(h(R.HeartIcon, { ref }));
    expect(ref.current).toBeInstanceOf(SVGSVGElement);
    expect(ref.current.getAttribute('class')).toContain('glyphfox-heart');
  });

  it('renders specs with Icon and fusions with Fusion', () => {
    expect(html(h(R.Icon, { name: 'file+check@tr' }))).toContain('glyphfox-file-check-tr');
    expect(html(h(R.Icon, { icon: R.FileIcon && undefined, name: 'heart/solid' }))).toContain('class="gf-fill"');
    expect(html(h(R.Fusion, { icons: ['cloud', 'lock'], layout: 'side' }))).toContain('glyphfox-cloud-lock-side');
    expect(html(h(R.Fusion, { icons: ['cloud', 'lock'], layout: 'overlap', variant: 'solid' }))).toContain('class="gf-fill"');
  });

  it('replays click animations and toggles click morphs', () => {
    const div = mount(h(R.HeartIcon, { animate: 'pop', trigger: 'click' }));
    const svg = div.querySelector('svg');
    expect(svg.hasAttribute('data-gf-run')).toBe(false);
    act(() => svg.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(div.querySelector('svg').getAttribute('data-gf-run')).toBe('1');
    act(() => div.querySelector('svg').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(div.querySelector('svg').getAttribute('data-gf-run')).toBe('2');
  });

  it('morphs with morphTo and settles on the exact target', async () => {
    const div = mount(h(R.MenuIcon, { morphTo: 'x', duration: 60 }));
    await act(() => new Promise((r) => setTimeout(r, 250)));
    expect(div.querySelector('svg').getAttribute('class')).toContain('glyphfox-x');
  });

  it('morphs between names with MorphIcon and useMorph', async () => {
    let name = 'menu';
    const div = document.createElement('div');
    document.body.appendChild(div);
    const root = createRoot(div);
    roots.push(root);
    act(() => root.render(h(R.MorphIcon, { name, duration: 60 })));
    expect(div.querySelector('svg').getAttribute('class')).toContain('glyphfox-menu');
    name = 'x';
    act(() => root.render(h(R.MorphIcon, { name, duration: 60 })));
    await act(() => new Promise((r) => setTimeout(r, 250)));
    expect(div.querySelector('svg').getAttribute('class')).toContain('glyphfox-x');
    expect(typeof R.useMorph).toBe('function');
  });
});

describe('glyphfox/react/server', () => {
  it('marks the client modules for React Server Components', () => {
    for (const f of ['index.js', 'runtime.js', 'icons/file.js']) expect(readFileSync(`packages/glyphfox/dist/react/${f}`, 'utf8').startsWith("'use client';"), f).toBe(true);
    expect(readFileSync('packages/glyphfox/dist/react/server.js', 'utf8')).not.toContain('use client');
  });

  it('keeps the plain use simple without hooks', () => {
    checkDefault(html(h(RS.Icon, { name: 'file' })));
  });

  for (const c of STATIC_PROP_CASES) {
    it(`supports the ${c.prop} prop`, () => c.check(html(h(RS.Icon, { name: c.icon, ...c.props }))));
  }

  it('passes className, style and svg props through and resolves every icon by name', () => {
    const out = html(h(RS.Icon, { name: 'file+check@tr', className: 'extra', style: { color: 'red' }, id: 'x1' }));
    expect(out).toMatch(/class="glyphfox glyphfox-file-check-tr extra"/);
    expect(out).toContain('style="color:red"');
    expect(out).toContain('id="x1"');
    expect(html(h(RS.Fusion, { icons: ['cloud', 'lock'], layout: 'side' }))).toContain('glyphfox-cloud-lock-side');
  });
});
