// @vitest-environment happy-dom
// Brand kit export of the studio: every file of the zip, built the way the
// page builds it, with a stand in PNG encoder (there is no canvas in Node).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';
import * as gf from '../docs/vendor/glyphfox.js';
import { zip } from '../docs/assets/js/exporters.js';
import { ICO_SIZES, PNGS, cssPrefix, ident, kitFiles, mix, slug, tileSvg } from '../docs/assets/js/labs/kit-core.js';

const data = JSON.parse(readFileSync('docs/data/icons.json', 'utf8'));
gf.registerIcons(data.icons.map(([name, body, tags, categories, solid]) => ({ name, body, tags, categories, solid })));
const names = data.icons.map((i) => i[0]);
const render = (name, props) => gf.renderToString(gf.lookupIcon(name), props);
const text = (bytes) => new TextDecoder().decode(bytes);

/** A real (blank) PNG of size x size, so the test can read the dimensions back. */
function blankPng(size) {
  const chunk = (type, body) => {
    const out = Buffer.alloc(12 + body.length);
    out.writeUInt32BE(body.length, 0);
    out.write(type, 4, 'latin1');
    body.copy(out, 8);
    out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'latin1'), body])), 8 + body.length);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  return new Uint8Array(png);
}

const pngSize = (bytes) => {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  expect(Array.from(bytes.subarray(0, 4))).toEqual([137, 80, 78, 71]);
  return [v.getUint32(16), v.getUint32(20)];
};

/** Reads a store only zip back into a Map of name to bytes, checking every CRC. */
function unzip(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const files = new Map();
  let o = 0;
  while (v.getUint32(o, true) === 0x04034b50) {
    expect(v.getUint16(o + 8, true)).toBe(0);
    const size = v.getUint32(o + 18, true);
    const nameLen = v.getUint16(o + 26, true);
    const name = text(bytes.subarray(o + 30, o + 30 + nameLen));
    const body = bytes.subarray(o + 30 + nameLen, o + 30 + nameLen + size);
    expect(crc32(body) >>> 0, name).toBe(v.getUint32(o + 14, true));
    files.set(name, body);
    o += 30 + nameLen + size;
  }
  const end = bytes.length - 22;
  expect(v.getUint32(end, true)).toBe(0x06054b50);
  expect(v.getUint16(end + 10, true)).toBe(files.size);
  return files;
}

const settings = { seed: '#0a7cff', bg: '#101820', weight: 1.5, corners: 'sharp', variant: 'duotone', mark: 'heart', name: '@acme/brand-icons' };
const requested = [];
const files = await kitFiles({
  names,
  settings,
  render,
  version: data.version,
  png: async (markup, size) => {
    requested.push([size, markup]);
    return blankPng(size);
  },
});
const kit = unzip(new Uint8Array(await zip(files).arrayBuffer()));
const get = (path) => {
  const bytes = kit.get(`brand-icons/${path}`);
  expect(bytes, path).toBeDefined();
  return bytes;
};

describe('brand kit export', () => {
  it('names the folder, classes and exports after the package', () => {
    expect(slug('@acme/brand-icons')).toBe('brand-icons');
    expect(slug('My Icons!')).toBe('my-icons');
    expect(cssPrefix('@acme/brand-icons')).toBe('acme');
    expect(cssPrefix('brand-icons')).toBe('brand-icons');
    expect(ident('arrow-up-right')).toBe('iconArrowUpRight');
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('puts every part of the kit in one zip', () => {
    const expected = [
      'package.json',
      'README.md',
      'LICENSE',
      'index.js',
      'index.d.ts',
      'sprite.svg',
      'icons.css',
      'favicon/favicon.ico',
      'favicon/favicon.svg',
      'favicon/manifest.webmanifest',
      'favicon/head.html',
      ...PNGS.map((p) => p[0]),
      ...names.map((n) => `svg/${n}.svg`),
    ];
    expect([...kit.keys()].sort()).toEqual(expected.map((p) => `brand-icons/${p}`).sort());
    for (const p of ['favicon/favicon-16.png', 'favicon/favicon-32.png', 'favicon/apple-touch-icon.png', 'favicon/icon-192.png', 'favicon/icon-512.png']) expect(kit.has(`brand-icons/${p}`), p).toBe(true);
  });

  it('themes every SVG file with the color, weight, corners and style', () => {
    const secondary = mix('#0a7cff', '#ffffff', 0.35);
    for (const n of names) {
      const s = text(get(`svg/${n}.svg`));
      expect(s, n).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="24" height="24" viewBox="0 0 24 24"/);
      expect(s, n).toContain('stroke-width="1.5"');
      expect(s, n).toContain('stroke-linejoin="miter"');
      expect(s, n).toContain('color="#0a7cff"');
      expect(s, n).not.toMatch(/^<svg[^>]*\sclass=/);
      expect(s.trimEnd().endsWith('</svg>'), n).toBe(true);
    }
    expect(text(get('svg/heart.svg'))).toContain(`color="${secondary}"`);
  });

  it('writes a sprite and CSS that share the brand variables', () => {
    const sprite = text(get('sprite.svg'));
    expect(sprite.match(/<symbol id="[a-z0-9-]+"/g).length).toBe(names.length);
    expect(sprite).toContain('<symbol id="heart" viewBox="0 0 24 24"');
    expect(sprite).toContain('style="color:var(--acme-color,#0a7cff)"');
    expect(sprite).toMatch(/class="gf-secondary[^"]*"[^>]*style="color:var\(--acme-secondary,#[0-9a-f]{6}\)"/);
    const css = text(get('icons.css'));
    expect(css).toMatch(/:root \{\n {2}--acme-color: #0a7cff;\n {2}--acme-secondary: #[0-9a-f]{6};/);
    expect(css).toContain('--acme-surface: #101820;');
    expect(css).toContain('mask: var(--acme-glyph) no-repeat center / 100% 100%;');
    expect(css.match(/^\.acme-icon-[a-z0-9-]+\{--acme-glyph:url\("data:image\/svg\+xml,/gm).length).toBe(names.length);
    expect(css).not.toMatch(/url\("[^"]*"[^)]*"\)/);
  });

  it('builds the favicon set and the app icons at the right sizes', () => {
    for (const [path, , size] of PNGS) expect(pngSize(get(path)), path).toEqual([size, size]);
    expect(pngSize(get('favicon/apple-touch-icon.png'))).toEqual([180, 180]);
    const ico = get('favicon/favicon.ico');
    const v = new DataView(ico.buffer, ico.byteOffset, ico.byteLength);
    expect([v.getUint16(0, true), v.getUint16(2, true), v.getUint16(4, true)]).toEqual([0, 1, ICO_SIZES.length]);
    ICO_SIZES.forEach((size, i) => {
      const o = 6 + i * 16;
      expect(v.getUint8(o)).toBe(size);
      const len = v.getUint32(o + 8, true);
      const at = v.getUint32(o + 12, true);
      expect(pngSize(ico.subarray(at, at + len))).toEqual([size, size]);
    });
    const favicon = text(get('favicon/favicon.svg'));
    expect(favicon).toContain('fill="#101820"');
    expect(favicon).toContain('viewBox="0 0 32 32"');
    const store = requested.find(([size]) => size === 1024)[1];
    expect(store).toContain('<rect width="1024" height="1024" rx="0" fill="#101820"/>');
    const foreground = requested.find(([size]) => size === 432)[1];
    expect(foreground).not.toContain('<rect');
    expect(tileSvg(render, { ...settings }, 'app', 192)).toContain('rx="42.24"');
    const manifest = JSON.parse(text(get('favicon/manifest.webmanifest')));
    expect(manifest.icons.map((i) => i.src)).toEqual(['icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png']);
    expect(manifest.icons.filter((i) => i.purpose === 'maskable').length).toBe(2);
    for (const i of manifest.icons) expect(kit.has(`brand-icons/favicon/${i.src}`), i.src).toBe(true);
    expect(text(get('favicon/head.html'))).toContain('<link rel="manifest" href="/manifest.webmanifest">');
  });

  it('ships a package.json skeleton with entry points that exist', () => {
    const pkg = JSON.parse(text(get('package.json')));
    expect(pkg).toMatchObject({ name: '@acme/brand-icons', version: '0.1.0', license: 'MIT', type: 'module', main: './index.js', types: './index.d.ts' });
    expect(pkg.glyphfox).toMatchObject({ seed: '#0a7cff', weight: 1.5, corners: 'sharp', variant: 'duotone', mark: 'heart' });
    for (const f of pkg.files) expect([...kit.keys()].some((k) => k === `brand-icons/${f}` || k.startsWith(`brand-icons/${f}/`)), f).toBe(true);
    for (const target of Object.values(pkg.exports).map((e) => (typeof e === 'string' ? e : e.default))) {
      const p = target.replace(/^\.\//, '').replace(/\*$/, '');
      expect([...kit.keys()].some((k) => k.startsWith(`brand-icons/${p}`)), target).toBe(true);
    }
    const index = text(get('index.js'));
    expect(index.match(/^export const icon[A-Za-z0-9]+ = "<svg /gm).length).toBe(names.length);
    expect(index).toContain('export const iconHeart = "<svg ');
    expect(text(get('index.d.ts')).match(/^export declare const /gm).length).toBe(names.length);
    expect(text(get('LICENSE'))).toContain('Copyright (c) 2026 Alexandre Kohler');
    expect(text(get('README.md'))).toContain('<span class="acme-icon acme-icon-heart"></span>');
  });
});
