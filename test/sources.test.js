// Icon sources: prefixed names ("set:name") from other icon sets, normalized
// onto the 24 grid, with weight, animations, modifiers and Fusion.
import { describe, expect, it } from 'vitest';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fuse, getIcon, hasIconSource, loadIcon, normalizeIcon, parseSpec, registerIconSource, toSvg } from 'glyphfox';
import { Icon } from 'glyphfox/react';

const STROKE = {
  dot: { body: '<circle cx="12" cy="12" r="6"/>', tags: ['dot'] },
  bar: { body: '<path d="M4 12h16"/>' },
};
registerIconSource('tst', { get: (name) => STROKE[name] || null });
registerIconSource('big', { get: (name) => (name === 'square' ? { body: '<rect x="8" y="8" width="32" height="32"/>', viewBox: '0 0 48 48' } : null) });
registerIconSource('fil', { get: (name) => (name === 'blob' ? { body: '<path d="M4 4h16v16H4z"/>', mode: 'fill' } : null) });
registerIconSource('lazy', (name) => Promise.resolve(name === 'ring' ? { body: '<circle cx="12" cy="12" r="8"/>' } : null));

describe('icon sources', () => {
  it('resolves prefixed names through the registered source', () => {
    expect(hasIconSource('tst')).toBe(true);
    expect(getIcon('tst:dot').name).toBe('tst:dot');
    expect(getIcon('tst:nope')).toBeNull();
    expect(getIcon('none:dot')).toBeNull();
    const svg = toSvg('tst:dot', { weight: 3, size: 24 });
    expect(svg).toContain('stroke-width="3"');
    expect(svg).toContain('<circle cx="12" cy="12" r="6"/>');
  });

  it('loads names from asynchronous sources', async () => {
    expect(getIcon('lazy:ring')).toBeNull();
    const icon = await loadIcon('lazy:ring');
    expect(icon.name).toBe('lazy:ring');
    expect(getIcon('lazy:ring')).toBe(icon);
    expect(await loadIcon('lazy:none')).toBeNull();
  });

  it('moves other grids onto the 24 grid', () => {
    expect(getIcon('big:square').body).toBe('<rect x="4" y="4" width="16" height="16"/>');
    expect(normalizeIcon({ name: 'x', body: '<g stroke-width="4"><path d="M0 0L48 48"/></g>', viewBox: '0 0 48 48' }).body).toContain('stroke-width="2"');
  });

  it('keeps filled icons filled, with a fallback for the style axis and draw', () => {
    const svg = toSvg('fil:blob', { variant: 'solid', animate: 'draw' });
    expect(svg).toContain('fill="currentColor" stroke="none"');
    expect(svg).not.toContain('pathLength');
    expect(svg).toMatch(/gf-a/);
  });

  it('parses prefixed names next to layouts', () => {
    expect(parseSpec('tst:dot')).toMatchObject({ names: ['tst:dot'], layout: undefined });
    expect(parseSpec('tst:dot&tst:bar:side')).toMatchObject({ names: ['tst:dot', 'tst:bar'], layout: 'side' });
    expect(parseSpec('tst:dot&tst:bar')).toMatchObject({ names: ['tst:dot', 'tst:bar'], layout: undefined });
    expect(parseSpec('cloud&lock:nope').layout).toBe('nope');
    expect(parseSpec('tst:dot+check@tl/solid')).toMatchObject({ names: ['tst:dot'], modifier: 'check', corner: 'top-left', variant: 'solid' });
  });

  it('adds modifiers and fuses stroke and filled icons', () => {
    expect(toSvg('tst:dot+check')).toContain('glyphfox-tst-dot-check');
    const cut = toSvg('fil:blob+plus');
    expect(cut).toContain('fill="currentColor"');
    expect(getIcon('fil:blob').body).not.toBe(cut);
    const fused = fuse(['fil:blob', 'tst:dot'], { layout: 'overlap' });
    expect(fused.filled).toBe(true);
    expect(fused.body).toContain('<mask id="gf-k');
    expect(fused.body).toMatch(/<g mask="url\(#gf-k[^"]+\)">/);
    expect(toSvg('tst:dot&tst:bar:stack')).toContain('glyphfox-tst-dot-tst-bar-stack');
  });

  it('works in the components', () => {
    const html = renderToStaticMarkup(h(Icon, { name: 'tst:dot', weight: 1.5, modifier: 'plus' }));
    expect(html).toContain('stroke-width="1.5"');
    expect(html).toContain('glyphfox-tst-dot-plus');
    expect(renderToStaticMarkup(h(Icon, { name: 'tst:dot' }))).toContain('<circle');
  });
});
