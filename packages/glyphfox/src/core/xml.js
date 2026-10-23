// Tolerant XML parser for SVG files from any editor (used by Fox-ify and the
// editor import). Returns { name, attrs, children, text } trees.

import { decodeEntities } from './nodes.js';

/** Parses an XML document and returns its root element. */
export function parseXml(text) {
  const src = String(text).replace(/^﻿/, '');
  const root = { name: '#document', attrs: {}, children: [], text: '' };
  const stack = [root];
  let i = 0;
  const n = src.length;
  const top = () => stack[stack.length - 1];
  while (i < n) {
    const lt = src.indexOf('<', i);
    if (lt < 0) {
      top().text += decodeEntities(src.slice(i));
      break;
    }
    if (lt > i) top().text += decodeEntities(src.slice(i, lt));
    if (src.startsWith('<!--', lt)) {
      const end = src.indexOf('-->', lt + 4);
      i = end < 0 ? n : end + 3;
      continue;
    }
    if (src.startsWith('<![CDATA[', lt)) {
      const end = src.indexOf(']]>', lt + 9);
      top().text += src.slice(lt + 9, end < 0 ? n : end);
      i = end < 0 ? n : end + 3;
      continue;
    }
    if (src.startsWith('<?', lt)) {
      const end = src.indexOf('?>', lt + 2);
      i = end < 0 ? n : end + 2;
      continue;
    }
    if (src.startsWith('<!', lt)) {
      // DOCTYPE, possibly with an internal subset.
      let depth = 0;
      let k = lt + 2;
      for (; k < n; k++) {
        if (src[k] === '[') depth++;
        else if (src[k] === ']') depth--;
        else if (src[k] === '>' && depth <= 0) break;
      }
      i = k + 1;
      continue;
    }
    if (src[lt + 1] === '/') {
      const end = src.indexOf('>', lt);
      const name = src.slice(lt + 2, end < 0 ? n : end).trim();
      for (let k = stack.length - 1; k > 0; k--) {
        if (stack[k].name === name) {
          stack.length = k;
          break;
        }
      }
      i = end < 0 ? n : end + 1;
      continue;
    }
    // Start tag.
    let k = lt + 1;
    while (k < n && !/[\s/>]/.test(src[k])) k++;
    const name = src.slice(lt + 1, k);
    const attrs = {};
    for (;;) {
      while (k < n && /\s/.test(src[k])) k++;
      if (k >= n) break;
      if (src[k] === '>') {
        k++;
        const el = { name, attrs, children: [], text: '' };
        top().children.push(el);
        stack.push(el);
        break;
      }
      if (src[k] === '/' && src[k + 1] === '>') {
        k += 2;
        top().children.push({ name, attrs, children: [], text: '' });
        break;
      }
      let a = k;
      while (a < n && !/[\s=/>]/.test(src[a])) a++;
      const key = src.slice(k, a);
      k = a;
      while (k < n && /\s/.test(src[k])) k++;
      let value = '';
      if (src[k] === '=') {
        k++;
        while (k < n && /\s/.test(src[k])) k++;
        const q = src[k];
        if (q === '"' || q === "'") {
          const end = src.indexOf(q, k + 1);
          value = src.slice(k + 1, end < 0 ? n : end);
          k = end < 0 ? n : end + 1;
        } else {
          let e = k;
          while (e < n && !/[\s>]/.test(src[e])) e++;
          value = src.slice(k, e);
          k = e;
        }
      }
      if (key) attrs[key] = decodeEntities(value);
      if (!key) k++;
    }
    i = k;
  }
  const svg = findFirst(root, 'svg');
  if (!svg) throw new Error('no <svg> element found');
  return svg;
}

function localName(name) {
  const c = name.indexOf(':');
  return c >= 0 ? name.slice(c + 1) : name;
}

export function findFirst(node, name) {
  for (const c of node.children) {
    if (localName(c.name) === name) return c;
    const f = findFirst(c, name);
    if (f) return f;
  }
  return null;
}

export { localName };
