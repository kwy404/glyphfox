// @vitest-environment jsdom
// Prefixed names from icon sources in Vue and the web component (Svelte
// renders on the server in sources.test.js).
import { describe, expect, it } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { registerIconSource } from 'glyphfox';
import * as V from 'glyphfox/vue';
import 'glyphfox/web';

registerIconSource('pkg', { get: (name) => (name === 'ring' ? { body: '<circle cx="12" cy="12" r="7"/>' } : null) });
registerIconSource('slow', (name) => new Promise((r) => setTimeout(() => r(name === 'bar' ? { body: '<path d="M4 12h16"/>' } : null), 5)));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

describe('icon sources in the packages', () => {
  it('renders prefixed names in Vue', async () => {
    const html = await renderToString(createSSRApp({ render: () => h(V.Icon, { name: 'pkg:ring', weight: 1.5, variant: 'duotone' }) }));
    expect(html).toContain('<circle cx="12" cy="12" r="7"');
    expect(html).toContain('stroke-width="1.5"');
  });

  it('loads prefixed names in the web component', async () => {
    const node = document.createElement('glyph-fox');
    node.setAttribute('name', 'slow:bar');
    node.setAttribute('animate', 'draw');
    document.body.appendChild(node);
    await wait(60);
    const svg = node.shadowRoot.querySelector('svg');
    expect(svg.outerHTML).toContain('M4 12h16');
    expect(svg.getAttribute('class')).toContain('glyphfox-slow-bar');
  });

  it('fuses prefixed names with glyphfox icons in the web component', async () => {
    const node = document.createElement('glyph-fox');
    node.setAttribute('name', 'cloud&pkg:ring');
    node.setAttribute('layout', 'side');
    document.body.appendChild(node);
    await wait(60);
    expect(node.shadowRoot.querySelector('svg').getAttribute('class')).toContain('glyphfox-cloud-pkg-ring');
  });
});
