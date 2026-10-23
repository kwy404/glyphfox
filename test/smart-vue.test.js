// @vitest-environment jsdom
// Smart icons for Vue: SmartIcon, StatusIcon and IconGroup.
import { describe, expect, it } from 'vitest';
import { createApp, createSSRApp, h, nextTick, ref } from 'vue';
import { renderToString } from 'vue/server-renderer';
import * as V from '../packages/glyphfox/dist/vue/index.js';

const ssr = (C, props = {}, children) => renderToString(createSSRApp({ render: () => h(C, props, children) }));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function mount(render) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const app = createApp({ render });
  app.mount(el);
  return { el, app };
}

describe('glyphfox/vue smart icons', () => {
  it('exports SmartIcon, StatusIcon and IconGroup', () => {
    for (const n of ['SmartIcon', 'StatusIcon', 'IconGroup']) expect(V[n].name).toBe(n);
  });

  it('renders data icons with props from templates', async () => {
    const out = await ssr(V.SmartIcon, { kind: 'battery', value: '0.5', size: '32', class: 'x', id: 'b1' });
    expect(out).toContain('glyphfox-smart-battery');
    expect(out).toContain('width="32"');
    expect(out).toContain('id="b1"');
    expect(out).toMatch(/class="[^"]*\bx\b/);
    expect(await ssr(V.SmartIcon, { kind: 'file', ext: 'csv' })).toContain('>CSV</text>');
    expect(await ssr(V.SmartIcon, { kind: 'currency', locale: 'de-DE' })).toContain('gf-currency-euro');
    expect(await ssr(V.SmartIcon, { kind: 'badge', count: 7 })).toContain('>7</text>');
    expect(await ssr(V.SmartIcon, { kind: 'signal', value: 0.5, title: 'auto' })).toContain('<title>Signal 2 of 4</title>');
    expect(await ssr(V.SmartIcon, { name: 'chevron-right', locale: 'fa' })).toContain('matrix(-1 0 0 1 24 0)');
  });

  it('morphs StatusIcon on state changes', async () => {
    const state = ref('idle');
    const { el, app } = mount(() => h(V.StatusIcon, { state: state.value, duration: 240 }));
    expect(el.querySelector('svg').getAttribute('class')).toContain('gf-status-idle');
    state.value = 'error';
    await nextTick();
    await wait(80);
    expect(el.querySelector('svg').getAttribute('class')).toContain('glyphfox-status-idle-status-error');
    await wait(400);
    expect(el.querySelector('svg').getAttribute('class')).toContain('glyphfox-status-error');
    state.value = 'loading';
    await nextTick();
    await wait(400);
    expect(el.innerHTML).toContain('gf-spin');
    app.unmount();
  });

  it('staggers IconGroup children and items', async () => {
    const out = await ssr(V.IconGroup, { animate: 'pop', stagger: 70, size: 18 }, () => [h(V.HomeIcon), h(V.FileIcon), h(V.HeartIcon, { animate: 'wiggle' })]);
    expect(out).toContain('class="glyphfox-group"');
    expect(out).toMatch(/animation:gf-pop 520ms [^;}]* 70ms/);
    expect(out).toContain('@keyframes gf-wiggle');
    expect((out.match(/width="18"/g) || []).length).toBe(3);
    const items = await ssr(V.IconGroup, { icons: ['home', { kind: 'clock', time: '10:10' }], animate: 'spin', stagger: 40 });
    expect(items).toContain('glyphfox-smart-clock');
    expect(items).toMatch(/animation:gf-spin 1000ms [^;}]* 40ms/);
  });

  it('plays IconGroup on hover', async () => {
    const { el, app } = mount(() => h(V.IconGroup, { animate: 'bounce', trigger: 'hover' }, () => [h(V.HomeIcon), h(V.FileIcon)]));
    const on = () => [...el.querySelectorAll('svg')].filter((s) => s.classList.contains('gf-on')).length;
    expect(on()).toBe(0);
    el.querySelector('.glyphfox-group').dispatchEvent(new MouseEvent('mouseenter'));
    await nextTick();
    expect(on()).toBe(2);
    app.unmount();
  });
});
