// glyphfox/solid rendered on the server with solid-js/web.
import { describe, expect, it } from 'vitest';
import { createComponent, createRoot, createSignal } from 'solid-js';
import { renderToString } from 'solid-js/web';
import * as S from 'glyphfox/solid';
import { iconNames } from 'glyphfox';
import { componentName } from '../packages/glyphfox/dist/core/formats.js';
import { PROP_CASES, checkDefault } from './fixtures/props.js';

const comp = (name) => S[componentName(name)];
const ssr = (C, props = {}) => renderToString(() => createComponent(C, props));

describe('glyphfox/solid', () => {
  it('exports one component per icon, named NameIcon', () => {
    for (const n of iconNames) expect(typeof comp(n), n).toBe('function');
  });

  it('keeps the plain use simple', () => {
    checkDefault(ssr(S.FileIcon));
  });

  for (const c of PROP_CASES) {
    it(`supports the ${c.prop} prop`, () => c.check(ssr(comp(c.icon), c.props)));
  }

  it('passes class, style and attributes through', () => {
    const out = ssr(S.FileIcon, { class: 'extra', style: { color: 'red' }, id: 'x1', 'data-test': 'y' });
    expect(out).toMatch(/class="glyphfox glyphfox-file extra ?"/);
    expect(out).toMatch(/style="color: ?red"/);
    expect(out).toContain('id="x1"');
    expect(out).toContain('data-test="y"');
  });

  it('labels with aria-label when given and stays decorative otherwise', () => {
    expect(ssr(S.FileIcon, { 'aria-label': 'Doc' })).not.toContain('aria-hidden');
    expect(ssr(S.FileIcon)).toContain('aria-hidden="true"');
  });

  it('renders specs with Icon and fusions with Fusion', () => {
    expect(ssr(S.Icon, { name: 'file+check@tr' })).toContain('glyphfox-file-check-tr');
    expect(ssr(S.Icon, { name: 'heart/solid' })).toContain('class="gf-fill"');
    expect(ssr(S.Fusion, { icons: ['cloud', 'lock'], layout: 'side' })).toContain('glyphfox-cloud-lock-side');
    expect(ssr(S.Fusion, { icons: ['cloud', 'lock'], layout: 'overlap', variant: 'solid' })).toContain('class="gf-fill"');
    expect(ssr(S.MorphIcon, { name: 'menu' })).toContain('glyphfox-menu');
  });

  it('creates components for custom icon data', () => {
    const Dot = S.createIcon({ name: 'my-dot', body: '<circle cx="12" cy="12" r="4"/>', tags: [], categories: [] });
    const out = ssr(Dot, { size: 20 });
    expect(out).toContain('glyphfox-my-dot');
    expect(out).toContain('<circle cx="12" cy="12" r="4"');
  });

  it('exposes useMorph as an accessor', () => {
    createRoot((dispose) => {
      const [name] = createSignal('menu');
      const frame = S.useMorph(name);
      expect(frame().icon.name).toBe('menu');
      dispose();
    });
  });
});
