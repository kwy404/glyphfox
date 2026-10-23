// glyphfox/ember: plain function helpers called the way Glimmer calls them
// (positional arguments, then the named arguments object) and returning
// trusted markup (an object with toHTML, which Glimmer inserts unescaped).
import { describe, expect, it } from 'vitest';
import * as E from 'glyphfox/ember';
import { icons, iconNames } from 'glyphfox';
import { componentName } from '../packages/glyphfox/dist/core/formats.js';
import { CLICK_HANDLER } from '../packages/glyphfox/dist/core/static.js';
import { STATIC_PROP_CASES, checkDefault } from './fixtures/props.js';

const helper = (name) => E[componentName(name)];
const markup = (value) => {
  expect(typeof value.toHTML).toBe('function');
  expect(String(value)).toBe(value.toHTML());
  return value.toHTML();
};

describe('glyphfox/ember', () => {
  it('exports one helper per icon, named NameIcon', () => {
    for (const n of iconNames) expect(typeof helper(n), n).toBe('function');
  });

  it('keeps the plain use simple', () => {
    checkDefault(markup(E.FileIcon()));
  });

  for (const c of STATIC_PROP_CASES) {
    it(`supports the ${c.prop} argument`, () => c.check(markup(helper(c.icon)(c.props))));
  }

  it('passes class, style and attributes through', () => {
    const out = markup(E.FileIcon({ class: 'extra', style: 'color: red', id: 'x1', 'data-test': 'y' }));
    expect(out).toMatch(/class="glyphfox glyphfox-file extra"/);
    expect(out).toContain('style="color: red"');
    expect(out).toContain('id="x1"');
    expect(out).toContain('data-test="y"');
    expect(markup(E.FileIcon({ style: { color: 'blue', marginInlineEnd: '4px' } }))).toContain('style="color:blue;margin-inline-end:4px"');
  });

  it('labels with aria-label when given and stays decorative otherwise', () => {
    const out = markup(E.FileIcon({ 'aria-label': 'Doc' }));
    expect(out).not.toContain('aria-hidden');
    expect(out).toContain('aria-label="Doc"');
    expect(markup(E.FileIcon())).toContain('aria-hidden="true"');
  });

  it('replays click animations with an inline handler', () => {
    const out = markup(E.HeartIcon({ animate: 'pop', trigger: 'click' }));
    expect(out).toContain(`onclick="${CLICK_HANDLER.replace(/"/g, '&quot;')}"`);
    expect(out).toMatch(/\[data-gf-run="1"\]/);
  });

  it('renders specs with Glyph and fusions with Fusion', () => {
    E.registerIcons(icons);
    expect(markup(E.Glyph('file+check@tr'))).toContain('glyphfox-file-check-tr');
    expect(markup(E.Glyph('heart/solid'))).toContain('class="gf-fill"');
    expect(markup(E.Glyph({ name: 'file', size: 32 }))).toContain('width="32"');
    expect(markup(E.Fusion('cloud', 'lock', { layout: 'side' }))).toContain('glyphfox-cloud-lock-side');
    expect(markup(E.Fusion({ icons: ['cloud', 'lock'], layout: 'overlap', variant: 'solid' }))).toContain('class="gf-fill"');
  });

  it('creates helpers for custom icon data', () => {
    const dot = E.createIcon({ name: 'my-dot', body: '<circle cx="12" cy="12" r="4"/>', tags: [], categories: [] });
    expect(markup(dot({ size: 20 }))).toContain('glyphfox-my-dot');
    expect(markup(E.Glyph({ name: 'my-dot', body: '<circle cx="12" cy="12" r="4"/>', tags: [], categories: [] }))).toContain('glyphfox-my-dot');
  });
});
