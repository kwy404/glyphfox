// glyphfox/astro components rendered on the server with the Astro Container
// API (the .astro files are compiled by test/stubs/astro-plugin.js).
import { beforeAll, describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import * as A from 'glyphfox/astro';
import FileDeep from 'glyphfox/astro/icons/file';
import { iconNames } from 'glyphfox';
import { componentName } from '../packages/glyphfox/dist/core/formats.js';
import { STATIC_PROP_CASES, checkDefault } from './fixtures/props.js';

const comp = (name) => A[componentName(name)];
let container;
beforeAll(async () => {
  container = await AstroContainer.create();
});
const ssr = (C, props = {}) => container.renderToString(C, { props });

describe('glyphfox/astro', () => {
  it('exports one component per icon, named NameIcon', () => {
    for (const n of iconNames) expect(comp(n), n).toBeTruthy();
  });

  it('keeps the plain use simple', async () => {
    checkDefault(await ssr(A.FileIcon));
  });

  for (const c of STATIC_PROP_CASES) {
    it(`supports the ${c.prop} prop`, async () => c.check(await ssr(comp(c.icon), c.props)));
  }

  it('passes class, style and attributes through', async () => {
    const out = await ssr(A.FileIcon, { class: 'extra', style: { color: 'red' }, id: 'x1', 'data-test': 'y' });
    expect(out).toMatch(/class="glyphfox glyphfox-file extra"/);
    expect(out).toContain('style="color:red"');
    expect(out).toContain('id="x1"');
    expect(out).toContain('data-test="y"');
  });

  it('renders every icon of the set by name with Icon and Fusion', async () => {
    expect(await ssr(A.Icon, { name: 'file+check@tr' })).toContain('glyphfox-file-check-tr');
    expect(await ssr(A.Icon, { name: 'heart/solid' })).toContain('class="gf-fill"');
    expect(await ssr(A.Fusion, { icons: ['cloud', 'lock'], layout: 'side' })).toContain('glyphfox-cloud-lock-side');
    expect(await ssr(A.MenuIcon, { morphTo: 'x', trigger: 'hover' })).toMatch(/\.gf-x[0-9a-z]+:hover/);
  });

  it('replays click animations with an inline handler', async () => {
    expect(await ssr(A.HeartIcon, { animate: 'pop', trigger: 'click' })).toContain('onclick="');
  });

  it('supports deep imports of one icon', async () => {
    expect(await ssr(FileDeep, { size: 20 })).toMatch(/<svg[^>]*width="20"[^>]*class="glyphfox glyphfox-file"/);
  });
});
