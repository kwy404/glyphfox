// glyphfox/qwik rendered on the server with @qwik.dev/core/server.
import { describe, expect, it } from 'vitest';
import { jsx } from '@qwik.dev/core';
import { renderToString } from '@qwik.dev/core/server';
import * as Q from 'glyphfox/qwik';
import { icons, iconNames } from 'glyphfox';
import { componentName } from '../packages/glyphfox/dist/core/formats.js';
import { STATIC_PROP_CASES, checkDefault } from './fixtures/props.js';

// Outside a Qwik build there is no client manifest; an empty one is enough for static markup.
globalThis.__QWIK_MANIFEST__ = { manifestHash: 'test', symbols: {}, mapping: {}, bundles: {}, version: '1' };

const comp = (name) => Q[componentName(name)];
/** The <svg> markup of a component rendered by the Qwik server renderer. */
async function ssr(C, props = {}) {
  const { html } = await renderToString(jsx(C, props), { containerTagName: 'div', qwikLoader: 'never' });
  const m = /<svg[\s\S]*<\/svg>/.exec(html);
  // Drop the empty ":" markers Qwik adds to every element.
  return (m ? m[0] : html).replace(/ :(="[^"]*")?(?=[ >/])/g, '');
}

describe('glyphfox/qwik', () => {
  it('exports one lightweight component per icon, named NameIcon', () => {
    for (const n of iconNames) expect(typeof comp(n), n).toBe('function');
  });

  it('keeps the plain use simple', async () => {
    checkDefault(await ssr(Q.FileIcon));
  });

  for (const c of STATIC_PROP_CASES) {
    it(`supports the ${c.prop} prop`, async () => c.check(await ssr(comp(c.icon), c.props)));
  }

  it('passes class, style and attributes through', async () => {
    const out = await ssr(Q.FileIcon, { class: 'extra', style: { color: 'red' }, id: 'x1', 'data-test': 'y' });
    expect(out).toMatch(/class="glyphfox glyphfox-file extra"/);
    expect(out).toMatch(/style="color: ?red;?"/);
    expect(out).toContain('id="x1"');
    expect(out).toContain('data-test="y"');
  });

  it('runs morphTo on CSS and switches state triggers with active', async () => {
    const hover = await ssr(Q.MenuIcon, { morphTo: 'x', trigger: 'hover' });
    expect(hover).toMatch(/\.gf-x[0-9a-z]+:hover/);
    expect(hover).toContain('class="gf-ma"');
    const off = await ssr(Q.MenuIcon, { morphTo: 'x', trigger: 'state' });
    expect(off).not.toMatch(/class="[^"]*gf-on/);
  });

  it('replays click animations with an inline handler', async () => {
    const out = await ssr(Q.HeartIcon, { animate: 'pop', trigger: 'click' });
    expect(out).toMatch(/onclick="[^"]*data-gf-run/);
    expect(out).toMatch(/\[data-gf-run="1"\]/);
  });

  it('renders specs with Icon and fusions with Fusion', async () => {
    Q.registerIcons(icons);
    expect(await ssr(Q.Icon, { name: 'file+check@tr' })).toContain('glyphfox-file-check-tr');
    expect(await ssr(Q.Icon, { name: 'heart/solid' })).toContain('class="gf-fill"');
    expect(await ssr(Q.Fusion, { icons: ['cloud', 'lock'], layout: 'side' })).toContain('glyphfox-cloud-lock-side');
  });
});
