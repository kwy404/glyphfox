// Export helpers: PNG, animated SVG, GIF (a small LZW encoder), WebM
// (MediaRecorder) and ZIP (store only). Everything runs in the browser.

import { gf, t } from './app.js';

/** Rasterizes SVG markup into a canvas of width x height. */
export function svgToCanvas(markup, width, height = width, background = null) {
  return new Promise((resolve, reject) => {
    const sized = markup.replace(/<svg([^>]*?)\swidth="[^"]*"([^>]*?)\sheight="[^"]*"/, `<svg$1 width="${width}"$2 height="${height}"`);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const ctx = c.getContext('2d');
      if (background) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(c);
    };
    img.onerror = () => reject(new Error(t('error.rasterize')));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized);
  });
}

/** PNG blob for SVG markup. */
export async function svgToPng(markup, size, background = null) {
  const c = await svgToCanvas(markup, size, size, background);
  return new Promise((r) => c.toBlob(r, 'image/png'));
}

/** Replaces currentColor so standalone files keep the chosen color. */
export function bakeColor(markup, color) {
  if (!color || /^<svg[^>]*\scolor="/.test(markup)) return markup;
  return markup.replace('<svg ', `<svg color="${color}" `);
}

// ZIP (store only).
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Builds a ZIP file from [{ name, data }] where data is a string or bytes. */
export function zip(files) {
  const enc = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;
  const now = new Date();
  const time = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
  const date = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint16(8, 0, true);
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    parts.push(new Uint8Array(local.buffer), name, data);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true);
    cen.setUint16(4, 20, true);
    cen.setUint16(6, 20, true);
    cen.setUint16(8, 0x0800, true);
    cen.setUint16(10, 0, true);
    cen.setUint16(12, time, true);
    cen.setUint16(14, date, true);
    cen.setUint32(16, crc, true);
    cen.setUint32(20, data.length, true);
    cen.setUint32(24, data.length, true);
    cen.setUint16(28, name.length, true);
    cen.setUint32(42, offset, true);
    central.push(new Uint8Array(cen.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const centralSize = central.reduce((s, p) => s + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

// GIF encoder.
function buildPalette(frames) {
  const counts = new Map();
  for (const f of frames) {
    const d = f.data;
    for (let i = 0; i < d.length; i += 4) {
      const key = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 256);
  const palette = top.map(([k]) => [((k >> 10) & 31) * 8 + 4, ((k >> 5) & 31) * 8 + 4, (k & 31) * 8 + 4]);
  while (palette.length < 256) palette.push([0, 0, 0]);
  return palette;
}

function lzw(indices, minCode) {
  const out = [];
  let cur = 0;
  let bits = 0;
  const emit = (code, size) => {
    cur |= code << bits;
    bits += size;
    while (bits >= 8) {
      out.push(cur & 0xff);
      cur >>>= 8;
      bits -= 8;
    }
  };
  const clear = 1 << minCode;
  const eoi = clear + 1;
  let size = minCode + 1;
  let next = eoi + 1;
  let dict = new Map();
  emit(clear, size);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = prefix * 256 + k;
    const hit = dict.get(key);
    if (hit !== undefined) {
      prefix = hit;
      continue;
    }
    emit(prefix, size);
    if (next < 4096) {
      dict.set(key, next++);
      if (next > 1 << size && size < 12) size++;
    } else {
      emit(clear, size);
      dict = new Map();
      size = minCode + 1;
      next = eoi + 1;
    }
    prefix = k;
  }
  emit(prefix, size);
  emit(eoi, size);
  if (bits > 0) out.push(cur & 0xff);
  return out;
}

/** Encodes ImageData frames into an animated GIF (delay in ms, loops forever). */
export function encodeGif(frames, delay = 40) {
  const w = frames[0].width;
  const h = frames[0].height;
  const palette = buildPalette(frames);
  const cache = new Map();
  const nearest = (r, g, b) => {
    const key = (r << 16) | (g << 8) | b;
    let hit = cache.get(key);
    if (hit !== undefined) return hit;
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < 256; i++) {
      const p = palette[i];
      const d = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    cache.set(key, best);
    return best;
  };
  const bytes = [];
  const push16 = (v) => bytes.push(v & 0xff, (v >> 8) & 0xff);
  for (const c of 'GIF89a') bytes.push(c.charCodeAt(0));
  push16(w);
  push16(h);
  bytes.push(0xf7, 0, 0);
  for (const p of palette) bytes.push(p[0], p[1], p[2]);
  bytes.push(0x21, 0xff, 0x0b);
  for (const c of 'NETSCAPE2.0') bytes.push(c.charCodeAt(0));
  bytes.push(3, 1, 0, 0, 0);
  for (const f of frames) {
    bytes.push(0x21, 0xf9, 4, 0x04);
    push16(Math.round(delay / 10));
    bytes.push(0, 0);
    bytes.push(0x2c);
    push16(0);
    push16(0);
    push16(w);
    push16(h);
    bytes.push(0);
    const d = f.data;
    const idx = new Uint8Array(w * h);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) idx[j] = nearest(d[i], d[i + 1], d[i + 2]);
    bytes.push(8);
    const data = lzw(idx, 8);
    for (let i = 0; i < data.length; i += 255) {
      const chunk = data.slice(i, i + 255);
      bytes.push(chunk.length, ...chunk);
    }
    bytes.push(0);
  }
  bytes.push(0x3b);
  return new Blob([new Uint8Array(bytes)], { type: 'image/gif' });
}

/** Static frames of an animation, rendered to ImageData. */
export async function animationFrames(icon, props, { size = 256, fps = 25, background = '#0b0b0f' } = {}) {
  const total = gf.animationLength(props);
  const length = Number.isFinite(total) ? Math.min(total, 4000) : (props.duration || gf.ANIMATIONS[props.animate].duration) * 2;
  const count = Math.max(2, Math.round((length / 1000) * fps) + 1);
  const frames = [];
  for (let i = 0; i < count; i++) {
    const tms = (i / (count - 1)) * length;
    const markup = gf.renderToString(icon, { ...props, size, frame: tms });
    const c = await svgToCanvas(bakeColor(markup, props.color), size, size, background);
    frames.push(c.getContext('2d').getImageData(0, 0, size, size));
  }
  return { frames, delay: 1000 / fps };
}

export async function animationGif(icon, props, options) {
  const { frames, delay } = await animationFrames(icon, props, options);
  return encodeGif(frames, delay);
}

/** Records the animation into a WebM video with MediaRecorder. */
export async function animationWebm(icon, props, { size = 512, fps = 30, background = '#0b0b0f' } = {}) {
  if (typeof MediaRecorder === 'undefined') throw new Error(t('error.video'));
  const { frames, delay } = await animationFrames(icon, props, { size, fps, background });
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(frames[0], 0, 0);
  const stream = canvas.captureStream(fps);
  const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t)) || 'video/webm';
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 4_000_000 });
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise((r) => (rec.onstop = r));
  rec.start();
  for (const f of frames) {
    ctx.putImageData(f, 0, 0);
    await new Promise((r) => setTimeout(r, delay));
  }
  await new Promise((r) => setTimeout(r, delay));
  rec.stop();
  await done;
  return new Blob(chunks, { type: 'video/webm' });
}

/** Animated SVG that loops (CSS animation inside the file). */
export function animatedSvg(icon, props) {
  return bakeColor(gf.renderToString(icon, { ...props, trigger: 'mount', loop: props.loop ?? true }), props.color);
}
