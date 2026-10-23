import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readIcons } from '../scripts/lib/icons.mjs';
import { buildDocsData } from '../scripts/lib/docs.mjs';
import { lintBody } from '../packages/glyphfox/dist/core/lint.js';
import { nodeBounds } from '../packages/glyphfox/dist/core/geometry.js';
import { parseBody } from '../packages/glyphfox/dist/core/nodes.js';
import { componentName, dataName } from '../packages/glyphfox/dist/core/formats.js';

const root = resolve('.');
const dist = join(root, 'packages', 'glyphfox', 'dist');
const require = createRequire(import.meta.url);
const sources = readdirSync(join(root, 'icons'))
  .filter((f) => f.endsWith('.svg'))
  .map((f) => f.slice(0, -4))
  .sort();
const { icons, problems } = readIcons(join(root, 'icons'));

describe('build', () => {
  it('reads every source icon without problems', () => {
    expect(problems).toEqual([]);
    expect(icons.map((i) => i.name)).toEqual(sources);
  });

  it('writes per icon ESM modules with types', async () => {
    for (const name of sources) {
      expect(existsSync(join(dist, 'icons', `${name}.js`)), name).toBe(true);
      expect(existsSync(join(dist, 'icons', `${name}.d.ts`)), name).toBe(true);
    }
    const mod = await import('glyphfox/icons/file');
    expect(mod.default.name).toBe('file');
    expect(mod.default.body).toContain('<path');
  });

  it('writes an ESM and a CJS index with a typed union of names', async () => {
    const esm = await import('glyphfox');
    const cjs = require('glyphfox');
    expect(esm.iconNames).toEqual(sources);
    expect(cjs.iconNames).toEqual(sources);
    expect(typeof cjs.toSvg).toBe('function');
    expect(cjs.toSvg('file')).toBe(esm.toSvg('file'));
    for (const name of sources) expect(esm[dataName(name)], name).toBe(esm.icons[name]);
    const dts = readFileSync(join(dist, 'index.d.ts'), 'utf8');
    expect(dts).toContain(`export type IconName = ${sources.map((n) => JSON.stringify(n)).join(' | ')};`);
    expect(dts).toContain('export interface IconProps');
    expect(existsSync(join(dist, 'index.d.cts'))).toBe(true);
  });

  it('keeps the icon rules after optimization', () => {
    for (const icon of icons) {
      expect(lintBody(icon.body), icon.name).toEqual([]);
      const src = readFileSync(join(root, 'icons', `${icon.name}.svg`), 'utf8');
      const before = parseBody(src.replace(/^[\s\S]*?<svg[^>]*>|<\/svg>\s*$/g, ''));
      const after = parseBody(icon.body);
      expect(after.length, icon.name).toBe(before.length);
      before.forEach((n, k) => {
        const a = nodeBounds(n);
        const b = nodeBounds(after[k]);
        for (const key of ['minX', 'minY', 'maxX', 'maxY']) expect(Math.abs(a[key] - b[key]), `${icon.name} ${key}`).toBeLessThan(1e-6);
      });
      expect(icon.body.length, icon.name).toBeLessThanOrEqual(src.length);
    }
  });

  it('computes the solid style from closed shapes', () => {
    for (const icon of icons) {
      if (!icon.solid) continue;
      const count = parseBody(icon.body).filter((n) => n[1].class !== 'gf-secondary').length;
      for (const i of [...icon.solid[0], ...icon.solid[1]]) expect(i, icon.name).toBeLessThan(count);
      expect(icon.solid[0].length, icon.name).toBeGreaterThan(0);
    }
    expect(icons.some((i) => i.solid)).toBe(true);
  });

  it('writes icons.json, the sprite and the stylesheet', () => {
    const all = JSON.parse(readFileSync(join(dist, 'icons.json'), 'utf8'));
    expect(Object.keys(all)).toEqual(sources);
    expect(all.file).toMatchObject({ name: 'file', categories: expect.any(Array), tags: expect.any(Array) });
    const sprite = readFileSync(join(dist, 'sprite.svg'), 'utf8');
    expect((sprite.match(/<symbol /g) || []).length).toBe(sources.length);
    expect(sprite).toContain('<symbol id="gf-file" viewBox="0 0 24 24"');
    const css = readFileSync(join(dist, 'styles.css'), 'utf8');
    for (const a of ['spin', 'pulse', 'pop', 'wiggle', 'bounce', 'shake']) expect(css).toContain(`.gf-${a}`);
  });

  it('writes every framework entry point', () => {
    for (const f of ['react/index.js', 'react/index.cjs', 'react/index.d.ts', 'vue/index.js', 'vue/index.cjs', 'vue/index.d.ts', 'svelte/index.js', 'svelte/index.d.ts', 'svelte/Icon.svelte', 'web/index.js', 'web/element.js', 'web/glyphfox.min.js', 'tailwind/index.js', 'tailwind/index.cjs', 'runtime/auto.js', 'core/index.js', 'core/index.d.ts', 'core/static.js', 'tools.js', 'cli/index.js']) {
      expect(existsSync(join(dist, f)), f).toBe(true);
    }
    for (const fw of ['solid', 'preact', 'qwik', 'lit', 'native', 'ember']) {
      for (const f of ['index.js', 'index.d.ts', 'runtime.js', 'icons/file.js', 'icons/file.d.ts']) expect(existsSync(join(dist, fw, f)), `${fw}/${f}`).toBe(true);
      const mod = readFileSync(join(dist, fw, 'icons', 'file.js'), 'utf8');
      expect(mod, fw).toContain(`export const ${componentName('file')} = /*#__PURE__*/ createIcon(icon);`);
    }
    for (const f of ['astro/index.js', 'astro/index.d.ts', 'astro/Icon.astro', 'astro/Fusion.astro', 'astro/icons/file.astro', 'react/server.js', 'react/server.d.ts']) expect(existsSync(join(dist, f)), f).toBe(true);
    const react = readFileSync(join(dist, 'react', 'icons', 'file.js'), 'utf8');
    expect(react).toContain('/*#__PURE__*/');
    expect(react).toContain(`export const ${componentName('file')}`);
  });

  it('declares exports for every entry point and keeps frameworks optional', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'packages', 'glyphfox', 'package.json'), 'utf8'));
    for (const k of ['.', './icons/*', './icons.json', './sprite.svg', './styles.css', './runtime', './core', './tools', './react', './react/server', './vue', './svelte', './solid', './preact', './qwik', './lit', './astro', './native', './ember', './web', './web/element', './tailwind']) expect(pkg.exports[k], k).toBeTruthy();
    for (const p of Object.keys(pkg.peerDependencies)) expect(pkg.peerDependenciesMeta[p].optional).toBe(true);
    expect(pkg.dependencies).toBeUndefined();
    expect(pkg.bin.glyphfox).toBe('./bin/glyphfox.js');
    expect(pkg.license).toBe('MIT');
  });

  it('keeps the docs data in sync', async () => {
    expect(await buildDocsData(root, icons, { version: JSON.parse(readFileSync(join(root, 'packages', 'glyphfox', 'package.json'), 'utf8')).version, check: true })).toEqual([]);
  });
});
