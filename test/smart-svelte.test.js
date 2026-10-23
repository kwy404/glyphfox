// Smart icons for Svelte 5 (server rendering, like test/svelte.test.js).
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { createRawSnippet } from 'svelte';
import * as S from '../packages/glyphfox/dist/svelte/index.js';
import { groupItems, statusMarkup } from '../packages/glyphfox/dist/smart/svelte/smart.js';

const ssr = (C, props = {}) => render(C, { props }).body;
const snippet = (markup) => createRawSnippet(() => ({ render: () => markup }));

describe('glyphfox/svelte smart icons', () => {
  it('exports SmartIcon, StatusIcon and IconGroup', () => {
    for (const n of ['SmartIcon', 'StatusIcon', 'IconGroup']) expect(S[n], n).toBeTruthy();
  });

  it('renders data icons with the shared props and attributes', () => {
    const out = ssr(S.SmartIcon, { kind: 'thermometer', value: 30, min: -10, max: 40, size: 28, class: 'x', id: 't1' });
    expect(out).toContain('glyphfox-smart-thermometer');
    expect(out).toContain('width="28"');
    expect(out).toContain('id="t1"');
    expect(out).toMatch(/class="[^"]*\bx\b/);
    expect(ssr(S.SmartIcon, { kind: 'calendar', date: '2026-02-09', locale: 'en' })).toContain('>9</text>');
    expect(ssr(S.SmartIcon, { kind: 'currency', locale: 'en-GB' })).toContain('gf-currency-pound');
    expect(ssr(S.SmartIcon, { kind: 'volume', value: 0, title: 'auto' })).toContain('<title>Muted</title>');
    expect(ssr(S.SmartIcon, { name: 'reply', dir: 'rtl' })).toContain('matrix(-1 0 0 1 24 0)');
  });

  it('renders StatusIcon states and morph frames', () => {
    expect(ssr(S.StatusIcon, { state: 'loading' })).toContain('gf-spin');
    expect(ssr(S.StatusIcon, { state: 'success', title: 'auto' })).toContain('<title>Success</title>');
    const mid = statusMarkup('idle', 'success', 0.5, {});
    expect(mid.attrs.class).toContain('glyphfox-status-idle-status-success');
  });

  it('staggers IconGroup items and children', () => {
    const items = ssr(S.IconGroup, { icons: ['home', 'file', { kind: 'wifi', value: 0.5 }], animate: 'pop', stagger: 90 });
    expect(items).toContain('glyphfox-group');
    expect(items).toContain('glyphfox-smart-wifi');
    expect(items).toMatch(/animation:gf-pop 520ms [^;}]* 180ms/);
    const kids = ssr(S.IconGroup, { animate: 'bounce', stagger: 120, trigger: 'hover', children: snippet('<b>a</b>') });
    expect(kids).toMatch(/class="glyphfox-group gf-g[0-9a-z]+"/);
    expect(kids).toMatch(/:hover>:nth-child\(2\)\{animation-delay:120ms\}/);
    expect(groupItems(['home'], { animate: 'pop', trigger: 'click', run: '1' }, {})[0]).toContain('data-gf-run="1"');
  });
});
