// Streaming reader for .tgz archives (npm tarballs). Entries are read one at
// a time, so a 500 MB package never sits in memory: only the current file is
// buffered, and only when the filter accepts it.

import { createReadStream } from 'node:fs';
import { createGunzip } from 'node:zlib';

const text = (buf, start, len) => {
  const end = buf.indexOf(0, start);
  return buf.toString('utf8', start, end === -1 || end > start + len ? start + len : end);
};

function isZero(buf) {
  for (let i = 0; i < buf.length; i++) if (buf[i] !== 0) return false;
  return true;
}

function paxPath(data) {
  const s = data.toString('utf8');
  const m = /\d+ path=([^\n]*)\n/.exec(s);
  return m ? m[1] : null;
}

/**
 * Yields { name, size, data } for every regular file whose name passes
 * `accept(name, size)`. Other entries are skipped without being buffered.
 */
export async function* tarEntries(file, accept = () => true) {
  const input = createReadStream(file, { highWaterMark: 1 << 20 }).pipe(createGunzip({ chunkSize: 1 << 18 }));
  const head = Buffer.alloc(512);
  let headLen = 0;
  let mode = 'head';
  let left = 0;
  let pad = 0;
  let parts = null;
  let current = null;
  let longName = null;
  for await (const chunk of input) {
    let off = 0;
    while (off < chunk.length) {
      if (mode === 'head') {
        const n = Math.min(512 - headLen, chunk.length - off);
        chunk.copy(head, headLen, off, off + n);
        headLen += n;
        off += n;
        if (headLen < 512) continue;
        headLen = 0;
        if (isZero(head)) continue;
        let name = text(head, 0, 100);
        const prefix = text(head, 345, 155);
        if (prefix) name = `${prefix}/${name}`;
        const size = parseInt(text(head, 124, 12).trim() || '0', 8) || 0;
        const type = String.fromCharCode(head[156] || 48);
        if (longName && type !== 'x' && type !== 'L') {
          name = longName;
          longName = null;
        }
        const meta = type === 'x' || type === 'L';
        const regular = type === '0' || type === '\0' || type === '7';
        current = { name, size, type };
        parts = meta || (regular && accept(name, size)) ? [] : null;
        left = size;
        pad = (512 - (size % 512)) % 512;
        if (size === 0) {
          if (parts && regular) yield { name, size, data: Buffer.alloc(0) };
          parts = null;
          mode = pad ? 'pad' : 'head';
        } else mode = 'body';
      } else if (mode === 'body') {
        const n = Math.min(left, chunk.length - off);
        if (parts) parts.push(Buffer.from(chunk.subarray(off, off + n)));
        left -= n;
        off += n;
        if (left === 0) {
          if (parts) {
            const data = Buffer.concat(parts);
            parts = null;
            if (current.type === 'x') longName = paxPath(data) || longName;
            else if (current.type === 'L') longName = text(data, 0, data.length);
            else yield { name: current.name, size: current.size, data };
          }
          mode = pad ? 'pad' : 'head';
        }
      } else {
        const n = Math.min(pad, chunk.length - off);
        pad -= n;
        off += n;
        if (pad === 0) mode = 'head';
      }
    }
  }
}
