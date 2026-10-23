import { describe, expect, it } from 'vitest';
import {
  ANIMATION_NAMES,
  FORMATS,
  LAYOUTS,
  MODIFIER_NAMES,
  PROPS,
  categories,
  createMorph,
  frameState,
  fuse,
  getIcon,
  iconNames,
  parseSpec,
  resolve,
  search,
  snippet,
  strokeWidth,
  toNode,
  toSvg,
  renderToString,
} from 'glyphfox';
import { lintBody } from '../packages/glyphfox/dist/core/lint.js';
import { PROP_CASES, checkDefault } from './fixtures/props.js';

describe('toSvg', () => {
  it('keeps the plain use simple', () => {
    checkDefault(toSvg('file'));
  });

  for (const c of PROP_CASES) {
    if (c.prop === 'morphTo') continue;
    it(`supports ${c.prop}`, () => c.check(toSvg(c.icon, c.props)));
  }

  it('morphTo gives a CSS only morph with a cross fade fallback', () => {
    const svg = toSvg('menu', { morphTo: 'x', trigger: 'hover', duration: 300 });
    expect(svg).toContain('d:path("M');
    expect(svg).toContain(':hover');
    expect(svg).toContain('transition:d 300ms');
    expect(svg).toContain('@supports not (d:path("M0 0"))');
    expect(svg).toContain('class="gf-ma"');
    expect(svg).toContain('class="gf-mb"');
    const mount = toSvg('play', { morphTo: 'pause' });
    expect(mount).toMatch(/@keyframes gf-x[0-9a-z]+-0\{to\{d:path\(/);
    const state = toSvg('plus', { morphTo: 'check', trigger: 'state' });
    expect(state).toMatch(/\.gf-x[0-9a-z]+\.gf-on/);
  });

  it('passes class, style and the gap through', () => {
    const svg = toSvg('file', { class: 'a b', style: 'color:red' });
    expect(svg).toMatch(/class="glyphfox glyphfox-file a b"/);
    expect(svg).toContain('style="color:red"');
  });

  it('compensates the weight optically below 24 px and keeps it above', () => {
    expect(strokeWidth({ size: 24, weight: 2 })).toBe(2);
    expect(strokeWidth({ size: 48, weight: 2 })).toBe(2);
    expect(strokeWidth({ size: 16, weight: 2 })).toBeGreaterThan(2);
    expect(strokeWidth({ size: 12, weight: 2 })).toBeGreaterThan(strokeWidth({ size: 16, weight: 2 }));
    expect(strokeWidth({ size: 8, weight: 2 })).toBeLessThanOrEqual(2.6);
    expect(strokeWidth({ size: '1em', weight: 1.5 })).toBe(1.5);
    expect(strokeWidth({ weight: 9 })).toBe(4);
    expect(strokeWidth({ size: 12, weight: 2, absoluteWeight: true })).toBe(4);
  });

  it('escapes text and attributes', () => {
    const svg = toSvg('file', { title: '<b> & "x"', color: '"red"' });
    expect(svg).toContain('<title>&lt;b&gt; &amp; "x"</title>');
    expect(svg).toContain('color="&quot;red&quot;"');
  });

  it('renders every animation preset with reduced motion respected', () => {
    for (const a of ANIMATION_NAMES) {
      const svg = toSvg('heart', { animate: a });
      expect(svg).toContain('prefers-reduced-motion:reduce');
      expect(svg).toContain(a === 'draw' ? '@keyframes gf-draw' : `@keyframes gf-${a}`);
    }
    expect(toSvg('heart', { animate: 'spin' })).toContain('infinite');
    expect(toSvg('heart', { animate: 'pulse' })).toContain('infinite');
    expect(toSvg('heart', { animate: 'spin', loop: 2 })).toMatch(/ 2 both/);
    const draw = toSvg('file', { animate: 'draw' });
    expect(draw).toContain('pathLength="1"');
    expect(draw).toContain('stroke-dasharray:1 1');
    const click = toSvg('heart', { animate: 'pop', trigger: 'click' });
    expect(click).toContain('[data-gf-run="1"]');
    expect(click).toContain('[data-gf-run="2"]');
    expect(click).toContain('@keyframes gf-pop-r');
  });

  it('samples frames for GIF and WebM export', () => {
    const start = frameState({ animate: 'pop' }, 0);
    const end = frameState({ animate: 'pop' }, 10000);
    expect(start.opacity).toBe(0);
    expect(end.opacity).toBe(1);
    expect(end.transform).toContain('translate(12 12)');
    const draw = frameState({ animate: 'draw', count: 2 }, 0);
    expect(draw.draw).toHaveLength(2);
    expect(draw.draw[0].offset).toBe(1);
    expect(frameState({ animate: 'draw', count: 2 }, 5000).draw[1].offset).toBe(0);
    const svg = renderToString(getIcon('heart'), { animate: 'spin', frame: 250 });
    expect(svg).toContain('rotate(90)');
    expect(svg).not.toContain('<style');
  });

  it('throws for unknown icons, modifiers and layouts', () => {
    expect(() => toSvg('no-such-icon')).toThrow(/unknown icon/);
    expect(() => toSvg('file+nope')).toThrow(/unknown modifier/);
    expect(() => toSvg('cloud&lock:nope')).toThrow(/unknown layout/);
    expect(() => toSvg('file+plus@middle')).toThrow(/unknown corner/);
  });

  it('returns node trees', () => {
    const [tag, attrs, children] = toNode('file');
    expect(tag).toBe('svg');
    expect(attrs.viewBox).toBe('0 0 24 24');
    expect(children.length).toBeGreaterThan(0);
  });
});

describe('spec syntax', () => {
  it('parses names, layouts, modifiers, corners and styles', () => {
    expect(parseSpec('file')).toMatchObject({ names: ['file'] });
    expect(parseSpec('file+check@tr')).toMatchObject({ names: ['file'], modifier: 'check', corner: 'top-right' });
    expect(parseSpec('cloud&lock:side')).toMatchObject({ names: ['cloud', 'lock'], layout: 'side' });
    expect(parseSpec('heart/solid')).toMatchObject({ names: ['heart'], variant: 'solid' });
    expect(parseSpec('a&b:grid+plus@bl/duotone')).toMatchObject({ names: ['a', 'b'], layout: 'grid', modifier: 'plus', corner: 'bottom-left', variant: 'duotone' });
  });

  it('renders the style suffix', () => {
    expect(toSvg('heart/solid')).toContain('class="gf-fill"');
    expect(toSvg('heart/duotone')).toContain('gf-secondary');
  });

  it('resolves compositions into valid icons', () => {
    for (const spec of ['file+check', 'cloud&lock', 'cloud&lock:side', 'heart/solid']) {
      const icon = resolve(spec);
      expect(lintBody(icon.body), spec).toEqual([]);
    }
  });
});

describe('search and metadata', () => {
  it('lists icons and categories', () => {
    expect(iconNames.length).toBeGreaterThanOrEqual(10);
    expect(iconNames).toEqual([...iconNames].sort());
    expect(categories.length).toBeGreaterThan(0);
    for (const n of iconNames) {
      const ic = getIcon(n);
      expect(ic.name).toBe(n);
      expect(ic.categories.length).toBeGreaterThan(0);
    }
    expect(getIcon('nope')).toBeNull();
    expect(getIcon('constructor')).toBeNull();
  });

  it('ranks exact names first and filters by category', () => {
    expect(search('lock')[0].name).toBe('lock');
    expect(search('LOCK')[0].name).toBe('lock');
    expect(search('zzzz-nothing')).toEqual([]);
    const files = search('', { category: 'files', limit: 1000 });
    expect(files.every((ic) => ic.categories.includes('files'))).toBe(true);
    expect(search('', { limit: 3 })).toHaveLength(3);
  });

  it('exports the prop list in documentation order', () => {
    expect(PROPS).toHaveLength(23);
    expect(PROPS[0]).toBe('size');
    expect(PROPS[PROPS.length - 1]).toBe('decorative');
    expect(new Set(PROP_CASES.map((c) => c.prop)).size).toBe(PROPS.length);
    for (const c of PROP_CASES) expect(PROPS).toContain(c.prop);
  });
});

describe('snippets', () => {
  it('builds a snippet in every format', () => {
    const svg = toSvg('file', { size: 32 });
    for (const f of FORMATS) {
      const s = snippet(f, 'file', { size: 32, variant: 'solid' }, { svg, version: '1.0.0' });
      expect(s.length, f).toBeGreaterThan(10);
    }
    expect(snippet('jsx', 'file', { size: 32 })).toContain('<FileIcon size={32} />');
    expect(snippet('jsx', 'file+check@tr', {})).toContain('modifier="check" modifierCorner="top-right"');
    expect(snippet('jsx', 'cloud&lock:side', {})).toContain('<Fusion icons={["cloud","lock"]} layout="side" />');
    expect(snippet('vue', 'file', { flipX: true })).toContain('<FileIcon flip-x />');
    expect(snippet('svelte', 'file', { weight: 1.5 })).toContain('<FileIcon weight={1.5} />');
    expect(snippet('angular', 'file', { size: 20 })).toContain('<gf-icon name="file" [size]="20"></gf-icon>');
    expect(snippet('html', 'file+check', { color: 'red' })).toContain('<glyph-fox name="file+check" color="red"></glyph-fox>');
    expect(snippet('cdn', 'file', {}, { version: '1.2.3' })).toContain('https://cdn.jsdelivr.net/npm/glyphfox@1.2.3');
    expect(snippet('tailwind', 'file', { variant: 'solid', weight: 1.5 })).toContain('gf-file/solid-w1.5');
    expect(snippet('datauri', 'file', {}, { svg })).toMatch(/^data:image\/svg\+xml,/);
    expect(() => snippet('nope', 'file')).toThrow();
  });
});

describe('fuse and morph through the public API', () => {
  it('fuses names in every layout', () => {
    for (const layout of LAYOUTS) {
      const list = layout === 'inside' ? ['file', 'heart'] : ['cloud', 'lock', 'heart'].slice(0, layout === 'badge' ? 2 : 3);
      const icon = fuse(list, { layout });
      expect(lintBody(icon.body), layout).toEqual([]);
    }
  });

  it('creates morphs with exact end frames', () => {
    const m = createMorph(getIcon('menu'), getIcon('x'));
    expect(m.frame(0)).toBe(getIcon('menu'));
    expect(m.frame(1)).toBe(getIcon('x'));
    expect(m.frame(0.5).body).toContain('<path d="M');
  });

  it('knows every modifier', () => {
    expect(MODIFIER_NAMES).toEqual(['plus', 'minus', 'check', 'x', 'alert', 'lock', 'clock', 'sync', 'arrow-up', 'arrow-down', 'dot']);
  });
});
