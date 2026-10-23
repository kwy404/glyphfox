import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import postcss from 'postcss';
import { compile } from '@tailwindcss/node';
import glyphfox, { maskUrl, parseAxes } from 'glyphfox/tailwind';

const require = createRequire(import.meta.url);

// Tailwind v4 only accepts + and & inside arbitrary values; v3 accepts both forms.
const SHARED = ['gf-file', 'gf-[file+check]', 'gf-[cloud&lock]', 'gf-[cloud&lock]/side', 'gf-[file+check]/tr', 'gf-file/solid', 'gf-heart/duotone-sharp-w1.5', 'gf-spin', 'gf-pulse', 'gf-shake'];
const V4_ONLY = ['gf-[cloud&lock:side]'];
const V3_ONLY = ['gf-file+check', 'gf-file+check/tr'];

function rule(css, cls) {
  const esc = cls.replace(/[^a-zA-Z0-9_-]/g, (c) => '\\' + c);
  const re = new RegExp(`\\.${esc.replace(/[\\[\]().+*?^$|/&:@]/g, (c) => '\\' + c)}\\s*\\{`);
  const m = re.exec(css);
  if (!m) return '';
  return css.slice(m.index, css.indexOf('}', m.index) + 1);
}

function checkShared(css) {
  const file = rule(css, 'gf-file');
  expect(file).toContain('mask-image: url("data:image/svg+xml,');
  expect(file).toMatch(/background-color: currentColor/);
  expect(file).toMatch(/width: 1em/);
  for (const c of SHARED.filter((x) => !/spin|pulse|shake/.test(x))) expect(rule(css, c), c).toContain('mask-image');
  expect(rule(css, 'gf-file/solid')).not.toBe(rule(css, 'gf-file'));
  expect(css).toMatch(/\.gf-spin\s*\{\s*animation: gf-spin 1s linear infinite/);
  expect(css).toMatch(/@keyframes gf-spin/);
  expect(css).toMatch(/prefers-reduced-motion: reduce/);
}

describe('glyphfox/tailwind', () => {
  it('has the plugin shape both versions accept', () => {
    expect(glyphfox.__isOptionsFunction).toBe(true);
    const p = glyphfox({ prefix: 'icon' });
    expect(typeof p.handler).toBe('function');
    expect(p.config).toEqual({});
    const cjs = require('glyphfox/tailwind');
    expect(cjs.__isOptionsFunction).toBe(true);
    expect(typeof cjs().handler).toBe('function');
  });

  it('parses axes, layouts and corners after the slash', () => {
    expect(parseAxes('solid-sharp-w2.5')).toEqual({ variant: 'solid', corners: 'sharp', weight: 2.5 });
    expect(parseAxes('side-tr')).toEqual({ layout: 'side', corner: 'tr' });
    expect(parseAxes('')).toEqual({});
    expect(maskUrl('file', { variant: 'solid' })).toMatch(/^data:image\/svg\+xml,/);
    expect(maskUrl('file', { variant: 'solid' })).not.toBe(maskUrl('file'));
    expect(maskUrl('cloud&lock', { layout: 'side' })).toBe(maskUrl('cloud&lock:side'));
    expect(maskUrl('file+check', { corner: 'tr' })).toBe(maskUrl('file+check@tr'));
  });

  it('works with Tailwind CSS v4 (@plugin)', async () => {
    const compiler = await compile('@import "tailwindcss/utilities";\n@plugin "glyphfox/tailwind";', { base: process.cwd(), onDependency: () => {} });
    const css = compiler.build([...SHARED, ...V4_ONLY]);
    checkShared(css);
    expect(rule(css, 'gf-[cloud&lock:side]')).toContain('mask-image');
    expect(compiler.build(['gf-not-an-icon'])).not.toContain('gf-not-an-icon');
  });

  it('takes options in v4', async () => {
    const compiler = await compile('@import "tailwindcss/utilities";\n@plugin "glyphfox/tailwind" { prefix: icon; variant: solid; weight: 1.5; }', { base: process.cwd(), onDependency: () => {} });
    const css = compiler.build(['icon-file', 'icon-[cloud&lock]', 'icon-spin']);
    expect(rule(css, 'icon-file')).toContain('mask-image');
    expect(rule(css, 'icon-[cloud&lock]')).toContain('mask-image');
    expect(css).toContain('.icon-spin');
    expect(rule(css, 'icon-file')).toContain('gf-fill');
  });

  it('works with Tailwind CSS v3 (plugins array)', async () => {
    const tailwind3 = require('tailwindcss3');
    const html = `<span class="${[...SHARED, ...V3_ONLY].join(' ')}"></span>`;
    const result = await postcss([tailwind3({ content: [{ raw: html, extension: 'html' }], corePlugins: { preflight: false }, plugins: [require('glyphfox/tailwind')] })]).process('@tailwind utilities;', { from: undefined });
    checkShared(result.css);
    for (const c of V3_ONLY) expect(rule(result.css, c), c).toContain('mask-image');
  });

  it('takes options in v3 (prefix and combos)', async () => {
    const tailwind3 = require('tailwindcss3');
    const result = await postcss([
      tailwind3({ content: [{ raw: '<i class="icon-file icon-cloud&lock icon-spin"></i>', extension: 'html' }], corePlugins: { preflight: false }, plugins: [glyphfox({ prefix: 'icon', combos: ['cloud&lock'] })] }),
    ]).process('@tailwind utilities;', { from: undefined });
    expect(rule(result.css, 'icon-file')).toContain('mask-image');
    expect(rule(result.css, 'icon-cloud&lock')).toContain('mask-image');
    expect(result.css).toContain('.icon-spin');
  });
});
