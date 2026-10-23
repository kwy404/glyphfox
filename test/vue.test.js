// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createApp, createSSRApp, h, nextTick, ref } from 'vue';
import { renderToString } from 'vue/server-renderer';
import * as V from 'glyphfox/vue';
import { iconNames } from 'glyphfox';
import { componentName } from '../packages/glyphfox/dist/core/formats.js';
import { PROP_CASES, checkDefault } from './fixtures/props.js';

const comp = (name) => V[componentName(name)];
const ssr = (C, props = {}, attrs = {}) => renderToString(createSSRApp({ render: () => h(C, { ...props, ...attrs }) }));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

describe('glyphfox/vue', () => {
  it('exports one component per icon, named NameIcon', () => {
    for (const n of iconNames) {
      const C = comp(n);
      expect(C, n).toBeTruthy();
      expect(C.name).toBe(componentName(n));
    }
  });

  it('keeps the plain use simple', async () => {
    checkDefault(await ssr(V.FileIcon));
  });

  for (const c of PROP_CASES) {
    it(`supports the ${c.prop} prop`, async () => c.check(await ssr(comp(c.icon), c.props)));
  }

  it('accepts string values from templates', async () => {
    const out = await ssr(V.FileIcon, { size: '32', weight: '1.5', rotate: '90' });
    expect(out).toContain('width="32"');
    expect(out).toContain('stroke-width="1.5"');
    expect(out).toContain('rotate(90 12 12)');
  });

  it('passes class, style and attributes through', async () => {
    const out = await ssr(V.FileIcon, {}, { class: 'extra', style: 'color: red', id: 'x1' });
    expect(out).toMatch(/class="glyphfox glyphfox-file extra"/);
    expect(out).toContain('color:red');
    expect(out).toContain('id="x1"');
  });

  it('renders specs with Icon and fusions with Fusion', async () => {
    expect(await ssr(V.Icon, { name: 'file+check@tr' })).toContain('glyphfox-file-check-tr');
    expect(await ssr(V.Icon, { name: 'heart/solid' })).toContain('class="gf-fill"');
    expect(await ssr(V.Fusion, { icons: ['cloud', 'lock'], layout: 'side' })).toContain('glyphfox-cloud-lock-side');
  });

  it('replays click animations in the browser', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const app = createApp({ render: () => h(V.HeartIcon, { animate: 'pop', trigger: 'click' }) });
    app.mount(el);
    const svg = () => el.querySelector('svg');
    expect(svg().hasAttribute('data-gf-run')).toBe(false);
    svg().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(svg().getAttribute('data-gf-run')).toBe('1');
    app.unmount();
  });

  it('morphs with morphTo, MorphIcon and useMorph', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const name = ref('menu');
    const app = createApp({
      render: () => [h(V.MenuIcon, { morphTo: 'x', duration: 40 }), h(V.MorphIcon, { name: name.value, duration: 40 })],
    });
    app.mount(el);
    await wait(30);
    name.value = 'x';
    await wait(250);
    const classes = [...el.querySelectorAll('svg')].map((s) => s.getAttribute('class'));
    expect(classes[0]).toContain('glyphfox-x');
    expect(classes[1]).toContain('glyphfox-x');
    expect(typeof V.useMorph).toBe('function');
    app.unmount();
  });
});
