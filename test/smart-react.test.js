// @vitest-environment jsdom
// Smart icons for React: SmartIcon, StatusIcon and IconGroup.
import { afterEach, describe, expect, it } from 'vitest';
import { act, createElement as h, createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import * as R from '../packages/glyphfox/dist/react/index.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const html = (el) => renderToStaticMarkup(el);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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
  return { div, root };
}

describe('glyphfox/react smart icons', () => {
  it('exports SmartIcon, StatusIcon and IconGroup as forwardRef components', () => {
    for (const n of ['SmartIcon', 'StatusIcon', 'IconGroup']) {
      expect(R[n].$$typeof, n).toBe(Symbol.for('react.forward_ref'));
      expect(R[n].displayName).toBe(n);
    }
  });

  it('renders data icons with the shared props and svg attributes', () => {
    const out = html(h(R.SmartIcon, { kind: 'battery', value: 0.5, size: 32, color: 'red', className: 'x', id: 'b1' }));
    expect(out).toMatch(/class="glyphfox glyphfox-smart-battery gf-hc250 x"|class="glyphfox glyphfox-smart-battery x gf-hc250"/);
    expect(out).toContain('width="32"');
    expect(out).toContain('color="red"');
    expect(out).toContain('id="b1"');
    expect(out).toContain('class="gf-level"');
    expect(html(h(R.SmartIcon, { kind: 'file', ext: 'pdf' }))).toMatch(/text-anchor="middle"[^>]*>PDF<\/text>/);
    expect(html(h(R.SmartIcon, { kind: 'currency', locale: 'pt-BR' }))).toContain('gf-currency-real');
    expect(html(h(R.SmartIcon, { kind: 'calendar', date: '2026-10-23', locale: 'en' }))).toContain('>23</text>');
    expect(html(h(R.SmartIcon, { kind: 'badge', count: 4 }))).toContain('>4</text>');
  });

  it('labels the data with title="auto" and stays decorative otherwise', () => {
    const out = html(h(R.SmartIcon, { kind: 'progress', value: 0.25, title: 'auto', locale: 'en-US' }));
    expect(out).toContain('<title>25%</title>');
    expect(out).toContain('role="img"');
    expect(html(h(R.SmartIcon, { kind: 'wifi', value: 1 }))).toContain('aria-hidden="true"');
    expect(html(h(R.SmartIcon, { kind: 'wifi', value: 1, 'aria-label': 'Online' }))).not.toContain('aria-hidden');
  });

  it('renders any icon with the locale behaviors', () => {
    expect(html(h(R.SmartIcon, { name: 'arrow-right', locale: 'ar' }))).toContain('matrix(-1 0 0 1 24 0)');
    expect(html(h(R.SmartIcon, { name: 'arrow-right', locale: 'en' }))).not.toContain('matrix(-1');
    expect(html(h(R.ArrowRightIcon))).toContain('gf-rtl');
  });

  it('ticks the clock and forwards the ref', async () => {
    const ref = createRef();
    const { div } = mount(h(R.SmartIcon, { kind: 'clock', tick: true, seconds: true, ref }));
    expect(ref.current.tagName.toLowerCase()).toBe('svg');
    const first = div.querySelector('.gf-second').getAttribute('d');
    await act(() => wait(1100));
    expect(div.querySelector('.gf-second').getAttribute('d')).not.toBe(first);
  });

  it('morphs StatusIcon between states and spins while loading', async () => {
    const { div, root } = mount(h(R.StatusIcon, { state: 'loading', duration: 240 }));
    const svg = () => div.querySelector('svg');
    expect(svg().getAttribute('class')).toContain('gf-status-loading');
    expect(div.innerHTML).toContain('gf-spin');
    act(() => root.render(h(R.StatusIcon, { state: 'success', duration: 240 })));
    await act(() => wait(80));
    expect(svg().getAttribute('class')).toContain('glyphfox-status-loading-status-success');
    await act(() => wait(400));
    expect(svg().getAttribute('class')).toContain('glyphfox-status-success');
    expect(div.innerHTML).not.toContain('gf-spin');
  });

  it('staggers IconGroup children and renders `icons`', () => {
    const out = html(h(R.IconGroup, { animate: 'pop', stagger: 100, size: 20 }, h(R.HomeIcon), h(R.FileIcon), h(R.HeartIcon, { animate: 'shake' })));
    expect(out.startsWith('<span role="group" class="glyphfox-group">')).toBe(true);
    expect(out).toMatch(/animation:gf-pop 520ms [^;}]* 100ms/);
    expect(out).toContain('@keyframes gf-shake');
    expect((out.match(/width="20"/g) || []).length).toBe(3);
    const items = html(h(R.IconGroup, { icons: ['home', { kind: 'battery', value: 0.3 }], animate: 'bounce', stagger: 50 }));
    expect(items).toContain('glyphfox-smart-battery');
    expect(items).toMatch(/animation:gf-bounce 900ms [^;}]* 50ms/);
  });

  it('plays IconGroup on hover and replays on click', () => {
    const { div } = mount(h(R.IconGroup, { animate: 'wiggle', trigger: 'hover' }, h(R.HomeIcon), h(R.FileIcon)));
    const group = div.querySelector('.glyphfox-group');
    const on = () => [...div.querySelectorAll('svg')].filter((s) => s.classList.contains('gf-on')).length;
    expect(on()).toBe(0);
    act(() => group.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body })));
    expect(on()).toBe(2);
    const click = mount(h(R.IconGroup, { animate: 'pop', trigger: 'click' }, h(R.HomeIcon)));
    const el = click.div.querySelector('.glyphfox-group');
    expect(click.div.innerHTML).toMatch(/\.gf-on \.gf-anim\{animation:gf-pop/);
    expect(click.div.querySelector('svg').classList.contains('gf-on')).toBe(false);
    const before = click.div.querySelector('svg');
    act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(click.div.innerHTML).not.toContain('.gf-on .gf-anim');
    expect(click.div.innerHTML).toMatch(/\.gf-a[0-9a-z]+ \.gf-anim\{animation:gf-pop/);
    expect(click.div.querySelector('svg')).not.toBe(before);
  });
});
