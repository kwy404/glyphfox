// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import 'glyphfox/web';
import { ATTRIBUTES } from 'glyphfox';
import { PROP_CASES, checkDefault } from './fixtures/props.js';

const wait = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const pkg = JSON.parse(readFileSync(resolve('packages/glyphfox/package.json'), 'utf8'));

async function el(attrs) {
  const node = document.createElement('glyph-fox');
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === undefined) continue;
    node.setAttribute(k, v === true ? '' : String(v));
  }
  document.body.appendChild(node);
  await wait(30);
  return node;
}

const markup = (node) => node.shadowRoot.querySelector('svg').outerHTML;
const toAttrs = (props) => Object.fromEntries(Object.entries(props).map(([k, v]) => [ATTRIBUTES[k], v]));

describe('<glyph-fox>', () => {
  it('is defined with every prop as an observed attribute', () => {
    const El = customElements.get('glyph-fox');
    expect(El).toBeTruthy();
    for (const a of Object.values(ATTRIBUTES)) expect(El.observedAttributes).toContain(a);
    for (const a of ['name', 'layout', 'gap', 'morph']) expect(El.observedAttributes).toContain(a);
  });

  it('keeps the plain use simple', async () => {
    checkDefault(markup(await el({ name: 'file' })));
  });

  for (const c of PROP_CASES) {
    it(`supports the ${ATTRIBUTES[c.prop]} attribute`, async () => {
      const node = await el({ name: c.icon, ...toAttrs(c.props) });
      if (c.prop === 'morphTo') await wait(500);
      c.check(markup(node));
    });
  }

  it('passes class and style through the host', async () => {
    const node = await el({ name: 'file', class: 'extra', style: 'color: red' });
    expect(node.classList.contains('extra')).toBe(true);
    expect(node.getAttribute('style')).toContain('red');
  });

  it('takes the spec syntax and the fusion attributes', async () => {
    expect(markup(await el({ name: 'file+check@tl' }))).toContain('glyphfox-file-check-tl');
    expect(markup(await el({ name: 'cloud&lock', layout: 'side' }))).toContain('glyphfox-cloud-lock-side');
    expect(markup(await el({ name: 'heart/solid' }))).toContain('class="gf-fill"');
  });

  it('updates when attributes change and morphs names with the morph attribute', async () => {
    const node = await el({ name: 'menu', morph: true, duration: 40 });
    node.setAttribute('name', 'x');
    await wait(20);
    expect(markup(node)).toContain('glyphfox-menu-x');
    await wait(300);
    expect(markup(node)).toContain('glyphfox-x');
    node.setAttribute('weight', '3');
    await wait(10);
    expect(markup(node)).toContain('stroke-width="3"');
  });

  it('replays click animations', async () => {
    const node = await el({ name: 'heart', animate: 'pop', trigger: 'click' });
    node.click();
    await wait(10);
    expect(node.shadowRoot.querySelector('svg').getAttribute('data-gf-run')).toBe('1');
  });
});

describe('CDN build', () => {
  const file = resolve('packages/glyphfox/dist/web/glyphfox.min.js');
  const code = readFileSync(file, 'utf8');

  it('is the default file on jsDelivr and unpkg', () => {
    expect(pkg.jsdelivr).toBe('./dist/web/glyphfox.min.js');
    expect(pkg.unpkg).toBe('./dist/web/glyphfox.min.js');
    expect(code.startsWith('/*! glyphfox')).toBe(true);
    expect(code).not.toMatch(/\bimport\s*\(/);
  });

  it('works from a single script tag', async () => {
    const dom = new JSDOM('<!doctype html><body><glyph-fox name="file+check" size="32"></glyph-fox><i data-glyph="heart" data-variant="solid" class="x"></i></body>', { runScripts: 'outside-only', pretendToBeVisual: true });
    dom.window.eval(code);
    await new Promise((r) => setTimeout(r, 50));
    const { document: doc, glyphfox } = dom.window;
    expect(typeof glyphfox.toSvg).toBe('function');
    expect(glyphfox.iconNames.length).toBeGreaterThan(0);
    expect(dom.window.customElements.get('glyph-fox')).toBeTruthy();
    const host = doc.querySelector('glyph-fox');
    expect(host.shadowRoot.innerHTML).toContain('glyphfox-file-check');
    const replaced = doc.querySelector('svg[data-glyph-done="heart"]');
    expect(replaced).toBeTruthy();
    expect(replaced.getAttribute('class')).toContain('x');
    expect(replaced.innerHTML).toContain('gf-fill');
    const late = doc.createElement('i');
    late.setAttribute('data-glyph', 'lock');
    doc.body.appendChild(late);
    await new Promise((r) => setTimeout(r, 50));
    expect(doc.querySelector('svg[data-glyph-done="lock"]')).toBeTruthy();
    dom.window.close();
  });
});
