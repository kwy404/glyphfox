// @vitest-environment jsdom
// Smart icons as custom elements: <glyph-fox-smart>, <glyph-fox-status>,
// <glyph-fox-group>, and the CDN build.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import '../packages/glyphfox/dist/web/index.js';

const wait = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const markup = (node) => node.shadowRoot.querySelector('svg').outerHTML;

async function el(tag, attrs, html = '') {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== false && v !== undefined) node.setAttribute(k, v === true ? '' : String(v));
  node.innerHTML = html;
  document.body.appendChild(node);
  await wait(30);
  return node;
}

describe('<glyph-fox-smart>', () => {
  it('is defined with the smart and shared attributes', () => {
    const El = customElements.get('glyph-fox-smart');
    expect(El).toBeTruthy();
    for (const a of ['kind', 'value', 'badge-color', 'locale', 'tick', 'size', 'weight', 'secondary-color']) expect(El.observedAttributes).toContain(a);
  });

  it('renders data icons and updates with the attributes', async () => {
    const node = await el('glyph-fox-smart', { kind: 'battery', value: '0.2', size: '32' });
    expect(markup(node)).toContain('glyphfox-smart-battery');
    expect(markup(node)).toContain('width="32"');
    expect(markup(node)).toContain('gf-low');
    node.setAttribute('value', '1');
    await wait(10);
    expect(markup(node)).toContain('gf-full');
    node.setAttribute('charging', '');
    await wait(10);
    expect(markup(node)).toContain('gf-bolt');
    expect(markup(await el('glyph-fox-smart', { kind: 'currency', locale: 'ja-JP' }))).toContain('gf-currency-yen');
    expect(markup(await el('glyph-fox-smart', { kind: 'badge', count: '5', 'badge-color': '#e5484d' }))).toContain('color="#e5484d"');
    expect(markup(await el('glyph-fox-smart', { kind: 'progress', value: '0.5', label: true, title: 'auto' }))).toContain('<title>');
    expect(markup(await el('glyph-fox-smart', { name: 'arrow-left', locale: 'ar' }))).toContain('matrix(-1 0 0 1 24 0)');
  });

  it('ticks the clock', async () => {
    const node = await el('glyph-fox-smart', { kind: 'clock', tick: true, seconds: true });
    const first = node.shadowRoot.querySelector('.gf-second').getAttribute('d');
    await wait(1100);
    expect(node.shadowRoot.querySelector('.gf-second').getAttribute('d')).not.toBe(first);
    node.remove();
  });
});

describe('<glyph-fox-status>', () => {
  it('morphs between states', async () => {
    const node = await el('glyph-fox-status', { state: 'loading', duration: '240' });
    expect(markup(node)).toContain('gf-spin');
    node.setAttribute('state', 'success');
    await wait(80);
    expect(markup(node)).toContain('glyphfox-status-loading-status-success');
    await wait(400);
    expect(markup(node)).toContain('glyphfox-status-success');
    expect(markup(node)).not.toContain('gf-spin');
  });
});

describe('<glyph-fox-group>', () => {
  it('gives each child the preset and a staggered delay', async () => {
    const node = await el('glyph-fox-group', { animate: 'pop', stagger: '80' }, '<glyph-fox name="home"></glyph-fox><glyph-fox name="file" delay="5"></glyph-fox><glyph-fox-smart kind="wifi"></glyph-fox-smart>');
    const kids = [...node.children];
    expect(node.getAttribute('role')).toBe('group');
    expect(kids.map((k) => k.getAttribute('animate'))).toEqual(['pop', 'pop', 'pop']);
    expect(kids.map((k) => k.getAttribute('delay'))).toEqual(['0', '5', '160']);
    expect(markup(kids[0])).toContain('@keyframes gf-pop');
    const late = document.createElement('glyph-fox');
    late.setAttribute('name', 'heart');
    node.appendChild(late);
    await wait(20);
    expect(late.getAttribute('delay')).toBe('240');
  });

  it('plays on hover and replays on click', async () => {
    const hover = await el('glyph-fox-group', { animate: 'wiggle', trigger: 'hover' }, '<glyph-fox name="home"></glyph-fox>');
    const kid = hover.firstElementChild;
    expect(kid.getAttribute('trigger')).toBe('state');
    expect(kid.hasAttribute('active')).toBe(false);
    hover.dispatchEvent(new MouseEvent('mouseenter'));
    await wait(20);
    expect(kid.hasAttribute('active')).toBe(true);
    expect(markup(kid)).toMatch(/class="[^"]*gf-on/);
    hover.dispatchEvent(new MouseEvent('mouseleave'));
    await wait(20);
    expect(kid.hasAttribute('active')).toBe(false);
    const click = await el('glyph-fox-group', { animate: 'pop', trigger: 'click' }, '<glyph-fox name="home"></glyph-fox>');
    click.click();
    await wait(60);
    expect(click.firstElementChild.hasAttribute('active')).toBe(true);
  });
});

describe('CDN build', () => {
  it('defines the smart elements and exposes the smart API', async () => {
    const code = readFileSync(resolve('packages/glyphfox/dist/web/glyphfox.min.js'), 'utf8');
    const dom = new JSDOM('<!doctype html><body><glyph-fox-smart kind="currency" locale="pt-BR"></glyph-fox-smart><glyph-fox-status state="error"></glyph-fox-status></body>', { runScripts: 'outside-only', pretendToBeVisual: true });
    dom.window.eval(code);
    await new Promise((r) => setTimeout(r, 50));
    const { document: doc, glyphfox } = dom.window;
    for (const k of ['smartSvg', 'statusSvg', 'groupSvg', 'currencyInfo', 'defineSmartElements']) expect(typeof glyphfox[k], k).toBe('function');
    expect(glyphfox.smartSvg('badge', { count: 2, icon: 'mail' })).toContain('>2</text>');
    expect(doc.querySelector('glyph-fox-smart').shadowRoot.innerHTML).toContain('gf-currency-real');
    expect(doc.querySelector('glyph-fox-status').shadowRoot.innerHTML).toContain('gf-status-error');
    expect(dom.window.customElements.get('glyph-fox-group')).toBeTruthy();
    dom.window.close();
  });
});
