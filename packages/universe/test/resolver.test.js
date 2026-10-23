// The prefix:name resolver: names, aliases with their transformations,
// registered icons, license data on every icon and the SVG transforms.
import { beforeEach, describe, expect, it } from 'vitest';
import * as U from '../src/index.js';
import { fixtureCatalog, strokeSet, fillSet } from './fixtures.js';

beforeEach(() => {
  U.reset();
  U.configure({ offline: true });
  U.setCatalog(fixtureCatalog());
  U.addSetData('tst', strokeSet);
  U.addSetData('fil', fillSet);
});

describe('names', () => {
  it('parses prefix:name and rejects everything else', () => {
    expect(U.parseName('mdi:home')).toEqual({ prefix: 'mdi', name: 'home' });
    expect(U.parseName(' Material-Symbols:Arrow-Left ')).toEqual({ prefix: 'material-symbols', name: 'arrow-left' });
    expect(U.parseName('flag:gb_nir-4x3')).toEqual({ prefix: 'flag', name: 'gb_nir-4x3' });
    for (const bad of ['home', 'mdi:', ':home', 'mdi:home:x', 'mdi home', 'https://x', 42, null]) expect(U.parseName(bad)).toBeNull();
    expect(U.isUniverseName('ph:rocket')).toBe(true);
    expect(U.isUniverseName('rocket')).toBe(false);
  });
});

describe('getIcon', () => {
  it('resolves an icon with its box, stroke flag and license', async () => {
    const icon = await U.getIcon('tst:home');
    expect(icon.name).toBe('tst:home');
    expect(icon.viewBox).toBe('0 0 24 24');
    expect(icon.stroke).toBe(true);
    expect(icon.body).toContain('M3 10l9-7');
    expect(icon.license).toMatchObject({ spdx: 'MIT', kind: 'permissive', attribution: false, set: 'tst', file: 'LICENSES/tst.license' });
    const star = await U.getIcon('fil:star');
    expect(star.viewBox).toBe('0 0 16 16');
    expect(star.stroke).toBe(false);
    expect(star.license).toMatchObject({ spdx: 'CC-BY-4.0', attribution: true });
  });

  it('follows aliases and bakes their rotations and flips', async () => {
    expect((await U.getIcon('tst:back')).body).toBe(strokeSet.icons['arrow-left'].body);
    const up = await U.getIcon('tst:arrow-up');
    expect(up.body).toMatch(/^<g transform="rotate\(90 12 12\)">/);
    const mirror = await U.getIcon('tst:arrow-mirror');
    expect(mirror.body).toContain('scale(-1 1)');
  });

  it('keeps per icon sizes and resolves hidden icons by name', async () => {
    const logo = await U.getIcon('fil:logo');
    expect(logo.viewBox).toBe('0 0 32 16');
    expect((await U.getIcon('tst:old')).hidden).toBe(true);
  });

  it('returns null for unknown icons and rejects sets that are not shipped', async () => {
    expect(await U.getIcon('tst:nope')).toBeNull();
    expect(await U.getIcon('not a name')).toBeNull();
    await expect(U.getIcon('nc:thing')).rejects.toThrow(/unknown icon set/);
  });

  it('serves registered icons synchronously (offline bundles)', () => {
    expect(U.getIconSync('tst:home')).toBeUndefined();
    U.registerIcons({ sets: {}, icons: { 'tst:dot': { body: '<circle cx="12" cy="12" r="2" fill="currentColor"/>', width: 24, height: 24 } } });
    const dot = U.getIconSync('tst:dot');
    expect(dot.viewBox).toBe('0 0 24 24');
    expect(dot.license.spdx).toBe('MIT');
    expect(U.toSvgSync('tst:dot', { size: 16 })).toContain('width="16"');
  });

  it('gives the attribution line for CC BY sets only', async () => {
    expect(await U.attributionFor('fil:star')).toBe('Icons from "Fill Brands" by Fill Brands Authors (https://example.com/fil), licensed under CC-BY-4.0 (https://creativecommons.org/licenses/by/4.0/).');
    expect(await U.attributionFor('tst:home')).toBe('');
  });
});

describe('style transforms', () => {
  it('renders size, color, title and the aspect ratio', async () => {
    const svg = await U.toSvg('fil:logo', { size: 20, color: '#ff7a1a', title: 'Logo' });
    expect(svg).toContain('width="40" height="20" viewBox="0 0 32 16"');
    expect(svg).toContain('color="#ff7a1a"');
    expect(svg).toContain('role="img" aria-label="Logo"><title>Logo</title>');
    expect(await U.toSvg('fil:star')).toContain('aria-hidden="true"');
  });

  it('changes the weight of stroke icons on the glyphfox scale and leaves filled icons alone', async () => {
    const thin = await U.toSvg('tst:home', { weight: 1 });
    expect(thin).toContain('stroke-width="1"');
    const star = await U.toSvg('fil:star', { weight: 3 });
    expect(star).not.toContain('stroke-width');
    // A 16 unit box: weight 2 on the 24 grid is 1.333 units.
    expect(U.applyWeight('<path stroke="currentColor" stroke-width="1" d=""/>', { weight: 2, boxHeight: 16 })).toContain('stroke-width="1.333"');
    // Optical compensation below 24 px, like glyphfox.
    expect(U.applyWeight('<path stroke="currentColor" stroke-width="2" d=""/>', { weight: 2, size: 12, boxHeight: 24 })).toContain('stroke-width="2.462"');
  });

  it('switches corners, rotates, flips and paints the duotone layer', async () => {
    const sharp = await U.toSvg('tst:arrow-left', { corners: 'sharp', rotate: 45, flipX: true });
    expect(sharp).toContain('stroke-linecap="square"');
    expect(sharp).toContain('rotate(45 12 12)');
    expect(sharp).toContain('scale(-1 1)');
    const duo = await U.toSvg('tst:heart-duotone', { secondaryColor: '#ff7a1a', secondaryOpacity: 0.5 });
    expect(duo).toContain('fill="#ff7a1a" opacity="0.5"');
  });

  it('animates with motion guarded by prefers-reduced-motion', async () => {
    const draw = await U.toSvg('tst:home', { animate: 'draw' });
    expect(draw).toContain('pathLength="1"');
    expect(draw).toContain('@media (prefers-reduced-motion:no-preference)');
    expect(await U.toSvg('fil:star', { animate: 'draw' })).not.toContain('pathLength');
    expect(await U.toSvg('fil:star', { animate: 'spin' })).toContain('class="gfu-spin"');
  });
});
