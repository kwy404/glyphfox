// A collection as a link, with no server: the icons are packed as JSON,
// compressed with deflate and written in base64url into the URL fragment
// (studio.html#share=...). Browsers never send the fragment to a server, so
// the icons only travel inside the link itself.
//
//   z1.<base64url of deflate-raw(JSON)>    compressed
//   j1.<base64url of JSON>                 where CompressionStream is missing

import { fromBase64Url, fromUtf8, toBase64Url, utf8 } from './bytes.js';
import { LIMITS, cleanItem } from './sanitize.js';

export const VERSION = 1;
const MAX_LINK = 4 * 1024 * 1024; // characters of a payload we try to read
const MAX_JSON = 8 * 1024 * 1024; // bytes after inflating

async function pipe(bytes, stream, max = Infinity) {
  const reader = new Blob([bytes]).stream().pipeThrough(stream).getReader();
  const parts = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new Error('The shared collection is too large');
    }
    parts.push(value);
  }
  const out = new Uint8Array(size);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

const canCompress = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

/** Packs collection items ({ name, body, tags, categories }) into a link payload. */
export async function encodeCollection(items, { compress = canCompress() } = {}) {
  const list = (items || []).slice(0, LIMITS.items).map((i) => [String(i.name || 'icon'), String(i.body || ''), i.tags || [], i.categories || []]);
  const json = utf8(JSON.stringify({ v: VERSION, i: list }));
  if (!compress) return `j${VERSION}.${toBase64Url(json)}`;
  return `z${VERSION}.${toBase64Url(await pipe(json, new CompressionStream('deflate-raw')))}`;
}

/** The payload inside a link or a fragment (#share=...), or the text itself. */
export function payloadOf(text) {
  const s = String(text ?? '').trim();
  const m = /(?:^|[#&?])share=([A-Za-z0-9._-]+)/.exec(s);
  return m ? m[1] : s;
}

/** Reads a link or a payload back into clean items. Throws when it is not a glyphfox collection. */
export async function decodeCollection(text) {
  const payload = payloadOf(text);
  if (payload.length > MAX_LINK) throw new Error('The shared collection is too large');
  const m = /^([zj])(\d+)\.([A-Za-z0-9_-]*)$/.exec(payload);
  if (!m || Number(m[2]) !== VERSION) throw new Error('This is not a glyphfox collection link');
  let bytes = fromBase64Url(m[3]);
  if (m[1] === 'z') {
    if (!canCompress()) throw new Error('This browser cannot open compressed links');
    try {
      bytes = await pipe(bytes, new DecompressionStream('deflate-raw'), MAX_JSON);
    } catch (err) {
      throw new Error(/too large/.test(err.message) ? err.message : 'The link is damaged or incomplete');
    }
  }
  let data;
  try {
    data = JSON.parse(fromUtf8(bytes));
  } catch {
    throw new Error('The link is damaged or incomplete');
  }
  if (!data || data.v !== VERSION || !Array.isArray(data.i)) throw new Error('This is not a glyphfox collection link');
  const items = [];
  for (const row of data.i.slice(0, LIMITS.items)) {
    if (!Array.isArray(row)) continue;
    const item = cleanItem({ name: row[0], body: row[1], tags: row[2], categories: row[3] });
    if (item) items.push(item);
  }
  return items;
}

/** The full link for a payload: the page address without its fragment plus #share=. */
export function shareLink(pageUrl, payload) {
  return `${String(pageUrl).split('#')[0]}#share=${payload}`;
}
