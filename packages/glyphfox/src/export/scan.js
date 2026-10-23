// Usage scanner: finds the glyphfox icons a project uses in JS, TS, JSX,
// Vue, Svelte, Angular templates and HTML, flags names that do not exist,
// values the scan cannot resolve and icons that need an accessible name,
// and builds the minimal subset (an ES module with the icon data or an SVG
// sprite). Pure functions over source text, so it runs in Node and in
// browsers; the file system walker lives in scan-fs.js.

import { LAYOUTS, MODIFIER_NAMES } from '../core/compose.js';
import { componentName, dataName } from '../core/formats.js';
import { parseSpec } from '../core/spec.js';

/** File extensions the scanner reads. */
export const SCAN_EXTENSIONS = ['.js', '.mjs', '.cjs', '.jsx', '.ts', '.mts', '.cts', '.tsx', '.vue', '.svelte', '.html', '.htm'];

const FRAMEWORK_MODULE = /^glyphfox\/(react|vue|svelte)$/;
const DEEP_COMPONENT = /^glyphfox\/(react|vue|svelte)\/icons\/([a-z0-9-]+?)(?:\.svelte|\.js)?$/;
const DEEP_DATA = /^glyphfox\/icons\/([a-z0-9-]+?)(?:\.js)?$/;
const CORE_MODULE = /^(?:glyphfox(?:\/(?:core|web|web\/element|runtime|tools))?|glyphfox-angular)$/;
const GENERICS = { Icon: 'icon', Fusion: 'fusion', MorphIcon: 'morph' };
// How each engine function names icons in its arguments.
const FUNCTIONS = { toSvg: 'spec', toNode: 'spec', resolve: 'spec', getIcon: 'spec', loadIcon: 'spec', lookupIcon: 'spec', useMorph: 'spec', morphStore: 'spec', fuse: 'list', createMorph: 'pair' };
const NOT_ICONS = new Set(['spin', 'pulse', 'pop', 'wiggle', 'bounce', 'shake', 'draw', 'secondary', 'fill', 'on', 'anim', 'rtl', 'ma', 'mb']);
const VARIANT_NAMES = ['outline', 'duotone', 'solid'];
const CORNER_TOKENS = ['tl', 'tr', 'bl', 'br'];
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const ROLES = /^(?:button|link|menuitem|menuitemcheckbox|menuitemradio|tab|switch|checkbox|radio|option)$/;
const JS_KEYWORDS = new Set(['return', 'yield', 'await', 'case', 'default', 'else', 'do', 'in', 'of', 'typeof', 'void', 'delete', 'throw', 'new']);
const MAX_TAG = 8000;

// Names -------------------------------------------------------------------

const mapsCache = new WeakMap();

function nameMaps(names) {
  if (!names) return null;
  if (typeof names === 'object' && mapsCache.has(names)) return mapsCache.get(names);
  const set = new Set(names);
  const components = new Map();
  const data = new Map();
  for (const n of set) {
    components.set(componentName(n), n);
    data.set(dataName(n), n);
  }
  const maps = { set, list: [...set], components, data };
  if (typeof names === 'object') mapsCache.set(names, maps);
  return maps;
}

const kebab = (s) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();

const pascal = (s) =>
  s
    .split('-')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('');

function isName(ctx, n) {
  return ctx.maps ? ctx.maps.set.has(n) : /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(n);
}

/** Icon name of a component export such as ArrowRightIcon (null when unknown). */
function componentIcon(ctx, comp) {
  if (ctx.maps) return ctx.maps.components.get(comp) || null;
  return /^[A-Z]\w*Icon$/.test(comp) && comp !== 'MorphIcon' ? kebab(comp.slice(0, -4)) : null;
}

function dataIcon(ctx, id) {
  if (ctx.maps) return ctx.maps.data.get(id) || null;
  return /^icon[A-Z]\w*$/.test(id) ? kebab(id.slice(4)) : null;
}

function distance(a, b, limit) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < best) best = cur[j];
    }
    if (best > limit) return limit + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** Closest name in a list, when it is close enough to be a typo. */
function closest(name, list) {
  if (!name || !list || !list.length) return null;
  const limit = Math.max(1, Math.floor(name.length / 3));
  let best = null;
  let bd = limit + 1;
  for (const n of list) {
    const d = distance(name, n, Math.min(limit, bd));
    if (d < bd) {
      bd = d;
      best = n;
    }
  }
  return bd <= limit ? best : null;
}

// Positions and records ---------------------------------------------------

function lineIndex(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1);
  return starts;
}

function locate(ctx, offset) {
  const s = ctx.starts;
  let lo = 0;
  let hi = s.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (s[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return { line: lo + 1, column: offset - s[lo] + 1 };
}

function partsOf(spec) {
  try {
    return parseSpec(spec);
  } catch {
    const head = spec.split(/[+@:/]/)[0];
    return { names: head.split('&').map((n) => n.trim()).filter(Boolean) };
  }
}

/**
 * Records a spec found at `offset`. strict: names that do not exist are
 * reported as unknown; otherwise (ambiguous places such as class names)
 * the spec is ignored unless every part exists. Returns true when kept.
 */
function addSpec(ctx, spec, offset, via, { strict = true, kind = 'use' } = {}) {
  const s = String(spec).trim();
  if (!s) return false;
  const parts = partsOf(s);
  const known = parts.names.filter((n) => isName(ctx, n));
  const missing = parts.names.filter((n) => !isName(ctx, n));
  const badModifier = parts.modifier && !MODIFIER_NAMES.includes(parts.modifier) ? parts.modifier : null;
  if (!strict && (missing.length || !known.length || badModifier)) return false;
  const key = `${offset}|${s}|${via}`;
  if (ctx.seen.has(key)) return true;
  ctx.seen.add(key);
  const loc = locate(ctx, offset);
  for (const n of missing) ctx.out.unknown.push({ name: n, spec: s, file: ctx.file, ...loc, via, suggestion: closest(n, ctx.maps && ctx.maps.list) });
  if (badModifier) ctx.out.unknown.push({ name: badModifier, spec: s, file: ctx.file, ...loc, via, kind: 'modifier', suggestion: closest(badModifier, MODIFIER_NAMES) });
  if (known.length && !badModifier) ctx.out.occurrences.push({ spec: s, names: known, file: ctx.file, ...loc, via, kind });
  return true;
}

function addUnknown(ctx, name, spec, offset, via, extra = {}) {
  const key = `u${offset}|${spec}`;
  if (ctx.seen.has(key)) return;
  ctx.seen.add(key);
  ctx.out.unknown.push({ name, spec, file: ctx.file, ...locate(ctx, offset), via, suggestion: closest(name, ctx.maps && ctx.maps.list), ...extra });
}

function addDynamic(ctx, offset, via, code, message) {
  const key = `d${offset}`;
  if (ctx.seen.has(key)) return;
  ctx.seen.add(key);
  const snippet = code.replace(/\s+/g, ' ').trim();
  ctx.out.dynamic.push({ file: ctx.file, ...locate(ctx, offset), via, code: snippet.length > 80 ? snippet.slice(0, 77) + '...' : snippet, message });
}

function addA11y(ctx, offset, spec, message) {
  const key = `a${offset}`;
  if (ctx.seen.has(key)) return;
  ctx.seen.add(key);
  ctx.out.a11y.push({ file: ctx.file, ...locate(ctx, offset), spec, message });
}

// Lexing helpers ------------------------------------------------------------

function skipWs(text, p, end) {
  while (p < end && /\s/.test(text[p])) p++;
  return p;
}

/** Index of the closing quote of the string starting at i (stops at a line end). */
function skipString(text, i, end) {
  const q = text[i];
  for (let k = i + 1; k < end; k++) {
    const c = text[k];
    if (c === '\\') k++;
    else if (c === q || c === '\n') return k;
  }
  return end - 1;
}

/** Index of the closing backtick of the template literal starting at i. */
function skipTemplate(text, i, end) {
  for (let k = i + 1; k < end; k++) {
    const c = text[k];
    if (c === '\\') k++;
    else if (c === '`') return k;
    else if (c === '$' && text[k + 1] === '{') {
      const e = matchClose(text, k + 1, end);
      if (e < 0) return end - 1;
      k = e;
    }
  }
  return end - 1;
}

function prevSignificant(text, i, start) {
  let p = i - 1;
  while (p >= start && /\s/.test(text[p])) p--;
  return p;
}

function wordBefore(text, p, start) {
  let s = p;
  while (s > start && /[\w$]/.test(text[s - 1])) s--;
  return text.slice(s, p + 1);
}

function isRegexStart(text, i, start) {
  const n = text[i + 1];
  if (n === '/' || n === '*') return false;
  const p = prevSignificant(text, i, start);
  if (p < start) return true;
  const c = text[p];
  if (/[\w$]/.test(c)) return JS_KEYWORDS.has(wordBefore(text, p, start));
  return '(,=:[!&|?{};+-*%<>~^'.includes(c);
}

function skipRegex(text, i, end) {
  let cls = false;
  for (let k = i + 1; k < end; k++) {
    const c = text[k];
    if (c === '\\') k++;
    else if (c === '\n') return -1;
    else if (c === '[') cls = true;
    else if (c === ']') cls = false;
    else if (c === '/' && !cls) return k;
  }
  return -1;
}

/** Index of the bracket that closes text[p] ('{', '(' or '['), aware of strings and comments. */
function matchClose(text, p, end) {
  const open = text[p];
  const close = open === '{' ? '}' : open === '(' ? ')' : ']';
  let depth = 0;
  for (let i = p; i < end; i++) {
    const c = text[i];
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return i;
    } else if (c === '"' || c === "'") i = skipString(text, i, end);
    else if (c === '`') i = skipTemplate(text, i, end);
    else if (c === '/' && text[i + 1] === '/') {
      const e = text.indexOf('\n', i);
      i = e < 0 || e >= end ? end : e;
    } else if (c === '/' && text[i + 1] === '*') {
      const e = text.indexOf('*/', i + 2);
      if (e < 0 || e >= end) return -1;
      i = e + 1;
    } else if (c === '/' && isRegexStart(text, i, p + 1)) {
      const e = skipRegex(text, i, end);
      if (e > 0) i = e;
    }
  }
  return -1;
}

/** String literals in an expression: [{ value, offset, template }]. */
function stringLiterals(expr, base) {
  const out = [];
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (c === '"' || c === "'" || c === '`') {
      const e = c === '`' ? skipTemplate(expr, i, expr.length) : skipString(expr, i, expr.length);
      const value = expr.slice(i + 1, e);
      const template = c === '`' && value.includes('${');
      if (!template) out.push({ value, offset: base + i + 1 });
      else out.push({ value, offset: base + i + 1, template: true });
      i = e;
    }
  }
  return out;
}

/**
 * Literals of an expression that only picks between literals (a literal,
 * a ternary or a logical expression). Calls, concatenation, arrays and
 * objects return null: the value is built at run time.
 */
function plainLiterals(expr, base) {
  const lits = stringLiterals(expr, base);
  if (!lits.length || lits.some((l) => l.template)) return null;
  let stripped = '';
  let p = 0;
  for (const l of lits) {
    stripped += expr.slice(p, l.offset - base - 1);
    p = l.offset - base + l.value.length + 1;
  }
  stripped += expr.slice(p);
  if (/[\w$\])]\s*\(|[[{}+`]/.test(stripped)) return null;
  return lits;
}

/** Literals of an array literal of strings (['cloud', 'lock']), or null. */
function listLiterals(text, offset) {
  const v = text.trim();
  if (!v.startsWith('[') || !v.endsWith(']')) return null;
  const inner = v.slice(1, -1);
  if (!/^[\s,]*$/.test(inner.replace(/'[^'\n]*'|"[^"\n]*"/g, ''))) return null;
  const lits = stringLiterals(inner, offset + (text.length - text.trimStart().length) + 1);
  return lits.length && !lits.some((l) => l.template) ? lits : null;
}

/** Splits call arguments at top level commas: [{ text, offset }]. */
function splitArgs(text, start, end) {
  const out = [];
  let s = start;
  let depth = 0;
  for (let i = start; i < end; i++) {
    const c = text[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === '"' || c === "'") i = skipString(text, i, end);
    else if (c === '`') i = skipTemplate(text, i, end);
    else if (c === ',' && depth === 0) {
      out.push({ text: text.slice(s, i), offset: s });
      s = i + 1;
    }
  }
  if (text.slice(s, end).trim()) out.push({ text: text.slice(s, end), offset: s });
  return out.map((a) => {
    const lead = a.text.length - a.text.trimStart().length;
    return { text: a.text.trim(), offset: a.offset + lead };
  });
}

// Tags ----------------------------------------------------------------------

const TAG_NAME = /[A-Za-z][\w.:-]*/y;

/** Parses the tag at text[i] === '<'. Returns null when it is not a tag. */
function parseTag(text, i, end) {
  const limit = Math.min(end, i + MAX_TAG);
  const close = text[i + 1] === '/';
  let p = i + (close ? 2 : 1);
  if (text[p] === '>') return { name: '', attrs: [], start: i, end: p + 1, close, selfClosing: false };
  TAG_NAME.lastIndex = p;
  const m = TAG_NAME.exec(text);
  if (!m) return null;
  const name = m[0];
  p += name.length;
  if (close) {
    p = skipWs(text, p, limit);
    return text[p] === '>' ? { name, attrs: [], start: i, end: p + 1, close: true, selfClosing: false } : null;
  }
  if (p < limit && !/[\s/>]/.test(text[p])) return null;
  const attrs = [];
  for (;;) {
    p = skipWs(text, p, limit);
    if (p >= limit) return null;
    const c = text[p];
    if (c === '>') return { name, attrs, start: i, end: p + 1, close: false, selfClosing: false };
    if (c === '/' && text[p + 1] === '>') return { name, attrs, start: i, end: p + 2, close: false, selfClosing: true };
    if (c === '<') return null;
    if (c === '{') {
      const e = matchClose(text, p, limit);
      if (e < 0) return null;
      attrs.push({ name: '', kind: 'expr', value: text.slice(p + 1, e), valueStart: p + 1, start: p });
      p = e + 1;
      continue;
    }
    const ns = p;
    while (p < limit && !/[\s=>"'`{}]/.test(text[p]) && !(text[p] === '/' && text[p + 1] === '>')) p++;
    if (p === ns) return null;
    const attrName = text.slice(ns, p);
    const q0 = skipWs(text, p, limit);
    if (text[q0] !== '=') {
      attrs.push({ name: attrName, kind: 'bool', value: '', valueStart: p, start: ns });
      continue;
    }
    const q = skipWs(text, q0 + 1, limit);
    const v = text[q];
    if (v === '"' || v === "'") {
      const e = text.indexOf(v, q + 1);
      if (e < 0 || e >= limit) return null;
      attrs.push({ name: attrName, kind: 'string', value: text.slice(q + 1, e), valueStart: q + 1, start: ns });
      p = e + 1;
    } else if (v === '{') {
      const e = matchClose(text, q, limit);
      if (e < 0) return null;
      attrs.push({ name: attrName, kind: 'expr', value: text.slice(q + 1, e), valueStart: q + 1, start: ns });
      p = e + 1;
    } else {
      let e = q;
      while (e < limit && !/[\s>]/.test(text[e]) && !(text[e] === '/' && text[e + 1] === '>')) e++;
      if (e === q) return null;
      attrs.push({ name: attrName, kind: 'string', value: text.slice(q, e), valueStart: q, start: ns });
      p = e;
    }
  }
}

/** Builds a tolerant element tree from markup (HTML, Vue, Svelte, Angular). */
function parseMarkup(ctx, start, end) {
  const text = ctx.text;
  const root = { type: 'el', name: '#root', attrs: [], children: [] };
  const stack = [root];
  let i = start;
  let textStart = start;
  const flush = (to) => {
    if (to > textStart) stack[stack.length - 1].children.push({ type: 'text', start: textStart, end: to, value: text.slice(textStart, to) });
  };
  while (i < end) {
    const lt = text.indexOf('<', i);
    if (lt < 0 || lt >= end) break;
    if (text.startsWith('<!--', lt)) {
      flush(lt);
      const e = text.indexOf('-->', lt + 4);
      i = e < 0 || e >= end ? end : e + 3;
      textStart = i;
      continue;
    }
    const tag = parseTag(text, lt, end);
    if (!tag || (!tag.name && !tag.close)) {
      i = lt + 1;
      continue;
    }
    flush(lt);
    i = tag.end;
    textStart = i;
    if (tag.close) {
      const want = tag.name.toLowerCase();
      for (let k = stack.length - 1; k > 0; k--) {
        if (stack[k].name.toLowerCase() === want) {
          stack.length = k;
          break;
        }
      }
      continue;
    }
    const node = { type: 'el', name: tag.name, attrs: tag.attrs, start: lt, end: tag.end, children: [] };
    stack[stack.length - 1].children.push(node);
    const lower = tag.name.toLowerCase();
    if (tag.selfClosing || VOID.has(lower)) continue;
    if (lower === 'script' || lower === 'style') {
      const re = new RegExp(`</${lower}\\s*>`, 'ig');
      re.lastIndex = tag.end;
      const m = re.exec(text);
      const stop = m && m.index < end ? m.index : end;
      if (lower === 'script') scanJs(ctx, tag.end, stop, false, []);
      i = stop;
      textStart = stop;
      continue;
    }
    stack.push(node);
  }
  flush(end);
  return root.children;
}

function jsxStart(text, i, start) {
  const n = text[i + 1];
  if (!n || !(/[A-Za-z]/.test(n) || n === '>')) return false;
  const p = prevSignificant(text, i, start);
  if (p < start) return true;
  const c = text[p];
  if (/[\w$]/.test(c)) return JS_KEYWORDS.has(wordBefore(text, p, start));
  return !')].'.includes(c);
}

/** Markup inside a string literal (inline templates, innerHTML) becomes its own tree. */
function scanString(ctx, s, e) {
  const text = ctx.text;
  const lt = text.indexOf('<', s);
  if (lt < 0 || lt >= e || !/[A-Za-z]/.test(text[lt + 1] || '')) return;
  ctx.trees.push(parseMarkup(ctx, s, e));
}

/** Lexes JS or TS between start and end: strings, comments, regular expressions and JSX. */
function scanJs(ctx, start, end, jsx, nodes) {
  const text = ctx.text;
  let i = start;
  while (i < end) {
    const c = text[i];
    if (c === '/' && text[i + 1] === '/') {
      const e = text.indexOf('\n', i);
      i = e < 0 || e >= end ? end : e + 1;
    } else if (c === '/' && text[i + 1] === '*') {
      const e = text.indexOf('*/', i + 2);
      i = e < 0 || e >= end ? end : e + 2;
    } else if (c === '"' || c === "'") {
      const e = Math.min(skipString(text, i, end), end);
      scanString(ctx, i + 1, e);
      i = e + 1;
    } else if (c === '`') {
      const e = Math.min(skipTemplate(text, i, end), end);
      scanString(ctx, i + 1, e);
      i = e + 1;
    } else if (c === '/' && isRegexStart(text, i, start)) {
      const e = skipRegex(text, i, end);
      i = e < 0 ? i + 1 : e + 1;
    } else if (c === '<' && jsx && jsxStart(text, i, start)) {
      const node = parseJsx(ctx, i, end);
      if (node) {
        nodes.push(node);
        i = node.end;
      } else i++;
    } else i++;
  }
}

/** Parses one JSX element (and its children) at text[i] === '<'. */
function parseJsx(ctx, i, end) {
  const text = ctx.text;
  const tag = parseTag(text, i, end);
  if (!tag || tag.close) return null;
  const node = { type: 'el', name: tag.name, attrs: tag.attrs, start: i, end: tag.end, children: [], jsx: true };
  for (const a of tag.attrs) {
    if (a.kind === 'expr') {
      a.nodes = [];
      scanJs(ctx, a.valueStart, a.valueStart + a.value.length, true, a.nodes);
    }
  }
  if (tag.selfClosing) return node;
  let p = tag.end;
  let textStart = p;
  const flush = (to) => {
    if (to > textStart) node.children.push({ type: 'text', start: textStart, end: to, value: text.slice(textStart, to) });
  };
  while (p < end) {
    const c = text[p];
    if (c === '{') {
      const e = matchClose(text, p, end);
      if (e < 0) return null;
      flush(p);
      const expr = { type: 'expr', start: p, end: e + 1, value: text.slice(p + 1, e), valueStart: p + 1, nodes: [] };
      scanJs(ctx, p + 1, e, true, expr.nodes);
      node.children.push(expr);
      p = e + 1;
      textStart = p;
      continue;
    }
    if (c === '<') {
      if (text[p + 1] === '/') {
        const close = parseTag(text, p, end);
        if (close && close.close) {
          if (close.name !== tag.name) return null;
          flush(p);
          node.end = close.end;
          return node;
        }
      } else if (/[A-Za-z>]/.test(text[p + 1] || '')) {
        const child = parseJsx(ctx, p, end);
        if (child) {
          flush(p);
          node.children.push(child);
          p = child.end;
          textStart = p;
          continue;
        }
      }
    }
    p++;
  }
  return null;
}

// Imports and calls ---------------------------------------------------------

const IMPORT_RE = /\bimport\s+(?!\()([\w$\s{},*]*?)\s*from\s*(['"])([^'"\r\n]+)\2/g;
const EXPORT_FROM_RE = /\bexport\s+(\{[^}]*\}|\*(?:\s+as\s+[\w$]+)?)\s*from\s*(['"])([^'"\r\n]+)\2/g;
const REQUIRE_RE = /\b(?:const|let|var)\s+(\{[^}]*\}|[\w$]+)\s*=\s*require\s*\(\s*(['"])([^'"\r\n]+)\2\s*\)/g;
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*(['"])([^'"\r\n]+)\1\s*\)/g;
const SIDE_IMPORT_RE = /\bimport\s*(['"])([^'"\r\n]+)\1/g;

function parseClause(clause, base, colonAlias) {
  const items = [];
  let s = clause.replace(/^\s*type\s+/, '');
  const offsetOf = (word, from) => {
    const k = clause.indexOf(word, from);
    return base + (k < 0 ? 0 : k);
  };
  const ns = /\*\s*as\s+([\w$]+)/.exec(s);
  if (ns) items.push({ kind: 'namespace', local: ns[1], imported: '*', offset: offsetOf(ns[1], 0) });
  const brace = /\{([^}]*)\}/.exec(s);
  const head = s.replace(/\{[^}]*\}/, '').replace(/\*\s*as\s+[\w$]+/, '');
  const def = /^\s*([\w$]+)/.exec(head);
  if (def && def[1] !== 'type') items.push({ kind: 'default', local: def[1], imported: 'default', offset: offsetOf(def[1], 0) });
  if (brace) {
    const inner = clause.indexOf('{');
    let from = inner;
    for (const raw of brace[1].split(',')) {
      const t = raw.trim().replace(/^type\s+/, '');
      if (!t) continue;
      const m = colonAlias ? /^([\w$]+)(?:\s*:\s*([\w$]+))?$/.exec(t) : /^([\w$]+)(?:\s+as\s+([\w$]+))?$/.exec(t);
      if (!m) continue;
      const offset = offsetOf(m[1], from);
      from = offset - base + m[1].length;
      items.push({ kind: 'named', imported: m[1], local: m[2] || m[1], offset });
    }
  }
  return items;
}

/** Reads every import of a glyphfox module and returns the local bindings. */
function bindingsFrom(ctx) {
  const text = ctx.text;
  const b = { components: new Map(), namespaces: new Map([['glyphfox', { module: 'glyphfox' }]]), funcs: new Map() };
  const handle = (module, items) => {
    const fw = FRAMEWORK_MODULE.exec(module);
    const deep = DEEP_COMPONENT.exec(module);
    const deepData = DEEP_DATA.exec(module);
    if (deep) {
      const [, via, name] = deep;
      for (const it of items) {
        if (it.kind === 'namespace') continue;
        if (!isName(ctx, name)) {
          addUnknown(ctx, name, module, it.offset, via);
          b.components.set(it.local, { icon: null, via });
        } else {
          b.components.set(it.local, { icon: name, via });
          addSpec(ctx, name, it.offset, via, { kind: 'import' });
        }
      }
      return;
    }
    if (deepData) {
      const name = deepData[1];
      const offset = items.length ? items[0].offset : 0;
      if (isName(ctx, name)) addSpec(ctx, name, offset, 'data', { kind: 'import' });
      else addUnknown(ctx, name, module, offset, 'data');
      return;
    }
    if (fw) {
      const via = fw[1];
      for (const it of items) {
        if (it.kind === 'namespace') {
          b.namespaces.set(it.local, { module, via });
          continue;
        }
        const id = it.imported;
        if (GENERICS[id]) b.components.set(it.local, { icon: null, generic: GENERICS[id], via });
        else if (FUNCTIONS[id]) b.funcs.set(it.local, id);
        else if (/^[A-Z]\w*Icon$/.test(id)) {
          const name = componentIcon(ctx, id);
          if (name) {
            b.components.set(it.local, { icon: name, via });
            addSpec(ctx, name, it.offset, via, { kind: 'import' });
          } else {
            b.components.set(it.local, { icon: null, via });
            addUnknown(ctx, kebab(id.slice(0, -4)), id, it.offset, via, { component: id });
          }
        }
      }
      return;
    }
    if (CORE_MODULE.test(module)) {
      for (const it of items) {
        if (it.kind === 'namespace') {
          b.namespaces.set(it.local, { module });
          continue;
        }
        const id = it.imported;
        if (FUNCTIONS[id]) b.funcs.set(it.local, id);
        else if (id === 'icons' && /^glyphfox$/.test(module)) addDynamic(ctx, it.offset, 'data', `import { icons } from '${module}'`, 'imports every icon, so a bundler keeps the whole set');
        else if (/^icon[A-Z]\w*$/.test(id)) {
          const name = dataIcon(ctx, id);
          if (name) addSpec(ctx, name, it.offset, 'data', { kind: 'import' });
          else addUnknown(ctx, kebab(id.slice(4)), id, it.offset, 'data', { data: id });
        }
      }
    }
  };
  const glyphModule = (m) => /^glyphfox(?:\/|-angular$|$)/.test(m);
  for (const m of text.matchAll(IMPORT_RE)) {
    if (!glyphModule(m[3])) continue;
    handle(m[3], parseClause(m[1], m.index + m[0].indexOf(m[1]), false));
  }
  for (const m of text.matchAll(EXPORT_FROM_RE)) {
    if (!glyphModule(m[3]) || !m[1].startsWith('{')) continue;
    handle(m[3], parseClause(m[1], m.index + m[0].indexOf(m[1]), false));
  }
  for (const m of text.matchAll(REQUIRE_RE)) {
    if (!glyphModule(m[3])) continue;
    const base = m.index + m[0].indexOf(m[1]);
    const items = m[1].startsWith('{') ? parseClause(m[1], base, true) : [{ kind: 'namespace', local: m[1], imported: '*', offset: base }];
    handle(m[3], items);
  }
  for (const m of text.matchAll(DYNAMIC_IMPORT_RE)) {
    if (!glyphModule(m[2])) continue;
    const offset = m.index + m[0].indexOf(m[2]);
    if (DEEP_DATA.test(m[2]) || DEEP_COMPONENT.test(m[2])) handle(m[2], [{ kind: 'default', local: '', imported: 'default', offset }]);
  }
  for (const m of text.matchAll(SIDE_IMPORT_RE)) {
    if (m[2] === 'glyphfox/web') addDynamic(ctx, m.index + m[0].indexOf(m[2]), 'web-component', `import '${m[2]}'`, 'glyphfox/web registers every icon; import glyphfox/web/element and registerIcons(subset) to ship only the used ones');
  }
  return b;
}

/** Specs named by one argument: literals, or null when nothing is literal. */
function argSpecs(arg) {
  return plainLiterals(arg.text, arg.offset);
}

const CALL_RE = /\b([\w$]+)(?:\s*\.\s*([\w$]+))?\s*\(/g;

/** toSvg('file+check'), fuse(['cloud', 'lock']), createMorph('menu', 'x') and friends. */
function scanCalls(ctx, b) {
  const text = ctx.text;
  for (const m of text.matchAll(CALL_RE)) {
    let fn = null;
    if (m[2]) {
      if (b.namespaces.has(m[1]) && FUNCTIONS[m[2]]) fn = m[2];
    } else if (b.funcs.has(m[1])) fn = b.funcs.get(m[1]);
    if (!fn) continue;
    if (/\bfunction\s*$/.test(text.slice(Math.max(0, m.index - 12), m.index))) continue;
    const open = m.index + m[0].length - 1;
    const close = matchClose(text, open, text.length);
    if (close < 0) continue;
    const args = splitArgs(text, open + 1, close);
    if (!args.length) continue;
    const kind = FUNCTIONS[fn];
    const dynamic = (arg) => addDynamic(ctx, arg.offset, 'js', `${fn}(${arg.text})`, `${fn} gets a value that is not a literal, the scan cannot tell which icon it names`);
    if (kind === 'list') {
      const arg = args[0];
      const lits = listLiterals(arg.text, arg.offset);
      if (!lits) dynamic(arg);
      else {
        const layout = args[1] && /\blayout\s*:\s*(['"`])(\w+)\1/.exec(args[1].text);
        addSpec(ctx, lits.map((l) => l.value.trim()).join('&') + (layout ? `:${layout[2]}` : ''), lits[0].offset, 'js');
      }
    } else {
      const take = kind === 'pair' ? args.slice(0, 2) : args.slice(0, 1);
      for (const arg of take) {
        if (/^[[{]/.test(arg.text) || /^icon[A-Z][\w$]*$/.test(arg.text)) continue;
        const lits = argSpecs(arg);
        if (!lits) dynamic(arg);
        else for (const l of lits) addSpec(ctx, l.value, l.offset, 'js');
      }
      if (kind === 'spec' && args[1]) {
        const mt = /\bmorphTo\s*:\s*(['"`])([^'"`]+)\1/.exec(args[1].text);
        if (mt) addSpec(ctx, mt[2], args[1].offset + mt.index + mt[0].indexOf(mt[2]), 'js');
      }
    }
  }
  // Data through a namespace: gf.iconHome.
  for (const m of text.matchAll(/\b([\w$]+)\s*\.\s*(icon[A-Z][\w$]*)\b/g)) {
    const ns = b.namespaces.get(m[1]);
    if (!ns || FRAMEWORK_MODULE.test(ns.module || '')) continue;
    const name = dataIcon(ctx, m[2]);
    const offset = m.index + m[0].lastIndexOf(m[2]);
    if (name) addSpec(ctx, name, offset, 'data');
    else addUnknown(ctx, kebab(m[2].slice(4)), m[2], offset, 'data', { data: m[2] });
  }
}

/** <use href="sprite.svg#gf-home"> and xlink:href. */
function scanSprites(ctx) {
  for (const m of ctx.text.matchAll(/(?:xlink:href|href)\s*=\s*\{?\s*(["'`])([^"'`\s]*?)#gf-([a-z0-9]+(?:-[a-z0-9]+)*)\1/g)) {
    addSpec(ctx, m[3], m.index + m[0].lastIndexOf(m[3]), 'sprite', { strict: false });
  }
}

// Elements --------------------------------------------------------------------

function attrMap(node) {
  if (node.am) return node.am;
  const m = new Map();
  for (const a of node.attrs) {
    if (!a.name) continue;
    let key = a.name;
    let binding = a.kind === 'expr';
    if (key.startsWith('v-bind:')) {
      key = key.slice(7);
      binding = true;
    } else if (key.startsWith(':')) {
      key = key.slice(1);
      binding = true;
    } else if (key.startsWith('[') && key.endsWith(']')) {
      key = key.slice(1, -1);
      binding = true;
      if (key.startsWith('attr.')) key = key.slice(5);
    }
    if (!m.has(key)) m.set(key, { ...a, key, binding });
  }
  node.am = m;
  return m;
}

/** Literal values of an attribute: { values: [{ value, offset }], dynamic }. */
function attrValues(a) {
  if (!a || a.kind === 'bool') return { values: [], dynamic: false };
  if (!a.binding) {
    if (/\{\{|\$\{|^\s*\{[\s\S]*\}\s*$/.test(a.value)) return { values: [], dynamic: true };
    return { values: [{ value: a.value, offset: a.valueStart }], dynamic: false };
  }
  const lits = plainLiterals(a.value, a.valueStart);
  return lits ? { values: lits, dynamic: false } : { values: [], dynamic: true };
}

function literal(a) {
  const { values } = attrValues(a);
  return values.length === 1 ? values[0].value.trim() : undefined;
}

const codeOf = (a) => (a.kind === 'expr' ? `${a.name}={${a.value}}` : `${a.name}="${a.value}"`);

function takeSpecs(ctx, a, via, layout) {
  if (!a) return [];
  const { values, dynamic } = attrValues(a);
  if (dynamic) addDynamic(ctx, a.start, via, codeOf(a), `${a.key} is not a literal, the scan cannot tell which icon it names`);
  const specs = [];
  for (const v of values) {
    let spec = v.value.trim();
    if (!spec) continue;
    if (layout && spec.includes('&') && !spec.includes(':')) spec += `:${layout}`;
    addSpec(ctx, spec, v.offset, via);
    specs.push(spec);
  }
  return specs;
}

function takeList(ctx, a, via, layout) {
  if (!a) return [];
  const lits = a.binding ? listLiterals(a.value, a.valueStart) : null;
  if (!lits) {
    addDynamic(ctx, a.start, via, codeOf(a), `${a.key} is not a literal list, the scan cannot tell which icons it names`);
    return [];
  }
  const spec = lits.map((l) => l.value.trim()).join('&') + (layout ? `:${layout}` : '');
  addSpec(ctx, spec, lits[0].offset, via);
  return [spec];
}

const TAILWIND_RE = /(?<![\w-])gf-(\[[^\]\s'"`]+\]|[a-z0-9]+(?:-[a-z0-9]+)*(?:[+&@:][a-z0-9]+(?:-[a-z0-9]+)*)*)(?:\/([\w.-]+))?/g;

function isClassAttr(name) {
  return /^(?:class|className|:class|v-bind:class|\[class\]|\[className\]|\[ngClass\]|ngClass|class:.+)$/.test(name);
}

/** Tailwind classes such as gf-home, gf-[file+check] and gf-[cloud&lock]/side. Returns the specs kept. */
function tailwindSpecs(ctx, source, base) {
  const kept = [];
  for (const m of source.matchAll(TAILWIND_RE)) {
    const bracket = m[1].startsWith('[');
    let spec = bracket ? m[1].slice(1, -1) : m[1];
    if (!bracket && NOT_ICONS.has(spec)) continue;
    if (m[2]) {
      let variant = null;
      for (const tok of m[2].split(/[-_,]+/)) {
        if (LAYOUTS.includes(tok) && spec.includes('&') && !spec.includes(':')) spec += `:${tok}`;
        else if (CORNER_TOKENS.includes(tok) && spec.includes('+') && !spec.includes('@')) spec += `@${tok}`;
        else if (VARIANT_NAMES.includes(tok) && !variant) variant = tok;
      }
      if (variant && variant !== 'outline') spec += `/${variant}`;
    }
    if (addSpec(ctx, spec, base + m.index, 'tailwind', { strict: false })) kept.push(spec);
  }
  return kept;
}

function hasValue(a) {
  return Boolean(a && (a.binding || a.kind === 'expr' || a.value.trim()));
}

function isFalse(a) {
  return Boolean(a && a.value.trim() === 'false' && a.kind !== 'bool');
}

function resolveComponent(ctx, name, b) {
  const direct = b.components.get(name);
  if (direct) return direct;
  if (name.includes('.')) {
    const [ns, member] = name.split('.');
    const n = b.namespaces.get(ns);
    const fw = n && FRAMEWORK_MODULE.exec(n.module || '');
    if (!fw) return null;
    if (GENERICS[member]) return { icon: null, generic: GENERICS[member], via: fw[1] };
    const icon = componentIcon(ctx, member);
    return icon ? { icon, via: fw[1] } : null;
  }
  if (name.includes('-') && /^[a-z]/.test(name)) return b.components.get(pascal(name)) || null;
  return null;
}

/** Finds the icons an element names and records them. Sets node.icon when it is an icon. */
function visitElement(ctx, node, b) {
  const am = attrMap(node);
  const lower = node.name.toLowerCase();
  let info = null;
  const mark = (via, specs = []) => {
    if (!info) info = { via, specs: [], labelled: ['title', 'label', 'aria-label', 'aria-labelledby'].some((k) => hasValue(am.get(k))), decorativeFalse: isFalse(am.get('decorative')) };
    info.specs.push(...specs);
  };
  const morph = (via) => takeSpecs(ctx, am.get('morph-to') || am.get('morphTo'), via);
  if (lower === 'glyph-fox') {
    const layout = literal(am.get('layout'));
    mark('web-component', takeSpecs(ctx, am.get('name'), 'web-component', layout));
    mark('web-component', morph('web-component'));
  } else if (lower === 'gf-icon') {
    const layout = literal(am.get('layout'));
    mark('angular', takeSpecs(ctx, am.get('name'), 'angular', layout));
    if (am.get('icons')) mark('angular', takeList(ctx, am.get('icons'), 'angular', layout));
    mark('angular', morph('angular'));
  } else if (node.name !== '#root') {
    const comp = resolveComponent(ctx, node.name, b);
    if (comp) {
      if (comp.icon) {
        const mod = literal(am.get('modifier'));
        const spec = mod ? `${comp.icon}+${mod}` : comp.icon;
        addSpec(ctx, spec, node.start, comp.via);
        mark(comp.via, [spec]);
      } else if (comp.generic === 'fusion') mark(comp.via, takeList(ctx, am.get('icons'), comp.via, literal(am.get('layout'))));
      else if (comp.generic) mark(comp.via, takeSpecs(ctx, am.get('name'), comp.via));
      else mark(comp.via);
      mark(comp.via, morph(comp.via));
    }
  }
  const glyph = am.get('data-glyph');
  if (glyph) mark('html', takeSpecs(ctx, glyph, 'html'));
  for (const a of node.attrs) {
    if (!a.name || !isClassAttr(a.name)) continue;
    const specs = a.name.startsWith('class:') ? tailwindSpecs(ctx, a.name.slice(6), a.start + 6) : tailwindSpecs(ctx, a.value, a.valueStart);
    if (specs.length) mark('tailwind', specs);
  }
  if (info) {
    node.icon = info;
    if (info.decorativeFalse && !info.labelled) addA11y(ctx, node.start, info.specs[0] || node.name, `<${node.name}> sets decorative to false but has no title: add a title so assistive technology can name the icon`);
  }
}

function walk(nodes, fn) {
  for (const n of nodes) {
    if (n.type === 'el') {
      fn(n);
      for (const a of n.attrs) if (a.nodes) walk(a.nodes, fn);
      walk(n.children, fn);
    } else if (n.type === 'expr') walk(n.nodes, fn);
  }
}

// Accessibility -----------------------------------------------------------------

function visibleText(s) {
  const t = s
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
    .replace(/\{\s*[#:/][^}]*\}/g, '')
    .replace(/@(?:if|else if|else|for|switch|case|default|defer|placeholder|loading|empty)\b[^{]*\{|\}/g, '');
  return /\S/.test(t);
}

function exprIsText(value) {
  const v = value.replace(/\/\*[\s\S]*?\*\//g, '').trim();
  if (!v) return false;
  return !/^(['"`])\s*\1$/.test(v);
}

function literalTextOutside(ctx, expr) {
  let v = '';
  let p = expr.valueStart;
  for (const n of expr.nodes) {
    v += ctx.text.slice(p, n.start);
    p = n.end;
  }
  v += ctx.text.slice(p, expr.end - 1);
  return stringLiterals(v, 0).some((l) => /[\p{L}\p{N}]/u.test(l.value));
}

function content(ctx, nodes, out) {
  for (const c of nodes) {
    if (c.type === 'text') {
      if (visibleText(c.value)) out.text = true;
    } else if (c.type === 'expr') {
      if (c.nodes.length) {
        content(ctx, c.nodes, out);
        if (literalTextOutside(ctx, c)) out.text = true;
      } else if (exprIsText(c.value)) out.text = true;
    } else if (c.type === 'el') {
      const am = attrMap(c);
      const hidden = am.get('aria-hidden');
      if (hidden && hidden.value.trim() === 'true') continue;
      if (c.icon) {
        out.icons.push(c);
        if (c.icon.labelled) out.text = true;
        continue;
      }
      const lower = c.name.toLowerCase();
      if (lower === 'img') {
        if (hasValue(am.get('alt'))) out.text = true;
        continue;
      }
      if (['v-text', 'v-html', 'innerHTML', 'textContent', 'dangerouslySetInnerHTML'].some((k) => am.has(k))) out.text = true;
      content(ctx, c.children, out);
    }
  }
}

function isInteractive(node, am) {
  const role = am.get('role');
  if (role && !role.binding && ROLES.test(role.value.trim())) return true;
  const n = node.name;
  if (n === 'button' || n === 'summary') return true;
  if (n === 'a') return am.has('href') || am.has('routerLink') || am.has('to');
  if (/^[A-Z]/.test(n)) return /(?:Button|^Link|^NavLink|^RouterLink|^NuxtLink)$/.test(n);
  return /^(?:router-link|nuxt-link)$|-button$/.test(n);
}

function checkInteractive(ctx, node) {
  const am = attrMap(node);
  if (node.name === '#root' || !isInteractive(node, am)) return;
  // A spread ({...props}) or a Svelte shorthand ({title}) may carry the name.
  if (node.attrs.some((a) => !a.name)) return;
  if (['aria-label', 'aria-labelledby', 'title'].some((k) => hasValue(am.get(k)))) return;
  if (/^[A-Z]/.test(node.name) && hasValue(am.get('label'))) return;
  if (['v-text', 'v-html', 'innerHTML', 'textContent'].some((k) => am.has(k))) return;
  const out = { icons: [], text: false };
  if (node.icon) {
    out.icons.push(node);
    if (node.icon.labelled) out.text = true;
  }
  content(ctx, node.children, out);
  if (!out.icons.length || out.text) return;
  const icon = out.icons[0];
  addA11y(ctx, icon.start, icon.icon.specs[0] || icon.name, `icon only <${node.name}> has no accessible name: add aria-label to the <${node.name}> or a title to the icon`);
}

// Public API ------------------------------------------------------------------

function kindOf(file, text) {
  const f = String(file).toLowerCase();
  const ext = (/\.[a-z0-9]+$/.exec(f) || [''])[0];
  if (ext === '.vue') return 'vue';
  if (ext === '.svelte') return 'svelte';
  if (ext === '.html' || ext === '.htm') return 'html';
  if (ext === '.ts' || ext === '.mts' || ext === '.cts') return 'ts';
  if (SCAN_EXTENSIONS.includes(ext)) return 'jsx';
  return text.trimStart().startsWith('<') ? 'html' : 'jsx';
}

const byPosition = (a, b) => a.line - b.line || a.column - b.column;

/**
 * Finds glyphfox usage in one source text. `names` lists every icon name;
 * it maps component and data names back to icons and validates names.
 * Returns { occurrences, unknown, dynamic, a11y } with 1 based lines and columns.
 */
export function scanSource(text, { file = 'input', names } = {}) {
  const src = String(text ?? '');
  const ctx = { text: src, file, maps: nameMaps(names), starts: lineIndex(src), out: { occurrences: [], unknown: [], dynamic: [], a11y: [] }, seen: new Set(), trees: [] };
  const kind = kindOf(file, src);
  const b = bindingsFrom(ctx);
  scanCalls(ctx, b);
  scanSprites(ctx);
  if (kind === 'jsx' || kind === 'ts') {
    const nodes = [];
    scanJs(ctx, 0, src.length, kind === 'jsx', nodes);
    ctx.trees.push(nodes);
  } else ctx.trees.push(parseMarkup(ctx, 0, src.length));
  for (const tree of ctx.trees) walk(tree, (n) => visitElement(ctx, n, b));
  for (const tree of ctx.trees) walk(tree, (n) => checkInteractive(ctx, n));
  for (const list of Object.values(ctx.out)) list.sort(byPosition);
  return ctx.out;
}

/**
 * Scans many files: [{ file, text }]. Returns { files, used, specs,
 * occurrences, unknown, dynamic, a11y }; used lists the base icon names
 * (what a subset needs), specs every distinct spec including composites.
 */
export function scanFiles(files, { names } = {}) {
  const report = { files: 0, used: [], specs: [], occurrences: [], unknown: [], dynamic: [], a11y: [] };
  for (const f of files) {
    report.files++;
    const r = scanSource(f.text, { file: f.file, names });
    report.occurrences.push(...r.occurrences);
    report.unknown.push(...r.unknown);
    report.dynamic.push(...r.dynamic);
    report.a11y.push(...r.a11y);
  }
  report.used = [...new Set(report.occurrences.flatMap((o) => o.names))].sort();
  report.specs = [...new Set(report.occurrences.map((o) => o.spec))].sort();
  return report;
}

function uniqueIcons(icons) {
  const seen = new Set();
  const out = [];
  for (const ic of icons || []) {
    if (!ic || !ic.name || seen.has(ic.name)) continue;
    seen.add(ic.name);
    out.push(ic);
  }
  return out;
}

/**
 * ES module with the data of a subset: one export per icon (iconHome), plus
 * `icons` and a default export with the list, ready for registerIcons() and
 * provideGlyphFox({ icons }).
 */
export function subsetEsm(icons, { header } = {}) {
  const list = uniqueIcons(icons);
  const head = String(header || `glyphfox subset: ${list.length} icon${list.length === 1 ? '' : 's'}, made by glyphfox scan`)
    .split(/\r?\n/)
    .map((l) => `// ${l}`.trimEnd())
    .join('\n');
  const body = list.map((ic) => `export const ${dataName(ic.name)} = ${JSON.stringify(ic)};`).join('\n');
  return `${head}\n${body ? body + '\n' : ''}\nexport const icons = [${list.map((ic) => dataName(ic.name)).join(', ')}];\nexport default icons;\n`;
}

/** SVG sprite of a subset: <use href="sprite.svg#gf-NAME">. */
export function subsetSprite(icons) {
  const list = uniqueIcons(icons);
  const symbols = list.map((ic) => `<symbol id="gf-${ic.name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ic.body}</symbol>`);
  return `<svg xmlns="http://www.w3.org/2000/svg">\n${symbols.join('\n')}${symbols.length ? '\n' : ''}</svg>\n`;
}

/** Human readable report (the CLI output). */
export function formatReport(report, { color = false } = {}) {
  const paint = (code) => (s) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
  const bold = paint('1');
  const dim = paint('2');
  const red = paint('31');
  const yellow = paint('33');
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const lines = [];
  const where = (x) => dim(`${x.file}:${x.line}:${x.column}`);
  lines.push(bold(`${plural(report.used.length, 'icon')} used in ${plural(report.files, 'file')}`));
  if (report.used.length) {
    const width = Math.max(...report.used.map((n) => n.length));
    for (const name of report.used) {
      const occ = report.occurrences.filter((o) => o.names.includes(name));
      const uses = occ.filter((o) => o.kind !== 'import').length || occ.length;
      const via = [...new Set(occ.map((o) => o.via))].join(', ');
      lines.push(`  ${name.padEnd(width)}  ${String(uses).padStart(3)}  ${dim(via)}`);
    }
  }
  if (report.unknown.length) {
    lines.push('', red(bold('Unknown icons')));
    for (const u of report.unknown) {
      const what = u.kind === 'modifier' ? `unknown modifier "${u.name}"` : `unknown icon "${u.name}"`;
      const inSpec = u.spec && u.spec !== u.name ? ` in ${u.spec}` : '';
      lines.push(`  ${where(u)}  ${what}${inSpec}${u.suggestion ? `, did you mean "${u.suggestion}"?` : ''}`);
    }
  }
  if (report.dynamic.length) {
    lines.push('', yellow(bold('Not resolved')));
    for (const d of report.dynamic) lines.push(`  ${where(d)}  ${d.message}: ${d.code}`);
  }
  if (report.a11y.length) {
    lines.push('', yellow(bold('Accessibility')));
    for (const a of report.a11y) lines.push(`  ${where(a)}  ${a.message}`);
  }
  lines.push('', `${plural(report.used.length, 'icon')}, ${report.specs.length} distinct spec${report.specs.length === 1 ? '' : 's'}, ${report.unknown.length} unknown, ${report.dynamic.length} not resolved, ${plural(report.a11y.length, 'accessibility issue')}`);
  return lines.join('\n');
}
