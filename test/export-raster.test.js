// Raster, PNG, animated favicon and CSS cursor exporters.
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { deflateSync, inflateSync } from 'node:zlib';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { resolve } from '../packages/glyphfox/dist/index.js';
import { dataUri, encodePng, parseColor, rasterize, toPng } from '../packages/glyphfox/src/export/raster.js';
import { FAVICON_ANIMATIONS, animateFavicon, faviconFrames, faviconKit, faviconRuntime, faviconSvg } from '../packages/glyphfox/src/export/favicon.js';
import { HOTSPOTS, cursorKit, resolveHotspot } from '../packages/glyphfox/src/export/cursor.js';

const tmp = mkdtempSync(join(os.tmpdir(), 'glyphfox-raster-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));
afterEach(() => vi.useRealTimers());

const CRC = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t.push(c >>> 0);
  }
  return t;
})();
const crc32 = (bytes) => {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

/** Splits a PNG into chunks and checks the signature and every CRC. */
function chunks(png) {
  expect(Array.from(png.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const out = [];
  let o = 8;
  while (o < png.length) {
    const len = view.getUint32(o);
    const type = String.fromCharCode(...png.slice(o + 4, o + 8));
    const data = png.slice(o + 8, o + 8 + len);
    expect(view.getUint32(o + 8 + len), `${type} crc`).toBe(crc32(png.slice(o + 4, o + 8 + len)));
    out.push({ type, data });
    o += 12 + len;
  }
  return out;
}

function header(png) {
  const c = chunks(png).find((x) => x.type === 'IHDR');
  const v = new DataView(c.data.buffer, c.data.byteOffset, c.data.byteLength);
  return { width: v.getUint32(0), height: v.getUint32(4), depth: c.data[8], color: c.data[9] };
}

/** Decodes the RGBA pixels of a PNG written by encodePng (filter 0 rows). */
function pixels(png) {
  const { width, height } = header(png);
  const idat = chunks(png)
    .filter((x) => x.type === 'IDAT')
    .map((x) => x.data);
  const raw = inflateSync(Buffer.concat(idat.map((d) => Buffer.from(d))));
  expect(raw.length).toBe(height * (width * 4 + 1));
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    expect(raw[y * (width * 4 + 1)]).toBe(0);
    data.set(raw.subarray(y * (width * 4 + 1) + 1, (y + 1) * (width * 4 + 1)), y * width * 4);
  }
  return { width, height, data };
}

const at = (img, x, y) => Array.from(img.data.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 4));
const alpha = (img, x, y) => img.data[(y * img.width + x) * 4 + 3];
const painted = (img) => {
  let n = 0;
  for (let i = 3; i < img.data.length; i += 4) if (img.data[i] > 0) n++;
  return n;
};

/** A tiny DOM with icon links, a canvas that names each drawn frame, and images that load on the next microtask. */
function fakeDom({ href = 'static.svg', type = 'image/svg+xml', links = 1 } = {}) {
  const el = (tag) => {
    const attrs = {};
    return {
      tagName: tag,
      attrs,
      setAttribute(k, v) {
        attrs[k] = String(v);
      },
      getAttribute(k) {
        return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null;
      },
      removeAttribute(k) {
        delete attrs[k];
      },
    };
  };
  const list = [];
  for (let k = 0; k < links; k++) {
    const l = el('link');
    l.setAttribute('rel', k ? 'alternate icon' : 'icon');
    if (href) l.setAttribute('href', href);
    if (type) l.setAttribute('type', type);
    list.push(l);
  }
  let drawn = 0;
  const doc = {
    head: { appendChild: (n) => list.push(n) },
    querySelectorAll: () => list.filter((l) => /(^|\s)icon(\s|$)/.test(l.getAttribute('rel') || '')),
    createElement(tag) {
      const n = el(tag);
      if (tag === 'canvas') {
        n.getContext = () => ({ clearRect() {}, drawImage() {} });
        n.toDataURL = (t) => `data:${t};base64,FRAME${drawn++}`;
      }
      return n;
    },
  };
  return { doc, links: list };
}

class FakeImage {
  set src(v) {
    this._src = v;
    Promise.resolve().then(() => (FakeImage.fail ? this.onerror() : this.onload()));
  }
  get src() {
    return this._src;
  }
}

const flush = async () => {
  for (let k = 0; k < 5; k++) await Promise.resolve();
};

describe('parseColor', () => {
  it('reads hex, rgb() and named colors', () => {
    expect(parseColor('#f00')).toEqual([255, 0, 0, 255]);
    expect(parseColor('#ff7a1a')).toEqual([255, 122, 26, 255]);
    expect(parseColor('#0008')).toEqual([0, 0, 0, 136]);
    expect(parseColor('#11223344')).toEqual([17, 34, 51, 68]);
    expect(parseColor('rgb(10, 20, 30)')).toEqual([10, 20, 30, 255]);
    expect(parseColor('rgba(10,20,30,0.5)')).toEqual([10, 20, 30, 128]);
    expect(parseColor('White')).toEqual([255, 255, 255, 255]);
    expect(parseColor('transparent')[3]).toBe(0);
    expect(parseColor('currentColor')).toEqual([0, 0, 0, 255]);
    expect(() => parseColor('#12345')).toThrow(/unsupported color/);
    expect(() => parseColor('tomato')).toThrow(RangeError);
  });
});

describe('rasterize', () => {
  it('covers the strokes and leaves empty areas clear', () => {
    const img = rasterize(resolve('circle'), { size: 32, color: '#ff7a1a' });
    expect(img.width).toBe(32);
    expect(img.data.length).toBe(32 * 32 * 4);
    expect(alpha(img, 16, 16)).toBe(0);
    expect(alpha(img, 16, 2)).toBeGreaterThan(200);
    expect(at(img, 16, 2).slice(0, 3)).toEqual([255, 122, 26]);
    const edges = Array.from({ length: img.width * img.height }, (_, i) => img.data[i * 4 + 3]).filter((a) => a > 0 && a < 255);
    expect(edges.length).toBeGreaterThan(20);
  });

  it('draws the minus icon as a 2 unit band at 24 px', () => {
    const img = rasterize(resolve('minus'), { size: 24 });
    expect(alpha(img, 12, 11)).toBe(255);
    expect(alpha(img, 12, 12)).toBe(255);
    expect(alpha(img, 12, 10)).toBe(0);
    expect(alpha(img, 12, 13)).toBe(0);
    expect(alpha(img, 2, 12)).toBe(0);
  });

  it('fills closed shapes for the solid and duotone variants', () => {
    expect(alpha(rasterize(resolve('circle'), { size: 32, variant: 'solid' }), 16, 16)).toBe(255);
    const duo = rasterize(resolve('file'), { size: 24, variant: 'duotone', color: '#000' });
    expect(Math.abs(alpha(duo, 12, 12) - 77)).toBeLessThanOrEqual(2);
    const op = rasterize(resolve('file'), { size: 24, variant: 'duotone', secondaryOpacity: 0.5 });
    expect(Math.abs(alpha(op, 12, 12) - 128)).toBeLessThanOrEqual(2);
    const colored = rasterize(resolve('file'), { size: 24, variant: 'duotone', color: '#000', secondaryColor: '#00f' });
    expect(at(colored, 12, 12).slice(0, 3)).toEqual([0, 0, 255]);
    const target = rasterize(resolve('target'), { size: 48, variant: 'solid' });
    const ring = rasterize(resolve('target'), { size: 48 });
    expect(painted(target)).toBeGreaterThan(painted(ring));
  });

  it('adds a halo under the icon and a rounded background', () => {
    const plain = rasterize(resolve('cursor'), { size: 32, color: '#111' });
    const halo = rasterize(resolve('cursor'), { size: 32, color: '#111', outline: '#fff' });
    expect(painted(halo)).toBeGreaterThan(painted(plain) + 40);
    let white = 0;
    for (let i = 0; i < halo.data.length; i += 4) if (halo.data[i + 3] === 255 && halo.data[i] > 240) white++;
    expect(white).toBeGreaterThan(10);
    const bg = rasterize(resolve('heart'), { size: 32, background: '#14112b', radius: 8, color: '#fff' });
    expect(alpha(bg, 0, 0)).toBe(0);
    expect(at(bg, 16, 30)).toEqual([20, 17, 43, 255]);
  });

  it('is fast enough for exports', () => {
    const icons = ['heart', 'settings', 'globe', 'target', 'fenn'].map((n) => resolve(n));
    const t0 = performance.now();
    for (const ic of icons) rasterize(ic, { size: 64, variant: 'solid', outline: '#fff' });
    expect((performance.now() - t0) / icons.length).toBeLessThan(100);
  });

  it('rejects things that are not icons', () => {
    expect(() => rasterize(null)).toThrow(TypeError);
    expect(() => rasterize({ name: 'x' })).toThrow(TypeError);
  });
});

describe('PNG', () => {
  it('writes a valid PNG with stored deflate blocks', () => {
    const img = rasterize(resolve('heart'), { size: 32, color: '#ff7a1a' });
    const png = encodePng(img);
    expect(chunks(png).map((c) => c.type)).toEqual(['IHDR', 'IDAT', 'IEND']);
    expect(header(png)).toEqual({ width: 32, height: 32, depth: 8, color: 6 });
    expect(Array.from(pixels(png).data)).toEqual(Array.from(img.data));
  });

  it('splits big images into several stored blocks', () => {
    const img = rasterize(resolve('heart'), { size: 200 });
    const png = encodePng(img);
    expect(png.length).toBeGreaterThan(65535 * 2);
    expect(Array.from(pixels(png).data)).toEqual(Array.from(img.data));
  });

  it('takes a deflate function for smaller files', () => {
    const img = rasterize(resolve('heart'), { size: 64 });
    const stored = encodePng(img);
    const small = encodePng(img, { deflate: (b) => deflateSync(b) });
    expect(small.length).toBeLessThan(stored.length / 3);
    expect(Array.from(pixels(small).data)).toEqual(Array.from(img.data));
    expect(Array.from(toPng(resolve('heart'), { size: 64 }))).toEqual(Array.from(stored));
    expect(() => encodePng({ width: 2, height: 2, data: new Uint8Array(3) })).toThrow(TypeError);
  });

  it('makes base64 data URIs', () => {
    expect(dataUri(new Uint8Array([1, 2, 3]))).toBe('data:image/png;base64,AQID');
    expect(dataUri(new Uint8Array([1, 2]))).toBe('data:image/png;base64,AQI=');
    const svg = '<svg xmlns="http://www.w3.org/2000/svg">á</svg>';
    expect(dataUri(svg, 'image/svg+xml')).toBe(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
    const png = toPng(resolve('x'), { size: 16 });
    expect(dataUri(png)).toBe(`data:image/png;base64,${Buffer.from(png).toString('base64')}`);
  });
});

describe('animated favicon', () => {
  it('renders one loop of frames for every animation', () => {
    expect(FAVICON_ANIMATIONS).toEqual(['pulse', 'spin', 'draw', 'pop', 'wiggle', 'bounce', 'shake', 'morph']);
    for (const animate of FAVICON_ANIMATIONS) {
      const frames = faviconFrames(resolve('bell'), { animate, morphTo: resolve('bell-ring') });
      expect(frames.length, animate).toBe(24);
      expect(new Set(frames).size, animate).toBeGreaterThan(2);
      for (const f of frames) {
        expect(f.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"'), animate).toBe(true);
        expect(f).toContain('color="#ff7a1a"');
        expect(f).not.toContain('<style');
      }
    }
    expect(faviconFrames(resolve('heart'), { frames: 10 }).length).toBe(10);
  });

  it('starts the morph on the exact icon and adds a background', () => {
    const frames = faviconFrames(resolve('menu'), { animate: 'morph', morphTo: resolve('x'), color: '#123456' });
    expect(frames[0]).toBe(faviconSvg(resolve('menu'), { color: '#123456' }));
    expect(frames).toContain(faviconSvg(resolve('x'), { color: '#123456' }));
    const bg = faviconFrames(resolve('heart'), { animate: 'spin', background: '#14112b', radius: 8 });
    expect(bg[3]).toMatch(/<rect x="0" y="0" width="24" height="24" rx="6" fill="#14112b" stroke="none"\/><g class="gf-anim" transform="/);
    expect(() => faviconFrames(resolve('heart'), { animate: 'morph' })).toThrow(/morphTo/);
    expect(() => faviconFrames(resolve('heart'), { animate: 'twirl' })).toThrow(/unknown favicon animation/);
  });

  it('writes a static fallback SVG', () => {
    const svg = faviconSvg(resolve('heart'), { color: '#ff7a1a', variant: 'solid' });
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]* color="#ff7a1a"/);
    expect(svg).toContain('gf-fill');
    expect(svg.endsWith('</svg>')).toBe(true);
  });

  it('cycles the tab icon through canvas frames and restores the fallback', async () => {
    vi.useFakeTimers();
    const { doc, links } = fakeDom({ links: 2 });
    const frames = faviconFrames(resolve('heart'), { frames: 6 });
    const ctl = animateFavicon(frames, { document: doc, Image: FakeImage, fps: 10, reducedMotion: false });
    const urls = await ctl.ready;
    await flush();
    expect(urls.length).toBe(6);
    expect(new Set(urls).size).toBe(6);
    expect(ctl.playing).toBe(true);
    const seen = new Set([links[0].getAttribute('href')]);
    for (let k = 0; k < 6; k++) {
      vi.advanceTimersByTime(100);
      seen.add(links[0].getAttribute('href'));
    }
    expect(seen).toEqual(new Set(urls));
    expect(links[0].getAttribute('type')).toBe('image/png');
    expect(links[1].getAttribute('href')).toBe(links[0].getAttribute('href'));
    ctl.stop();
    expect(ctl.playing).toBe(false);
    for (const l of links) {
      expect(l.getAttribute('href')).toBe('static.svg');
      expect(l.getAttribute('type')).toBe('image/svg+xml');
    }
    vi.advanceTimersByTime(1000);
    expect(links[0].getAttribute('href')).toBe('static.svg');
  });

  it('stays static under reduced motion and plays once without loop', async () => {
    vi.useFakeTimers();
    const frames = faviconFrames(resolve('heart'), { animate: 'pop', frames: 4 });
    const still = fakeDom();
    const a = animateFavicon(frames, { document: still.doc, Image: FakeImage, reducedMotion: true });
    await a.ready;
    await flush();
    vi.advanceTimersByTime(2000);
    expect(a.playing).toBe(false);
    expect(still.links[0].getAttribute('href')).toBe('static.svg');

    const once = fakeDom();
    const b = animateFavicon(frames, { document: once.doc, Image: FakeImage, reducedMotion: false, loop: false, fps: 4 });
    await b.ready;
    await flush();
    expect(once.links[0].getAttribute('href')).toMatch(/^data:image\/png/);
    vi.advanceTimersByTime(250 * 3);
    expect(b.playing).toBe(true);
    vi.advanceTimersByTime(250);
    expect(b.playing).toBe(false);
    expect(once.links[0].getAttribute('href')).toBe('static.svg');
  });

  it('creates an icon link when there is none and falls back to SVG frames', async () => {
    vi.useFakeTimers();
    const { doc, links } = fakeDom({ links: 0 });
    FakeImage.fail = true;
    try {
      const ctl = animateFavicon(['<svg xmlns="http://www.w3.org/2000/svg"/>', 'frame.png'], { document: doc, Image: FakeImage, reducedMotion: false, autostart: false });
      const urls = await ctl.ready;
      expect(urls[0]).toBe(`data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"/>')}`);
      expect(urls[1]).toBe('frame.png');
      expect(ctl.playing).toBe(false);
      ctl.start();
      await flush();
      expect(links.length).toBe(1);
      expect(links[0].getAttribute('rel')).toBe('icon');
      expect(links[0].getAttribute('type')).toBe('image/svg+xml');
      vi.advanceTimersByTime(1000 / 12);
      expect(links[0].getAttribute('href')).toBe('frame.png');
      expect(links[0].getAttribute('type')).toBeNull();
      ctl.stop();
      expect(links[0].getAttribute('href')).toBeNull();
    } finally {
      FakeImage.fail = false;
    }
    expect(animateFavicon(['a'], { document: null }).playing).toBe(false);
  });

  it('writes a standalone runtime module', async () => {
    const frames = faviconFrames(resolve('bell'), { animate: 'shake', frames: 5 });
    const src = faviconRuntime(frames, { fps: 8 });
    expect(src).not.toMatch(/^\s*import /m);
    expect(src).toContain('export function animateFavicon(');
    expect(src).toContain('export function stopFavicon(');
    expect(src).toContain("if (typeof document !== 'undefined') animateFavicon();");
    expect(faviconRuntime(frames, { autostart: false })).not.toContain('animateFavicon();');
    const file = join(tmp, 'favicon-animated.mjs');
    writeFileSync(file, src);
    const mod = await import(pathToFileURL(file).href);
    expect(typeof mod.animateFavicon).toBe('function');
    vi.useFakeTimers();
    const { doc, links } = fakeDom();
    const ctl = mod.animateFavicon({ document: doc, Image: FakeImage, reducedMotion: false });
    const urls = await ctl.ready;
    await flush();
    expect(urls.length).toBe(5);
    expect(links[0].getAttribute('href')).toBe(urls[0]);
    vi.advanceTimersByTime(125);
    expect(links[0].getAttribute('href')).toBe(urls[1]);
    mod.stopFavicon();
    expect(links[0].getAttribute('href')).toBe('static.svg');
  });

  it('builds the favicon kit', () => {
    const kit = faviconKit(resolve('bell'), { animate: 'shake', background: '#14112b', deflate: (b) => deflateSync(b) });
    expect(Object.keys(kit)).toEqual(['favicon.svg', 'favicon-32.png', 'favicon-animated.js', 'favicon.html']);
    expect(header(kit['favicon-32.png'])).toEqual({ width: 32, height: 32, depth: 8, color: 6 });
    expect(alpha(pixels(kit['favicon-32.png']), 16, 16)).toBe(255);
    expect(kit['favicon.svg']).toContain('fill="#14112b"');
    expect(kit['favicon.html']).toContain('<link rel="icon" href="favicon.svg" type="image/svg+xml">');
    expect(kit['favicon.html']).toContain('<script type="module" src="favicon-animated.js"></script>');
    expect(kit['favicon-animated.js']).toContain('const FRAMES = [');
  });
});

describe('CSS cursor', () => {
  it('resolves hotspots', () => {
    expect(HOTSPOTS).toEqual(['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right']);
    expect(resolveHotspot()).toEqual([16, 16]);
    expect(resolveHotspot('tl')).toEqual([3, 3]);
    expect(resolveHotspot('top-right')).toEqual([29, 3]);
    expect(resolveHotspot('bottom-left')).toEqual([3, 29]);
    expect(resolveHotspot('BR')).toEqual([29, 29]);
    expect(resolveHotspot('center', 64)).toEqual([32, 32]);
    expect(resolveHotspot([3.5, 3.5])).toEqual([5, 5]);
    expect(resolveHotspot(' 6 , 18 ')).toEqual([8, 24]);
    expect(resolveHotspot('6 18')).toEqual([8, 24]);
    expect(resolveHotspot({ x: 0, y: 0 })).toEqual([0, 0]);
    expect(resolveHotspot('24,24')).toEqual([31, 31]);
    expect(resolveHotspot([-5, 30])).toEqual([0, 31]);
    expect(() => resolveHotspot('middle')).toThrow(/unknown hotspot/);
    expect(() => resolveHotspot([1])).toThrow(RangeError);
  });

  it('writes PNG at 32 and 64 px with the cursor CSS', () => {
    const kit = cursorKit(resolve('cursor'), { hotspot: '3.5,3.5' });
    expect(Object.keys(kit.files)).toEqual(['cursor-32.png', 'cursor-64.png', 'cursor.css']);
    expect(header(kit.files['cursor-32.png'])).toMatchObject({ width: 32, height: 32 });
    expect(header(kit.files['cursor-64.png'])).toMatchObject({ width: 64, height: 64 });
    expect(kit.hotspot).toEqual([5, 5]);
    expect(kit.css).toBe(kit.files['cursor.css']);
    expect(kit.css).toContain('.gf-cursor-cursor {');
    expect(kit.css).toContain('cursor: url("cursor-32.png") 5 5, auto;');
    expect(kit.css).toContain('cursor: -webkit-image-set(url("cursor-32.png") 1x, url("cursor-64.png") 2x) 5 5, auto;');
    expect(kit.css).toContain('cursor: image-set(url("cursor-32.png") 1x, url("cursor-64.png") 2x) 5 5, auto;');
    const px = pixels(kit.files['cursor-32.png']);
    let dark = 0;
    let light = 0;
    for (let i = 0; i < px.data.length; i += 4) {
      if (px.data[i + 3] < 250) continue;
      if (px.data[i] < 40) dark++;
      else if (px.data[i] > 230) light++;
    }
    expect(dark).toBeGreaterThan(20);
    expect(light).toBeGreaterThan(20);
    const big = pixels(kit.files['cursor-64.png']);
    expect(painted(big)).toBeGreaterThan(painted(px) * 3);
  });

  it('inlines data URIs and keeps safe names', () => {
    const kit = cursorKit(resolve('file+check'), { inline: true, fallback: 'pointer', color: '#ff7a1a', outline: null });
    expect(Object.keys(kit.files)).toEqual(['file-check-32.png', 'file-check-64.png', 'file-check.css']);
    expect(kit.css).toContain('.gf-cursor-file-check {');
    expect(kit.css).toContain(`url("${dataUri(kit.files['file-check-32.png'])}") 16 16, pointer;`);
    expect(kit.css).toContain(`url("${dataUri(kit.files['file-check-64.png'])}") 2x`);
    expect(cursorKit(resolve('x'), { fallback: 'url(evil)' }).css).toContain(', auto;');
    expect(cursorKit(resolve('x'), { name: 'My Cursor!' }).files).toHaveProperty('my-cursor.css');
  });
});
