import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import * as S from 'glyphfox/svelte';
import { iconNames } from 'glyphfox';
import { get } from 'svelte/store';
import { componentName } from '../packages/glyphfox/dist/core/formats.js';
import { PROP_CASES, checkDefault } from './fixtures/props.js';

const comp = (name) => S[componentName(name)];
const ssr = (C, props = {}) => render(C, { props }).body;

describe('glyphfox/svelte', () => {
  it('exports one component per icon, named NameIcon', () => {
    for (const n of iconNames) expect(comp(n), n).toBeTruthy();
  });

  it('keeps the plain use simple', () => {
    checkDefault(ssr(S.FileIcon));
  });

  for (const c of PROP_CASES) {
    it(`supports the ${c.prop} prop`, () => c.check(ssr(comp(c.icon), c.props)));
  }

  it('passes class, style and attributes through', () => {
    const out = ssr(S.FileIcon, { class: 'extra', style: 'color: red', id: 'x1' });
    expect(out).toMatch(/class="glyphfox glyphfox-file extra"/);
    expect(out).toContain('style="color: red"');
    expect(out).toContain('id="x1"');
  });

  it('renders specs with Icon and fusions with Fusion', () => {
    expect(ssr(S.Icon, { name: 'file+check@tr' })).toContain('glyphfox-file-check-tr');
    expect(ssr(S.Icon, { name: 'heart/solid' })).toContain('class="gf-fill"');
    expect(ssr(S.Fusion, { icons: ['cloud', 'lock'], layout: 'side' })).toContain('glyphfox-cloud-lock-side');
    expect(ssr(S.MorphIcon, { name: 'menu' })).toContain('glyphfox-menu');
  });

  it('morphs with the morphStore', async () => {
    const store = S.morphStore('menu', { duration: 30 });
    expect(get(store).icon.name).toBe('menu');
    store.set('x');
    await new Promise((r) => setTimeout(r, 200));
    expect(get(store).icon.name).toBe('x');
  });
});
