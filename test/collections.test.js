// The display (48 grid) and isometric collections in the package: the core,
// glyphfox/collections and the React, Vue and Svelte components (the web
// component and the CDN build are in collections-web.test.js). Imports go straight to this checkout's dist so the
// test does not depend on the published package.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { render as svelteRender } from 'svelte/server';
import * as core from '../packages/glyphfox/dist/index.js';
import * as C from '../packages/glyphfox/dist/collections.js';
import { loadIcon, lookupIcon } from '../packages/glyphfox/dist/core/lookup.js';
import * as RC from '../packages/glyphfox/dist/react/collections.js';
import * as VC from '../packages/glyphfox/dist/vue/collections.js';
import * as SC from '../packages/glyphfox/dist/svelte/collections.js';
import ReactCube from '../packages/glyphfox/dist/react/icons/isometric/cube.js';

const pkg = JSON.parse(readFileSync(resolve('packages/glyphfox/package.json'), 'utf8'));
const svgNames = (id) =>
  readdirSync(resolve('icons', id))
    .filter((f) => f.endsWith('.svg'))
    .map((f) => f.slice(0, -4))
    .sort();
const attr = (svg, name) => new RegExp(`<svg[^>]* ${name}="([^"]*)"`).exec(svg)?.[1];

describe('glyphfox/collections', () => {
  it('ships every icon of icons/display and icons/isometric', () => {
    expect(Object.keys(C.display)).toEqual(svgNames('display'));
    expect(Object.keys(C.isometric)).toEqual(svgNames('isometric'));
    expect(Object.keys(C.display)).toHaveLength(60);
    expect(Object.keys(C.isometric)).toHaveLength(30);
    expect(C.collections.display.grid).toBe(48);
    expect(C.collections.isometric.grid).toBe(24);
    expect(C.collectionNames).toHaveLength(90);
    expect(C.collectionNames).toContain('display/calendar-clock');
    expect(C.collectionNames).toContain('isometric/cube');
  });

  it('keeps the drawing of the sources and names icons id/name', () => {
    const icon = C.display['calendar-clock'];
    expect(icon.name).toBe('display/calendar-clock');
    expect(icon.grid).toBe(48);
    expect(icon.solid).toBeNull();
    expect(icon.body).toContain('<circle cx="34" cy="34" r="10"/>');
    expect(C.isometric.cube.name).toBe('isometric/cube');
    expect(C.isometric.cube.grid).toBeUndefined();
  });

  it('is an entry of the package with types, and the base set is unchanged', () => {
    expect(pkg.exports['./collections']).toEqual({ types: './dist/collections.d.ts', default: './dist/collections.js' });
    for (const fw of ['react', 'vue', 'svelte']) expect(pkg.exports[`./${fw}/collections`].default).toBe(`./dist/${fw}/collections.js`);
    expect(readFileSync(resolve('packages/glyphfox/dist/collections.d.ts'), 'utf8')).toContain('export type DisplayIconName =');
    expect(core.iconNames.some((n) => n.includes('/'))).toBe(false);
    expect(core.icons['display/calendar-clock']).toBeUndefined();
  });
});

describe('collections in the core', () => {
  it('renders display icons on the 48 grid at 48 px by default', () => {
    const svg = core.toSvg('display/calendar-clock');
    expect(attr(svg, 'viewBox')).toBe('0 0 48 48');
    expect(attr(svg, 'width')).toBe('48');
    expect(attr(svg, 'stroke-width')).toBe('2');
    expect(svg).toContain('glyphfox-display-calendar-clock');
    expect(core.getIcon('display/calendar-clock')).toBe(C.display['calendar-clock']);
    expect(core.gridOfIcon(C.display['calendar-clock'])).toBe(48);
  });

  it('takes size, weight and color, and compensates the stroke below 48 px', () => {
    const svg = core.toSvg('display/calendar-clock', { size: 96, weight: 3, color: '#e11d48' });
    expect(attr(svg, 'width')).toBe('96');
    expect(attr(svg, 'stroke-width')).toBe('3');
    expect(attr(svg, 'color')).toBe('#e11d48');
    const small = Number(attr(core.toSvg('display/calendar-clock', { size: 24 }), 'stroke-width'));
    expect(small).toBeGreaterThan(2);
    expect(small).toBeLessThanOrEqual(2.6);
    expect(attr(core.toSvg('display/calendar-clock', { size: 96, weight: 2, absoluteWeight: true }), 'stroke-width')).toBe('1');
  });

  it('rotates, flips and animates around the center of the 48 grid', () => {
    const svg = core.toSvg('display/rocket-launch', { rotate: 90, flipX: true, animate: 'spin' });
    expect(svg).toContain('rotate(90 24 24)');
    expect(svg).toContain('matrix(-1 0 0 1 48 0)');
    expect(svg).toContain('transform-origin:24px 24px');
    expect(core.toSvg('display/rocket-launch', { animate: 'draw' })).toContain('pathLength="1"');
  });

  it('keeps display icons outline and refuses 24 grid composition', () => {
    const plain = core.toSvg('display/calendar-clock');
    expect(core.toSvg('display/calendar-clock', { variant: 'solid' })).toBe(plain);
    expect(core.toSvg('display/calendar-clock/duotone')).toBe(plain);
    expect(core.toSvg('display/calendar-clock', { modifier: 'check' })).toBe(plain);
    expect(() => core.toSvg('display/calendar-clock+check')).toThrow(/48 grid/);
    expect(() => core.toSvg('display/calendar-clock&home')).toThrow(/48 grid/);
  });

  it('renders isometric icons like the base set, styles and composition included', () => {
    const svg = core.toSvg('isometric/cube', { size: 32, weight: 1.5, color: 'teal' });
    expect(attr(svg, 'viewBox')).toBe('0 0 24 24');
    expect(attr(svg, 'width')).toBe('32');
    expect(attr(svg, 'stroke-width')).toBe('1.5');
    expect(core.toSvg('isometric/cube', { variant: 'solid' })).toContain('gf-fill');
    expect(core.toSvg('isometric/cube+check')).toContain('glyphfox-');
    expect(core.parseSpec('isometric/cube/solid')).toMatchObject({ names: ['isometric/cube'], variant: 'solid' });
    expect(core.parseSpec('display/calendar-clock')).toMatchObject({ names: ['display/calendar-clock'], variant: undefined });
  });

  it('loads collection icons on demand by name', async () => {
    const icon = await loadIcon('display/analytics-growth');
    expect(icon.name).toBe('display/analytics-growth');
    expect(lookupIcon('display/analytics-growth')).toBe(icon);
    expect(await loadIcon('display/not-an-icon')).toBeNull();
  });
});

describe('collection components', () => {
  it('React: deep imports and glyphfox/react/collections', () => {
    const html = renderToStaticMarkup(createElement(RC.DisplayCalendarClockIcon, { size: 64, color: 'red', weight: 3 }));
    expect(html).toContain('viewBox="0 0 48 48"');
    expect(html).toContain('width="64"');
    expect(html).toContain('stroke-width="3"');
    expect(html).toContain('color="red"');
    expect(ReactCube).toBe(RC.IsometricCubeIcon);
    expect(renderToStaticMarkup(createElement(ReactCube, { variant: 'solid' }))).toContain('gf-fill');
  });

  it('Vue: glyphfox/vue/collections', async () => {
    const html = await renderToString(h(VC.DisplayCalendarClockIcon, { size: 40, weight: 2.5 }));
    expect(html).toContain('viewBox="0 0 48 48"');
    expect(html).toContain('width="40"');
    expect(await renderToString(h(VC.IsometricCubeIcon))).toContain('glyphfox-isometric-cube');
  });

  it('Svelte: glyphfox/svelte/collections', () => {
    const html = svelteRender(SC.DisplayCalendarClockIcon, { props: { size: 56, color: 'blue' } }).body;
    expect(html).toContain('viewBox="0 0 48 48"');
    expect(html).toContain('width="56"');
    expect(svelteRender(SC.IsometricCubeIcon, { props: {} }).body).toContain('glyphfox-isometric-cube');
  });

  it('keeps the default entries free of collection components', () => {
    for (const fw of ['react', 'vue', 'svelte']) {
      const index = readFileSync(resolve(`packages/glyphfox/dist/${fw}/index.js`), 'utf8');
      expect(index).not.toContain('icons/display/');
      expect(index).not.toContain('icons/isometric/');
    }
    expect(readFileSync(resolve('packages/glyphfox/dist/react/icons/display/calendar-clock.js'), 'utf8')).toMatch(/^'use client';/);
  });
});
